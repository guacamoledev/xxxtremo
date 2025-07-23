import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import theme from './theme';
import UsersPage from './pages/UsersPage';
import LandingPage from './pages/LandingPage';
import TermsPage from './pages/TermsPage';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import BettingPage from './pages/BettingPage';
import MyBetsPage from './pages/MyBetsPage';
import BettingAdminPage from './pages/BettingAdminPage';
import LiveStreamPage from './pages/LiveStreamPage';
import FinancesPage from './pages/FinancesPage';

// Admin pages
import AdminPanel from './pages/admin/AdminPanel';
import PalenquesPage from './pages/admin/PalenquesPage';
import EventsPage from './pages/admin/EventsPage';
import FightsPage from './pages/admin/FightsPage';
import FinanceAdminPage from './pages/admin/FinanceAdminPage';

// Debug utilities for development
import './utils/debugAuth';
import './utils/debugReactQuery';
import './utils/userAdmin';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 segundos (más frecuente para desarrollo)
      gcTime: 5 * 60 * 1000, // 5 minutos
      refetchOnWindowFocus: true, // Refrescar al volver a la ventana
      retry: 2, // Reintentar hasta 2 veces en caso de error
    },
    mutations: {
      retry: 1, // Reintentar mutaciones 1 vez
      onError: (error) => {
        console.error('Mutation error:', error);
      },
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <NotificationProvider>
          <AuthProvider>
            <Router>
            <Routes>
              {/* Landing page y términos */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/terms" element={<TermsPage />} />

              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/betting"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <BettingPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Usuarios - solo para admin y finanzas */}
              <Route
                path="/users"
                element={
                  <ProtectedRoute roles={['admin', 'finance']}>
                    <Layout>
                      <UsersPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <Layout>
                      <AdminPanel />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/palenques"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <Layout>
                      <PalenquesPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/events"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <Layout>
                      <EventsPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/fights"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <Layout>
                      <FightsPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/betting"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <Layout>
                      <BettingAdminPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/finances"
                element={
                  <ProtectedRoute roles={['admin', 'finance']}>
                    <Layout>
                      <FinanceAdminPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Other protected routes */}
              <Route
                path="/live"
                element={
                  <ProtectedRoute>
                    <Layout noPadding>
                      <LiveStreamPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/history"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <MyBetsPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route 
                path="/finances" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <FinancesPage />
                    </Layout>
                  </ProtectedRoute>
                } 
              />

              {/* Default redirect para rutas no encontradas */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
}

export default App;
