import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves the site under /vela-trade/
export default defineConfig({
  base: '/vela-trade/',
  plugins: [react()],
})
