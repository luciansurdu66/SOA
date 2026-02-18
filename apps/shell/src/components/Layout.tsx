import React from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Layout({ children }: { children?: React.ReactNode }) {
    const { token, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-slate-800 text-white shadow">
                <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
                    <nav className="flex gap-6">
                        <Link to="/dashboard" className="hover:underline">
                            Dashboard
                        </Link>
                        <Link to="/orders" className="hover:underline">
                            Orders
                        </Link>
                        <Link to="/inventory" className="hover:underline">
                            Inventory
                        </Link>
                    </nav>
                    {token ? (
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="rounded bg-slate-600 px-3 py-1 hover:bg-slate-500"
                        >
                            Logout
                        </button>
                    ) : (
                        <Link
                            to="/login"
                            className="rounded bg-slate-600 px-3 py-1 hover:bg-slate-500"
                        >
                            Login
                        </Link>
                    )}
                </div>
            </header>
            <main className="mx-auto max-w-7xl px-4 py-6">
                {children ?? <Outlet />}
            </main>
        </div>
    );
}
