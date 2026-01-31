from fastapi import APIRouter
from fastapi.responses import PlainTextResponse
import os

router = APIRouter()

@router.get("/download/app-js")
async def download_app_js():
    file_path = "/app/frontend/src/App.js"
    if os.path.exists(file_path):
        with open(file_path, 'r') as f:
            content = f.read()
        return PlainTextResponse(content, media_type="text/plain")
    return PlainTextResponse("File not found", status_code=404)
