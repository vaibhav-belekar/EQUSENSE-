import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true
      }
    },
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' 'unsafe-hashes' blob: data:; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; connect-src 'self' http://localhost:8000 ws://localhost:8000 ws://localhost:5173 http://localhost:5173; font-src 'self' data:; worker-src 'self' blob: data:; object-src 'none'; base-uri 'self';"
    }
  }
})

