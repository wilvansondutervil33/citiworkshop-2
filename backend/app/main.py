from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth
from app.config import settings
import logging
import traceback

app = FastAPI(
    title= "Med-Flow Command Center",
    description=" This is scound app",
    version= "1.0.0"
)

app.include_router(auth.router)

@app.get("/health", tags=["health"])
async def health() -> dict[str, str]:
    return {'status': 'OK'}