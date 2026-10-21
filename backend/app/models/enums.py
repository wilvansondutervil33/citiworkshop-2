from enum import Enum

class UserRole(str, Enum):
    FACILITY_ADMIN = "Facility Admin"
    EMPLOYEE = "Employee"
    ENGINEER = "Engineer"

class TicketPriority(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    CRITICAL = "Critical"

class TicketStatus(str, Enum):
    OPEN = "Open"
    IN_PROGRESS = "In-Progress"
    BLOCKED = "Blocked"
    RESOLVED = "Resolved"
    CLOSED = "Closed"

class EngineerAvailability(str, Enum):
    AVAILABLE = "Available"
    BUSY = "Busy"
    OFF_DUTY = "Off-Duty"

class SeatType(str, Enum):
    DESK = "Desk"
    MEETING_ROOM = "Meeting Room"
    COMMON_AREA = "Common Area"
    OTHER = "Other"

class IssueType(str, Enum):
    SOFTWARE = "Software"
    HARDWARE = "Hardware"
    NETWORK = "Network"
    PLUMBING = "Plumbing"
    STRUCTURAL = "Structural"
    OTHER = "Other"
