import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";

export default defineConfig({
    plugins: [
        react(),
        federation({
            name: "orders",
            exposes: { "./App": "./src/App.tsx" },
            shared: ["react", "react-dom", "react-router-dom"],
        }),
    ],
    build: { target: "esnext", minify: false, cssCodeSplit: false },
    server: {
        port: 5001,
        cors: true,
        proxy: {
            "/api": {
                target: "http://localhost",
                changeOrigin: true,
            },
        },
    },
});
