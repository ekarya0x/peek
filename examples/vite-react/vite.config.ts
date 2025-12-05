import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import peek from '@peektree/vite-plugin'

export default defineConfig({
  plugins: [react(), peek()]
})

