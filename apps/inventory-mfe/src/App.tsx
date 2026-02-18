import React, { useCallback, useEffect, useMemo, useState } from "react";
import { stockApi, StockItem } from "./api";

export default function App() {
    const [stock, setStock] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [productId, setProductId] = useState("");
    const [quantity, setQuantity] = useState(0);

    const load = useCallback(() => {
        setLoading(true);
        setError("");
        stockApi
            .list()
            .then((data) => {
                const normalized = Array.isArray(data)
                    ? data
                    : Array.isArray((data as any)?.results)
                    ? ((data as any).results as StockItem[])
                    : [];
                setStock(normalized);
            })
            .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const safeStock = useMemo<StockItem[]>(
        () => (Array.isArray(stock) ? stock : []),
        [stock]
    );

    const lowStock = useMemo(
        () => safeStock.filter((s) => s.available <= 5 && s.quantity > 0),
        [safeStock]
    );

    const handleAddStock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!productId || quantity < 0) return;
        try {
            await stockApi.create(productId, quantity);
            setProductId("");
            setQuantity(0);
            load();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed");
        }
    };

    if (loading) return <p>Loading inventory...</p>;
    if (error) return <p className="text-red-600">{error}</p>;

    return (
        <div>
            <h2 className="mb-4 text-xl font-semibold">Inventory</h2>
            {lowStock.length > 0 && (
                <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-3 text-amber-800">
                    Low stock: {lowStock.map((s) => s.product_id).join(", ")}
                </div>
            )}
            <form onSubmit={handleAddStock} className="mb-6 flex gap-2">
                <input
                    type="text"
                    placeholder="Product ID"
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="rounded border px-3 py-2"
                />
                <input
                    type="number"
                    placeholder="Quantity"
                    value={quantity || ""}
                    onChange={(e) =>
                        setQuantity(parseInt(e.target.value, 10) || 0)
                    }
                    className="w-24 rounded border px-3 py-2"
                    min={0}
                />
                <button
                    type="submit"
                    className="rounded bg-slate-800 px-4 py-2 text-white hover:bg-slate-700"
                >
                    Add stock
                </button>
            </form>
            <div className="overflow-x-auto rounded border bg-white shadow">
                <table className="w-full text-left">
                    <thead className="bg-slate-100">
                        <tr>
                            <th className="p-3">Product</th>
                            <th className="p-3">Quantity</th>
                            <th className="p-3">Reserved</th>
                            <th className="p-3">Available</th>
                        </tr>
                    </thead>
                    <tbody>
                        {safeStock.map((s) => (
                            <tr key={s.product_id} className="border-t">
                                <td className="p-3 font-medium">
                                    {s.product_id}
                                </td>
                                <td className="p-3">{s.quantity}</td>
                                <td className="p-3">{s.reserved}</td>
                                <td className="p-3">{s.available}</td>
                            </tr>
                        ))}
                        {safeStock.length === 0 && (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="p-4 text-center text-slate-500"
                                >
                                    No stock entries.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
