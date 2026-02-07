import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import path from "path";

export default defineConfig({
  plugins: [solidPlugin()],
  resolve: {
    alias: {
      "@core": path.resolve(__dirname, "src/core"),
      "@infra": path.resolve(__dirname, "src/infra"),
      "@app": path.resolve(__dirname, "src/app"),
      "@ui": path.resolve(__dirname, "src/ui"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api": "http://localhost:8000",
      "/ws": { target: "ws://localhost:8000", ws: true },
    },
  },
  build: {
    target: "esnext",
  },
});
