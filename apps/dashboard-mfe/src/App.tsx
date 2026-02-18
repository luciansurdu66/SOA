import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api";

interface Order {
    id: number;
    status: string;
    total_amount: string;
}
interface StockItem {
    product_id: string;
    available: number;
}

export default function App() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [stock, setStock] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(() => {
        setLoading(true);
        Promise.all([api<Order[]>("/orders"), api<StockItem[]>("/stock")])
            .then(([o, s]) => {
                const normalizedOrders = Array.isArray(o)
                    ? o
                    : Array.isArray((o as any)?.results)
                    ? ((o as any).results as Order[])
                    : [];
                const normalizedStock = Array.isArray(s)
                    ? s
                    : Array.isArray((s as any)?.results)
                    ? ((s as any).results as StockItem[])
                    : [];
                setOrders(normalizedOrders);
                setStock(normalizedStock);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const safeOrders = useMemo<Order[]>(
        () => (Array.isArray(orders) ? orders : []),
        [orders]
    );
    const safeStock = useMemo<StockItem[]>(
        () => (Array.isArray(stock) ? stock : []),
        [stock]
    );

    const totalOrders = safeOrders.length;
    const lowStockCount = useMemo(
        () => safeStock.filter((s) => s.available <= 5).length,
        [safeStock]
    );

    if (loading) return <p>Loading dashboard...</p>;

    return (
        <div>
            <h2 className="mb-6 text-xl font-semibold">Dashboard</h2>
            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border bg-white p-6 shadow">
                    <p className="text-sm text-slate-500">Total orders</p>
                    <p className="text-2xl font-bold">{totalOrders}</p>
                </div>
                <div className="rounded-lg border bg-white p-6 shadow">
                    <p className="text-sm text-slate-500">Low stock items</p>
                    <p className="text-2xl font-bold">{lowStockCount}</p>
                </div>
                <div className="rounded-lg border bg-white p-6 shadow">
                    <p className="text-sm text-slate-500">Recent</p>
                    <p className="text-sm">
                        {safeOrders
                            .slice(0, 3)
                            .map((o) => `#${o.id} ${o.status}`)
                            .join(" · ") || "No orders"}
                    </p>
                </div>
            </div>
        </div>
    );
}
