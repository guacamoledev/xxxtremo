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
      title: 'Manage Palenques',
      description: 'Create, edit and manage fighting venues',
      icon: <Stadium fontSize="large" />,
      color: '#1976d2',
      path: '/admin/palenques',
      count: palenques.length,
      countLabel: 'Active Palenques'
    },
    {
      title: 'Manage Events',
      description: 'Create and organize cockfighting events',
      icon: <Event fontSize="large" />,
      color: '#388e3c',
      path: '/admin/events',
      count: events.length,
      countLabel: 'Total Events'
    },
    {
      title: 'Manage Fights',
      description: 'Set up individual fights within events',
      icon: <SportsMma fontSize="large" />,
      color: '#f57c00',
      path: '/admin/fights',
      count: fights.length,
      countLabel: 'Total Fights'
    },
    {
      title: 'Betting Management',
      description: 'Resolve bets and manage betting outcomes',
      icon: <Casino fontSize="large" />,
      color: '#e91e63',
      path: '/admin/betting',
      count: fights.filter(f => f.status === 'betting_open' || f.status === 'in_progress').length,
      countLabel: 'Active Betting'
    },
  ];

  const quickStats = [
    {
      label: 'Active Palenques',
      value: palenques.filter(p => p.active).length,
      total: palenques.length,
      icon: <Stadium />,
      color: '#1976d2'
    },
    {
      label: 'Upcoming Events',
      value: events.filter(e => e.status === 'scheduled').length,
      total: events.length,
      icon: <Event />,
      color: '#388e3c'
    },
    {
      label: 'Scheduled Fights',
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
            Admin Panel
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Welcome back, {currentUser?.name}. Manage your XXXTREMO platform.
          </Typography>
        </Box>

        {/* Quick Stats */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" component="h2" gutterBottom sx={{ mb: 2 }}>
            Quick Stats
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
                        of {stat.total} total
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
            Management Tools
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
                    Manage
                  </Button>
                </CardActions>
              </Card>
            ))}
          </Box>
        </Box>

        {/* Quick Actions */}
        <Box>
          <Typography variant="h6" component="h2" gutterBottom sx={{ mb: 2 }}>
            Quick Actions
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Stadium />}
              onClick={() => navigate('/admin/palenques')}
              sx={{ flex: '1 1 200px' }}
            >
              New Palenque
            </Button>
            <Button
              variant="outlined"
              startIcon={<Event />}
              onClick={() => navigate('/admin/events')}
              sx={{ flex: '1 1 200px' }}
            >
              New Event
            </Button>
            <Button
              variant="outlined"
              startIcon={<SportsMma />}
              onClick={() => navigate('/admin/fights')}
              sx={{ flex: '1 1 200px' }}
            >
              New Fight
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
