from typing import List, Dict, Any

class ResourceService:
    def recommend_resources(self, nlp_extraction: Dict[str, Any], disaster_type: str, priority_score: int) -> List[str]:
        resources = set()
        
        nlp_data = nlp_extraction.get("nlp_extraction", {}) if "nlp_extraction" in nlp_extraction else nlp_extraction
        
        # 1. NLP direct requests
        req_nlp = nlp_data.get("resources_required", [])
        for r in req_nlp:
            resources.add(r)
            
        # 2. Disaster-type defaults
        if disaster_type == "flood":
            # If deep water, need boat
            water_level = nlp_data.get("water_level_cm", 0)
            if water_level > 60:
                resources.add("boat")
            else:
                resources.add("search_rescue")
        elif disaster_type == "fire":
            resources.add("fire_truck")
        elif disaster_type in ["earthquake", "landslide"]:
            resources.add("search_rescue")
        elif disaster_type == "cyclone":
            resources.add("search_rescue")
            
        # 3. Medical emergency checks
        if nlp_data.get("medical_emergency") or "ambulance" in req_nlp:
            resources.add("ambulance")
            resources.add("medical_team")
            
        # 4. Priority escalation
        if priority_score >= 85:
            # High priority incidents get backup search & rescue or medical
            if disaster_type == "flood":
                resources.add("medical_team")
            elif disaster_type == "fire":
                resources.add("ambulance")
            else:
                resources.add("medical_team")
                
        # Cleanup names
        resource_list = list(resources)
        # Ensure we don't have invalid categories
        valid_resources = ["boat", "ambulance", "medical_team", "fire_truck", "search_rescue"]
        final_resources = [r for r in resource_list if r in valid_resources]
        
        # If empty, add a default depending on type
        if not final_resources:
            if disaster_type == "fire":
                final_resources = ["fire_truck"]
            elif disaster_type == "flood":
                final_resources = ["boat"]
            else:
                final_resources = ["search_rescue"]
                
        return final_resources

# Singleton instance
resource_service = ResourceService()
