import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { onSnapshot, collection, query, orderBy, doc, getDocs, where } from 'firebase/firestore';
import { useEffect, useState, useCallback } from 'react';
import { db } from '../config/firebase';
import { palenqueService, eventService, fightService } from '../services/firestore';
import { betService } from '../services/betService';
import { useNotification } from '../contexts/NotificationContext';
import { analyzeRealtimeError } from '../utils/realtimeErrorHandler';
import type { Palenque, Event, Fight, Bet, User, StreamingChannel } from '../types';

// Query Keys
export const queryKeys = {
  palenques: ['palenques'] as const,
  palenque: (id: string) => ['palenques', id] as const,
  events: ['events'] as const,
  event: (id: string) => ['events', id] as const,
  eventsByPalenque: (palenqueId: string) => ['events', 'palenque', palenqueId] as const,
  upcomingEvents: ['events', 'upcoming'] as const,
  fights: ['fights'] as const,
  fight: (id: string) => ['fights', id] as const,
  fightsByEvent: (eventId: string) => ['fights', 'event', eventId] as const,
  bets: ['bets'] as const,
  bet: (id: string) => ['bets', id] as const,
  betsByFight: (fightId: string) => ['bets', 'fight', fightId] as const,
  betsByUser: (userId: string) => ['bets', 'user', userId] as const,
};

// Palenque Hooks
export const usePalenques = () => {
  return useQuery({
    queryKey: queryKeys.palenques,
    queryFn: palenqueService.getAll,
  });
};

export const useActivePalenques = () => {
  return useQuery({
    queryKey: [...queryKeys.palenques, 'active'],
    queryFn: palenqueService.getActive,
  });
};

export const usePalenque = (id: string) => {
  return useQuery({
    queryKey: queryKeys.palenque(id),
    queryFn: () => palenqueService.getById(id),
    enabled: !!id,
  });
};

export const useCreatePalenque = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (palenque: Omit<Palenque, 'id'>) => palenqueService.create(palenque),
    onSuccess: (newId, variables) => {
      // Invalidar la cache de todos los palenques
      queryClient.invalidateQueries({ queryKey: queryKeys.palenques });
      
      // Actualización optimista: agregar el nuevo palenque a la cache
      queryClient.setQueryData(queryKeys.palenques, (old: Palenque[] | undefined) => {
        if (!old) return [{ id: newId, ...variables }];
        return [{ id: newId, ...variables }, ...old];
      });
      
      // Invalidar después para asegurar datos frescos del servidor
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.palenques });
      }, 100);
    },
    onError: (error) => {
      console.error('Error creating palenque:', error);
      // En caso de error, invalidar para refrescar datos
      queryClient.invalidateQueries({ queryKey: queryKeys.palenques });
    },
  });
};

export const useUpdatePalenque = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Palenque> }) => 
      palenqueService.update(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.palenques });
      queryClient.invalidateQueries({ queryKey: queryKeys.palenque(id) });
    },
  });
};

export const useDeletePalenque = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => palenqueService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.palenques });
    },
  });
};

// Event Hooks
export const useEvents = () => {
  return useQuery({
    queryKey: queryKeys.events,
    queryFn: eventService.getAll,
  });
};

export const useUpcomingEvents = () => {
  return useQuery({
    queryKey: queryKeys.upcomingEvents,
    queryFn: eventService.getUpcoming,
  });
};

export const useEventsByPalenque = (palenqueId: string) => {
  return useQuery({
    queryKey: queryKeys.eventsByPalenque(palenqueId),
    queryFn: () => eventService.getByPalenque(palenqueId),
    enabled: !!palenqueId,
  });
};

export const useEvent = (id: string) => {
  return useQuery({
    queryKey: queryKeys.event(id),
    queryFn: () => eventService.getById(id),
    enabled: !!id,
  });
};

export const useCreateEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (event: Omit<Event, 'id'>) => eventService.create(event),
    onSuccess: (newId, variables) => {
      // Invalidar múltiples queries relacionadas
      queryClient.invalidateQueries({ queryKey: queryKeys.events });
      queryClient.invalidateQueries({ queryKey: queryKeys.upcomingEvents });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.eventsByPalenque(variables.palenqueId) 
      });
      
      // Actualización optimista
      queryClient.setQueryData(queryKeys.events, (old: Event[] | undefined) => {
        if (!old) return [{ id: newId, ...variables }];
        return [{ id: newId, ...variables }, ...old];
      });
      
      // Refrescar datos del servidor
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.events });
      }, 100);
    },
    onError: (error) => {
      console.error('Error creating event:', error);
      queryClient.invalidateQueries({ queryKey: queryKeys.events });
    },
  });
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Event> }) => 
      eventService.update(id, updates),
    onSuccess: (_, { id, updates }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events });
      queryClient.invalidateQueries({ queryKey: queryKeys.event(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.upcomingEvents });
      
      if (updates.palenqueId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.eventsByPalenque(updates.palenqueId) 
        });
      }
    },
  });
};

export const useDeleteEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => eventService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events });
      queryClient.invalidateQueries({ queryKey: queryKeys.upcomingEvents });
    },
  });
};

// Fight Hooks
export const useFights = () => {
  const [data, setData] = useState<Fight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { showError } = useNotification();

  const MAX_RETRIES = 3;

  const startListener = useCallback(() => {
    const fightsRef = collection(db, 'fights');
    const q = query(fightsRef, orderBy('scheduledTime', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        try {
          const fights = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Fight));
          
          setData(fights);
          setError(null);
          setIsLoading(false);
          setRetryCount(0); // Reset retry count on success
        } catch (err) {
          console.error('❌ useFights: Error processing snapshot:', err);
          setError(err as Error);
          setIsLoading(false);
        }
      },
      (firestoreError) => {
        const errorInfo = analyzeRealtimeError(firestoreError);
        console.error('❌ useFights: Listener error:', errorInfo);
        
        if (errorInfo.shouldRetry && retryCount < MAX_RETRIES) {
          console.log(`🔄 useFights: Retrying (attempt ${retryCount + 1}/${MAX_RETRIES}) in ${errorInfo.retryDelay}ms`);
          setRetryCount(prev => prev + 1);
          
          setTimeout(() => {
            startListener();
          }, errorInfo.retryDelay);
        } else {
          // No más reintentos o error no recuperable
          setError(new Error(errorInfo.message));
          setIsLoading(false);
          
          if (errorInfo.isNetworkError) {
            showError(`Error de conexión en peleas: ${errorInfo.message}`, 8000);
          }
          
          // Fallback to one-time fetch
          fightService.getAll()
            .then(fights => {
              console.log('🔄 useFights: Fallback fetch successful');
              setData(fights);
              setError(null);
            })
            .catch(fallbackErr => {
              console.error('❌ useFights: Fallback fetch failed:', fallbackErr);
              setError(fallbackErr as Error);
            });
        }
      }
    );

    return unsubscribe;
  }, [retryCount, showError]);

  useEffect(() => {
    const unsubscribe = startListener();

    return () => {
      console.log('🧹 useFights: Cleaning up listener');
      unsubscribe();
    };
  }, [startListener]);

  return {
    data,
    isLoading,
    error,
    // Mantener compatibilidad con React Query
    status: isLoading ? 'pending' : error ? 'error' : 'success'
  };
};

export const useFightsByEvent = (eventId: string) => {
  return useQuery({
    queryKey: queryKeys.fightsByEvent(eventId),
    queryFn: () => fightService.getByEvent(eventId),
    enabled: !!eventId,
  });
};

export const useFight = (id: string) => {
  return useQuery({
    queryKey: queryKeys.fight(id),
    queryFn: () => fightService.getById(id),
    enabled: !!id,
  });
};

export const useCreateFight = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (fight: Omit<Fight, 'id'>) => fightService.create(fight),
    onSuccess: (newId, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: queryKeys.fights });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.fightsByEvent(variables.eventId) 
      });
      
      // Actualización optimista
      queryClient.setQueryData(queryKeys.fights, (old: Fight[] | undefined) => {
        if (!old) return [{ id: newId, ...variables }];
        return [{ id: newId, ...variables }, ...old];
      });
      
      // Refrescar datos del servidor
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.fights });
      }, 100);
    },
    onError: (error) => {
      console.error('Error creating fight:', error);
      queryClient.invalidateQueries({ queryKey: queryKeys.fights });
    },
  });
};

export const useUpdateFight = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Fight> }) => 
      fightService.update(id, updates),
    onSuccess: (_, { id, updates }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fights });
      queryClient.invalidateQueries({ queryKey: queryKeys.fight(id) });
      
      if (updates.eventId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.fightsByEvent(updates.eventId) 
        });
      }
    },
  });
};

export const useUpdateFightStatus = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError, showInfo } = useNotification();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Fight['status'] }) => {
      console.log('🥊 useUpdateFightStatus: Updating fight status', { id, status });
      
      // Actualizar el estado de la pelea
      await fightService.updateStatus(id, status);
      
      // Si el estado cambia a betting_closed, emparejar apuestas automáticamente
      if (status === 'betting_closed') {
        console.log('🔄 useUpdateFightStatus: Betting closed, starting auto-match...');
        showInfo('Apuestas cerradas. Iniciando emparejamiento automático...', 4000);
        
        try {
          await betService.autoMatchBets(id);
          console.log('✅ useUpdateFightStatus: Auto-match completed');
          showSuccess('¡Emparejamiento automático completado! Las apuestas están listas para la pelea.', 8000);
        } catch (error) {
          console.error('❌ useUpdateFightStatus: Error in auto-match:', error);
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
          showError(`Error en emparejamiento automático: ${errorMessage}`, 10000);
          // No lanzamos el error para no bloquear la actualización del estado
        }
      } else if (status === 'betting_open') {
        showInfo('¡Apuestas abiertas! Los usuarios ya pueden apostar.', 5000);
      } else if (status === 'in_progress') {
        showInfo('¡Pelea en progreso! Las apuestas están cerradas.', 5000);
      } else if (status === 'finished') {
        showSuccess('Pelea finalizada. Asigna el ganador para resolver las apuestas.', 7000);
      }
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fight(id) });
      // Also invalidate the fights list for the event
      queryClient.invalidateQueries({ queryKey: queryKeys.fights });
      // Invalidate bets to ensure they refresh when fight status changes
      queryClient.invalidateQueries({ queryKey: queryKeys.bets });
      queryClient.invalidateQueries({ queryKey: queryKeys.betsByFight(id) });
    },
    onError: (error) => {
      console.error('❌ useUpdateFightStatus: Error updating fight status:', error);
      showError(`Error al actualizar estado de la pelea: ${error.message}`, 8000);
    },
  });
};

export const useSetFightWinner = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, winner }: { id: string; winner: 'red' | 'green' | null }) => 
      fightService.setWinner(id, winner),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fight(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.fights });
    },
  });
};

export const useDeleteFight = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => fightService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fights });
    },
  });
};

// ===============================
// BET HOOKS
// ===============================

// Obtener todas las apuestas
export const useBets = () => {
  const [data, setData] = useState<Bet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { showError } = useNotification();

  const MAX_RETRIES = 3;

  const startListener = useCallback(() => {
    const betsRef = collection(db, 'bets');

    const unsubscribe = onSnapshot(
      betsRef,
      (snapshot) => {
        try {
          const bets = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Bet));
          
          setData(bets);
          setError(null);
          setIsLoading(false);
          setRetryCount(0); // Reset retry count on success
        } catch (err) {
          console.error('❌ useBets: Error processing snapshot:', err);
          setError(err as Error);
          setIsLoading(false);
        }
      },
      (firestoreError) => {
        const errorInfo = analyzeRealtimeError(firestoreError);
        console.error('❌ useBets: Listener error:', errorInfo);
        
        if (errorInfo.shouldRetry && retryCount < MAX_RETRIES) {
          console.log(`🔄 useBets: Retrying (attempt ${retryCount + 1}/${MAX_RETRIES}) in ${errorInfo.retryDelay}ms`);
          setRetryCount(prev => prev + 1);
          
          setTimeout(() => {
            startListener();
          }, errorInfo.retryDelay);
        } else {
          // No más reintentos o error no recuperable
          setError(new Error(errorInfo.message));
          setIsLoading(false);
          
          if (errorInfo.isNetworkError) {
            showError(`Error de conexión en apuestas: ${errorInfo.message}`, 8000);
          }
          
          // Fallback to one-time fetch
          betService.getAll()
            .then(bets => {
              console.log('🔄 useBets: Fallback fetch successful');
              setData(bets);
              setError(null);
            })
            .catch(fallbackErr => {
              console.error('❌ useBets: Fallback fetch failed:', fallbackErr);
              setError(fallbackErr as Error);
            });
        }
      }
    );

    return unsubscribe;
  }, [retryCount, showError]);

  useEffect(() => {
    const unsubscribe = startListener();

    return () => {
      console.log('🧹 useBets: Cleaning up listener');
      unsubscribe();
    };
  }, [startListener]);

  return {
    data,
    isLoading,
    error,
    // Mantener compatibilidad con React Query
    status: isLoading ? 'pending' : error ? 'error' : 'success'
  };
};

// Obtener apuestas por pelea
export const useBetsByFight = (fightId: string) => {
  return useQuery({
    queryKey: queryKeys.betsByFight(fightId),
    queryFn: () => betService.getByFight(fightId),
    enabled: !!fightId,
  });
};

// Obtener apuestas por usuario
export const useBetsByUser = (userId: string) => {
  return useQuery({
    queryKey: queryKeys.betsByUser(userId),
    queryFn: () => betService.getByUser(userId),
    enabled: !!userId,
  });
};

// Obtener retiros por usuario
export const useUserWithdrawals = (userId: string) => {
  return useQuery({
    queryKey: ['withdrawals', 'user', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const withdrawalsRef = collection(db, 'withdrawals');
      const q = query(
        withdrawalsRef,
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

// Crear apuesta
export const usePlaceBet = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();
  
  return useMutation({
    mutationFn: ({ 
      userId, 
      fightId, 
      color, 
      amount 
    }: { 
      userId: string; 
      fightId: string; 
      color: 'red' | 'green'; 
      amount: number; 
    }) => {
      console.log('🎯 usePlaceBet: Starting bet placement', {
        userId,
        fightId,
        color,
        amount
      });
      return betService.placeBet(userId, fightId, color, amount);
    },
    onSuccess: (_, variables) => {
      console.log('✅ usePlaceBet: Bet placed successfully');
      
      // Mostrar notificación de éxito al usuario
      const colorText = variables.color === 'red' ? 'Rojo' : 'Verde';
      showSuccess(
        `¡Apuesta aceptada! $${variables.amount.toLocaleString()} MXN en ${colorText}`,
        8000
      );
      
      // Invalidar caches relevantes
      queryClient.invalidateQueries({ queryKey: queryKeys.bets });
      queryClient.invalidateQueries({ queryKey: queryKeys.betsByFight(variables.fightId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.betsByUser(variables.userId) });
      
      // También invalidar datos del usuario para actualizar balance
      queryClient.invalidateQueries({ queryKey: ['user', variables.userId] });
    },
    onError: (error) => {
      console.error('❌ usePlaceBet: Error placing bet:', {
        error: error.message,
        name: error.name,
        stack: error.stack
      });
      
      // Mostrar notificación de error al usuario
      showError(`Error al realizar apuesta: ${error.message}`, 10000);
    },
  });
};

// Cancelar apuesta
export const useCancelBet = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();
  
  return useMutation({
    mutationFn: (betId: string) => betService.cancelBet(betId),
    onSuccess: () => {
      // Mostrar notificación de éxito al usuario
      showSuccess('Apuesta cancelada exitosamente. El monto ha sido reembolsado.', 7000);
      
      queryClient.invalidateQueries({ queryKey: queryKeys.bets });
      // También invalidar usuarios para actualizar balances
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      console.error('Error canceling bet:', error);
      // Mostrar notificación de error al usuario
      showError(`Error al cancelar apuesta: ${error.message}`, 8000);
    },
  });
};

// Emparejar apuestas automáticamente
export const useAutoMatchBets = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();
  
  return useMutation({
    mutationFn: (fightId: string) => {
      console.log('🤝 useAutoMatchBets: Starting auto-match for fight', fightId);
      return betService.autoMatchBets(fightId);
    },
    onSuccess: (_, fightId) => {
      console.log('✅ useAutoMatchBets: Auto-match completed for fight', fightId);
      
      // Mostrar notificación de éxito al admin
      showSuccess('¡Emparejamiento automático completado exitosamente!', 6000);
      
      // Invalidar caches relevantes para mostrar las apuestas emparejadas
      queryClient.invalidateQueries({ queryKey: queryKeys.bets });
      queryClient.invalidateQueries({ queryKey: queryKeys.betsByFight(fightId) });
      // También invalidar usuarios para actualizar balances si hay reembolsos
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      console.error('❌ useAutoMatchBets: Error auto-matching bets:', {
        error: error.message,
        name: error.name,
        stack: error.stack
      });
      
      // Mostrar notificación de error al admin
      showError(`Error en emparejamiento automático: ${error.message}`, 10000);
    },
  });
};

// Resolver apuestas (admin only)
export const useResolveBets = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();
  
  return useMutation({
    mutationFn: ({ fightId, winner }: { fightId: string; winner: 'red' | 'green' | null }) => 
      betService.resolveBets(fightId, winner),
    onSuccess: (_, { winner }) => {
      let message = '';
      if (winner === null) {
        message = 'Apuestas resueltas como empate. Todos los fondos han sido reembolsados.';
      } else {
        const winnerColor = winner === 'red' ? 'Rojo' : 'Verde';
        message = `¡Apuestas resueltas! Ganador: ${winnerColor}. Premios distribuidos.`;
      }
      
      showSuccess(message, 8000);
      
      queryClient.invalidateQueries({ queryKey: queryKeys.bets });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      console.error('Error resolving bets:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showError(`Error al resolver apuestas: ${errorMessage}`, 10000);
    },
  });
};

// Cancelar todas las apuestas pendientes de una pelea (admin only)
export const useCancelAllPendingBets = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useNotification();
  
  return useMutation({
    mutationFn: (fightId: string) => {
      console.log('🚫 useCancelAllPendingBets: Cancelling all pending bets for fight', fightId);
      return betService.cancelAllPendingBets(fightId);
    },
    onSuccess: (_, fightId) => {
      console.log('✅ useCancelAllPendingBets: All pending bets cancelled for fight', fightId);
      
      // Mostrar notificación de éxito al admin
      showSuccess('Todas las apuestas pendientes han sido canceladas y reembolsadas.', 7000);
      
      // Invalidar caches relevantes
      queryClient.invalidateQueries({ queryKey: queryKeys.bets });
      queryClient.invalidateQueries({ queryKey: queryKeys.betsByFight(fightId) });
      // También invalidar usuarios para actualizar balances
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      console.error('❌ useCancelAllPendingBets: Error cancelling pending bets:', {
        error: error.message,
        name: error.name,
        stack: error.stack
      });
      
      // Mostrar notificación de error al admin
      showError(`Error al cancelar apuestas pendientes: ${error.message}`, 10000);
    },
  });
};

// Obtener estadísticas de emparejamiento
export const useMatchingStats = (fightId: string) => {
  return useQuery({
    queryKey: ['matchingStats', fightId],
    queryFn: () => betService.getMatchingStats(fightId),
    enabled: !!fightId,
  });
};

// ===============================
// USER BALANCE HOOKS (REAL-TIME)
// ===============================

// Hook para obtener balance del usuario en tiempo real
export const useUserBalance = (userId: string) => {
  const [data, setData] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { showError } = useNotification();

  const MAX_RETRIES = 3;

  const startListener = useCallback(() => {
    if (!userId) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return () => {}; // Return empty cleanup function
    }

    const userRef = doc(db, 'users', userId);

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        try {
          if (snapshot.exists()) {
            const userData = { 
              id: snapshot.id, 
              ...snapshot.data() 
            } as User;
            
            setData(userData);
            setError(null);
            setRetryCount(0); // Reset retry count on success
          } else {
            console.warn('⚠️ useUserBalance: User document not found:', userId);
            setData(null);
            setError(new Error('Usuario no encontrado'));
          }
          setIsLoading(false);
        } catch (err) {
          console.error('❌ useUserBalance: Error processing snapshot:', err);
          setError(err as Error);
          setIsLoading(false);
        }
      },
      (firestoreError) => {
        const errorInfo = analyzeRealtimeError(firestoreError);
        console.error('❌ useUserBalance: Listener error:', errorInfo);
        
        if (errorInfo.shouldRetry && retryCount < MAX_RETRIES) {
          console.log(`🔄 useUserBalance: Retrying (attempt ${retryCount + 1}/${MAX_RETRIES}) in ${errorInfo.retryDelay}ms`);
          setRetryCount(prev => prev + 1);
          
          setTimeout(() => {
            startListener();
          }, errorInfo.retryDelay);
        } else {
          // No más reintentos o error no recuperable
          setError(new Error(errorInfo.message));
          setIsLoading(false);
          
          if (errorInfo.isNetworkError) {
            showError(`Error de conexión en balance del usuario: ${errorInfo.message}`, 8000);
          }
        }
      }
    );

    return unsubscribe;
  }, [userId, retryCount, showError]);

  useEffect(() => {
    const unsubscribe = startListener();

    return () => {
      console.log('🧹 useUserBalance: Cleaning up listener for user:', userId);
      if (unsubscribe) unsubscribe();
    };
  }, [startListener, userId]);

  return {
    data,
    isLoading,
    error,
    // Mantener compatibilidad con React Query
    status: isLoading ? 'pending' : error ? 'error' : 'success'
  };
};

// Streaming Channels Hook
export const useStreamingChannels = () => {
  return useQuery<StreamingChannel[]>({
    queryKey: ['streaming-channels'],
    queryFn: async () => {
      const streamingChannelsRef = collection(db, 'streaming-channels');
      const q = query(streamingChannelsRef, orderBy('name'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StreamingChannel[];
    },
  });
};
