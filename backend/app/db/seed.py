import asyncio
import datetime
from bson import ObjectId

async def seed_data(db):
    print("Seeding database collections...")
    
    # 1. Seed Teams
    teams_col = db["teams"]
    await teams_col.delete_one({})  # Wipe existing in mock, or clear
    # Let's clean up
    # In real Mongo, it's safer to drop or delete_many
    try:
        await teams_col.delete_many({})
    except Exception:
        pass
        
    teams = [
        {
            "_id": ObjectId("665f00000000000000000001"),
            "name": "Jaipur Rescue Team Alpha (Boat)",
            "type": "boat",
            "status": "available",
            "current_location": {"lat": 26.9124, "lng": 75.7873}
        },
        {
            "_id": ObjectId("665f00000000000000000002"),
            "name": "Apex Medical Responder (Ambulance)",
            "type": "ambulance",
            "status": "available",
            "current_location": {"lat": 26.8532, "lng": 75.8012}
        },
        {
            "_id": ObjectId("665f00000000000000000003"),
            "name": "SDRE Rapid Action (Search & Rescue)",
            "type": "search_rescue",
            "status": "dispatched",
            "current_location": {"lat": 26.8962, "lng": 75.7354}
        },
        {
            "_id": ObjectId("665f00000000000000000004"),
            "name": "Malviya Nagar Fire Dispatch",
            "type": "fire",
            "status": "available",
            "current_location": {"lat": 26.8624, "lng": 75.8203}
        },
        {
            "_id": ObjectId("665f00000000000000000005"),
            "name": "Fortis Emergency Unit (Medical)",
            "type": "medical",
            "status": "busy",
            "current_location": {"lat": 26.8415, "lng": 75.8015}
        }
    ]
    for team in teams:
        await teams_col.insert_one(team)
    print(f"Seeded {len(teams)} teams.")

    # 2. Seed Regions (Jaipur neighborhoods)
    regions_col = db["regions"]
    try:
        await regions_col.delete_many({})
    except Exception:
        pass
        
    # We will represent simple geo-coordinate boundaries for the frontend map to draw
    regions = [
        {
            "_id": ObjectId("665f00000000000000000011"),
            "name": "Mansarovar Zone",
            "geojson_boundary": {
                "type": "Polygon",
                "coordinates": [[
                    [75.72, 26.88],
                    [75.76, 26.88],
                    [75.76, 26.83],
                    [75.72, 26.83],
                    [75.72, 26.88]
                ]]
            },
            "rainfall_mm": 185.5,
            "river_level_m": 4.2,
            "humidity_pct": 92.0,
            "elevation_m": 420.0,
            "past_flood_events_count": 3,
            "risk_1h": 0.12,
            "risk_3h": 0.45,
            "risk_6h": 0.72,
            "risk_24h": 0.88,
            "updated_at": datetime.datetime.utcnow()
        },
        {
            "_id": ObjectId("665f00000000000000000012"),
            "name": "Malviya Nagar Zone",
            "geojson_boundary": {
                "type": "Polygon",
                "coordinates": [[
                    [75.79, 26.88],
                    [75.84, 26.88],
                    [75.84, 26.83],
                    [75.79, 26.83],
                    [75.79, 26.88]
                ]]
            },
            "rainfall_mm": 42.0,
            "river_level_m": 1.5,
            "humidity_pct": 65.0,
            "elevation_m": 440.0,
            "past_flood_events_count": 0,
            "risk_1h": 0.01,
            "risk_3h": 0.03,
            "risk_6h": 0.08,
            "risk_24h": 0.15,
            "updated_at": datetime.datetime.utcnow()
        },
        {
            "_id": ObjectId("665f00000000000000000013"),
            "name": "Vaishali Zone",
            "geojson_boundary": {
                "type": "Polygon",
                "coordinates": [[
                    [75.70, 26.94],
                    [75.75, 26.94],
                    [75.75, 26.89],
                    [75.70, 26.89],
                    [75.70, 26.94]
                ]]
            },
            "rainfall_mm": 210.0,
            "river_level_m": 5.8,
            "humidity_pct": 95.0,
            "elevation_m": 412.0,
            "past_flood_events_count": 5,
            "risk_1h": 0.45,
            "risk_3h": 0.82,
            "risk_6h": 0.94,
            "risk_24h": 0.98,
            "updated_at": datetime.datetime.utcnow()
        },
        {
            "_id": ObjectId("665f00000000000000000014"),
            "name": "C-Scheme Zone",
            "geojson_boundary": {
                "type": "Polygon",
                "coordinates": [[
                    [75.78, 26.93],
                    [75.82, 26.93],
                    [75.82, 26.89],
                    [75.78, 26.89],
                    [75.78, 26.93]
                ]]
            },
            "rainfall_mm": 115.0,
            "river_level_m": 2.8,
            "humidity_pct": 82.0,
            "elevation_m": 435.0,
            "past_flood_events_count": 1,
            "risk_1h": 0.05,
            "risk_3h": 0.18,
            "risk_6h": 0.40,
            "risk_24h": 0.65,
            "updated_at": datetime.datetime.utcnow()
        }
    ]
    for region in regions:
        await regions_col.insert_one(region)
    print(f"Seeded {len(regions)} regions.")

    # 3. Seed Reports (Incidents)
    reports_col = db["reports"]
    try:
        await reports_col.delete_many({})
    except Exception:
        pass
        
    reports = [
        {
            "_id": ObjectId("665f00000000000000000021"),
            "citizen_name": "Amit Sharma",
            "phone": "+91 98765 43210",
            "location": {"lat": 26.9152, "lng": 75.7785, "address": "Civil Lines, Jaipur"},
            "disaster_type": "flood",
            "raw_description": "Our house is flooded with chest-deep water. There are 4 people trapped including a child. We need a rescue boat immediately. No electricity.",
            "num_people": 4,
            "special_needs": ["children"],
            "images": [],
            "nlp_extraction": {
                "urgency_keywords": ["chest-deep water", "trapped", "boat"],
                "people_breakdown": {"children": 1, "elderly": 0, "pregnant": 0, "disabled": 0},
                "medical_emergency": False,
                "resources_required": ["boat"],
                "confidence": 0.92
            },
            "cv_analysis": {
                "detections": [{"class": "flood_water", "confidence": 0.88}],
                "people_visible": 1,
                "severity_estimate": "high"
            },
            "priority_score": 92,
            "priority_reasons": ["Chest-deep water reported", "Children trapped", "Rescue boat required"],
            "recommended_resources": ["boat"],
            "duplicate_of": None,
            "duplicate_cluster_id": None,
            "status": "pending",
            "assigned_team_id": None,
            "created_at": datetime.datetime.utcnow() - datetime.timedelta(minutes=45),
            "updated_at": datetime.datetime.utcnow() - datetime.timedelta(minutes=45)
        },
        {
            "_id": ObjectId("665f00000000000000000022"),
            "citizen_name": "Rahul Verma",
            "phone": "+91 91234 56789",
            "location": {"lat": 26.8965, "lng": 75.7350, "address": "Mansarovar Sector 3, Jaipur"},
            "disaster_type": "fire",
            "raw_description": "Heavy electrical short circuit fire in apartment block. Multiple families are inside. Need fire brigade, smoke is filling up the lobby.",
            "num_people": 12,
            "special_needs": ["elderly", "medical"],
            "images": [],
            "nlp_extraction": {
                "urgency_keywords": ["fire", "smoke", "trapped", "families"],
                "people_breakdown": {"children": 0, "elderly": 2, "pregnant": 0, "disabled": 0},
                "medical_emergency": True,
                "resources_required": ["fire", "ambulance"],
                "confidence": 0.95
            },
            "cv_analysis": {
                "detections": [{"class": "fire", "confidence": 0.95}],
                "people_visible": 4,
                "severity_estimate": "high"
            },
            "priority_score": 96,
            "priority_reasons": ["Active fire in residential zone", "Multiple families trapped", "Elderly present", "Medical standby required"],
            "recommended_resources": ["fire", "ambulance"],
            "duplicate_of": None,
            "duplicate_cluster_id": None,
            "status": "assigned",
            "assigned_team_id": ObjectId("665f00000000000000000003"),
            "created_at": datetime.datetime.utcnow() - datetime.timedelta(hours=2),
            "updated_at": datetime.datetime.utcnow() - datetime.timedelta(hours=1, minutes=45)
        },
        {
            "_id": ObjectId("665f00000000000000000023"),
            "citizen_name": "Sunita Devi",
            "phone": "+91 99988 87766",
            "location": {"lat": 26.8524, "lng": 75.8010, "address": "Malviya Nagar Sector 8, Jaipur"},
            "disaster_type": "landslide",
            "raw_description": "Small rockslide blocked the colony road. No one is injured, but cars are blocked and we cannot exit the main gate.",
            "num_people": 2,
            "special_needs": [],
            "images": [],
            "nlp_extraction": {
                "urgency_keywords": ["rockslide", "blocked"],
                "people_breakdown": {"children": 0, "elderly": 0, "pregnant": 0, "disabled": 0},
                "medical_emergency": False,
                "resources_required": ["search_rescue"],
                "confidence": 0.81
            },
            "cv_analysis": {
                "detections": [{"class": "rock_debris", "confidence": 0.76}],
                "people_visible": 0,
                "severity_estimate": "low"
            },
            "priority_score": 28,
            "priority_reasons": ["Road blocked", "No injuries reported", "Low visual severity estimate"],
            "recommended_resources": ["search_rescue"],
            "duplicate_of": None,
            "duplicate_cluster_id": None,
            "status": "pending",
            "assigned_team_id": None,
            "created_at": datetime.datetime.utcnow() - datetime.timedelta(hours=3),
            "updated_at": datetime.datetime.utcnow() - datetime.timedelta(hours=3)
        },
        {
            "_id": ObjectId("665f00000000000000000024"),
            "citizen_name": "Priya Singh",
            "phone": "+91 95432 10987",
            "location": {"lat": 26.9201, "lng": 75.7981, "address": "C-Scheme, Jaipur"},
            "disaster_type": "flood",
            "raw_description": "Water logging in the street. Water is coming up to the porch, about 15 cm deep. Need sandbags if possible.",
            "num_people": 3,
            "special_needs": [],
            "images": [],
            "nlp_extraction": {
                "urgency_keywords": ["logging", "street", "porch"],
                "people_breakdown": {"children": 0, "elderly": 0, "pregnant": 0, "disabled": 0},
                "medical_emergency": False,
                "resources_required": [],
                "confidence": 0.70
            },
            "cv_analysis": {
                "detections": [],
                "people_visible": 0,
                "severity_estimate": "low"
            },
            "priority_score": 24,
            "priority_reasons": ["Shallow street water logging", "Low priority score calculation"],
            "recommended_resources": [],
            "duplicate_of": None,
            "duplicate_cluster_id": None,
            "status": "resolved",
            "assigned_team_id": None,
            "created_at": datetime.datetime.utcnow() - datetime.timedelta(hours=6),
            "updated_at": datetime.datetime.utcnow() - datetime.timedelta(hours=4)
        },
        {
            "_id": ObjectId("665f00000000000000000025"),
            "citizen_name": "Ramesh Kumar",
            "phone": "+91 93344 55667",
            "location": {"lat": 26.9148, "lng": 75.7790, "address": "Near Civil Lines Station, Jaipur"},
            "disaster_type": "flood",
            "raw_description": "We are stuck because the whole street is waterlogged with high level water. Water has entered ground floor. 3 people stuck.",
            "num_people": 3,
            "special_needs": [],
            "images": [],
            "nlp_extraction": {
                "urgency_keywords": ["stuck", "waterlogged", "high level"],
                "people_breakdown": {"children": 0, "elderly": 0, "pregnant": 0, "disabled": 0},
                "medical_emergency": False,
                "resources_required": ["boat"],
                "confidence": 0.85
            },
            "cv_analysis": {
                "detections": [],
                "people_visible": 0,
                "severity_estimate": "medium"
            },
            "priority_score": 75,
            "priority_reasons": ["Duplicate of Civil Lines flood incident", "High similarity detected"],
            "recommended_resources": ["boat"],
            "duplicate_of": ObjectId("665f00000000000000000021"),
            "duplicate_cluster_id": "665f00000000000000000021",
            "status": "pending",
            "assigned_team_id": None,
            "created_at": datetime.datetime.utcnow() - datetime.timedelta(minutes=30),
            "updated_at": datetime.datetime.utcnow() - datetime.timedelta(minutes=30)
        }
    ]
    for report in reports:
        await reports_col.insert_one(report)
    print(f"Seeded {len(reports)} reports.")
    print("Database seeding completed.")
