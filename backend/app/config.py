import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "RescueAI"
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "rescueai")
    FIREBASE_PROJECT_ID: str = os.getenv("FIREBASE_PROJECT_ID", "")
    
    # Simple bypass secret for local development/testing without real Firebase Auth keys setup
    BYPASS_AUTH: bool = os.getenv("BYPASS_AUTH", "true").lower() in ("true", "1", "yes")
    
    class Config:
        case_sensitive = True

settings = Settings()
