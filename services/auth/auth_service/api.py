from django.contrib.auth import authenticate
from ninja import NinjaAPI
from ninja.errors import HttpError

from .jwt_utils import encode_access, encode_refresh, decode_token
from .models import User
from .schemas import LoginIn, RegisterIn, RefreshIn, TokenOut, VerifyIn, VerifyOut

api = NinjaAPI(title="Auth API", version="1.0")


@api.post("/register", response=TokenOut)
def register(request, payload: RegisterIn):
    if User.objects.filter(username=payload.username).exists():
        raise HttpError(400, "Username already taken")
    if User.objects.filter(email=payload.email).exists():
        raise HttpError(400, "Email already taken")
    user = User.objects.create_user(
        username=payload.username,
        email=payload.email,
        password=payload.password,
    )
    return TokenOut(
        access=encode_access(user.id),
        refresh=encode_refresh(user.id),
        user_id=user.id,
    )


@api.post("/login", response=TokenOut)
def login(request, payload: LoginIn):
    user = authenticate(request, username=payload.username, password=payload.password)
    if not user:
        raise HttpError(401, "Invalid credentials")
    return TokenOut(
        access=encode_access(user.id),
        refresh=encode_refresh(user.id),
        user_id=user.id,
    )


@api.post("/refresh", response=TokenOut)
def refresh(request, payload: RefreshIn):
    payload_jwt = decode_token(payload.refresh)
    if not payload_jwt or payload_jwt.get("type") != "refresh":
        raise HttpError(401, "Invalid refresh token")
    try:
        user_id = int(payload_jwt.get("sub"))
    except (TypeError, ValueError):
        raise HttpError(401, "Invalid refresh token")
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        raise HttpError(401, "User not found")
    return TokenOut(
        access=encode_access(user.id),
        refresh=encode_refresh(user.id),
        user_id=user.id,
    )


@api.post("/verify", response=VerifyOut)
def verify(request, payload: VerifyIn):
    """Validate access token and return user_id. Used by gateway for JWT validation."""
    access = (payload.access or "").strip() if hasattr(payload, "access") else ""
    if not access:
        raise HttpError(401, "Invalid access token")
    payload_jwt = decode_token(access)
    if not payload_jwt or payload_jwt.get("type") != "access":
        raise HttpError(401, "Invalid access token")
    try:
        user_id = int(payload_jwt.get("sub"))
    except (TypeError, ValueError):
        raise HttpError(401, "Invalid access token")
    try:
        User.objects.get(pk=user_id)
    except User.DoesNotExist:
        raise HttpError(401, "User not found")
    return VerifyOut(user_id=user_id)
