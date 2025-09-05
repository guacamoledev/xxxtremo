import React, { Suspense, lazy } from 'react';
import { CircularProgress } from '@mui/material';
import { createRoot } from 'react-dom/client';
import './index.css';

// Dynamic imports for main pages
const App = lazy(() => import('./App.tsx'));

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback={
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
        <CircularProgress size={32} />
        <span style={{ marginTop: 16, color: '#888' }}>Cargando aplicación...</span>
      </div>
    }>
      <App />
    </Suspense>
  </React.StrictMode>
);
