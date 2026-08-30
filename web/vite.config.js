import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Built app is served by the Node server (same origin), so base is relative and API calls
// use relative paths. In dev, proxy /api and /events to the backend.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  build: { outDir: 'dist', emptyOutDir: true },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
      '/events': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
})
