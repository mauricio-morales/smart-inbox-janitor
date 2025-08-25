import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/main',
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
    build: {
      outDir: 'dist/preload'
    },
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
      outDir: 'dist/renderer',
      rollupOptions: {
        input: {
          main: resolve('src/renderer/index.html')
        }
      }
    }
  }
})