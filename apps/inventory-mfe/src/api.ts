const API_BASE = import.meta.env.VITE_API_URL || "/api";
const STORAGE_KEY = "auth";

function getStored(): {
    access: string | null;
    refresh: string | null;
    user_id: number | null;
} {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { access: null, refresh: null, user_id: null };
        const data = JSON.parse(raw);
        return {
            access: data.access ?? null,
            refresh: data.refresh ?? null,
            user_id: data.user_id ?? null,
        };
    } catch {
        return { access: null, refresh: null, user_id: null };
    }
}

function getToken(): string | null {
    return getStored().access;
}

function saveTokens(access: string, refresh: string, user_id: number): void {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ access, refresh, user_id })
        );
    } catch {
        // ignore
    }
}

async function refreshTokens(): Promise<boolean> {
    const { refresh } = getStored();
    if (!refresh) return false;
    const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return false;
    const access = data.access;
    const newRefresh = data.refresh ?? refresh;
    const user_id = data.user_id;
    if (access && user_id != null) {
        saveTokens(access, newRefresh, user_id);
        return true;
    }
    return false;
}

export async function api<T>(
    path: string,
    options: RequestInit = {},
    retried = false
): Promise<T> {
    const token = getToken();
    const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(options.headers as object),
    };
    if (token)
        (headers as Record<string, string>)[
            "Authorization"
        ] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));

    if (res.status === 401 && !retried && (await refreshTokens())) {
        return api<T>(path, options, true);
    }

    if (!res.ok) throw new Error(data.detail || res.statusText);
    return data as T;
}

export interface StockItem {
    product_id: string;
    quantity: number;
    reserved: number;
    available: number;
}

export const stockApi = {
    list: () => api<StockItem[]>("/stock"),
    get: (productId: string) => api<StockItem>(`/stock/${productId}`),
    create: (productId: string, quantity: number) =>
        api<StockItem>("/stock", {
            method: "POST",
            body: JSON.stringify({ product_id: productId, quantity }),
        }),
};
