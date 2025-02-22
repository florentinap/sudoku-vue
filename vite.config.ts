import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import ip from 'ip'

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === "production" ? '/sudoku-vue/' : '/',
  plugins: [vue()],
  server: {
    host: ip.address(),
    port: 3000
  }
})
