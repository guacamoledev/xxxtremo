import React from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  Alert,
  Button,
} from '@mui/material';
import {
  LiveTv,
  Casino as BetIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const BettingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h4" component="h1" gutterBottom>
            🎰 Apuestas
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Las apuestas ahora están integradas con el streaming en vivo
          </Typography>
        </Box>

        {/* Redirección */}
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <LiveTv sx={{ fontSize: 80, color: 'primary.main', mb: 3 }} />
          
          <Typography variant="h5" gutterBottom>
            ¡Nueva Experiencia de Apuestas!
          </Typography>
          
          <Typography variant="body1" color="text.secondary" paragraph>
            Ahora puedes apostar directamente mientras ves el streaming en vivo de las peleas.
            Disfruta de una experiencia más inmersiva con el video y las apuestas en la misma pantalla.
          </Typography>

          <Alert severity="info" sx={{ mb: 4, textAlign: 'left' }}>
            <Typography variant="body2">
              <strong>Nueva funcionalidad:</strong>
            </Typography>
            <Typography variant="body2">
              • Streaming en vivo integrado con apuestas
            </Typography>
            <Typography variant="body2">
              • Selección de eventos en tiempo real
            </Typography>
            <Typography variant="body2">
              • Apuestas sin salir del stream
            </Typography>
          </Alert>

          <Button
            variant="contained"
            size="large"
            startIcon={<LiveTv />}
            onClick={() => navigate('/live')}
            sx={{ 
              py: 2, 
              px: 4,
              fontSize: '1.1rem',
              background: 'linear-gradient(45deg, #f44336 30%, #ff9800 90%)',
              '&:hover': {
                background: 'linear-gradient(45deg, #d32f2f 30%, #f57c00 90%)',
              }
            }}
          >
            Ir al Streaming en Vivo
          </Button>

          <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary">
              También puedes acceder desde el menú principal: <strong>Live Events</strong>
            </Typography>
          </Box>
        </Paper>

        {/* Características destacadas */}
        <Box sx={{ mt: 4, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          <Paper sx={{ p: 3, flex: 1, textAlign: 'center' }}>
            <BetIcon sx={{ fontSize: 40, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Apuestas en Tiempo Real
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Realiza apuestas mientras ves la acción en vivo
            </Typography>
          </Paper>

          <Paper sx={{ p: 3, flex: 1, textAlign: 'center' }}>
            <LiveTv sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Streaming HD
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Calidad de video en alta definición
            </Typography>
          </Paper>

          <Paper sx={{ p: 3, flex: 1, textAlign: 'center' }}>
            <Typography variant="h2" sx={{ color: 'warning.main', mb: 2 }}>⚡</Typography>
            <Typography variant="h6" gutterBottom>
              Resultados Instantáneos
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Conoce los resultados al momento
            </Typography>
          </Paper>
        </Box>
      </Box>
    </Container>
  );
};

export default BettingPage;
