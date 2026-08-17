import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import electron from "vite-plugin-electron/simple";
import { docsRegistryPlugin } from "./plugins/docs-registry";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "/app/",

  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    allowedHosts: [
      "outrageous-natasha-nonpictorially.ngrok-free.dev",
      ".ngrok-free.dev",
    ],
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
      "/socket.io": {
        target: "ws://localhost:5000",
        ws: true,
      },
    },
  },

  build: {
    emptyOutDir: true,
  },

  plugins: [
    react(),
    tailwindcss(),
    docsRegistryPlugin(),
    electron({
      main: {
        entry: path.resolve(__dirname, 'electron/main/index.ts'),
        vite: {
          build: {
            rollupOptions: {
              external: ['better-sqlite3', 'electron-log', 'sqlite3', 'path', 'url', 'fs', 'electron', 'bufferutil', 'utf-8-validate']
            }
          }
        }
      },
      preload: {
        input: path.resolve(__dirname, 'electron/preload/index.ts'),
        vite: {
          build: {
            rollupOptions: {
              external: ['better-sqlite3', 'electron-log', 'sqlite3', 'path', 'url', 'fs', 'electron', 'bufferutil', 'utf-8-validate']
            }
          }
        }
      },
    })
  ],
});