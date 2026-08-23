import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: '/-Student-Data-Pipeline-UI/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    // Resolve the @/ alias inside Vitest the same way Vite does.
    alias: {
      '@/': path.resolve(import.meta.dirname, './src') + '/',
    },
  },
})
