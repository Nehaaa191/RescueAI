from fastapi import APIRouter, Depends
from typing import Dict, Any

from app.db.mongo import get_db

router = APIRouter()

@router.get("/analytics/summary")
async def get_analytics_summary(db = Depends(get_db)):
    # 1. Total counts
    total_count = await db["reports"].count_documents({})
    
    # 2. Status counts
    pending_count = await db["reports"].count_documents({"status": "pending"})
    assigned_count = await db["reports"].count_documents({"status": "assigned"})
    resolved_count = await db["reports"].count_documents({"status": "resolved"})
    acknowledged_count = await db["reports"].count_documents({"status": "acknowledged"})
    
    # 3. Critical counts (priority >= 80, not resolved)
    critical_count = await db["reports"].count_documents({
        "priority_score": {"$gte": 80},
        "status": {"$ne": "resolved"}
    })
    
    # 4. Disaster type distribution
    disaster_types = ["flood", "fire", "earthquake", "landslide", "cyclone", "other"]
    distribution = {}
    for d_type in disaster_types:
        distribution[d_type] = await db["reports"].count_documents({"disaster_type": d_type})
        
    # 5. Team utilization
    total_teams = await db["teams"].count_documents({})
    busy_teams = await db["teams"].count_documents({"status": {"$in": ["dispatched", "busy"]}})
    
    return {
        "summary": {
            "total_reports": total_count,
            "pending_reports": pending_count + acknowledged_count,
            "active_assigned_reports": assigned_count,
            "resolved_reports": resolved_count,
            "critical_reports": critical_count
        },
        "disaster_type_distribution": distribution,
        "resource_utilization": {
            "total_teams": total_teams,
            "active_dispatched_teams": busy_teams,
            "utilization_pct": round(busy_teams / total_teams * 100, 1) if total_teams > 0 else 0
        }
    }
