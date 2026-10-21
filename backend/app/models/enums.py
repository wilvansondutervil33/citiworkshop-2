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