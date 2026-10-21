import os

from datetime import datetime, timedelta, timezone
from app.config import settings
import bcrypt
import jwt 

SECERT_KEY = settings.secret_key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def hash_password(password):
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")

def verify_password(password, hashed_password):
    return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(data, expires_delta = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + ( expires_delta or timedelta(minutes= ACCESS_TOKEN_EXPIRE_MINUTES))

    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECERT_KEY, algorithm=ALGORITHM)

def decode_access_token(token):
    return jwt.decode(token, SECERT_KEY, algorithms=[ALGORITHM])