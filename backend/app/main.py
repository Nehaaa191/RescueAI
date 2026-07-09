import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import settings
from app.db.mongo import init_db, get_db
from app.db.seed import seed_data
from app.routers import reports, incidents, teams, forecast, analytics, ws

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("rescueai.main")

app = FastAPI(title=settings.PROJECT_NAME, version="1.0.0")

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Set to actual domains in production
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static uploads directory so frontend can render incident images
uploads_dir = os.path.join("static", "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.on_event("startup")
async def startup_event():
    logger.info("Starting RescueAI backend application...")
    
    # Initialize database
    db = await init_db()
    
    # Check if we are running in Mock Database mode
    # If so, automatically seed the database in memory
    from app.db.mongo import is_mock_db
    if is_mock_db:
        logger.info("Running in Mock Database mode. Seeding initial demo data...")
        await seed_data(db)
    else:
        # Check if database is empty; if so, seed it
        teams_count = await db["teams"].count_documents({})
        if teams_count == 0:
            logger.info("Database is empty. Seeding initial demo data...")
            await seed_data(db)

@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "RescueAI Disaster Intelligence Platform API is active.",
        "version": "1.0.0"
    }

# Include API Routers
app.include_router(reports.router, prefix="/api", tags=["reports"])
app.include_router(incidents.router, prefix="/api", tags=["incidents"])
app.include_router(teams.router, prefix="/api", tags=["teams"])
app.include_router(forecast.router, prefix="/api", tags=["forecast"])
app.include_router(analytics.router, prefix="/api", tags=["analytics"])
app.include_router(ws.router, tags=["websocket"])
