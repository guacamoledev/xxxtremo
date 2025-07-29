import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

// Dynamic imports for main pages
const App = lazy(() => import('./App.tsx'));

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback={<div>Cargando aplicación...</div>}>
      <App />
    </Suspense>
  </React.StrictMode>
);
