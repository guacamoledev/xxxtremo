import { useMutation, useQueryClient } from '@tanstack/react-query';
import { betService } from '../services/betService';
import { useNotification } from '../contexts/NotificationContext';

export const useResolveBets = () => {
  const queryClient = useQueryClient();
  const notification = useNotification();

  return useMutation({
    mutationFn: async ({ fightId, winner }: { fightId: string; winner: 'red' | 'green' | null }) => {
      return await betService.resolveBets(fightId, winner);
    },
    onSuccess: (_, { fightId, winner }) => {
      // Invalidar todas las queries relevantes para actualización inmediata
      queryClient.invalidateQueries({ queryKey: ['bets'] });
      queryClient.invalidateQueries({ queryKey: ['users'] }); // Para balances actualizados
      queryClient.invalidateQueries({ queryKey: ['fights'] }); // Por si el estado de la pelea cambió
      
      const winnerText = winner === 'red' ? 'Rojo' : winner === 'green' ? 'Verde' : 'Sin ganador';
      notification.showSuccess(`Apuestas resueltas exitosamente - Ganador: ${winnerText}`);
      
      console.log('🔄 useResolveBets: Queries invalidated after resolution', {
        fightId,
        winner: winnerText
      });
    },
    onError: (error: any) => {
      console.error('Error resolving bets:', error);
      notification.showError('Error al resolver las apuestas: ' + error.message);
    },
  });
};
