import asyncio

from mangum import Mangum
from app.main import app

# CloudFront sends /api/facilities/* to this Lambda unchanged; strip the prefix so FastAPI sees /tickets etc.
API_BASE_PATH = "/api/facilities"

http_handler = Mangum(app, api_gateway_base_path=API_BASE_PATH, lifespan="off")

def run_task(event):
    from app import database
    from db.add_engineers import add_engineers
    from db.generate_tickets import generate_tickets, remove_generated
    from db.init_db import init_db

    tasks = {
        "init-db": lambda: init_db(),
        "generate-tickets": lambda: generate_tickets(int(event.get("count", 1000)), int(event.get("days", 90))),
        "remove-generated": lambda: remove_generated(),
        "add-engineers": lambda: add_engineers(),
    }
    task = tasks.get(event["task"])
    if task is None:
        return {"error": f"Unknown task '{event['task']}'. Use one of: {', '.join(tasks)}"}

    async def run_and_release():
        try:
            return await task()
        finally:
            # Connections belong to this task's event loop; don't leave them for the next one
            await database.engine.dispose()

    # Not behind CloudFront's 30 s limit, so wait longer for a paused database to resume
    database.CONNECT_DEADLINE_SECONDS = 120
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(run_and_release())
    finally:
        loop.close()

def handler(event, context):
    # Direct invocations ({"task": ...}) work on the database, which isn't reachable from outside AWS
    if isinstance(event, dict) and event.get("task"):
        return run_task(event)
    return http_handler(event, context)
