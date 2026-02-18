import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";
export default defineConfig({
    plugins: [
        react(),
        federation({
            name: "shell",
            remotes: {
                orders: "http://localhost:5001/assets/remoteEntry.js",
                inventory: "http://localhost:5002/assets/remoteEntry.js",
                dashboard: "http://localhost:5003/assets/remoteEntry.js",
            },
            shared: ["react", "react-dom", "react-router-dom"],
        }),
    ],
    build: { target: "esnext", minify: false, cssCodeSplit: false },
    server: { port: 5173, cors: true },
});
