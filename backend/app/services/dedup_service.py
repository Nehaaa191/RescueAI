import logging
from typing import Dict, List, Optional, Tuple, Any
import numpy as np

logger = logging.getLogger("rescueai.dedup")

def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculates the distance in kilometers between two points on the earth."""
    # Earth radius in kilometers
    R = 6371.0
    
    phi1 = np.radians(lat1)
    phi2 = np.radians(lat2)
    delta_phi = np.radians(lat2 - lat1)
    delta_lambda = np.radians(lng2 - lng1)
    
    a = np.sin(delta_phi / 2)**2 + np.cos(phi1) * np.cos(phi2) * np.sin(delta_lambda / 2)**2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
    
    return R * c

class DedupService:
    def __init__(self, model_name="all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.model = None
        self.model_loaded = False

    def initialize_model(self):
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading Sentence-Transformer model: {self.model_name}...")
            # Load on CPU by default
            self.model = SentenceTransformer(self.model_name, device="cpu")
            self.model_loaded = True
            logger.info("Sentence-Transformer model loaded successfully.")
        except Exception as e:
            logger.warning(f"Could not load SentenceTransformer: {e}. Using token-overlap + difflib fallback.")
            self.model = None
            self.model_loaded = False

    def sequence_similarity_fallback(self, text1: str, text2: str) -> float:
        """Fallback text similarity using word-token overlap and difflib."""
        import difflib
        
        t1 = text1.lower().strip()
        t2 = text2.lower().strip()
        
        # Word set overlap
        words1 = set(t1.split())
        words2 = set(t2.split())
        
        if not words1 or not words2:
            return 0.0
            
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        overlap = len(intersection) / len(union)
        
        # Sequence Matcher ratio
        seq_ratio = difflib.SequenceMatcher(None, t1, t2).ratio()
        
        # Combine (weighted)
        return float(0.4 * overlap + 0.6 * seq_ratio)

    def calculate_similarity(self, text1: str, text2: str) -> float:
        if not self.model_loaded and self.model is None:
            self.initialize_model()
            
        if self.model_loaded and self.model is not None:
            try:
                embeddings = self.model.encode([text1, text2])
                emb1 = embeddings[0]
                emb2 = embeddings[1]
                
                # Cosine similarity
                dot_product = np.dot(emb1, emb2)
                norm_a = np.linalg.norm(emb1)
                norm_b = np.linalg.norm(emb2)
                
                return float(dot_product / (norm_a * norm_b))
            except Exception as e:
                logger.error(f"Error computing embedding similarity: {e}. Using fallback.")
                return self.sequence_similarity_fallback(text1, text2)
        else:
            return self.sequence_similarity_fallback(text1, text2)

    def find_duplicate(self, current_desc: str, current_lat: float, current_lng: float, recent_reports: List[Dict[str, Any]], threshold: float = 0.82) -> Optional[Dict[str, Any]]:
        """
        Scans recent reports, filters by distance (<1.0km), and computes semantic similarity.
        Returns the matching parent report if duplicate found, else None.
        """
        for report in recent_reports:
            # Skip if report is already flagged as duplicate of something else (we link to root parent)
            if report.get("duplicate_of") is not None:
                continue
                
            loc = report.get("location", {})
            rep_lat = loc.get("lat")
            rep_lng = loc.get("lng")
            
            if rep_lat is None or rep_lng is None:
                continue
                
            # Geographic filter: 1.0 km threshold
            dist = haversine_distance(current_lat, current_lng, rep_lat, rep_lng)
            if dist > 1.0:
                continue
                
            # Text similarity check
            rep_desc = report.get("raw_description", "")
            sim = self.calculate_similarity(current_desc, rep_desc)
            
            logger.info(f"Comparing with incident {report.get('_id')} (dist: {dist:.2f}km, similarity: {sim:.2f})")
            
            if sim >= threshold:
                logger.info(f"Duplicate incident detected! Matches incident ID: {report.get('_id')}")
                return report
                
        return None

# Singleton instance
dedup_service = DedupService()
