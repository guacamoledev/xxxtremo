import React from 'react';
import { Box, Typography, Avatar, Paper, Button } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const UserProfilePage: React.FC = () => {
  const { currentUser } = useAuth();

  // Puedes expandir esto con más datos del usuario y acciones
  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', py: 4 }}>
      <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ width: 80, height: 80, mb: 1, fontSize: 36 }}>
          {currentUser?.name?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || '?'}
        </Avatar>
        <Typography variant="h6">{currentUser?.name || 'Sin nombre'}</Typography>
        <Typography variant="body2" color="text.secondary">{currentUser?.email}</Typography>
        <Typography variant="body2" color="text.secondary">Tel: {currentUser?.phone || 'No registrado'}</Typography>
        <Typography variant="body2" color="text.secondary">Nacimiento: {currentUser?.birthdate || 'No registrado'}</Typography>
        <Typography variant="body2" color="primary.main" fontWeight={600}>
          Saldo: ${currentUser?.balance?.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' }) || '0'}
        </Typography>
        <Button variant="outlined" sx={{ mt: 2 }} disabled>
          Editar perfil (próximamente)
        </Button>
      </Paper>
    </Box>
  );
};

export default UserProfilePage;
