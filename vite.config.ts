import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from a custom domain (weather.bryht.net) at the root, so base is '/'.
export default defineConfig({
  plugins: [react()],
  base: '/',
})
