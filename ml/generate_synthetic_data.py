import os
import numpy as np
import pandas as pd

def generate_priority_dataset(num_samples=4000, output_path="ml/data/synthetic_priority_dataset.csv"):
    np.random.seed(42)
    
    # Generate features
    num_people = np.random.randint(1, 10, size=num_samples)
    has_children = np.random.choice([0, 1], size=num_samples, p=[0.7, 0.3])
    has_elderly = np.random.choice([0, 1], size=num_samples, p=[0.75, 0.25])
    has_pregnant = np.random.choice([0, 1], size=num_samples, p=[0.92, 0.08])
    has_disabled = np.random.choice([0, 1], size=num_samples, p=[0.9, 0.10])
    medical_emergency = np.random.choice([0, 1], size=num_samples, p=[0.85, 0.15])
    water_level_cm = np.random.randint(0, 250, size=num_samples)
    
    # disaster_type_encoded: 0: flood, 1: fire, 2: earthquake, 3: landslide, 4: cyclone, 5: other
    disaster_type_encoded = np.random.randint(0, 6, size=num_samples)
    
    road_blocked = np.random.choice([0, 1], size=num_samples, p=[0.6, 0.4])
    distance_to_nearest_shelter_km = np.random.uniform(0.1, 15.0, size=num_samples)
    people_visible_in_image = np.random.randint(0, 6, size=num_samples)
    
    # severity_estimate_encoded: 0: low, 1: medium, 2: high
    severity_estimate_encoded = np.random.choice([0, 1, 2], size=num_samples, p=[0.5, 0.3, 0.2])
    
    # Custom formula to generate target priority_score
    # Base score
    priority_score = 15.0
    
    # Features effects
    priority_score += np.minimum(num_people * 2.5, 15.0)
    priority_score += has_children * 10.0
    priority_score += has_elderly * 10.0
    priority_score += has_pregnant * 15.0
    priority_score += has_disabled * 12.0
    priority_score += medical_emergency * 25.0
    priority_score += np.minimum(water_level_cm * 0.1, 20.0)
    
    # Disaster type weights (earthquake & fire are high priority)
    # 0: flood, 1: fire, 2: earthquake, 3: landslide, 4: cyclone, 5: other
    type_weights = {0: 5.0, 1: 12.0, 2: 15.0, 3: 8.0, 4: 10.0, 5: 2.0}
    type_contrib = np.array([type_weights[t] for t in disaster_type_encoded])
    priority_score += type_contrib
    
    priority_score += road_blocked * 8.0
    priority_score += np.maximum(5.0 - distance_to_nearest_shelter_km * 0.5, 0.0)
    priority_score += np.minimum(people_visible_in_image * 2.0, 10.0)
    priority_score += severity_estimate_encoded * 10.0
    
    # Add noise
    noise = np.random.normal(0, 3.0, size=num_samples)
    priority_score += noise
    
    # Clip between 0 and 100
    priority_score = np.clip(priority_score, 0, 100)
    
    # Create DataFrame
    df = pd.DataFrame({
        "num_people": num_people,
        "has_children": has_children,
        "has_elderly": has_elderly,
        "has_pregnant": has_pregnant,
        "has_disabled": has_disabled,
        "medical_emergency": medical_emergency,
        "water_level_cm": water_level_cm,
        "disaster_type_encoded": disaster_type_encoded,
        "road_blocked": road_blocked,
        "distance_to_nearest_shelter_km": distance_to_nearest_shelter_km,
        "people_visible_in_image": people_visible_in_image,
        "severity_estimate_encoded": severity_estimate_encoded,
        "priority_score": priority_score
    })
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"Generated priority dataset with {num_samples} samples at {output_path}")

def generate_forecast_dataset(num_samples=3000, output_path="ml/data/synthetic_forecast_dataset.csv"):
    np.random.seed(101)
    
    # Generate features
    rainfall_mm = np.random.uniform(0.0, 350.0, size=num_samples)
    river_level_m = np.random.uniform(0.5, 12.0, size=num_samples)
    humidity_pct = np.random.uniform(40.0, 100.0, size=num_samples)
    elevation_m = np.random.uniform(2.0, 1500.0, size=num_samples)
    past_flood_events_count = np.random.randint(0, 10, size=num_samples)
    
    # 0: dry, 1: monsoon, 2: winter/other
    season_encoded = np.random.choice([0, 1, 2], size=num_samples, p=[0.4, 0.4, 0.2])
    
    # Calculate probability score P
    # base logits
    z = (rainfall_mm * 0.02) + (river_level_m * 0.6) - (elevation_m * 0.003) + (past_flood_events_count * 0.3) + (season_encoded == 1) * 1.5 - 4.5
    prob = 1.0 / (1.0 + np.exp(-z))
    
    # We want 4 binary targets: will_become_critical_within_1h, 3h, 6h, 24h
    # As time horizon gets larger, the risk probability increases.
    prob_1h = prob * 0.15
    prob_3h = prob * 0.40
    prob_6h = prob * 0.70
    prob_24h = prob * 0.95
    
    # Sample binary outcomes
    target_1h = np.random.binomial(1, np.clip(prob_1h, 0, 1))
    target_3h = np.random.binomial(1, np.clip(prob_3h, 0, 1))
    target_6h = np.random.binomial(1, np.clip(prob_6h, 0, 1))
    target_24h = np.random.binomial(1, np.clip(prob_24h, 0, 1))
    
    # Ensure logical consistency: if 1h is critical, then 3h, 6h, 24h must be critical
    target_3h = np.maximum(target_3h, target_1h)
    target_6h = np.maximum(target_6h, target_3h)
    target_24h = np.maximum(target_24h, target_6h)
    
    # Create DataFrame
    df = pd.DataFrame({
        "rainfall_mm": rainfall_mm,
        "river_level_m": river_level_m,
        "humidity_pct": humidity_pct,
        "elevation_m": elevation_m,
        "past_flood_events_count": past_flood_events_count,
        "season_encoded": season_encoded,
        "will_become_critical_within_1h": target_1h,
        "will_become_critical_within_3h": target_3h,
        "will_become_critical_within_6h": target_6h,
        "will_become_critical_within_24h": target_24h
    })
    
    df.to_csv(output_path, index=False)
    print(f"Generated forecast dataset with {num_samples} samples at {output_path}")

if __name__ == "__main__":
    generate_priority_dataset()
    generate_forecast_dataset()
