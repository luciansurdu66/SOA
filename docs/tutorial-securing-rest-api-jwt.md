# Tutorial: Securing a REST API with JWT in a Microservices Architecture

This tutorial walks through a working implementation of JWT-based security for a REST API behind an API gateway, with a dedicated auth service and multiple backend services.

**What you will learn**

-   Issuing and validating JWT access and refresh tokens in an auth service
-   Protecting gateway routes with JWT and delegating validation to the auth service
-   Sending tokens from the client and refreshing them on 401

**Prerequisites**

-   Docker and Docker Compose (to run the full stack)
-   Basic familiarity with REST APIs and HTTP headers

---

## 1. Architecture and Flow

The system uses:

-   **API Gateway** — Single entry point; forwards requests to backend services and enforces authentication on protected routes.
-   **Auth service** — Issues JWTs (access + refresh) and exposes a **verify** endpoint so the gateway can validate tokens without sharing secret-key logic.
-   **Backend services** (e.g. orders, inventory) — Receive requests only from the gateway; they trust the gateway’s routing and do not validate JWTs themselves (the gateway has already done so).

Security flow:

1. Client calls **POST /api/auth/login** (or register) through the gateway; gateway proxies to the auth service.
2. Auth service returns `access`, `refresh`, and `user_id`; client stores them (e.g. in `localStorage`).
3. For protected calls (e.g. **GET /api/orders**), the client sends `Authorization: Bearer <access>`.
4. Gateway extracts the token and calls the auth service **POST /api/verify** with `{"access": "<token>"}`.
5. If the auth service returns `user_id`, the gateway treats the request as authenticated and forwards it to the backend (e.g. orders), optionally passing `user_id` in the request body or params.
6. If the token is expired or invalid, the client can retry the request once after refreshing tokens via **POST /api/auth/refresh** and then resending with the new access token.

This keeps the JWT secret and validation logic in one place (auth service) while the gateway remains stateless and simply “asks” the auth service whether the token is valid.

---

## 2. Auth Service: Issuing and Verifying Tokens

The auth service is responsible for:

-   **Login / register** — Return access and refresh JWTs.
-   **Refresh** — Accept a valid refresh token and return a new access (and optionally refresh) token.
-   **Verify** — Accept an access token and return `user_id` (used by the gateway).

**Token contents and TTL**

-   Access token: short-lived (e.g. 1 hour), contains `sub` (user id), `exp`, and `type: "access"`.
-   Refresh token: longer-lived (e.g. 7 days), same structure with `type: "refresh"`.

Both are signed with a shared **JWT_SECRET_KEY** (must be the same across gateway and auth in this design). Example settings (Django):

```python
# auth_service/settings.py
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "jwt-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TTL = 3600
JWT_REFRESH_TTL = 86400 * 7
```

**Issuing tokens (login/register)**

Encode a payload with `sub`, `exp`, and `type`; sign with the secret. Return both tokens and `user_id` in the JSON response so the client can store them.

**Verify endpoint**

The gateway calls **POST /api/verify** with body `{"access": "<token>"}`. The auth service:

1. Decodes the JWT with the same secret and algorithm.
2. Checks `type == "access"` and that the user still exists.
3. Returns `{"user_id": <id>}` on success, or 401 on invalid/expired token.

Important: use a single algorithm (e.g. HS256), validate `exp` (and optional `nbf`), and handle decode errors (expired, bad signature) by returning 401 rather than 500. A small clock-skew leeway (e.g. 15 seconds) for `exp`/`nbf` is often useful.

In the reference codebase this lives in the auth service’s API (e.g. `/api/verify`) and in a small `jwt_utils` module that performs `encode_access`, `encode_refresh`, and `decode_token`.

---

## 3. Gateway: Protecting Routes and Proxying

The gateway exposes:

-   **Public routes** — e.g. `/api/auth/login`, `/api/auth/register`, `/api/auth/refresh` — no token required; request is proxied to the auth service.
-   **Protected routes** — e.g. `/api/orders`, `/api/stock` — require a valid JWT; the gateway validates the token before proxying.

**How the gateway validates**

Instead of decoding the JWT in the gateway (which would require embedding the secret there), the gateway calls the auth service’s verify endpoint with the token. If the response is 200 and contains `user_id`, the gateway treats the request as authenticated and uses `user_id` when calling backend services (e.g. adds `user_id` to the body or query for orders). If verify returns an error, the gateway returns 401 to the client.

**Implementation pattern (Django Ninja example)**

-   Define a custom auth class (e.g. `JWTBearer`) that:
    -   Reads the `Authorization` header and strips the `Bearer ` prefix.
    -   Calls the auth service’s verify endpoint with that token.
    -   Returns `user_id` on success (which Ninja will attach to `request.auth`) or `None` to deny access.
-   Attach this to protected routes: `@api.get("/orders", auth=JWTBearer())`.
-   In each protected view, get `user_id` from `request.auth` and pass it to the backend (e.g. in query params or JSON body).

The gateway must also forward the `Authorization` header when proxying to the auth service for login/refresh; for backend services, the gateway typically does **not** forward the raw JWT but instead sends identity via `user_id` in the proxied request, so backends stay simple and do not need the JWT secret.

**Nginx (optional)**

If you put Nginx in front of the gateway, ensure it forwards the header:

```nginx
location /api/ {
    proxy_pass http://api_gateway;
    proxy_set_header Authorization $http_authorization;
    # ... other proxy_set_header directives
}
```

Otherwise the gateway will not see `Authorization` and will reject protected requests.

---

## 4. Client: Sending Tokens and Refreshing on 401

The client must:

1. Store tokens (and optionally `user_id`) after login/register/refresh (e.g. in `localStorage` or memory).
2. Send the access token on every protected request: `Authorization: Bearer <access>`.
3. On **401 Unauthorized**, attempt a single refresh: call **POST /api/auth/refresh** with the stored refresh token, then retry the original request with the new access token.

**Example pattern (TypeScript)**

-   `getToken()` — read access token from storage.
-   `api(path, options)` — set `Authorization: Bearer ${getToken()}` on the request; if the response is 401 and a refresh succeeds, call `api(path, options)` once more (use a “retried” flag to avoid infinite retry).
-   `refreshTokens()` — POST to `/api/auth/refresh` with `{ refresh }`, then persist the new `access`, `refresh`, and `user_id` and return success/failure.

This keeps the rest of the app simple: all API calls go through one helper that handles token attachment and one-time refresh on 401.

---

## 5. Running the Example

The reference implementation is structured as follows (paths relative to the repository root):

-   **Auth service** — `services/auth/` (Django app with `/api/register`, `/api/login`, `/api/refresh`, `/api/verify` and JWT encoding/decoding).
-   **Gateway** — `services/gateway/` (Django Ninja app with `JWTBearer` and proxy views to auth, orders, inventory).
-   **Infrastructure** — `infra/docker-compose.yml` defines `auth`, `gateway1`, `gateway2`, and optionally Nginx in front.

To run the stack:

1. Clone the repository and from the repo root run (for example):  
   `docker compose -f infra/docker-compose.yml up --build`
2. Ensure the gateway has `AUTH_SERVICE_URL` pointing at the auth service (e.g. `http://auth:8000`) and that auth and gateway share the same `JWT_SECRET_KEY`.
3. Use the API at the gateway’s base URL (e.g. `http://localhost/api/` if Nginx is used, or the gateway port directly). Register or login to obtain tokens, then call protected endpoints with `Authorization: Bearer <access>`.

You can test verify directly with curl:

```bash
# After logging in and copying the access token:
curl -X POST http://localhost/api/auth/verify -H "Content-Type: application/json" -d '{"access":"<YOUR_ACCESS_TOKEN>"}'
```

Expected: `{"user_id": 1}` on success, or 401 with an error body when the token is missing, expired, or invalid.

---

## Summary

| Component        | Responsibility                                                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Auth service** | Issue access/refresh JWTs; expose `/api/verify` for token validation; use a single secret and algorithm.                                                           |
| **Gateway**      | Protect routes with a custom auth class that calls the auth service verify endpoint; proxy to backends with `user_id`; forward `Authorization` for auth endpoints. |
| **Client**       | Store tokens; send `Authorization: Bearer <access>`; on 401, refresh once and retry.                                                                               |

This pattern keeps JWT logic centralized in the auth service, avoids duplicating secrets in the gateway, and scales to multiple backend services without each one handling JWTs. The same repository also demonstrates load balancing (e.g. Nginx with multiple gateway replicas) and Redis-backed WebSocket notifications, which you can explore next.
