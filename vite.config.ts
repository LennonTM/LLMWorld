import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The frontend talks to the Express proxy at /api, which holds the API key.
const API_PORT = process.env.PORT ?? '8787'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
})
