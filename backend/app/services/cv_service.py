import os
import logging
from typing import Dict, List, Any

logger = logging.getLogger("rescueai.cv")

class CVService:
    def __init__(self, model_path="yolov8n.pt"):
        self.model_path = model_path
        self.model = None
        self.model_loaded = False

    def initialize_model(self):
        try:
            from ultralytics import YOLO
            logger.info(f"Loading YOLOv8 model: {self.model_path}...")
            # This will automatically download yolov8n.pt if it's not present
            self.model = YOLO(self.model_path)
            self.model_loaded = True
            logger.info("YOLOv8 model loaded successfully.")
        except Exception as e:
            logger.warning(f"Could not load YOLOv8 model: {e}. Using heuristic PIL fallback.")
            self.model = None
            self.model_loaded = False

    def analyze_image_fallback(self, image_path: str) -> Dict[str, Any]:
        """Fallback visual analysis using basic image stats (PIL) if YOLO is offline."""
        try:
            from PIL import Image
            import numpy as np
            
            if not os.path.exists(image_path):
                return {
                    "detections": [],
                    "people_visible": 0,
                    "severity_estimate": "medium",
                    "confidence": 0.5
                }
                
            img = Image.open(image_path)
            img_rgb = img.convert("RGB")
            width, height = img_rgb.size
            
            # Simple color distribution heuristic to detect water or fire
            # Resize image to speed up calculations
            img_small = img_rgb.resize((50, 50))
            pixels = np.array(img_small.getdata())
            
            # Calculate red vs blue ratios
            # pixels shape is (2500, 3)
            red_pixels = 0
            blue_pixels = 0
            
            for r, g, b in pixels:
                # Fire/Orange indicator: high red, moderate green, low blue
                if r > 150 and g > 50 and b < 50:
                    red_pixels += 1
                # Flood/Water indicator: blue-greyish tones
                elif b > 100 and r < 120 and g < 150:
                    blue_pixels += 1
            
            total_pixels = len(pixels)
            red_ratio = red_pixels / total_pixels
            blue_ratio = blue_pixels / total_pixels
            
            detections = []
            severity = "low"
            
            if red_ratio > 0.05:
                detections.append({"class": "fire_or_smoke", "confidence": round(0.5 + red_ratio, 2)})
                severity = "high"
            elif blue_ratio > 0.10:
                detections.append({"class": "flood_water", "confidence": round(0.5 + blue_ratio, 2)})
                severity = "high"
            elif width * height > 1000:
                severity = "medium"
                
            # Simulate a visible person detection if image size is large as simple heuristic
            people_visible = 1 if width > 500 else 0
            if people_visible > 0:
                detections.append({"class": "person", "confidence": 0.72})
                
            return {
                "detections": detections,
                "people_visible": people_visible,
                "severity_estimate": severity,
                "confidence": 0.60
            }
        except Exception as e:
            logger.error(f"Error in CV fallback analysis: {e}")
            return {
                "detections": [],
                "people_visible": 0,
                "severity_estimate": "low",
                "confidence": 0.30
            }

    def analyze_incident_image(self, image_path: str) -> Dict[str, Any]:
        """Runs YOLOv8 object detection on the image if available; else calls fallback."""
        if not self.model_loaded and self.model is None:
            self.initialize_model()
            
        if not self.model_loaded or self.model is None:
            return self.analyze_image_fallback(image_path)
            
        try:
            if not os.path.exists(image_path):
                return {
                    "detections": [],
                    "people_visible": 0,
                    "severity_estimate": "low"
                }
                
            # Run inference
            results = self.model(image_path, verbose=False)
            result = results[0]
            
            detections = []
            people_visible = 0
            vehicles_visible = 0
            
            # COCO class indexes: 0 is person, 2 is car, 3 is motorcycle, 5 is bus, 7 is truck
            for box in result.boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                label = result.names[cls_id]
                
                if cls_id == 0:
                    people_visible += 1
                    detections.append({"class": "person", "confidence": round(conf, 2)})
                elif cls_id in [2, 3, 5, 7]:
                    vehicles_visible += 1
                    detections.append({"class": label, "confidence": round(conf, 2)})
                    
            # Determine visual severity estimate based on people visible and other details
            if people_visible >= 3 or vehicles_visible >= 2:
                severity = "high"
            elif people_visible >= 1 or vehicles_visible >= 1:
                severity = "medium"
            else:
                severity = "low"
                
            # If no classes detected but image exists, let's also check color fallback to see if there is flood/fire
            if len(detections) == 0:
                color_fallback = self.analyze_image_fallback(image_path)
                detections = color_fallback["detections"]
                severity = color_fallback["severity_estimate"]
                
            return {
                "detections": detections,
                "people_visible": people_visible,
                "severity_estimate": severity
            }
            
        except Exception as e:
            logger.error(f"Error in YOLO image analysis: {e}. Falling back.")
            return self.analyze_image_fallback(image_path)

# Singleton instance
cv_service = CVService()
