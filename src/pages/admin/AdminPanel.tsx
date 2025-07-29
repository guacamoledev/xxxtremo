import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Container,
  Avatar,
} from '@mui/material';
import {
  Stadium,
  Event,
  SportsMma,
  Dashboard as DashboardIcon,
  Casino,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePalenques, useEvents, useFights } from '../../hooks/useFirestore';

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // Obtener estadísticas básicas
  const { data: palenques = [] } = usePalenques();
  const { data: events = [] } = useEvents();
  const { data: fights = [] } = useFights();

  const adminCards = [
    {
      title: 'Gestionar Palenques',
      description: 'Crea, edita y administra los palenques',
      icon: <Stadium fontSize="large" />, 
      color: '#1976d2',
      path: '/admin/palenques',
      count: palenques.length,
      countLabel: 'Palenques activos'
    },
    {
      title: 'Gestionar Eventos',
      description: 'Crea y organiza eventos de peleas',
      icon: <Event fontSize="large" />, 
      color: '#388e3c',
      path: '/admin/events',
      count: events.length,
      countLabel: 'Eventos totales'
    },
    {
      title: 'Gestionar Peleas',
      description: 'Configura peleas individuales dentro de los eventos',
      icon: <SportsMma fontSize="large" />, 
      color: '#f57c00',
      path: '/admin/fights',
      count: fights.length,
      countLabel: 'Peleas totales'
    },
    {
      title: 'Gestión de Apuestas',
      description: 'Resuelve apuestas y administra los resultados',
      icon: <Casino fontSize="large" />, 
      color: '#e91e63',
      path: '/admin/betting',
      count: fights.filter(f => f.status === 'betting_open' || f.status === 'in_progress').length,
      countLabel: 'Apuestas activas'
    },
  ];

  const quickStats = [
    {
      label: 'Palenques activos',
      value: palenques.filter(p => p.active).length,
      total: palenques.length,
      icon: <Stadium />, 
      color: '#1976d2'
    },
    {
      label: 'Próximos eventos',
      value: events.filter(e => e.status === 'scheduled').length,
      total: events.length,
      icon: <Event />, 
      color: '#388e3c'
    },
    {
      label: 'Peleas programadas',
      value: fights.filter(f => f.status === 'scheduled').length,
      total: fights.length,
      icon: <SportsMma />, 
      color: '#f57c00'
    },
  ];

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Panel de Administración
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Bienvenido, {currentUser?.name}. Administra la plataforma XXXTREMO.
          </Typography>
        </Box>

        {/* Quick Stats */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" component="h2" gutterBottom sx={{ mb: 2 }}>
            Estadísticas rápidas
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {quickStats.map((stat, index) => (
              <Card key={index} sx={{ flex: '1 1 300px', minWidth: '250px' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: stat.color, mr: 2 }}>
                      {stat.icon}
                    </Avatar>
                    <Box>
                      <Typography variant="h4" component="div">
                        {stat.value}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        de {stat.total} total
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body1">
                    {stat.label}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>

        {/* Admin Actions */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" component="h2" gutterBottom sx={{ mb: 2 }}>
            Herramientas de gestión
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {adminCards.map((card, index) => (
              <Card 
                key={index}
                sx={{ 
                  flex: '1 1 300px',
                  minWidth: '250px',
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: card.color, mr: 2 }}>
                      {card.icon}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" component="h3">
                        {card.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {card.count} {card.countLabel}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {card.description}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button 
                    variant="contained" 
                    fullWidth
                    onClick={() => navigate(card.path)}
                    sx={{ bgcolor: card.color }}
                  >
                    Gestionar
                  </Button>
                </CardActions>
              </Card>
            ))}
          </Box>
        </Box>

        {/* Quick Actions */}
        <Box>
          <Typography variant="h6" component="h2" gutterBottom sx={{ mb: 2 }}>
            Accesos rápidos
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Stadium />}
              onClick={() => navigate('/admin/palenques')}
              sx={{ flex: '1 1 200px' }}
            >
              Nuevo Palenque
            </Button>
            <Button
              variant="outlined"
              startIcon={<Event />}
              onClick={() => navigate('/admin/events')}
              sx={{ flex: '1 1 200px' }}
            >
              Nuevo Evento
            </Button>
            <Button
              variant="outlined"
              startIcon={<SportsMma />}
              onClick={() => navigate('/admin/fights')}
              sx={{ flex: '1 1 200px' }}
            >
              Nueva Pelea
            </Button>
            <Button
              variant="outlined"
              startIcon={<DashboardIcon />}
              onClick={() => navigate('/dashboard')}
              sx={{ flex: '1 1 200px' }}
            >
              Dashboard
            </Button>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default AdminPanel;
