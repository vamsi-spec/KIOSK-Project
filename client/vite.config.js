import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    // Proxy API calls to Nginx during local dev (without Docker)
    proxy: {
      '/api': {
        target: 'http://localhost:80',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:80',
        ws: true,
        changeOrigin: true
      }
    }
  },

  build: {
    outDir: 'dist',
    // Output dir is mounted into the Nginx container in production
    sourcemap: false
  }
})