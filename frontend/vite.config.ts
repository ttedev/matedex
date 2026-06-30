import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/plans': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/photos': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/profile': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/tags': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
})
