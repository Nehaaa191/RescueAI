import os
import joblib
import pandas as pd
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score

def train_forecast():
    # Load dataset
    data_path = "ml/data/synthetic_forecast_dataset.csv"
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Dataset not found at {data_path}. Please run generate_synthetic_data.py first.")
        
    df = pd.read_csv(data_path)
    
    # Feature columns
    feature_cols = [
        "rainfall_mm", 
        "river_level_m", 
        "humidity_pct", 
        "elevation_m", 
        "past_flood_events_count", 
        "season_encoded"
    ]
    
    target_cols = [
        "will_become_critical_within_1h",
        "will_become_critical_within_3h",
        "will_become_critical_within_6h",
        "will_become_critical_within_24h"
    ]
    
    X = df[feature_cols]
    
    models = {}
    
    print("Training XGBoost Classifiers for forecast horizons...")
    for target in target_cols:
        y = df[target]
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        model = XGBClassifier(
            n_estimators=80,
            max_depth=4,
            learning_rate=0.1,
            random_state=42,
            eval_metric="logloss"
        )
        model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = model.predict(X_test)
        y_pred_proba = model.predict_proba(X_test)[:, 1]
        
        acc = accuracy_score(y_test, y_pred)
        auc = roc_auc_score(y_test, y_pred_proba)
        
        print(f"[{target}] Model Trained. Accuracy: {acc:.4f}, ROC AUC: {auc:.4f}")
        models[target] = model
        
    # Save artifacts
    artifacts_dir = "ml/artifacts"
    os.makedirs(artifacts_dir, exist_ok=True)
    model_path = os.path.join(artifacts_dir, "forecast_models.joblib")
    
    joblib.dump(models, model_path)
    print(f"Saved forecast models dict to {model_path}")

if __name__ == "__main__":
    train_forecast()
