import React from 'react';
import logo from '/public/logo.png';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Container,
  Paper,
  Link,
} from '@mui/material';
import { Facebook, Instagram, YouTube } from '@mui/icons-material';

const LandingPage: React.FC = () => {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      {/* Menu superior */}
      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar>
          <Box sx={{ flexGrow: 1 }}>
            <img src={logo} alt="XXXTREMO Logo" style={{ height: 'auto', verticalAlign: 'middle' }} />
          </Box>
          {/* <Button color="inherit" startIcon={<Login />} href="/login">
            Iniciar sesión
          </Button> */}
        </Toolbar>
      </AppBar>

      {/* Presentación */}
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h3" fontWeight="bold" gutterBottom>
            PELEAS DE GALLOS EN VIVO
          </Typography>
          <Box sx={{ mt: 4, mb: 2 }}>
            <Paper elevation={6} sx={{ p: 4, bgcolor: '#97979aff', border: '2px solid #ff9800' }}>
              <Typography variant="h5" color="error" fontWeight="bold" gutterBottom>
                Plataforma en mantenimiento
              </Typography>
              <Typography variant="body1" color="text.primary">
                La plataforma XXXTREMO se encuentra en mantenimiento desde el viernes 5 de septiembre 2025.<br/>
                Estaremos de regreso el domingo 7 de septiembre 2025 a las 5:00 AM.<br/>
                ¡Gracias por tu comprensión!
              </Typography>
            </Paper>
          </Box>
          {/**
          <Button variant="contained" color="primary" size="large" href="/register">
            ¡REGÍSTRATE!
          </Button>
          */}
        </Box>

        {/* Sección de tres columnas */}
        {/* Sección de tres columnas/fila responsiva */}
        <Box
          sx={{
            mb: 6,
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr', // móvil: una columna
              sm: '1fr',
              md: 'repeat(3, 1fr)', // desktop: tres columnas
            },
            gap: 4,
          }}
        >
          <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Acción
            </Typography>
            <Typography variant="subtitle1" color="primary" gutterBottom>
              ¡La arena está lista!
            </Typography>
            <Typography variant="body1" gutterBottom>
              ¿Qué esperas para registrarte?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Regístrate gratis en segundos y disfruta la acción de las peleas de gallos en vivo.
            </Typography>
          </Paper>
          <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Adrenalina
            </Typography>
            <Typography variant="subtitle1" color="error" gutterBottom>
              ¡Dos guerreros emplumados frente a frente!
            </Typography>
            <Typography variant="body1" gutterBottom>
              ¿Quién es tu favorito?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Mete tu apuesta y vive la adrenalina de los golpes, velocidad y estrategia en cada pelea
            </Typography>
          </Paper>
          <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Honor
            </Typography>
            <Typography variant="subtitle1" color="success.main" gutterBottom>
              ¡Sólo uno saldrá victorioso!
            </Typography>
            <Typography variant="body1" gutterBottom>
              ¿Quieres ganar?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Aquí sólo los mejores sobreviven. Esto no es sólo una pelea. ¡Es un duelo de honor!
            </Typography>
          </Paper>
        </Box>

        {/* <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Button variant="contained" color="secondary" size="large" href="/register">
            ¡REGÍSTRATE YA!
          </Button>
        </Box> */}
      </Container>

      {/* Footer */}
      <Box component="footer" sx={{ bgcolor: 'grey.900', color: 'grey.100', py: 4, mt: 'auto' }}>
        <Container maxWidth="md">
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 2 }}>
            <IconButton color="inherit" href="https://facebook.com" target="_blank">
              <Facebook />
            </IconButton>
            <IconButton color="inherit" href="https://instagram.com" target="_blank">
              <Instagram />
            </IconButton>
            <IconButton color="inherit" href="https://youtube.com" target="_blank">
              <YouTube />
            </IconButton>
          </Box>
          <Typography variant="body2" align="center" sx={{ mb: 1 }}>
            Copyright © XXXTREMO 2025.
          </Typography>
          <Typography variant="body2" align="center">
            <Link href="/terms" color="inherit" underline="always">
              Términos y Condiciones
            </Link>
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;
