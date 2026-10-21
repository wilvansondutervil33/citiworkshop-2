from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, ticket, engineer, floor, building, note, seat, user
from app.config import settings
import logging
import traceback

FRONTEND_ORIGIN = settings.frontend_origin
logger = logging.getLogger("uvicorn.error")

app = FastAPI(
    title= "ACME Facilities Desk API",
    description="Facility incident management for ACME employees, engineers and facility admins",
    version= "1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    # On AWS the site and API share the CloudFront domain, so FRONTEND_ORIGIN is only needed locally
    allow_origins= [origin for origin in [FRONTEND_ORIGIN, "http://localhost:3000"] if origin],
    allow_credentials= True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(auth.router)
app.include_router(ticket.router)
app.include_router(engineer.router)
app.include_router(floor.router)
app.include_router(building.router)
app.include_router(note.router)
app.include_router(seat.router)
app.include_router(user.router)

@app.get("/health", tags=["health"])
async def health() -> dict[str, str]:
    return {'status': 'OK'}