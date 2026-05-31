import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Deployed to GitHub Pages under /EnchantedBasement/trivia/
export default defineConfig({
  plugins: [react()],
  base: '/EnchantedBasement/trivia/',
})
