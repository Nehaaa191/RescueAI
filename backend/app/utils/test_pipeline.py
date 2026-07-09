import sys
import os

# Add root folder to path so we can import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.services.nlp_service import nlp_service
from app.services.priority_service import priority_service
from app.services.forecast_service import forecast_service
from app.services.cv_service import cv_service

def run_tests():
    print("=== Running RescueAI ML Pipeline Verification ===")
    
    # 1. Test NLP Service
    print("\n--- Testing NLP Service ---")
    desc = "We are trapped on the roof. Severe flood water levels are rising. There are three children and my elderly mother with us. Need a rescue boat!"
    nlp_res = nlp_service.analyze_report(desc)
    
    print(f"Description: '{desc}'")
    print(f"Predicted Disaster Type: {nlp_res['disaster_type']}")
    nlp_data = nlp_res["nlp_extraction"]
    print(f"NLP Extraction Details:")
    print(f"  Confidence: {nlp_data['confidence']}")
    print(f"  People Breakdown: {nlp_data['people_breakdown']}")
    print(f"  Urgency Keywords: {nlp_data['urgency_keywords']}")
    print(f"  Water Level: {nlp_data['water_level_cm']} cm")
    print(f"  Resources Required: {nlp_data['resources_required']}")
    print(f"  Road Blocked: {nlp_data['road_blocked']}")
    
    assert nlp_res["disaster_type"] == "flood", "Should detect flood"
    assert nlp_data["people_breakdown"]["children"] == 1, "Should detect children"
    assert nlp_data["people_breakdown"]["elderly"] == 1, "Should detect elderly"
    
    # 2. Test CV Fallback (PIL-based)
    print("\n--- Testing CV Service Heuristics ---")
    # We pass a non-existent path, which should trigger the fallback's safe default
    cv_res = cv_service.analyze_incident_image("nonexistent_image.jpg")
    print(f"CV Heuristic Result: {cv_res}")
    assert "severity_estimate" in cv_res, "Should output a severity estimate"
    
    # 3. Test Priority Prediction Service
    print("\n--- Testing Priority Prediction ---")
    priority_inputs = {
        "num_people": 4,
        "has_children": 1,
        "has_elderly": 1,
        "has_pregnant": 0,
        "has_disabled": 0,
        "medical_emergency": 0,
        "water_level_cm": 120,
        "disaster_type_encoded": 0,  # flood
        "road_blocked": 0,
        "distance_to_nearest_shelter_km": 3.5,
        "people_visible_in_image": 0,
        "severity_estimate_encoded": 1  # medium
    }
    
    priority_res = priority_service.predict_priority(priority_inputs)
    print(f"Inputs: {priority_inputs}")
    print(f"Predicted Priority Score: {priority_res['priority_score']}")
    print(f"Reasons: {priority_res['priority_reasons']}")
    print(f"Is Model Inference: {priority_res['is_model_inference']}")
    
    assert priority_res["priority_score"] > 60, "Priority score should be High/Critical"
    
    # 4. Test Forecasting Service
    print("\n--- Testing Forecasting Service ---")
    forecast_inputs = {
        "rainfall_mm": 180.0,
        "river_level_m": 5.2,
        "humidity_pct": 90.0,
        "elevation_m": 410.0,
        "past_flood_events_count": 3,
        "season_encoded": 1  # monsoon
    }
    
    forecast_res = forecast_service.predict_region_risks(forecast_inputs)
    print(f"Inputs: {forecast_inputs}")
    print(f"Predicted Risks: {forecast_res}")
    
    assert "risk_1h" in forecast_res, "Should predict 1h risk"
    assert "risk_24h" in forecast_res, "Should predict 24h risk"
    
    print("\n=== ALL PIPELINE VERIFICATIONS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_tests()
