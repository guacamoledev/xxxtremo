import React, { useEffect, useRef } from 'react';
import { Box, Alert, Typography, Fade } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useBetsByUser } from '../hooks/useFirestore';
import { useNotification } from '../contexts/NotificationContext';
import type { Bet } from '../types';


export const UserBetNotifications: React.FC = () => {
  const { currentUser } = useAuth();
  const { showSuccess, showInfo } = useNotification();
  const { data: userBets, isLoading } = useBetsByUser(currentUser?.id || '');
  const lastCheckedBetsRef = useRef<Bet[]>([]);



  useEffect(() => {
    if (!userBets || isLoading || !currentUser) return;

    // Solo procesar si tenemos datos previos para comparar
    if (lastCheckedBetsRef.current.length > 0) {
      // Buscar apuestas que cambiaron de 'pending' a 'matched'
      const newlyMatchedBets = userBets.filter((bet: Bet) => {
        const previousBet = lastCheckedBetsRef.current.find((prev: Bet) => prev.id === bet.id);
        return previousBet?.status === 'pending' && bet.status === 'matched';
      });

      // Buscar apuestas que fueron canceladas/reembolsadas
      const refundedBets = userBets.filter((bet: Bet) => {
        const previousBet = lastCheckedBetsRef.current.find((prev: Bet) => prev.id === bet.id);
        return previousBet?.status === 'pending' && bet.status === 'refunded';
      });

      // Buscar apuestas que ganaron
      const wonBets = userBets.filter((bet: Bet) => {
        const previousBet = lastCheckedBetsRef.current.find((prev: Bet) => prev.id === bet.id);
        return previousBet?.status === 'matched' && bet.status === 'won';
      });

      // Buscar apuestas que perdieron
      const lostBets = userBets.filter((bet: Bet) => {
        const previousBet = lastCheckedBetsRef.current.find((prev: Bet) => prev.id === bet.id);
        return previousBet?.status === 'matched' && bet.status === 'lost';
      });

      // Mostrar notificaciones
      newlyMatchedBets.forEach((bet: Bet) => {
        const colorText = bet.color === 'red' ? 'Rojo' : 'Verde';
        showSuccess(
          bet.matchedAmount && bet.matchedAmount < bet.amount
            ? `¡Tu apuesta de $${bet.amount.toLocaleString()} MXN ha sido parcialmente emparejada por $${bet.matchedAmount.toLocaleString()} MXN en ${colorText}!`
            : `¡Tu apuesta de $${(bet.matchedAmount || bet.amount).toLocaleString()} MXN en ${colorText} ha sido emparejada!`,
          8000
        );
      });

      refundedBets.forEach((bet: Bet) => {
        const colorText = bet.color === 'red' ? 'Rojo' : 'Verde';
        showInfo(
          `Tu apuesta de $${bet.amount.toLocaleString()} MXN en ${colorText} ha sido reembolsada.`,
          7000
        );
      });

      wonBets.forEach((bet: Bet) => {
        const profit = bet.profit || 0;
        const total = (bet.matchedAmount || bet.amount) + profit;
        showSuccess(
          `¡Felicidades! Ganaste $${total.toLocaleString()} MXN (ganancia: $${profit.toLocaleString()})`,
          10000
        );
        
        console.log('🎉 Won bet notification:', {
          betId: bet.id,
          amount: bet.amount,
          profit,
          total
        });
      });

      lostBets.forEach((bet: Bet) => {
        const colorText = bet.color === 'red' ? 'Rojo' : 'Verde';
        showInfo(
          `Tu apuesta de $${(bet.matchedAmount || bet.amount).toLocaleString()} MXN en ${colorText} no resultó ganadora.`,
          6000
        );
        
        console.log('😔 Lost bet notification:', {
          betId: bet.id,
          amount: bet.matchedAmount || bet.amount,
          color: colorText
        });
      });
    }

    // Actualizar la referencia de apuestas verificadas
    lastCheckedBetsRef.current = [...userBets];
  }, [userBets, isLoading, currentUser, showSuccess, showInfo]);

  if (!currentUser || isLoading) return null;

  const pendingBets = userBets?.filter((bet: Bet) => bet.status === 'pending') || [];
  const matchedBets = userBets?.filter((bet: Bet) => bet.status === 'matched') || [];

  return (
    <Box sx={{ mb: 2 }}>
      {pendingBets.length > 0 && (
        <Fade in timeout={500}>
          <Alert 
            severity="info" 
            sx={{ mb: 1 }}
            icon={<span>⏳</span>}
          >
            <Typography variant="body2">
              Tienes {pendingBets.length} apuesta{pendingBets.length > 1 ? 's' : ''} esperando emparejamiento.
              Se emparejarán automáticamente cuando se cierren las apuestas.
            </Typography>
          </Alert>
        </Fade>
      )}
      
      {matchedBets.length > 0 && (
        <Fade in timeout={500}>
          <Alert 
            severity="success" 
            sx={{ mb: 1 }}
            icon={<span>🤝</span>}
          >
            <Typography variant="body2">
              ¡Tienes {matchedBets.length} apuesta{matchedBets.length > 1 ? 's' : ''} emparejada{matchedBets.length > 1 ? 's' : ''} y lista{matchedBets.length > 1 ? 's' : ''} para la pelea!
            </Typography>
          </Alert>
        </Fade>
      )}
    </Box>
  );
};

export default UserBetNotifications;
