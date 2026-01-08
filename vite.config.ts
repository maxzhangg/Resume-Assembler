import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        // Entry point for the main process
        entry: 'electron/main.ts',
      },
      preload: {
        input: 'electron/preload.ts', 
      },
      renderer: {},
    }),
  ],
  server: {
    port: 3000,
    strictPort: true,
  }
})