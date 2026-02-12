from fastapi import APIRouter
from fastapi.responses import FileResponse
import os

router = APIRouter()

@router.get("/download/{filepath:path}")
async def download_file(filepath: str):
    base_path = "/app/frontend/src"
    full_path = os.path.join(base_path, filepath)
    if os.path.exists(full_path):
        return FileResponse(full_path, filename=os.path.basename(full_path))
    return {"error": "File not found"}
