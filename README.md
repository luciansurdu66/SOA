# SOA Microservices

Microservices stack: API gateway (JWT auth), auth, orders, inventory, Nginx load balancing, Redis (channel layer), RabbitMQ. Frontend: React shell + Module Federation (orders, inventory, dashboard MFEs).

---

## Mini tutorial: run the application

### Prerequisites

-   **Docker** and **Docker Compose**
-   **Node.js** 18+ and **pnpm**

### 1. Start the backend

From the project root:

```bash
docker compose -f infra/docker-compose.yml up --build
```

Wait until all services are up. You should have:

-   **Nginx** → http://localhost (port 80), proxying to the API and serving static assets
-   **API** at http://localhost/api/ (auth, orders, inventory via gateway)
-   **RabbitMQ** management UI at http://localhost:15672 (guest/guest)
-   **Redis** on port 6379

### 2. Start the frontend (shell)

In a new terminal, from the project root:

```bash
cd apps/shell
pnpm install
pnpm dev
```

Open **http://localhost:5173**. The shell proxies `/api` to `http://localhost`, so the backend must be running on port 80 (step 1).

### 3. (Optional) Run the micro-frontends

For the full Module Federation experience (Orders, Inventory, Dashboard), run each MFE in its own terminal:

```bash
# Terminal 2 – Orders MFE
cd apps/orders-mfe && pnpm install && pnpm dev

# Terminal 3 – Inventory MFE
cd apps/inventory-mfe && pnpm install && pnpm dev

# Terminal 4 – Dashboard MFE
cd apps/dashboard-mfe && pnpm install && pnpm dev
```

Ports: shell **5173**, orders **5001**, inventory **5002**, dashboard **5003**. Reload the shell (http://localhost:5173) to load the remotes.

### 4. Try it out

1. Register or log in via the shell (calls `/api/auth/login` or `/api/auth/register`).
2. Use the app (orders, stock) — protected routes use the JWT returned at login.

To stop the backend: in the terminal where Docker Compose is running, press `Ctrl+C`, then:

```bash
docker compose -f infra/docker-compose.yml down
```

---

## Project layout

| Area                 | Description                                                          |
| -------------------- | -------------------------------------------------------------------- |
| `infra/`             | Docker Compose, Nginx config, Lambda (invoice PDF)                   |
| `services/gateway`   | API gateway (Django Ninja), JWT auth, proxy to auth/orders/inventory |
| `services/auth`      | Auth service (Django), JWT issue + verify                            |
| `services/orders`    | Orders service (Django)                                              |
| `services/inventory` | Inventory service (Django)                                           |
| `apps/shell`         | React host app (Vite, Module Federation)                             |
| `apps/orders-mfe`    | Orders micro-frontend                                                |
| `apps/inventory-mfe` | Inventory micro-frontend                                             |
| `apps/dashboard-mfe` | Dashboard micro-frontend                                             |
| `docs/`              | Tutorials and diagrams (e.g. JWT securing REST API)                  |
