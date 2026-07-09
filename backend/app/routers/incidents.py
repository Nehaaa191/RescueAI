from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import List, Optional
from bson import ObjectId
from datetime import datetime

from app.db.mongo import get_db
from app.models.schemas import ReportResponse
from app.routers.ws import manager

router = APIRouter()

def clean_doc(doc: dict) -> dict:
    if not doc:
        return doc
    doc = dict(doc)
    if "_id" in doc:
        doc["_id"] = str(doc["_id"])
    if "duplicate_of" in doc and doc["duplicate_of"]:
        doc["duplicate_of"] = str(doc["duplicate_of"])
    if "duplicate_cluster_id" in doc and doc["duplicate_cluster_id"]:
        doc["duplicate_cluster_id"] = str(doc["duplicate_cluster_id"])
    if "assigned_team_id" in doc and doc["assigned_team_id"]:
        doc["assigned_team_id"] = str(doc["assigned_team_id"])
        
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
            
    return doc

@router.get("/reports", response_model=List[ReportResponse])
async def list_reports(
    status_filter: Optional[str] = Query(None, alias="status"),
    disaster_type: Optional[str] = Query(None),
    min_priority: Optional[int] = Query(None),
    db = Depends(get_db)
):
    query = {}
    if status_filter:
        query["status"] = status_filter
    if disaster_type:
        query["disaster_type"] = disaster_type
    if min_priority is not None:
        query["priority_score"] = {"$gte": min_priority}
        
    cursor = db["reports"].find(query).sort([("priority_score", -1), ("created_at", -1)])
    reports = await cursor.to_list(length=100)
    
    return [clean_doc(r) for r in reports]

@router.get("/reports/{report_id}", response_model=ReportResponse)
async def get_report(report_id: str, db = Depends(get_db)):
    try:
        oid = ObjectId(report_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid report ID format")
        
    report = await db["reports"].find_one({"_id": oid})
    if not report:
        raise HTTPException(status_code=404, detail="Incident report not found")
        
    return clean_doc(report)

@router.patch("/reports/{report_id}/assign", response_model=ReportResponse)
async def assign_team(report_id: str, payload: dict, db = Depends(get_db)):
    try:
        report_oid = ObjectId(report_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid report ID format")
        
    team_id_str = payload.get("assigned_team_id")
    if not team_id_str:
        raise HTTPException(status_code=400, detail="assigned_team_id is required")
        
    try:
        team_oid = ObjectId(team_id_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid team ID format")
        
    # Check if report exists
    report = await db["reports"].find_one({"_id": report_oid})
    if not report:
        raise HTTPException(status_code=404, detail="Incident report not found")
        
    # Check if team exists
    team = await db["teams"].find_one({"_id": team_oid})
    if not team:
        raise HTTPException(status_code=404, detail="Rescue team not found")
        
    # Update report
    now = datetime.utcnow()
    await db["reports"].update_one(
        {"_id": report_oid},
        {"$set": {
            "status": "assigned",
            "assigned_team_id": team_oid,
            "updated_at": now
        }}
    )
    
    # Update team status
    await db["teams"].update_one(
        {"_id": team_oid},
        {"$set": {"status": "dispatched"}}
    )
    
    # Get updated report
    updated_report = await db["reports"].find_one({"_id": report_oid})
    cleaned = clean_doc(updated_report)
    
    # Broadcast status change
    await manager.broadcast({
        "event": "status_update",
        "data": cleaned
    })
    
    return cleaned

@router.patch("/reports/{report_id}/resolve", response_model=ReportResponse)
async def resolve_report(report_id: str, db = Depends(get_db)):
    try:
        report_oid = ObjectId(report_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid report ID format")
        
    report = await db["reports"].find_one({"_id": report_oid})
    if not report:
        raise HTTPException(status_code=404, detail="Incident report not found")
        
    assigned_team_oid = report.get("assigned_team_id")
    
    # Update report status to resolved
    now = datetime.utcnow()
    await db["reports"].update_one(
        {"_id": report_oid},
        {"$set": {
            "status": "resolved",
            "updated_at": now
        }}
    )
    
    # If a team was assigned, free them up
    if assigned_team_oid:
        await db["teams"].update_one(
            {"_id": assigned_team_oid},
            {"$set": {"status": "available"}}
        )
        
    # Get updated report
    updated_report = await db["reports"].find_one({"_id": report_oid})
    cleaned = clean_doc(updated_report)
    
    # Broadcast resolution change
    await manager.broadcast({
        "event": "status_update",
        "data": cleaned
    })
    
    return cleaned
