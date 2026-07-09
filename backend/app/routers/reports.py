import os
import shutil
import datetime
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from typing import List, Optional
from bson import ObjectId

from app.db.mongo import get_db
from app.routers.incidents import clean_doc
from app.routers.ws import manager
from app.services.nlp_service import nlp_service
from app.services.cv_service import cv_service
from app.services.priority_service import priority_service
from app.services.dedup_service import dedup_service
from app.services.resource_service import resource_service

router = APIRouter()

# Local upload directory setup
UPLOAD_DIR = os.path.join("static", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

DISASTER_TYPE_MAP = {
    "flood": 0,
    "fire": 1,
    "earthquake": 2,
    "landslide": 3,
    "cyclone": 4,
    "other": 5
}

SEVERITY_MAP = {
    "low": 0,
    "medium": 1,
    "high": 2
}

@router.post("/reports")
async def create_report(
    citizen_name: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    disaster_type: str = Form("other"),
    raw_description: str = Form(...),
    num_people: int = Form(1),
    special_needs: Optional[str] = Form(None),  # Comma separated, e.g., "elderly,children"
    lat: float = Form(...),
    lng: float = Form(...),
    address: Optional[str] = Form(None),
    images: List[UploadFile] = File([]),
    db = Depends(get_db)
):
    try:
        # 1. Parse special needs list
        needs_list = []
        if special_needs:
            needs_list = [n.strip() for n in special_needs.split(",") if n.strip()]

        # 2. Save uploaded files
        image_urls = []
        cv_detections = []
        people_visible = 0
        cv_severities = []
        
        for file in images:
            if not file.filename:
                continue
            # Create a unique filename
            timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
            filename = f"{timestamp}_{file.filename}"
            file_path = os.path.join(UPLOAD_DIR, filename)
            
            # Save file
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
                
            image_url = f"/static/uploads/{filename}"
            image_urls.append(image_url)
            
            # Run CV on saved file
            cv_res = cv_service.analyze_incident_image(file_path)
            cv_detections.extend(cv_res.get("detections", []))
            people_visible += cv_res.get("people_visible", 0)
            cv_severities.append(cv_res.get("severity_estimate", "low"))
            
        # Select highest severity detected from images
        cv_severity = "low"
        if "high" in cv_severities:
            cv_severity = "high"
        elif "medium" in cv_severities:
            cv_severity = "medium"
            
        cv_analysis = {
            "detections": cv_detections,
            "people_visible": people_visible,
            "severity_estimate": cv_severity
        }

        # 3. NLP Analysis of Description
        nlp_res = nlp_service.analyze_report(raw_description)
        nlp_data = nlp_res["nlp_extraction"]
        
        # If user submitted 'other' or a type, check if NLP classifies it as something else with high confidence
        predicted_type = nlp_res["disaster_type"]
        final_disaster_type = disaster_type
        if disaster_type == "other" and predicted_type != "other" and nlp_data.get("confidence", 0.0) > 0.70:
            final_disaster_type = predicted_type

        # 4. Priority Prediction Inputs
        # Map values
        p_needs = nlp_data.get("people_breakdown", {})
        has_children = p_needs.get("children", 0) or int("children" in needs_list)
        has_elderly = p_needs.get("elderly", 0) or int("elderly" in needs_list)
        has_pregnant = p_needs.get("pregnant", 0) or int("pregnant" in needs_list)
        has_disabled = p_needs.get("disabled", 0) or int("disabled" in needs_list)
        
        # Calculate a mock distance to nearest shelter (between 0.5km and 6.0km)
        # Using a deterministic hash based on coordinates to make it consistent for the same location
        shelter_dist = float(abs(hash(f"{lat},{lng}")) % 55) / 10.0 + 0.5
        
        priority_inputs = {
            "num_people": num_people,
            "has_children": has_children,
            "has_elderly": has_elderly,
            "has_pregnant": has_pregnant,
            "has_disabled": has_disabled,
            "medical_emergency": nlp_data.get("medical_emergency", False),
            "water_level_cm": nlp_data.get("water_level_cm", 0),
            "disaster_type_encoded": DISASTER_TYPE_MAP.get(final_disaster_type, 5),
            "road_blocked": nlp_data.get("road_blocked", False),
            "distance_to_nearest_shelter_km": shelter_dist,
            "people_visible_in_image": people_visible,
            "severity_estimate_encoded": SEVERITY_MAP.get(cv_severity, 0)
        }
        
        # Predict priority
        priority_res = priority_service.predict_priority(priority_inputs)
        priority_score = priority_res["priority_score"]
        priority_reasons = priority_res["priority_reasons"]

        # 5. Resource Recommendations
        recommended = resource_service.recommend_resources(nlp_data, final_disaster_type, priority_score)

        # 6. Duplicate Incident Detection
        # Fetch reports from the last 24 hours
        time_limit = datetime.datetime.utcnow() - datetime.timedelta(hours=24)
        cursor = db["reports"].find({"created_at": {"$gte": time_limit}})
        recent_reports = await cursor.to_list(length=100)
        
        # Convert IDs back to dict and ObjectIds
        duplicate_of = None
        duplicate_cluster_id = None
        
        duplicate = dedup_service.find_duplicate(raw_description, lat, lng, recent_reports)
        if duplicate:
            duplicate_of = duplicate["_id"]
            duplicate_cluster_id = duplicate.get("duplicate_cluster_id") or duplicate["_id"]
            # A duplicate inherits or joins a cluster
            
        # 7. Save to Database
        now = datetime.datetime.utcnow()
        report_doc = {
            "citizen_name": citizen_name,
            "phone": phone,
            "location": {
                "lat": lat,
                "lng": lng,
                "address": address
            },
            "disaster_type": final_disaster_type,
            "raw_description": raw_description,
            "num_people": num_people,
            "special_needs": needs_list,
            "images": image_urls,
            "nlp_extraction": nlp_data,
            "cv_analysis": cv_analysis,
            "priority_score": priority_score,
            "priority_reasons": priority_reasons,
            "recommended_resources": recommended,
            "duplicate_of": duplicate_of,
            "duplicate_cluster_id": duplicate_cluster_id,
            "status": "pending",
            "assigned_team_id": None,
            "created_at": now,
            "updated_at": now
        }
        
        result = await db["reports"].insert_one(report_doc)
        report_doc["_id"] = result.inserted_id
        
        cleaned = clean_doc(report_doc)
        
        # 8. Broadcast to WebSocket clients
        await manager.broadcast({
            "event": "new_report",
            "data": cleaned
        })
        
        return cleaned
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to process emergency report: {str(e)}")
