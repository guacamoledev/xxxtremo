import { useMutation, useQueryClient } from '@tanstack/react-query';
import { betService } from '../services/betService';
import { useNotification } from '../contexts/NotificationContext';

export const useAutoMatchBets = () => {
  const queryClient = useQueryClient();
  const notification = useNotification();

  return useMutation({
    mutationFn: async (fightId: string) => {
      return await betService.autoMatchBets(fightId);
    },
    onSuccess: (_, fightId) => {
      // Invalidar queries relacionadas con apuestas
      queryClient.invalidateQueries({ queryKey: ['bets', 'fight', fightId] });
      queryClient.invalidateQueries({ queryKey: ['bets', 'user'] });
      queryClient.invalidateQueries({ queryKey: ['users'] }); // Para balances actualizados
      
      notification.showSuccess('Apuestas emparejadas exitosamente');
    },
    onError: (error: any) => {
      console.error('Error auto-matching bets:', error);
      notification.showError('Error al emparejar apuestas: ' + error.message);
    },
  });
};
