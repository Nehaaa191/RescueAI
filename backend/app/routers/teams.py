from fastapi import APIRouter, Depends
from typing import List

from app.db.mongo import get_db
from app.models.schemas import TeamResponse
from app.routers.incidents import clean_doc

router = APIRouter()

@router.get("/teams", response_model=List[TeamResponse])
async def list_teams(db = Depends(get_db)):
    cursor = db["teams"].find({})
    teams = await cursor.to_list(length=100)
    return [clean_doc(t) for t in teams]
