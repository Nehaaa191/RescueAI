from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class Location(BaseModel):
    lat: float
    lng: float
    address: Optional[str] = None

class NLPBreakdown(BaseModel):
    urgency_keywords: List[str] = []
    people_breakdown: Dict[str, int] = {}
    medical_emergency: bool = False
    resources_required: List[str] = []
    confidence: float = 1.0

class CVBreakdown(BaseModel):
    detections: List[Dict[str, Any]] = []
    people_visible: int = 0
    severity_estimate: str = "low"

class ReportSubmit(BaseModel):
    citizen_name: Optional[str] = None
    phone: Optional[Optional[str]] = None
    disaster_type: str = "other"  # flood, fire, etc.
    raw_description: str
    num_people: int = 1
    special_needs: List[str] = []
    lat: float
    lng: float
    address: Optional[str] = None

class ReportResponse(BaseModel):
    id: str = Field(..., alias="_id")
    citizen_name: Optional[str] = None
    phone: Optional[str] = None
    location: Location
    disaster_type: str
    raw_description: str
    num_people: int
    special_needs: List[str] = []
    images: List[str] = []
    nlp_extraction: Optional[NLPBreakdown] = None
    cv_analysis: Optional[CVBreakdown] = None
    priority_score: int = 0
    priority_reasons: List[str] = []
    recommended_resources: List[str] = []
    duplicate_of: Optional[str] = None
    duplicate_cluster_id: Optional[str] = None
    status: str = "pending"  # pending, acknowledged, assigned, resolved
    assigned_team_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class TeamResponse(BaseModel):
    id: str = Field(..., alias="_id")
    name: str
    type: str  # boat, ambulance, medical, search_rescue, fire
    status: str  # available, dispatched, busy
    current_location: Location

    class Config:
        populate_by_name = True

class RegionResponse(BaseModel):
    id: str = Field(..., alias="_id")
    name: str
    geojson_boundary: Dict[str, Any]
    rainfall_mm: float
    river_level_m: float
    humidity_pct: float
    elevation_m: float
    past_flood_events_count: int
    risk_1h: float
    risk_3h: float
    risk_6h: float
    risk_24h: float
    updated_at: datetime

    class Config:
        populate_by_name = True
