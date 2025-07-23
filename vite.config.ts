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
    // rollupOptions: {
    //   output: {
    //     manualChunks(id) {
    //       if (id.includes('node_modules')) {
    //         if (id.includes('firebase')) return 'firebase';
    //         if (id.includes('@mui')) return 'mui';
    //         if (id.includes('react')) return 'react';
    //       }
    //     },
    //   },
    // },
  },
})
