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
        // CORRECT WAY to reference preload in Vite:
        // Use process.cwd() or relative path to ensure it resolves correctly during build
        input: 'electron/preload.ts', 
      },
      // Polyfill the Electron and Node.js built-in modules for Renderer process
      renderer: {},
    }),
  ],
  server: {
    // Ensure the port is fixed so Electron knows where to look if not using env vars
    port: 3000,
    strictPort: true,
  }
})