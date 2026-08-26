import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages serves this as a project site at /vidz/, not the domain root.
  base: command === 'build' ? '/vidz/' : '/',
  plugins: [react()],
}))
