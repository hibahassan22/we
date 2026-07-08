import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/react/',
  server: {
    proxy: {
      '/api/admin': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api': {
        target: 'https://drivo1.elmoroj.com',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
