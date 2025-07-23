import React, { useEffect } from 'react';
import { Box, Typography, Fade, Alert } from '@mui/material';
import { useNotification } from '../contexts/NotificationContext';
import { useBets } from '../hooks/useFirestore';

interface BetMatchingNotificationsProps {
  fightId?: string;
}

export const BetMatchingNotifications: React.FC<BetMatchingNotificationsProps> = ({ fightId }) => {
  const { showInfo } = useNotification();
  const { data: bets, isLoading } = useBets();

  useEffect(() => {
    if (bets && fightId) {
      const fightBets = bets.filter(bet => bet.fightId === fightId);
      const pendingBets = fightBets.filter(bet => bet.status === 'pending');
      const matchedBets = fightBets.filter(bet => bet.status === 'matched');
      
      // Mostrar información sobre el estado de las apuestas
      if (pendingBets.length > 0 && matchedBets.length > 0) {
        const pendingCount = pendingBets.length;
        const matchedCount = matchedBets.length;
        showInfo(
          `Estado actual: ${matchedCount} apuestas emparejadas, ${pendingCount} pendientes`,
          4000
        );
      }
    }
  }, [bets, fightId, showInfo]);

  if (isLoading || !fightId || !bets) return null;

  const fightBets = bets.filter(bet => bet.fightId === fightId);
  const pendingBets = fightBets.filter(bet => bet.status === 'pending');
  const matchedBets = fightBets.filter(bet => bet.status === 'matched');
  const redBets = pendingBets.filter(bet => bet.color === 'red');
  const greenBets = pendingBets.filter(bet => bet.color === 'green');

  if (fightBets.length === 0) return null;

  return (
    <Fade in timeout={500}>
      <Box sx={{ mb: 2 }}>
        {pendingBets.length > 0 && (
          <Alert 
            severity="info" 
            sx={{ mb: 1 }}
            icon={<span>🎯</span>}
          >
            <Typography variant="body2">
              <strong>Apuestas pendientes de emparejamiento:</strong>
              <br />
              🔴 Rojas: {redBets.length} apuestas
              <br />
              🟢 Verdes: {greenBets.length} apuestas
              {redBets.length > 0 && greenBets.length > 0 && (
                <span>
                  <br />
                  ✅ <em>Listas para emparejamiento automático al cerrar apuestas</em>
                </span>
              )}
            </Typography>
          </Alert>
        )}
        
        {matchedBets.length > 0 && (
          <Alert 
            severity="success" 
            sx={{ mb: 1 }}
            icon={<span>🤝</span>}
          >
            <Typography variant="body2">
              <strong>Apuestas emparejadas:</strong> {matchedBets.length} apuestas listas para la pelea
            </Typography>
          </Alert>
        )}
        
        {pendingBets.length === 0 && matchedBets.length === 0 && (
          <Alert 
            severity="warning" 
            icon={<span>📭</span>}
          >
            <Typography variant="body2">
              No hay apuestas registradas para esta pelea
            </Typography>
          </Alert>
        )}
      </Box>
    </Fade>
  );
};

export default BetMatchingNotifications;
