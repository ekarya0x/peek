import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import peek from '@ekarya0x/vite-plugin'

export default defineConfig({
  plugins: [react(), peek()]
})

