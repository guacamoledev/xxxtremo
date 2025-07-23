import { useEffect, useRef } from 'react';
import { useBetsByUser } from './useFirestore';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import type { Bet } from '../types';

interface UseRejectedBetNotificationsProps {
  enabled?: boolean;
}

export const useRejectedBetNotifications = ({ enabled = true }: UseRejectedBetNotificationsProps = {}) => {
  const { currentUser } = useAuth();
  const notification = useNotification();
  const lastCheckedRejectedBetsRef = useRef<string[]>([]);
  
  const { data: userBets } = useBetsByUser(currentUser?.id || '');

  useEffect(() => {
    if (!userBets || !enabled || !currentUser) return;

    // Filtrar apuestas rechazadas
    const rejectedBets = userBets.filter((bet: Bet) => bet.status === 'rejected');
    const currentRejectedBetIds = rejectedBets.map((bet: Bet) => bet.id);
    
    // Encontrar nuevas apuestas rechazadas (que no habíamos notificado antes)
    const newRejectedBets = rejectedBets.filter((bet: Bet) => 
      !lastCheckedRejectedBetsRef.current.includes(bet.id)
    );

    if (newRejectedBets.length > 0) {
      console.log('🔔 New rejected bets detected:', newRejectedBets.length);
      
      // Mostrar notificación por cada apuesta rechazada
      newRejectedBets.forEach((bet: Bet) => {
        notification.showWarning(
          `Apuesta de $${bet.amount} MXN reembolsada - No se pudo emparejar`,
          6000 // 6 segundos
        );
      });

      // Si hay múltiples reembolsos, mostrar un resumen
      if (newRejectedBets.length > 1) {
        const totalRefunded = newRejectedBets.reduce((sum: number, bet: Bet) => sum + bet.amount, 0);
        notification.showInfo(
          `Total reembolsado: $${totalRefunded} MXN (${newRejectedBets.length} apuestas)`,
          8000 // 8 segundos
        );
      }
    }

    // Actualizar la referencia con las apuestas rechazadas actuales
    lastCheckedRejectedBetsRef.current = currentRejectedBetIds;
  }, [userBets, notification, enabled, currentUser]);

  return {
    rejectedBets: userBets?.filter((bet: Bet) => bet.status === 'rejected') || [],
  };
};
