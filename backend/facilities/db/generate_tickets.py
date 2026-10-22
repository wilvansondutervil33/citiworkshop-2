"""Generates realistic sample tickets (and engineer notes) for demos and analytics.

Every generated ticket's description ends with SAMPLE_MARKER, so remove_generated() can
delete exactly those tickets later without touching real ones.

    python -m db.generate_tickets 1000         # add 1000 tickets over the last 90 days
    python -m db.generate_tickets --remove     # delete all generated tickets and their notes
"""
import asyncio
import random
import sys
from datetime import datetime, timedelta

from sqlalchemy import delete, func, insert, select, text

from app.database import AsyncSessionLocal
from app.models import Building, Engineer, Floor, Note, Seat, Ticket, User, UserRole

SAMPLE_MARKER = "(sample data)"
ACTIVE = ("Open", "In-Progress", "Blocked")

TITLES = {
    "Software": [
        ("Laptop can't connect to VPN", "VPN client fails at sign-in with a certificate error."),
        ("Room booking screen frozen", "The booking display outside the room is stuck on yesterday's schedule."),
        ("Printer queue stuck", "Print jobs sit in the queue and never print."),
        ("Desk phone app crashing", "The softphone closes every time a call comes in."),
        ("Shared drive not mapping", "The team drive is missing after logging in."),
        ("Email client won't sync", "New emails stop arriving until the app is restarted."),
    ],
    "Hardware": [
        ("Monitor flickering", "External monitor flickers every few seconds."),
        ("Docking station not charging laptop", "Laptop shows not charging when docked."),
        ("Keyboard keys not responding", "Several keys need to be pressed twice."),
        ("Projector shows no signal", "No picture over HDMI or wireless casting."),
        ("Badge reader rejecting badges", "Valid badges are rejected at the door."),
        ("Headset microphone not working", "Others can't hear me on calls with the desk headset."),
    ],
    "Network": [
        ("Wi-Fi drops in meeting room", "Video calls disconnect every few minutes."),
        ("No network at desk port", "Wired connection shows no internet."),
        ("Slow connection on this floor", "Pages take a long time to load all afternoon."),
        ("Guest Wi-Fi not loading sign-in page", "Visitors can't reach the guest sign-in page."),
        ("Video calls freezing", "Calls freeze and drop audio near the windows."),
    ],
    "Plumbing": [
        ("Leaking tap in kitchen", "Tap drips constantly and water is pooling."),
        ("Toilet won't stop running", "Cistern keeps refilling after flushing."),
        ("Water fountain not cold", "Drinking fountain only dispenses warm water."),
        ("Blocked sink", "Sink drains very slowly and smells."),
        ("Low water pressure in restroom", "Taps barely run in the restroom."),
    ],
    "Structural": [
        ("Broken desk chair", "Height lever is broken and the seat keeps sinking."),
        ("Ceiling tile stained", "A ceiling tile above the desks is stained and sagging."),
        ("Door doesn't latch", "Meeting room door won't stay closed."),
        ("Cracked window", "There's a crack running across the window pane."),
        ("Loose carpet tile", "Carpet tile lifts at the corner and is a trip hazard."),
        ("Desk drawer stuck", "Pedestal drawer won't open."),
    ],
    "Other": [
        ("Air conditioning too cold", "This area is much colder than the rest of the floor."),
        ("Lights flickering", "Ceiling lights flicker constantly near the lounge."),
        ("Bin not emptied", "Recycling bin here hasn't been emptied for days."),
        ("Strange smell near pantry", "There's a burning smell near the pantry."),
        ("Desk lamp not working", "Desk lamp won't turn on with a new bulb."),
    ],
}

PROGRESS_NOTES = [
    "On site now, looking into it.",
    "Found the cause, working on a fix.",
    "Ordered a replacement part; it should arrive in a couple of days.",
    "Applied a temporary fix while we wait for the permanent one.",
    "Checked with the vendor, waiting on their reply.",
]
BLOCKED_NOTES = ["Waiting on a replacement part before I can continue.", "Need access to the room; waiting on building security."]
DONE_NOTES = ["Fixed and tested. Please let us know if it happens again.", "Replaced the faulty part; working normally now."]

# Typical days from acknowledgement to fix, by issue type (randomised per ticket)
FIX_DAYS = {"Software": 1.5, "Hardware": 2.0, "Network": 3.0, "Plumbing": 2.5, "Structural": 5.0, "Other": 4.0}
# Typical hours to acknowledge, by priority
ACK_HOURS = {"Critical": (0.3, 3), "Medium": (1, 12), "Low": (2, 48)}


def pick_status(age_days: float, rng: random.Random) -> str:
    """Newer tickets are more likely to still be open; old ones are mostly closed."""
    if age_days < 3:
        weights = {"Open": 35, "In-Progress": 35, "Blocked": 10, "Resolved": 15, "Closed": 5}
    elif age_days < 14:
        weights = {"Open": 5, "In-Progress": 15, "Blocked": 5, "Resolved": 20, "Closed": 55}
    else:
        weights = {"Open": 0, "In-Progress": 1, "Blocked": 1, "Resolved": 5, "Closed": 93}
    return rng.choices(list(weights), weights=list(weights.values()))[0]


async def generate_tickets(count: int = 1000, days: int = 90, seed: int | None = None) -> dict:
    rng = random.Random(seed)
    async with AsyncSessionLocal() as session:
        # Use the database clock, matching how created_at is filled in for real tickets
        now = (await session.execute(text("SELECT LOCALTIMESTAMP"))).scalar_one().replace(microsecond=0)

        locations = (await session.execute(
            select(Seat.id, Building.id, Building.department)
            .join(Floor, Floor.id == Seat.floor_id)
            .join(Building, Building.id == Floor.building_id)
            .where(Seat.is_active == True, Floor.is_active == True, Building.is_active == True)
        )).all()
        reporters = (await session.execute(
            select(User.id).where(User.role == UserRole.EMPLOYEE, User.is_active == True)
        )).scalars().all()
        engineer_rows = (await session.execute(
            select(Engineer.id, Engineer.user_id, Engineer.building_id, Engineer.max_workload)
            .join(User, User.id == Engineer.user_id)
            .where(Engineer.is_active == True, User.is_active == True)
        )).all()
        if not locations or not reporters:
            raise RuntimeError("Need at least one active seat and one active employee to generate tickets")

        # Current open load per engineer, so generated active tickets respect max_workload
        load = dict((await session.execute(
            select(Ticket.assigned_to_id, func.count(Ticket.id))
            .where(Ticket.assigned_to_id.is_not(None), Ticket.status.in_(ACTIVE))
            .group_by(Ticket.assigned_to_id)
        )).all())
        engineers_by_building = {}
        for engineer_id, user_id, building_id, max_workload in engineer_rows:
            engineers_by_building.setdefault(building_id, []).append((engineer_id, user_id, max_workload))

        tickets, plans = [], []
        for _ in range(count):
            seat_id, building_id, department = rng.choice(locations)
            issue_type = department.value if department else "Other"
            title, description = rng.choice(TITLES[issue_type])
            priority = rng.choices(["Low", "Medium", "Critical"], weights=[45, 40, 15])[0]

            created = now - timedelta(days=rng.uniform(0, days))
            created = created.replace(hour=rng.randint(7, 18), minute=rng.randint(0, 59), second=0)
            if created > now:
                created -= timedelta(days=1)
            age_days = (now - created).total_seconds() / 86400
            status = pick_status(age_days, rng)

            opened = closed = None
            if status != "Open":
                opened = created + timedelta(hours=rng.uniform(*ACK_HOURS[priority]))
                if status == "Closed":
                    closed = opened + timedelta(days=FIX_DAYS[issue_type] * rng.uniform(0.3, 2.5))
                # Times can't be in the future: an unfinished ticket is still being worked on
                if opened > now:
                    status, opened, closed = "Open", None, None
                elif closed and closed > now:
                    status, closed = "In-Progress", None

            # Match auto-assignment: only buildings with a department, and active work within limits
            assignee = None
            candidates = engineers_by_building.get(building_id, []) if issue_type != "Other" else []
            if candidates:
                if status in ACTIVE:
                    free = [c for c in candidates if load.get(c[0], 0) < c[2]]
                    if free:
                        assignee = min(free, key=lambda c: load.get(c[0], 0))
                        load[assignee[0]] = load.get(assignee[0], 0) + 1
                else:
                    assignee = rng.choice(candidates)
            if assignee is None and status in ("In-Progress", "Blocked", "Resolved"):
                status, opened = "Open", None  # nobody to work on it yet

            tickets.append({
                "title": title,
                "description": f"{description} {SAMPLE_MARKER}",
                "priority": priority,
                "status": status,
                "issue_type": issue_type,
                "assigned_to_id": assignee[0] if assignee else None,
                "created_by_id": rng.choice(reporters),
                "location_id": seat_id,
                "created_at": created,
                "opened_at": opened,
                "closed_at": closed,
            })
            plans.append((status, assignee))

        ticket_ids = (await session.execute(
            insert(Ticket).returning(Ticket.id, sort_by_parameter_order=True), tickets
        )).scalars().all()

        notes = []
        for ticket_id, (status, assignee) in zip(ticket_ids, plans):
            if not assignee or status == "Open":
                continue
            engineer_id, user_id, _ = assignee
            for body in rng.sample(PROGRESS_NOTES, k=rng.randint(0, 2)):
                notes.append({"ticket_id": ticket_id, "author_id": user_id, "engineer_id": engineer_id, "body": body})
            if status == "Blocked":
                notes.append({"ticket_id": ticket_id, "author_id": user_id, "engineer_id": engineer_id, "body": rng.choice(BLOCKED_NOTES)})
            if status in ("Resolved", "Closed"):
                notes.append({"ticket_id": ticket_id, "author_id": user_id, "engineer_id": engineer_id, "body": rng.choice(DONE_NOTES)})
        if notes:
            await session.execute(insert(Note), notes)

        await session.commit()

    statuses = {}
    for status, _ in plans:
        statuses[status] = statuses.get(status, 0) + 1
    return {"tickets_added": len(ticket_ids), "notes_added": len(notes), "statuses": statuses, "days": days}


async def remove_generated() -> dict:
    """Deletes every generated ticket and its notes; real tickets are untouched."""
    async with AsyncSessionLocal() as session:
        generated = select(Ticket.id).where(Ticket.description.like(f"%{SAMPLE_MARKER}"))
        notes = await session.execute(delete(Note).where(Note.ticket_id.in_(generated)))
        tickets = await session.execute(delete(Ticket).where(Ticket.description.like(f"%{SAMPLE_MARKER}")))
        await session.commit()
    return {"tickets_removed": tickets.rowcount, "notes_removed": notes.rowcount}


if __name__ == "__main__":
    if "--remove" in sys.argv:
        print(asyncio.run(remove_generated()))
    else:
        args = [a for a in sys.argv[1:] if not a.startswith("-")]
        print(asyncio.run(generate_tickets(int(args[0]) if args else 1000)))
