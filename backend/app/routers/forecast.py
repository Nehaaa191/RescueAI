from fastapi import APIRouter, HTTPException, Depends
from typing import List
from bson import ObjectId
from datetime import datetime

from app.db.mongo import get_db
from app.models.schemas import RegionResponse
from app.services.forecast_service import forecast_service
from app.routers.incidents import clean_doc

router = APIRouter()

@router.get("/forecast/regions", response_model=List[RegionResponse])
async def list_regions(db = Depends(get_db)):
    cursor = db["regions"].find({})
    regions = await cursor.to_list(length=100)
    return [clean_doc(r) for r in regions]

@router.post("/forecast/regions/{region_id}/recompute", response_model=RegionResponse)
async def recompute_region_forecast(region_id: str, payload: dict, db = Depends(get_db)):
    """
    Triggers recomputation of risks for a region based on updated parameters (rainfall, river level, etc.).
    Payload schema:
    {
        "rainfall_mm": float,
        "river_level_m": float,
        "humidity_pct": float
    }
    """
    try:
        oid = ObjectId(region_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid region ID format")
        
    region = await db["regions"].find_one({"_id": oid})
    if not region:
        raise HTTPException(status_code=404, detail="Region not found")
        
    # Get updated parameters or default to current values in DB
    rainfall = float(payload.get("rainfall_mm", region.get("rainfall_mm", 0.0)))
    river_level = float(payload.get("river_level_m", region.get("river_level_m", 1.0)))
    humidity = float(payload.get("humidity_pct", region.get("humidity_pct", 50.0)))
    
    # Prepare model inputs
    inputs = {
        "rainfall_mm": rainfall,
        "river_level_m": river_level,
        "humidity_pct": humidity,
        "elevation_m": region.get("elevation_m", 400.0),
        "past_flood_events_count": region.get("past_flood_events_count", 0),
        "season_encoded": 1  # Assume monsoon context for active recomputation
    }
    
    # Predict risks
    risks = forecast_service.predict_region_risks(inputs)
    
    # Update DB
    now = datetime.utcnow()
    await db["regions"].update_one(
        {"_id": oid},
        {"$set": {
            "rainfall_mm": rainfall,
            "river_level_m": river_level,
            "humidity_pct": humidity,
            "risk_1h": risks["risk_1h"],
            "risk_3h": risks["risk_3h"],
            "risk_6h": risks["risk_6h"],
            "risk_24h": risks["risk_24h"],
            "updated_at": now
        }}
    )
    
    # Get updated region
    updated_region = await db["regions"].find_one({"_id": oid})
    return clean_doc(updated_region)
