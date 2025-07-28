import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@mui/material', '@mui/system', '@mui/icons-material'],
  },
  build: {
    chunkSizeWarningLimit: 1000, // aumenta el límite a 1000 kB
    rollupOptions: {
      output: {
        manualChunks: {
          // Agrupa dependencias grandes en chunks separados
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'mui-vendor': ['@mui/material', '@mui/system', '@mui/icons-material', '@mui/x-date-pickers'],
          'firebase-vendor': ['firebase'],
        },
      },
    },
  },
})
