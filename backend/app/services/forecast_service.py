import os
import logging
import joblib
import pandas as pd
import numpy as np

logger = logging.getLogger("rescueai.forecast")

FEATURE_COLS = [
    "rainfall_mm", 
    "river_level_m", 
    "humidity_pct", 
    "elevation_m", 
    "past_flood_events_count", 
    "season_encoded"
]

class ForecastService:
    def __init__(self, model_path="ml/artifacts/forecast_models.joblib"):
        self.model_path = model_path
        self.models = None
        self.load_models()

    def load_models(self):
        if os.path.exists(self.model_path):
            try:
                self.models = joblib.load(self.model_path)
                logger.info(f"Loaded forecast models successfully from {self.model_path}")
            except Exception as e:
                logger.error(f"Error loading forecast models: {e}")
        else:
            logger.warning(f"Forecast models not found at {self.model_path}. Heuristics will be used.")

    def calculate_risk_heuristic(self, data: dict) -> dict[str, float]:
        # Heuristic fallback if models are not loaded
        rainfall = data.get("rainfall_mm", 0.0)
        river_level = data.get("river_level_m", 1.0)
        humidity = data.get("humidity_pct", 50.0)
        elevation = data.get("elevation_m", 400.0)
        past_events = data.get("past_flood_events_count", 0)
        season = data.get("season_encoded", 0)  # 0: dry, 1: monsoon, 2: other

        # Core logic: higher rainfall, river level, past events, and monsoon raise risk
        # higher elevation lowers risk
        z = (rainfall * 0.02) + (river_level * 0.6) - (elevation * 0.003) + (past_events * 0.3) + (1.5 if season == 1 else 0.0) - 4.5
        prob = 1.0 / (1.0 + np.exp(-z))
        
        # Scaling based on time horizon
        return {
            "risk_1h": float(np.clip(prob * 0.15, 0.0, 1.0)),
            "risk_3h": float(np.clip(prob * 0.40, 0.0, 1.0)),
            "risk_6h": float(np.clip(prob * 0.70, 0.0, 1.0)),
            "risk_24h": float(np.clip(prob * 0.95, 0.0, 1.0)),
        }

    def predict_region_risks(self, data: dict) -> dict:
        """
        Predicts risks for 1h, 3h, 6h, 24h horizons.
        data schema:
        {
            "rainfall_mm": float,
            "river_level_m": float,
            "humidity_pct": float,
            "elevation_m": float,
            "past_flood_events_count": int,
            "season_encoded": int
        }
        """
        if self.models is None:
            risks = self.calculate_risk_heuristic(data)
            risks["is_model_inference"] = False
            return risks
            
        try:
            row = {col: [data.get(col, 0.0)] for col in FEATURE_COLS}
            df = pd.DataFrame(row)
            
            risks = {}
            for horizon, model in self.models.items():
                # horizon is like "will_become_critical_within_1h"
                # predict_proba returns probability for [class 0, class 1]
                prob = float(model.predict_proba(df)[0][1])
                
                # Map column name to key name
                if "1h" in horizon:
                    risks["risk_1h"] = prob
                elif "3h" in horizon:
                    risks["risk_3h"] = prob
                elif "6h" in horizon:
                    risks["risk_6h"] = prob
                elif "24h" in horizon:
                    risks["risk_24h"] = prob
                    
            risks["is_model_inference"] = True
            return risks
            
        except Exception as e:
            logger.error(f"Error predicting risks: {e}. Falling back to heuristic.")
            risks = self.calculate_risk_heuristic(data)
            risks["is_model_inference"] = False
            return risks

# Singleton instance
forecast_service = ForecastService()
