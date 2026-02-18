import json
import requests
from django.conf import settings
from ninja import NinjaAPI
from ninja.errors import HttpError

from .auth import JWTBearer

api = NinjaAPI(title="Gateway API", version="1.0")

AUTH = settings.AUTH_SERVICE_URL
ORDERS = settings.ORDERS_SERVICE_URL
INVENTORY = settings.INVENTORY_SERVICE_URL


def _req(
    method: str,
    base: str,
    path: str,
    *,
    json_data: dict = None,
    params: dict = None,
    headers: dict = None,
):
    url = f"{base.rstrip('/')}/api{path}"
    h = headers or {}
    try:
        if method == "GET":
            r = requests.get(url, params=params, headers=h, timeout=30)
        elif method == "POST":
            r = requests.post(url, json=json_data, params=params, headers=h, timeout=30)
        elif method == "PATCH":
            r = requests.patch(url, json=json_data, headers=h, timeout=30)
        else:
            raise HttpError(405, "Method not allowed")
    except requests.RequestException as e:
        raise HttpError(502, str(e))
    if r.status_code >= 400:
        raise HttpError(r.status_code, r.text or "Upstream error")
    return r.json() if r.content else None


@api.api_operation(["POST"], "/auth/register")
def auth_register(request):
    body = json.loads(request.body) if request.body else {}
    return _req("POST", AUTH, "/register", json_data=body)


@api.api_operation(["POST"], "/auth/login")
def auth_login(request):
    body = json.loads(request.body) if request.body else {}
    return _req("POST", AUTH, "/login", json_data=body)


@api.api_operation(["POST"], "/auth/refresh")
def auth_refresh(request):
    body = json.loads(request.body) if request.body else {}
    return _req("POST", AUTH, "/refresh", json_data=body)


@api.get("/orders", auth=JWTBearer())
def orders_list(request):
    user_id = request.auth
    return _req("GET", ORDERS, "/orders", params={"user_id": user_id})


@api.post("/orders", auth=JWTBearer())
def orders_create(request):
    user_id = request.auth
    body = json.loads(request.body) if request.body else {}
    body["user_id"] = user_id
    return _req("POST", ORDERS, "/orders", json_data=body)


@api.get("/orders/{order_id}", auth=JWTBearer())
def order_get(request, order_id: int):
    return _req("GET", ORDERS, f"/orders/{order_id}")


@api.patch("/orders/{order_id}", auth=JWTBearer())
def order_update(request, order_id: int):
    body = json.loads(request.body) if request.body else {}
    return _req("PATCH", ORDERS, f"/orders/{order_id}", json_data=body)


@api.get("/stock", auth=JWTBearer())
def stock_list(request):
    return _req("GET", INVENTORY, "/stock")


@api.get("/stock/{product_id}", auth=JWTBearer())
def stock_get(request, product_id: str):
    return _req("GET", INVENTORY, f"/stock/{product_id}")


@api.post("/stock", auth=JWTBearer())
def stock_create(request):
    body = json.loads(request.body) if request.body else {}
    return _req("POST", INVENTORY, "/stock", json_data=body)


@api.post("/reserve", auth=JWTBearer())
def reserve(request):
    body = json.loads(request.body) if request.body else {}
    return _req("POST", INVENTORY, "/reserve", json_data=body)


@api.post("/release", auth=JWTBearer())
def release(request):
    body = json.loads(request.body) if request.body else {}
    order_id = body.get("order_id")
    if not order_id:
        raise HttpError(400, "order_id required")
    return _req("POST", INVENTORY, "/release", params={"order_id": order_id})


@api.post("/orders/{order_id}/invoice", auth=JWTBearer())
def order_invoice(request, order_id: int):
    try:
        import boto3

        client = boto3.client("lambda", region_name=settings.AWS_REGION)
        payload = json.dumps({"order_id": order_id})
        resp = client.invoke(
            FunctionName=settings.LAMBDA_INVOICE_FUNCTION,
            InvocationType="RequestResponse",
            Payload=payload,
        )
        result = json.loads(resp["Payload"].read().decode())
        if result.get("statusCode", 200) >= 400:
            raise HttpError(result["statusCode"], result.get("body", "Lambda error"))
        body = result.get("body", "{}")
        return json.loads(body) if isinstance(body, str) else body
    except HttpError:
        raise
    except Exception as e:
        raise HttpError(502, f"Lambda invocation failed: {e}")
