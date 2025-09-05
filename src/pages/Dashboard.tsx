
import React from 'react';
import UserZeroBalanceNotification from '../components/UserZeroBalanceNotification';



// Wrapper para permitir cerrar la notificación de saldo cero
export function UserZeroBalanceNotificationWithClose() {
  const [open, setOpen] = React.useState(true);
  if (!open) return null;
  return (
    <Box sx={{ mb: 2 }}>
      <UserZeroBalanceNotification show={true} onClose={() => setOpen(false)} />
    </Box>
  );
}
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Button,
  Chip,
  Container,
  Skeleton,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import {
  LiveTv,
  CalendarToday,
  AccessTime,
  People,
} from '@mui/icons-material';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEvents } from '../hooks/useFirestore';
import type { Event } from '../types';

const Dashboard: React.FC = () => {
  // Tabs para eventos actuales y pasados
  const [tabValue, setTabValue] = React.useState(0);
  // ...existing code...
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Usar React Query hooks para obtener datos reales
  const { 
    data: events = [], 
    isLoading: eventsLoading, 
    error: eventsError 
  } = useEvents();

  const loading = eventsLoading;
  const error = eventsError;

  // Filtrar eventos por status (después de obtener events)
  const eventosActuales = events.filter((e: Event) => ['scheduled', 'in_progress'].includes(e.status));
  const eventosPasados = events.filter((e: Event) => ['cancelled', 'finished', 'completed'].includes(e.status));

  const getEventStatusColor = (status: Event['status']) => {
    switch (status) {
      case 'scheduled':
        return 'primary';
      case 'in_progress':
        return 'success';
      case 'finished':
        return 'default';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getEventStatusLabel = (status: Event['status']) => {
    switch (status) {
      case 'scheduled':
        return 'Programado';
      case 'in_progress':
        return 'En Progreso';
      case 'finished':
        return 'Terminado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const formatDate = (date: any) => {
    return new Date(date.seconds * 1000).toLocaleDateString('es-MX');
  };

  const formatTime = (date: any) => {
    return new Date(date.seconds * 1000).toLocaleTimeString('es-MX', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Dashboard
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {[1, 2, 3, 4].map((item) => (
              <Card key={item} sx={{ width: 300 }}>
                <Skeleton variant="rectangular" width="100%" height={200} />
                <CardContent>
                  <Skeleton variant="text" sx={{ fontSize: '1.5rem' }} />
                  <Skeleton variant="text" />
                  <Skeleton variant="text" />
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Bienvenido, {currentUser?.name}!
        </Typography>

        {/* Notificación de saldo cero */}
        {currentUser && currentUser.balance === 0 && <UserZeroBalanceNotificationWithClose />}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error.message || 'Error loading data'}
          </Alert>
        )}
        {/* Tabs de eventos */}
        <Box sx={{ mb: 4 }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
            <Tab label="Actuales" />
            <Tab label="Pasados" />
          </Tabs>
          {/* Eventos actuales */}
          <Box hidden={tabValue !== 0}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {eventosActuales.length === 0 ? (
                <Typography color="text.secondary">No hay eventos actuales.</Typography>
              ) : (
                eventosActuales.map((event: Event) => (
                  <Card key={event.id} sx={{ width: 320, display: 'flex', flexDirection: 'column' }}>
                    <CardMedia
                      component="img"
                      height="200"
                      image={event.imageUrl || '/defaultImage.png'}
                      alt={event.name}
                      sx={{ bgcolor: 'grey.300', objectFit: 'cover' }}
                      onError={(e) => {
                        e.currentTarget.src = '/defaultImage.png';
                      }}
                    />
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                        <Chip 
                          label={event.eventType} 
                          size="small" 
                          color={event.eventType === 'special' ? 'secondary' : 'default'}
                          sx={{ color: 'grey.800' }}
                        />
                        <Chip 
                          label={getEventStatusLabel(event.status)} 
                          size="small" 
                          color={getEventStatusColor(event.status)}
                          sx={{ color: 'grey.800' }}
                        />
                      </Box>
                      <Typography gutterBottom variant="h6" component="h3">
                        {event.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {event.description}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <CalendarToday fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">{formatDate(event.date)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <AccessTime fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">{formatTime(event.startTime)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <People fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">{event.requiredFights} Peleas Obligatorias</Typography>
                      </Box>
                      <Typography variant="h6" color="primary" sx={{ mb: 2 }}>
                        ${event.entryCost} MXN
                      </Typography>
                    </CardContent>
                    {/* No mostrar botón View Event para eventos pasados */}
                  </Card>
                ))
              )}
            </Box>
          </Box>
          {/* Eventos pasados */}
          <Box hidden={tabValue !== 1}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {eventosPasados.length === 0 ? (
                <Typography color="text.secondary">No hay eventos pasados.</Typography>
              ) : (
                eventosPasados.map((event: Event) => (
                  <Card key={event.id} sx={{ width: 320, display: 'flex', flexDirection: 'column', bgcolor: 'grey.100' }}>
                    <CardMedia
                      component="img"
                      height="200"
                      image={event.imageUrl || '/defaultImage.png'}
                      alt={event.name}
                      sx={{ bgcolor: 'grey.300', objectFit: 'cover' }}
                      onError={(e) => {
                        e.currentTarget.src = '/defaultImage.png';
                      }}
                    />
                    <CardContent sx={{ flexGrow: 1, color: 'grey.800' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                        <Chip 
                          label={event.eventType} 
                          size="small" 
                          color={event.eventType === 'special' ? 'secondary' : 'default'}
                        />
                        <Chip 
                          label={getEventStatusLabel(event.status)} 
                          size="small" 
                          color={getEventStatusColor(event.status)}
                        />
                      </Box>
                      <Typography gutterBottom variant="h6" component="h3" sx={{ color: 'grey.800' }}>
                        {event.name}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 2, color: 'grey.800' }}>
                        {event.description}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <CalendarToday fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" sx={{ color: 'grey.800' }}>{formatDate(event.date)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <AccessTime fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" sx={{ color: 'grey.800' }}>{formatTime(event.startTime)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <People fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" sx={{ color: 'grey.800' }}>{event.requiredFights} Peleas Obligatorias</Typography>
                      </Box>
                      <Typography variant="h6" color="primary" sx={{ mb: 2 }}>
                        ${event.entryCost} MXN
                      </Typography>
                    </CardContent>
                    <Box sx={{ p: 2, pt: 0 }}>
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<LiveTv />}
                        onClick={() => navigate('/live')}
                      >
                        View Event
                      </Button>
                    </Box>
                  </Card>
                ))
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default Dashboard;
