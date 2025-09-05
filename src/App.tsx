import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, CircularProgress, Box } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReportsPage from './pages/ReportsPage';
import { UserRole } from './types';

import theme from './theme';
import { lazy, Suspense } from 'react';
const UsersPage = lazy(() => import('./pages/admin/UsersPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const EventsCalendarPage = lazy(() => import('./pages/EventsCalendarPage'));

// Pages
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const BettingPage = lazy(() => import('./pages/BettingPage'));
const MyBetsPage = lazy(() => import('./pages/MyBetsPage'));
const BettingAdminPage = lazy(() => import('./pages/admin/BettingAdminPage'));
const LiveStreamPage = lazy(() => import('./pages/LiveStreamPage'));
const FinancesPage = lazy(() => import('./pages/FinancesPage'));
// Pages

// Admin pages
const AdminPanel = lazy(() => import('./pages/admin/AdminPanel'));
const PalenquesPage = lazy(() => import('./pages/admin/PalenquesPage'));
const EventsPage = lazy(() => import('./pages/admin/EventsPage'));
const FightsPage = lazy(() => import('./pages/admin/FightsPage'));
const FinanceAdminPage = lazy(() => import('./pages/admin/FinanceAdminPage'));

// Debug utilities for development (solo en entorno de desarrollo)
if (import.meta.env.DEV) {
  import('./utils/debugAuth');
  import('./utils/debugReactQuery');
  import('./utils/userAdmin');
}

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
      onError: (error: unknown) => {
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
              <Suspense fallback={
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
                  <CircularProgress size={32} />
                  <span style={{ marginTop: 16, color: '#888' }}>Cargando aplicación...</span>
                </Box>
              }>
                <Routes>
                  {/* Landing page y términos */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/terms" element={<TermsPage />} />

                  {/* Public routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  {/* Protected routes */}
                  <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
                  <Route path="/betting" element={<ProtectedRoute><Layout><BettingPage /></Layout></ProtectedRoute>} />
                  <Route path="/users" element={<ProtectedRoute><Layout><UsersPage /></Layout></ProtectedRoute>} />
                  <Route path="/admin" element={<ProtectedRoute><Layout><AdminPanel /></Layout></ProtectedRoute>} />
                  <Route path="/admin/palenques" element={<ProtectedRoute roles={[UserRole.ADMIN, UserRole.FINANCE, UserRole.STREAMING]}><Layout><PalenquesPage /></Layout></ProtectedRoute>} />
                  <Route path="/admin/events" element={<ProtectedRoute roles={[UserRole.ADMIN, UserRole.FINANCE, UserRole.STREAMING]}><Layout><EventsPage /></Layout></ProtectedRoute>} />
                  <Route path="/admin/fights" element={<ProtectedRoute roles={[UserRole.ADMIN, UserRole.FINANCE, UserRole.STREAMING]}><Layout><FightsPage /></Layout></ProtectedRoute>} />
                  <Route path="/admin/betting" element={<ProtectedRoute><Layout><BettingAdminPage /></Layout></ProtectedRoute>} />
                  <Route path="/admin/finances" element={<ProtectedRoute><Layout><FinanceAdminPage /></Layout></ProtectedRoute>} />
                  <Route path="/eventos" element={<ProtectedRoute><Layout><EventsCalendarPage /></Layout></ProtectedRoute>} />
                  <Route path="/perfil" element={<ProtectedRoute><Layout><UserProfilePage /></Layout></ProtectedRoute>} />
        <Route
          path="/reports"
          element={
            <ProtectedRoute roles={[UserRole.ADMIN, UserRole.FINANCE]}>
              <Layout>
                <ReportsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
                  <Route path="/live" element={<ProtectedRoute><Layout noPadding><LiveStreamPage /></Layout></ProtectedRoute>} />
                  <Route path="/history" element={<ProtectedRoute><Layout><MyBetsPage /></Layout></ProtectedRoute>} />
                  <Route path="/finances" element={<ProtectedRoute><Layout><FinancesPage /></Layout></ProtectedRoute>} />

                  {/* Default redirect para rutas no encontradas */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </Router>
          </AuthProvider>
        </NotificationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
