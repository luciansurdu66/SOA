import json
import requests
from django.conf import settings
from django.http import HttpResponse


def proxy_request(
    method: str,
    base_url: str,
    path: str,
    request,
    pass_headers: bool = True,
    json_body: bool = True,
) -> HttpResponse:
    url = f"{base_url.rstrip('/')}/api{path}"
    headers = {}
    if pass_headers:
        auth = request.headers.get("Authorization")
        if auth:
            headers["Authorization"] = auth
        content_type = request.headers.get("Content-Type")
        if content_type:
            headers["Content-Type"] = content_type
    try:
        if method == "GET":
            resp = requests.get(url, headers=headers, params=request.GET, timeout=30)
        elif method == "POST":
            body = request.body if request.body else None
            if json_body and body:
                headers.setdefault("Content-Type", "application/json")
            resp = requests.post(
                url, headers=headers, data=body, params=request.GET, timeout=30
            )
        elif method == "PATCH":
            body = request.body if request.body else None
            if json_body and body:
                headers.setdefault("Content-Type", "application/json")
            resp = requests.patch(url, headers=headers, data=body, timeout=30)
        else:
            return HttpResponse(status=405)
    except requests.RequestException as e:
        return HttpResponse(
            json.dumps({"detail": str(e)}),
            status=502,
            content_type="application/json",
        )
    return HttpResponse(
        content=resp.content,
        status=resp.status_code,
        content_type=resp.headers.get("Content-Type", "application/json"),
    )
