import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  root: __dirname,
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: false,
    hmr: {
      port: 3000
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  base: '/',
  resolve: {
    preserveSymlinks: true,
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})

