import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        external: ['better-sqlite3', 'keytar', 'googleapis']
      }
    },
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
        '@providers': resolve('src/providers')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
        '@providers': resolve('src/providers')
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared'),
        '@providers': resolve('src/providers')
      }
    },
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          main: resolve('src/renderer/index.html')
        }
      }
    }
  }
})