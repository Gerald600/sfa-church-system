import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    pool: 'threads',
    isolate: false,
    fileParallelism: false,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) return 'lucide'
            if (id.includes('recharts') || id.includes('d3')) return 'charts'
            if (id.includes('@supabase') || id.includes('postgrest')) return 'supabase'
            if (id.includes('react-router') || id.includes('react-dom') || id.includes('react-hot-toast')) return 'react-vendor'
            return 'vendor'
          }
        }
      }
    },
    chunkSizeWarningLimit: 1200
  }
})
