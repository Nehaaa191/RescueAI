import re
import logging
from typing import Dict, List, Tuple, Any

logger = logging.getLogger("rescueai.nlp")

# Regex matchers for entity extraction
ENTITY_PATTERNS = {
    "children": r"\b(child|children|kids?|bab(y|ies)|infants?|toddlers?|son|daughter)\b",
    "elderly": r"\b(elderly|grand(mother|father|parent|pa|ma)|old\s+(man|woman|people|person)|seniors?)\b",
    "pregnant": r"\b(pregnant|pregnancy|expecting)\b",
    "disabled": r"\b(disabled|wheelchair|handicapped|blind|deaf|paralyzed|special\s+needs)\b",
    "medical": r"\b(injur(ed|y|ies)|bleeding|unconscious|medical|fractures?|blood|doctors?|ambulances?|chest\s+pain|breathing\s+issue|wound|hurt)\b",
    "trapped": r"\b(trapped|stuck|stranded|marooned|cannot\s+(exit|leave|escape|get\s+out)|confined)\b",
    "road_blocked": r"\b(road\s+(blocked|closed|washed\s+away)|blocked\s+road|landslide|debris|tree\s+fell|cannot\s+access)\b"
}

RESOURCE_PATTERNS = {
    "boat": r"\b(boats?|raft|rescue\s+boat|maritime)\b",
    "ambulance": r"\b(ambulance|paramedic|medic|hospital|doctor|first\s+aid)\b",
    "medical_team": r"\b(medical\s+team|doctors?|nurse|paramedic|first\s+aid)\b",
    "fire_truck": r"\b(fire\s+(truck|brigade|engine)|extinguisher|firemen|firefighters?)\b",
    "search_rescue": r"\b(search\s+and\s+rescue|helicopter|chopper|airlift|evacuate|dig\s+out|debris\s+removal)\b"
}

DISASTER_KEYWORDS = {
    "flood": r"\b(flood(ed|ing)?|water|drown(ing)?|submerged|river|rain(ing|fall)?|waterlogged|wash(ed)?\s+away)\b",
    "fire": r"\b(fire|smoke|burn(ing)?|flame|blaze|spark|explosion|short\s+circuit)\b",
    "earthquake": r"\b(earthquake|quake|tremor|shake|ground\s+shaking|collapsed?|rubble|debris)\b",
    "landslide": r"\b(landslide|mudslide|rockslide|debris\s+slide|land\s+slip|rocks\s+falling)\b",
    "cyclone": r"\b(cyclone|hurricane|typhoon|gale|tornado|wind|storm|tempest)\b"
}

class NLPService:
    def __init__(self):
        self.classifier = None
        self.model_loaded = False
        self.model_name = "valhalla/distilbart-mnli-12-1"

    def initialize_model(self):
        try:
            # Import here to avoid loading torch if it isn't needed immediately
            from transformers import pipeline
            logger.info(f"Loading zero-shot NLP classifier: {self.model_name}...")
            # Use CPU for pipeline by default to prevent cuda requirements
            self.classifier = pipeline("zero-shot-classification", model=self.model_name, device=-1)
            self.model_loaded = True
            logger.info("Zero-shot NLP classifier loaded successfully.")
        except Exception as e:
            logger.warning(f"Could not load HuggingFace NLP pipeline: {e}. Using rule-based fallback.")
            self.classifier = None
            self.model_loaded = False

    def rule_based_classification(self, text: str) -> Dict[str, Any]:
        """Highly accurate fallback classifier based on keyword frequencies."""
        text_lower = text.lower()
        
        # 1. Classify disaster type
        scores = {}
        for category, pattern in DISASTER_KEYWORDS.items():
            matches = len(re.findall(pattern, text_lower))
            scores[category] = matches
            
        max_matches = max(scores.values())
        if max_matches > 0:
            # Get the category with the max matches
            disaster_type = [k for k, v in scores.items() if v == max_matches][0]
            confidence = 0.85
        else:
            disaster_type = "other"
            confidence = 0.50
            
        # 2. Classify medical emergency
        has_medical = bool(re.search(ENTITY_PATTERNS["medical"], text_lower))
        medical_emergency = has_medical
        
        return {
            "disaster_type": disaster_type,
            "medical_emergency": medical_emergency,
            "confidence": confidence
        }

    def analyze_report(self, text: str) -> Dict[str, Any]:
        if not self.model_loaded and self.classifier is None:
            self.initialize_model()
            
        text_lower = text.lower()
        
        # 1. Classify using Model or Fallback
        disaster_type = "other"
        medical_emergency = False
        classifier_confidence = 0.5
        
        if self.model_loaded and self.classifier:
            try:
                # Classify disaster type
                disaster_labels = ["flood", "fire", "earthquake", "landslide", "cyclone", "other"]
                res_disaster = self.classifier(text, candidate_labels=disaster_labels)
                disaster_type = res_disaster["labels"][0]
                disaster_conf = res_disaster["scores"][0]
                
                # Classify medical emergency
                res_medical = self.classifier(text, candidate_labels=["medical emergency", "no medical emergency"])
                medical_emergency = res_medical["labels"][0] == "medical emergency"
                medical_conf = res_medical["scores"][0]
                
                classifier_confidence = (disaster_conf + medical_conf) / 2.0
            except Exception as e:
                logger.error(f"Error in NLP model prediction: {e}. Falling back to rules.")
                fallback = self.rule_based_classification(text)
                disaster_type = fallback["disaster_type"]
                medical_emergency = fallback["medical_emergency"]
                classifier_confidence = fallback["confidence"]
        else:
            fallback = self.rule_based_classification(text)
            disaster_type = fallback["disaster_type"]
            medical_emergency = fallback["medical_emergency"]
            classifier_confidence = fallback["confidence"]

        # 2. Keyword Phrase Extraction for Entities
        people_breakdown = {
            "children": 0,
            "elderly": 0,
            "pregnant": 0,
            "disabled": 0
        }
        
        # Simple extraction: if match, mark 1 (as binary flag for presence in description)
        # Note: in synthetic priority dataset, these are binary flags [0, 1]
        for key in people_breakdown.keys():
            if re.search(ENTITY_PATTERNS[key], text_lower):
                people_breakdown[key] = 1

        # Double-check medical emergency via regex if not set
        if not medical_emergency and re.search(ENTITY_PATTERNS["medical"], text_lower):
            medical_emergency = True
            
        # Extract urgency keywords found
        urgency_keywords = []
        for key, pattern in ENTITY_PATTERNS.items():
            matches = re.findall(pattern, text_lower)
            if matches:
                # Add the matched text to list
                urgency_keywords.extend(list(set(matches))[:2])
                
        # 3. Detect water level mentions (e.g. "chest deep", "neck deep", "2 meters", "100 cm")
        water_level_cm = 0
        if disaster_type == "flood" or "water" in text_lower:
            # Check descriptive phrases first
            if "chest" in text_lower:
                water_level_cm = 120
            elif "neck" in text_lower or "head" in text_lower:
                water_level_cm = 150
            elif "waist" in text_lower or "hip" in text_lower:
                water_level_cm = 90
            elif "knee" in text_lower:
                water_level_cm = 50
            elif "ankle" in text_lower:
                water_level_cm = 15
            else:
                # Look for numbers near "meter" or "cm" or "feet"
                meter_match = re.search(r"(\d+(\.\d+)?)\s*(meter|mtr|m)\b", text_lower)
                feet_match = re.search(r"(\d+(\.\d+)?)\s*(feet|ft|foot)\b", text_lower)
                cm_match = re.search(r"(\d+)\s*(cm|centimeter)\b", text_lower)
                
                if meter_match:
                    water_level_cm = int(float(meter_match.group(1)) * 100)
                elif feet_match:
                    water_level_cm = int(float(feet_match.group(1)) * 30.48)
                elif cm_match:
                    water_level_cm = int(cm_match.group(1))
                else:
                    # Default flood water level if mentioned but not specified
                    water_level_cm = 30

        # 4. Extract required resources
        resources_required = []
        for resource, pattern in RESOURCE_PATTERNS.items():
            if re.search(pattern, text_lower):
                resources_required.append(resource)
                
        # If flood and no resource extracted, add boat
        if disaster_type == "flood" and "boat" not in resources_required and water_level_cm > 80:
            resources_required.append("boat")
            
        # If fire and no resource extracted, add fire_truck
        if disaster_type == "fire" and "fire_truck" not in resources_required:
            resources_required.append("fire_truck")
            
        # If medical emergency, add ambulance/medical_team
        if medical_emergency and "ambulance" not in resources_required:
            resources_required.append("ambulance")
            
        # Check road blockages
        road_blocked = bool(re.search(ENTITY_PATTERNS["road_blocked"], text_lower))

        # Overall NLP output
        return {
            "disaster_type": disaster_type,
            "nlp_extraction": {
                "urgency_keywords": list(set(urgency_keywords)),
                "people_breakdown": people_breakdown,
                "medical_emergency": medical_emergency,
                "resources_required": resources_required,
                "confidence": round(float(classifier_confidence), 2),
                "water_level_cm": water_level_cm,
                "road_blocked": road_blocked
            }
        }

# Singleton instance
nlp_service = NLPService()
