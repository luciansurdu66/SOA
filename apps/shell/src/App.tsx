import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import { useAuth } from "./contexts/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";

const OrdersApp = lazy(() => import("orders/App"));
const InventoryApp = lazy(() => import("inventory/App"));
const DashboardApp = lazy(() => import("dashboard/App"));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { token } = useAuth();
    if (!token) return <Navigate to="/login" replace />;
    return <>{children}</>;
}

function App() {
    return (
        <Layout>
            <Suspense
                fallback={<div className="p-8 text-center">Loading...</div>}
            >
                <Routes>
                    <Route
                        path="/"
                        element={<Navigate to="/dashboard" replace />}
                    />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route
                        path="/dashboard/*"
                        element={
                            <ProtectedRoute>
                                <DashboardApp />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/orders/*"
                        element={
                            <ProtectedRoute>
                                <OrdersApp />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/inventory/*"
                        element={
                            <ProtectedRoute>
                                <InventoryApp />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="*"
                        element={<Navigate to="/dashboard" replace />}
                    />
                </Routes>
            </Suspense>
        </Layout>
    );
}

export default App;
