import asyncio

from mangum import Mangum
from app.main import app

# CloudFront sends /api/facilities/* to this Lambda unchanged; strip the prefix so FastAPI sees /tickets etc.
API_BASE_PATH = "/api/facilities"

http_handler = Mangum(app, api_gateway_base_path=API_BASE_PATH, lifespan="off")

def handler(event, context):
    # Direct invocations ({"task": "init-db"}) set up the database, which isn't reachable from outside AWS
    if isinstance(event, dict) and event.get("task") == "init-db":
        from db.init_db import init_db
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(init_db())
        finally:
            loop.close()
    return http_handler(event, context)
