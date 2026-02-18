import React, { useCallback, useEffect, useState } from "react";
import { Routes, Route, Link, useParams } from "react-router-dom";
import { ordersApi, Order } from "./api";

function OrderList() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = useCallback(() => {
        setLoading(true);
        setError("");
        ordersApi
            .list()
            .then(setOrders)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    if (loading) return <p>Loading orders...</p>;
    if (error) return <p className="text-red-600">{error}</p>;
    return (
        <div>
            <div className="mb-4 flex justify-between">
                <h2 className="text-xl font-semibold">Orders</h2>
                <Link
                    to="/orders/new"
                    className="rounded bg-slate-800 px-4 py-2 text-white hover:bg-slate-700"
                >
                    New order
                </Link>
            </div>
            <ul className="divide-y rounded border bg-white shadow">
                {orders.map((o) => (
                    <li
                        key={o.id}
                        className="flex items-center justify-between p-4"
                    >
                        <Link
                            to={`/orders/${o.id}`}
                            className="font-medium text-slate-800 hover:underline"
                        >
                            Order #{o.id} – {o.status} – {o.total_amount}
                        </Link>
                        <Link
                            to={`/orders/${o.id}`}
                            className="text-sm text-slate-600 hover:underline"
                        >
                            View
                        </Link>
                    </li>
                ))}
                {orders.length === 0 && (
                    <li className="p-4 text-slate-500">No orders yet.</li>
                )}
            </ul>
        </div>
    );
}

function NewOrder() {
    const [productId, setProductId] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [unitPrice, setUnitPrice] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await ordersApi.create([
                { product_id: productId, quantity, unit_price: unitPrice },
            ]);
            window.location.href = "/orders";
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md rounded border bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">New order</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <input
                    type="text"
                    placeholder="Product ID"
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="rounded border px-3 py-2"
                    required
                />
                <input
                    type="number"
                    placeholder="Quantity"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
                    className="rounded border px-3 py-2"
                    min={1}
                />
                <input
                    type="text"
                    placeholder="Unit price"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="rounded border px-3 py-2"
                    required
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                    type="submit"
                    disabled={loading}
                    className="rounded bg-slate-800 py-2 text-white hover:bg-slate-700 disabled:opacity-50"
                >
                    Create
                </button>
            </form>
        </div>
    );
}

function OrderDetail() {
    const { id: idParam } = useParams();
    const id = parseInt(idParam ?? "0", 10);
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        ordersApi
            .get(id)
            .then(setOrder)
            .finally(() => setLoading(false));
    }, [id]);

    const requestInvoice = async () => {
        try {
            const r = await ordersApi.invoice(id);
            setInvoiceUrl(r.invoice_url);
        } catch {
            // ignore
        }
    };

    if (loading || !order) return <p>Loading...</p>;
    return (
        <div className="rounded border bg-white p-6 shadow">
            <h2 className="text-xl font-semibold">Order #{order.id}</h2>
            <p className="text-slate-600">
                Status: {order.status} | Total: {order.total_amount}
            </p>
            <ul className="my-4 list-disc pl-6">
                {order.items.map((i, idx) => (
                    <li key={idx}>
                        {i.product_id} x{i.quantity} @ {i.unit_price}
                    </li>
                ))}
            </ul>
            <button
                type="button"
                onClick={requestInvoice}
                className="rounded bg-slate-700 px-4 py-2 text-white hover:bg-slate-600"
            >
                Generate invoice
            </button>
            {invoiceUrl && (
                <p className="mt-2">
                    <a
                        href={invoiceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 underline"
                    >
                        Download invoice
                    </a>
                </p>
            )}
        </div>
    );
}

export default function App() {
    return (
        <Routes>
            <Route index element={<OrderList />} />
            <Route path="new" element={<NewOrder />} />
            <Route path=":id" element={<OrderDetail />} />
        </Routes>
    );
}
