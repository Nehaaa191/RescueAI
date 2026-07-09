import os
import logging
import joblib
import pandas as pd
import numpy as np
import xgboost as xgb

logger = logging.getLogger("rescueai.priority")

FEATURE_COLS = [
    "num_people",
    "has_children",
    "has_elderly",
    "has_pregnant",
    "has_disabled",
    "medical_emergency",
    "water_level_cm",
    "disaster_type_encoded",
    "road_blocked",
    "distance_to_nearest_shelter_km",
    "people_visible_in_image",
    "severity_estimate_encoded"
]

FRIENDLY_REASONS = {
    "num_people": "Large group size requiring attention",
    "has_children": "Children present in distress zone",
    "has_elderly": "Elderly individuals requiring assistance",
    "has_pregnant": "Pregnant individual needing urgent care",
    "has_disabled": "Disabled individual needing special equipment",
    "medical_emergency": "Critical medical emergency reported",
    "water_level_cm": "Dangerously high water levels",
    "disaster_type_encoded": "High-risk disaster category",
    "road_blocked": "Access road blocked by debris",
    "distance_to_nearest_shelter_km": "Far distance to nearest emergency shelter",
    "people_visible_in_image": "Multiple individuals identified in visuals",
    "severity_estimate_encoded": "Severe physical damage detected in visuals"
}

class PriorityService:
    def __init__(self, model_path="ml/artifacts/priority_model.joblib"):
        self.model_path = model_path
        self.model = None
        self.load_model()

    def load_model(self):
        if os.path.exists(self.model_path):
            try:
                self.model = joblib.load(self.model_path)
                logger.info(f"Loaded priority model successfully from {self.model_path}")
            except Exception as e:
                logger.error(f"Error loading priority model: {e}")
        else:
            logger.warning(f"Priority model not found at {self.model_path}. Fallback heuristics will be used.")

    def calculate_priority_heuristic(self, data: dict) -> tuple[float, list[str]]:
        # Heuristic fallback if model is not loaded
        score = 15.0
        reasons = []
        
        num_people = data.get("num_people", 1)
        if num_people > 3:
            score += min(num_people * 2.5, 15.0)
            reasons.append(FRIENDLY_REASONS["num_people"])
            
        if data.get("has_children"):
            score += 10.0
            reasons.append(FRIENDLY_REASONS["has_children"])
        if data.get("has_elderly"):
            score += 10.0
            reasons.append(FRIENDLY_REASONS["has_elderly"])
        if data.get("has_pregnant"):
            score += 15.0
            reasons.append(FRIENDLY_REASONS["has_pregnant"])
        if data.get("has_disabled"):
            score += 12.0
            reasons.append(FRIENDLY_REASONS["has_disabled"])
        if data.get("medical_emergency"):
            score += 25.0
            reasons.append(FRIENDLY_REASONS["medical_emergency"])
            
        water_level = data.get("water_level_cm", 0)
        if water_level > 50:
            score += min(water_level * 0.1, 20.0)
            reasons.append(FRIENDLY_REASONS["water_level_cm"])
            
        if data.get("road_blocked"):
            score += 8.0
            reasons.append(FRIENDLY_REASONS["road_blocked"])
            
        dist = data.get("distance_to_nearest_shelter_km", 0.0)
        if dist > 5.0:
            score += min((dist - 5.0) * 0.5, 8.0)
            reasons.append(FRIENDLY_REASONS["distance_to_nearest_shelter_km"])
            
        vis_people = data.get("people_visible_in_image", 0)
        if vis_people > 1:
            score += min(vis_people * 2.0, 10.0)
            reasons.append(FRIENDLY_REASONS["people_visible_in_image"])
            
        severity = data.get("severity_estimate_encoded", 0)
        if severity >= 1:
            score += severity * 10.0
            reasons.append(FRIENDLY_REASONS["severity_estimate_encoded"])
            
        # Disaster Type
        dis_type = data.get("disaster_type_encoded", 5)
        if dis_type in (1, 2):  # fire, earthquake
            score += 12.0
            reasons.append(FRIENDLY_REASONS["disaster_type_encoded"])
            
        score = float(np.clip(score, 0, 100))
        if not reasons:
            reasons.append("Standard incident queue monitoring")
            
        return score, reasons[:4]

    def predict_priority(self, data: dict) -> dict:
        """
        Calculates priority score and extracts reasons.
        data schema:
        {
            "num_people": int,
            "has_children": bool/int,
            "has_elderly": bool/int,
            "has_pregnant": bool/int,
            "has_disabled": bool/int,
            "medical_emergency": bool/int,
            "water_level_cm": int/float,
            "disaster_type_encoded": int,  # 0: flood, 1: fire, etc.
            "road_blocked": bool/int,
            "distance_to_nearest_shelter_km": float,
            "people_visible_in_image": int,
            "severity_estimate_encoded": int # 0: low, 1: medium, 2: high
        }
        """
        # If model is not loaded, run heuristic
        if self.model is None:
            score, reasons = self.calculate_priority_heuristic(data)
            return {
                "priority_score": round(score),
                "priority_reasons": reasons,
                "is_model_inference": False
            }
            
        try:
            # Map input to dataframe
            row = {}
            for col in FEATURE_COLS:
                val = data.get(col, 0)
                # Convert bool to int
                if isinstance(val, bool):
                    val = int(val)
                row[col] = [val]
                
            df = pd.DataFrame(row)
            
            # Predict score
            score = float(self.model.predict(df)[0])
            score = float(np.clip(score, 0, 100))
            
            # Compute feature contributions for SHAP-like explanations
            # Using XGBoost's built-in pred_contribs through booster
            booster = self.model.get_booster()
            dmat = xgb.DMatrix(df)
            contribs = booster.predict(dmat, pred_contribs=True)[0]
            
            # contribs shape: (num_features + 1,)
            # The last element is the bias term
            feature_contribs = contribs[:-1]
            
            # Map contribution scores to feature names
            contrib_dict = {FEATURE_COLS[i]: feature_contribs[i] for i in range(len(FEATURE_COLS))}
            
            # Filter to positive contributors that actually occurred in this report
            # E.g., if a feature has positive contribution, it means it pushed the priority score UP
            reasons_contrib = []
            for col, val in contrib_dict.items():
                input_val = data.get(col, 0)
                # If feature is present/active and contribution is positive
                if val > 0.5:
                    if col in ["num_people", "water_level_cm", "people_visible_in_image", "distance_to_nearest_shelter_km"]:
                        # For continuous fields, verify they exceed a baseline
                        if col == "num_people" and input_val <= 1: continue
                        if col == "water_level_cm" and input_val <= 10: continue
                        if col == "people_visible_in_image" and input_val <= 0: continue
                        if col == "distance_to_nearest_shelter_km" and input_val <= 1.0: continue
                    reasons_contrib.append((col, val))
            
            # Sort by contribution descending
            reasons_contrib = sorted(reasons_contrib, key=lambda x: x[1], reverse=True)
            
            # Get friendly reason text
            priority_reasons = [FRIENDLY_REASONS[item[0]] for item in reasons_contrib[:4]]
            
            # If no strong features contribute, use the heuristic reasons as backup
            if not priority_reasons:
                _, priority_reasons = self.calculate_priority_heuristic(data)
                
            return {
                "priority_score": round(score),
                "priority_reasons": priority_reasons,
                "is_model_inference": True
            }
            
        except Exception as e:
            logger.error(f"Error running priority prediction model: {e}. Falling back to heuristic.")
            score, reasons = self.calculate_priority_heuristic(data)
            return {
                "priority_score": round(score),
                "priority_reasons": reasons,
                "is_model_inference": False
            }

# Singleton instance
priority_service = PriorityService()
