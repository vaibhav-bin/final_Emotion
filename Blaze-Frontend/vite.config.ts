import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/analyze': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/violent.wav': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/0.wav': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/Young_Female_South.wav': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
