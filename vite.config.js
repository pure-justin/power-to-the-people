import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import cesium from "vite-plugin-cesium";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cesium()],
  define: {
    CESIUM_BASE_URL: JSON.stringify("/cesium/"),
  },
  build: {
    // Cesium is large, suppress warning
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-firebase": [
            "firebase/app",
            "firebase/auth",
            "firebase/firestore",
            "firebase/storage",
            "firebase/functions",
          ],
          "vendor-resium": ["resium"],
          "vendor-icons": ["lucide-react"],
          "vendor-proj4": ["proj4"],
        },
      },
    },
  },
});
