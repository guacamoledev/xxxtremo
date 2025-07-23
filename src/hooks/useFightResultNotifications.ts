import { useEffect, useRef } from 'react';
import { useFights } from './useFirestore';
import { useNotification } from '../contexts/NotificationContext';
import type { Fight } from '../types';

interface UseFightResultNotificationsProps {
  selectedEventId?: string | null;
  enabled?: boolean;
}

export const useFightResultNotifications = ({ 
  selectedEventId, 
  enabled = true 
}: UseFightResultNotificationsProps = {}) => {
  const notification = useNotification();
  const lastCheckedFightsRef = useRef<Fight[]>([]);
  
  const { data: allFights = [] } = useFights();

  useEffect(() => {
    if (!enabled || !allFights.length) return;

    // Filtrar peleas por evento si se especifica
    const fights = selectedEventId 
      ? allFights.filter(fight => fight.eventId === selectedEventId)
      : allFights;

    // Solo procesar si tenemos datos previos para comparar
    if (lastCheckedFightsRef.current.length > 0) {
      // Buscar peleas que cambiaron a 'finished' y tienen ganador
      const newlyFinishedFights = fights.filter(fight => {
        const previousFight = lastCheckedFightsRef.current.find(prev => prev.id === fight.id);
        return (
          previousFight?.status !== 'finished' && 
          fight.status === 'finished' && 
          fight.winner
        );
      });

      // Mostrar notificaciones para peleas que terminaron
      newlyFinishedFights.forEach(fight => {
        const winnerText = fight.winner === 'red' ? 'Rojo' : 'Verde';
        const fightNumber = fight.fightNumber || 'N/A';
        
        notification.showInfo(
          `¡Pelea ${fightNumber} terminada! Ganó: ${winnerText}`,
          8000 // 8 segundos
        );
        
        console.log('🏆 Fight result notification:', {
          fightId: fight.id,
          fightNumber,
          winner: winnerText
        });
      });
    }

    // Actualizar la referencia con las peleas actuales
    lastCheckedFightsRef.current = [...fights];
  }, [allFights, selectedEventId, notification, enabled]);

  return {
    // Retornar estadísticas útiles si se necesitan
    finishedFights: allFights.filter(fight => fight.status === 'finished'),
  };
};
