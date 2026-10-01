import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Chuyển request /api/* sang backend Express khi dev
      "/api": {
        target: "http://localhost:5001",
        changeOrigin: true,
      },
    },
  },
});
