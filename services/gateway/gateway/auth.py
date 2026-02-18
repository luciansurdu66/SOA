import logging
from typing import Optional

import requests
from django.conf import settings
from ninja.security import HttpBearer

logger = logging.getLogger(__name__)


def _verify_token_with_auth_service(token: str) -> Optional[int]:
    """Validate access token via auth service. Returns user_id or None."""
    auth_url = getattr(settings, "AUTH_SERVICE_URL", "").rstrip("/")
    if not auth_url:
        logger.warning("AUTH_SERVICE_URL not set")
        return None
    try:
        resp = requests.post(
            f"{auth_url}/api/verify",
            json={"access": token},
            timeout=5,
            headers={"Content-Type": "application/json"},
        )
        if resp.status_code != 200:
            logger.warning(
                "Auth verify returned %s: %s", resp.status_code, resp.text[:200]
            )
            return None
        data = resp.json()
        user_id = data.get("user_id")
        return user_id if user_id is not None else None
    except requests.RequestException as e:
        logger.warning("Auth verify request failed: %s", e)
        return None


class JWTBearer(HttpBearer):
    def authenticate(self, request, token):
        if not token:
            return None
        token = token.strip()
        return _verify_token_with_auth_service(token)


def get_user_id_from_token(request):
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        return None
    token = auth[7:].strip()
    return _verify_token_with_auth_service(token)
