import time
from django.conf import settings
import jwt

# Leeway for exp/nbf to handle clock skew
JWT_LEEWAY_SECONDS = 15


def encode_access(user_id: int) -> str:
    raw = jwt.encode(
        {
            "sub": str(user_id),
            "exp": int(time.time()) + settings.JWT_ACCESS_TTL,
            "type": "access",
        },
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    return raw if isinstance(raw, str) else raw.decode("utf-8")


def encode_refresh(user_id: int) -> str:
    raw = jwt.encode(
        {
            "sub": str(user_id),
            "exp": int(time.time()) + settings.JWT_REFRESH_TTL,
            "type": "refresh",
        },
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    return raw if isinstance(raw, str) else raw.decode("utf-8")


def decode_token(token: str) -> dict | None:
    if not token or not isinstance(token, str):
        return None
    token = token.strip()
    if not token:
        return None
    try:
        return jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            leeway=JWT_LEEWAY_SECONDS,
        )
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidSignatureError:
        return None
    except jwt.PyJWTError as e:
        import logging

        logging.getLogger(__name__).warning("JWT decode failed: %s", type(e).__name__)
        return None
