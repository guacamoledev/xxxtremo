import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  Alert,
  Skeleton,
  Divider,
  IconButton,
  Collapse,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material';
import {
  LiveTv,
  FullscreenExit,
  Fullscreen,
  VolumeUp,
  VolumeOff,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';
import { useFights, useEvents, usePalenques, useUpdateFightStatus, useStreamingChannels } from '../hooks/useFirestore';
import { useAuth } from '../contexts/AuthContext';
import BettingCard from '../components/BettingCard';
import UserBetNotifications from '../components/UserBetNotifications';

import { UserZeroBalanceNotificationWithClose } from './Dashboard';
import UserBetsPanel from '../components/UserBetsPanel';
import { useRejectedBetNotifications } from '../hooks/useRejectedBetNotifications';
import { useFightResultNotifications } from '../hooks/useFightResultNotifications';
import dayjs from 'dayjs';
import { useNotification } from '../contexts/NotificationContext';
import type { Event } from '../types';

const LiveStreamPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { data: fights = [], isLoading: fightsLoading, error: fightsError } = useFights();
  const { data: events = [], isLoading: eventsLoading } = useEvents();
  const { data: palenques = [] } = usePalenques();
  const { data: streamingChannels = [] } = useStreamingChannels();
  const updateFightStatusMutation = useUpdateFightStatus();
  const { showInfo: showNotification, showSuccess: showSuccessNotification } = useNotification();

  const theme = useTheme<Theme>();
  const isMobile = useMediaQuery((theme as any).breakpoints.down('sm'));

  // Hook para notificaciones de apuestas rechazadas (reembolsos)
  useRejectedBetNotifications({ enabled: currentUser?.role === 'viewer' });
  
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  
  // Estado para mostrar peleas terminadas con localStorage
  const [showFinishedFights, setShowFinishedFights] = useState(() => {
    return localStorage.getItem('live-finished-fights-expanded') === 'true';
  });

  // Hook para notificaciones de resultados de peleas
  useFightResultNotifications({ 
    selectedEventId: selectedEvent?.id,
    enabled: currentUser?.role === 'viewer' 
  });

  // Obtener URL del streaming del evento seleccionado
  const getStreamingUrl = () => {
    if (!selectedEvent) {
      // URL por defecto si no hay evento seleccionado
      return "https://iframe.dacast.com/live/e7e061db-7350-6fd1-4fc0-b0f4b7e4b7fb/d308a64c-5161-0567-cce0-2f563d5868c2";
    }
    
    // Si el evento no tiene streaming channel configurado, usar URL por defecto
    if (!selectedEvent.streamingChannel) {
      console.warn(`Evento ${selectedEvent.name} no tiene streaming channel configurado. Usando URL por defecto.`);
      return "https://iframe.dacast.com/live/e7e061db-7350-6fd1-4fc0-b0f4b7e4b7fb/d308a64c-5161-0567-cce0-2f563d5868c2";
    }
    
    // Buscar el canal de streaming correspondiente
  const streamingChannel = streamingChannels.find((channel: any) => channel.id === selectedEvent.streamingChannel);
    
    if (!streamingChannel) {
      console.warn(`Canal de streaming ${selectedEvent.streamingChannel} no encontrado para el evento ${selectedEvent.name}. Usando URL por defecto.`);
      return "https://iframe.dacast.com/live/e7e061db-7350-6fd1-4fc0-b0f4b7e4b7fb/d308a64c-5161-0567-cce0-2f563d5868c2";
    }
    
    console.log(`Usando canal de streaming: ${streamingChannel.name} (${streamingChannel.url}) para el evento ${selectedEvent.name}`);
    return streamingChannel.url;
  };

  // Filtrar eventos en vivo o próximos
  const liveEvents = events.filter((event: Event) => 
    event.status === 'in_progress' || event.status === 'scheduled'
  );

  // Seleccionar automáticamente el primer evento en vivo
  useEffect(() => {
    if (liveEvents.length > 0 && !selectedEvent) {
      const inProgressEvent = liveEvents.find((e: Event) => e.status === 'in_progress');
      setSelectedEvent(inProgressEvent || liveEvents[0]);
    }
  }, [liveEvents, selectedEvent]);

  // Auto-transición a la siguiente pelea cuando una se resuelve
  useEffect(() => {
    if (!selectedEvent) return;

    const eventFights = fights.filter(fight => fight.eventId === selectedEvent.id);
    const sortedFights = eventFights.sort((a, b) => a.fightNumber - b.fightNumber);
    
    // Buscar peleas terminadas que no han sido marcadas como finalizadas
    const resolvedFights = sortedFights.filter(fight => 
      fight.resolved && fight.status !== 'finished'
    );

    if (resolvedFights.length > 0) {
      resolvedFights.forEach(async (fight) => {
        try {
          // Buscar la siguiente pelea por número
          const nextFight = sortedFights.find(f => 
            f.fightNumber === fight.fightNumber + 1 && 
            f.status === 'scheduled'
          );

          // Marcar pelea actual como terminada
          await updateFightStatusMutation.mutateAsync({
            id: fight.id,
            status: 'finished'
          });

          // Mostrar notificación de pelea terminada
          showSuccessNotification(`🏁 Pelea #${fight.fightNumber} terminada`);

          if (nextFight) {
            // Notificar que la pelea terminó y se activará la siguiente
            showNotification(`▶️ Activando Pelea #${nextFight.fightNumber} en 5 segundos...`);
            
            // Delay de 5 segundos antes de activar la siguiente pelea
            setTimeout(async () => {
              try {
                await updateFightStatusMutation.mutateAsync({
                  id: nextFight.id,
                  status: 'in_progress'
                });
                showSuccessNotification(`🥊 Pelea #${nextFight.fightNumber} activada automáticamente`);
              } catch (error) {
                console.error('Error activating next fight:', error);
              }
            }, 5000);
          } else {
            showNotification(`🏁 Pelea #${fight.fightNumber} terminada - Era la última pelea del evento`);
          }
        } catch (error) {
          console.error('Error finishing fight:', error);
        }
      });
    }
  }, [fights, selectedEvent, updateFightStatusMutation, showNotification, showSuccessNotification]);

  // Función para togglear mostrar peleas terminadas
  const toggleFinishedFights = () => {
    const newValue = !showFinishedFights;
    setShowFinishedFights(newValue);
    localStorage.setItem('live-finished-fights-expanded', newValue.toString());
  };

  // Obtener peleas del evento seleccionado
  const eventFights = selectedEvent 
    ? fights.filter(fight => fight.eventId === selectedEvent.id)
    : [];

  // Separar peleas activas y terminadas
  const activeFights = eventFights.filter(fight => fight.status !== 'finished');
  const finishedFights = eventFights.filter(fight => fight.status === 'finished');

  // Ordenar peleas por número
  const sortedActiveFights = activeFights.sort((a, b) => a.fightNumber - b.fightNumber);
  const sortedFinishedFights = finishedFights.sort((a, b) => a.fightNumber - b.fightNumber);

  const loading = fightsLoading || eventsLoading;

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            🔴 Streaming en Vivo
          </Typography>
          <Skeleton variant="rectangular" width="100%" height={400} sx={{ mb: 3 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} variant="rectangular" width="100%" height={200} />
            ))}
          </Box>
        </Box>
      </Container>
    );
  }

  if (fightsError) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            🔴 Streaming en Vivo
          </Typography>
          <Alert severity="error">
            Error al cargar los eventos: {fightsError.message}
          </Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', pt: { xs: 7, sm: 8 } }}>
      {/* Notificación de saldo cero siempre visible arriba */}
      {currentUser && currentUser.balance === 0 && (
        <UserZeroBalanceNotificationWithClose />
      )}
      {/* Notificaciones de Usuario */}
      {currentUser && (
        <Box sx={{ px: { xs: 2, sm: 3 }, pt: 0, pb: 1 }}>
          <UserBetNotifications />
        </Box>
      )}

      {liveEvents.length === 0 ? (
        <Box sx={{ px: { xs: 2, sm: 3 }, py: 2, flex: 1 }}>
          <Paper sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center' }}>
            <LiveTv sx={{ fontSize: { xs: 48, sm: 64 }, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No hay eventos en vivo
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Los eventos aparecerán aquí cuando estén programados o en progreso.
            </Typography>
          </Paper>
        </Box>
      ) : (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Área de Streaming Principal */}
          <Box sx={{ width: '100%' }}>
            <Paper sx={{ borderRadius: 0, overflow: 'hidden', boxShadow: 0 }}>
              {/* Video Player Area */}
              <Box 
                sx={{ 
                  position: 'relative',
                  height: { xs: 200, sm: 280, md: 350, lg: 450 },
                  backgroundColor: 'black',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {/* Stream en vivo con iframe */}
                <Box sx={{ 
                  width: '100%', 
                  height: '100%',
                  position: 'relative'
                }}>
                  <iframe
                    src={getStreamingUrl()}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    style={{
                      border: 'none',
                      borderRadius: 0
                    }}
                    title={`Stream en vivo - ${selectedEvent?.name}`}
                  />
                  
                  {/* Overlay con información del evento (solo visible cuando el stream no está disponible) */}
                  {(selectedEvent?.status === 'scheduled' || !selectedEvent?.streamingChannel) && (
                    <Box sx={{ 
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      zIndex: 1
                    }}>
                      <Box sx={{ textAlign: 'center', px: 2 }}>
                        <LiveTv sx={{ fontSize: { xs: 40, sm: 64 }, mb: { xs: 1, sm: 2 } }} />
                        {selectedEvent?.status === 'scheduled' ? (
                          <>
                            <Typography variant={isMobile ? "body1" : "h6"} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                              Próximamente: {selectedEvent?.name}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1, opacity: 0.7, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                              Inicia: {dayjs(selectedEvent.startTime.toDate()).format('DD/MM/YYYY HH:mm')}
                            </Typography>
                          </>
                        ) : (
                          <>
                            <Typography variant={isMobile ? "body1" : "h6"} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                              Canal de streaming no configurado
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1, opacity: 0.7, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                              El evento no tiene un canal de streaming asignado
                            </Typography>
                          </>
                        )}
                      </Box>
                    </Box>
                  )}
                </Box>

                {/* Controles del video */}
                <Box sx={{ 
                  position: 'absolute', 
                  top: { xs: 8, sm: 16 }, 
                  right: { xs: 8, sm: 16 },
                  display: 'flex',
                  gap: { xs: 0.5, sm: 1 },
                  zIndex: 2
                }}>
                  <IconButton 
                    size={isMobile ? "small" : "medium"}
                    sx={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.5)' }}
                    onClick={() => setIsMuted(!isMuted)}
                    title={isMuted ? "Activar sonido" : "Silenciar"}
                  >
                    {isMuted ? <VolumeOff /> : <VolumeUp />}
                  </IconButton>
                  <IconButton 
                    size={isMobile ? "small" : "medium"}
                    sx={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.5)' }}
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                  >
                    {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
                  </IconButton>
                </Box>
              </Box>
            </Paper>
          </Box>

          {/* Título dinámico con información del evento */}
          {selectedEvent && (
            <Box sx={{ 
              py: { xs: 2, sm: 3 }, 
              px: { xs: 2, sm: 3 }, 
              textAlign: 'center',
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper'
            }}>
              <Typography 
                variant={isMobile ? "h6" : "h5"} 
                component="h1" 
                fontWeight="bold" 
                color="text.primary"
                sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem' }, lineHeight: 1.2 }}
              >
                {(() => {
                  const palenque = palenques.find((p: any) => p.id === selectedEvent.palenqueId);
                  const activeFight = eventFights.find(f => f.status === 'in_progress') || eventFights[0];
                  const palenqueName = palenque?.name || 'Palenque';
                  const eventName = selectedEvent.name;
                  const fightNumber = activeFight ? `Pelea #${activeFight.fightNumber}` : '';
                  
                  return `${palenqueName} - ${eventName}${fightNumber ? ` - ${fightNumber}` : ''}`;
                })()}
              </Typography>
              {eventFights.length > 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  {eventFights.filter(f => f.status === 'finished').length} de {eventFights.length} peleas completadas
                </Typography>
              )}
            </Box>
          )}

          {/* Sección de Apuestas */}
          <Box sx={{ 
            flex: 1, 
            px: { xs: 1, sm: 2, md: 3 }, 
            py: { xs: 2, sm: 3 },
            bgcolor: 'grey.50'
          }}>
            <Paper sx={{ 
              p: { xs: 2, sm: 3 }, 
              borderRadius: { xs: 1, sm: 2 },
              boxShadow: { xs: 1, sm: 2 }
            }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mb: { xs: 2, sm: 3 },
                flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: 1, sm: 0 }
              }}>
                <Typography variant={isMobile ? "h6" : "h5"} sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>
                  🎰 Apuestas del Evento
                </Typography>
              </Box>

              {!selectedEvent ? (
                <Alert severity="info" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                  Selecciona un evento para ver las apuestas disponibles.
                </Alert>
              ) : eventFights.length === 0 ? (
                <Alert severity="warning" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                  No hay peleas programadas en este evento.
                </Alert>
              ) : (
                <Box>
                  {/* Sección de Peleas Activas */}
                  {sortedActiveFights.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        gutterBottom
                        sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                      >
                        📊 Peleas Activas ({sortedActiveFights.length} pelea{sortedActiveFights.length !== 1 ? 's' : ''} disponible{sortedActiveFights.length !== 1 ? 's' : ''})
                      </Typography>
                      
                      <Divider sx={{ my: { xs: 1.5, sm: 2 } }} />
                      
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 3 } }}>
                        {sortedActiveFights.map((fight) => (
                          <BettingCard 
                            key={fight.id} 
                            fight={fight}
                            disabled={!currentUser || currentUser.role === 'admin'}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Sección de Peleas Terminadas (Colapsable) */}
                  {sortedFinishedFights.length > 0 && (
                    <Box>
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          cursor: 'pointer',
                          py: 1,
                          '&:hover': {
                            bgcolor: 'grey.50'
                          }
                        }}
                        onClick={toggleFinishedFights}
                      >
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ 
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}
                        >
                          🔒 Ver terminadas ({sortedFinishedFights.length} pelea{sortedFinishedFights.length !== 1 ? 's' : ''} completada{sortedFinishedFights.length !== 1 ? 's' : ''})
                        </Typography>
                        <IconButton size="small">
                          {showFinishedFights ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                      </Box>
                      
                      <Collapse in={showFinishedFights}>
                        <Divider sx={{ my: { xs: 1.5, sm: 2 } }} />
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 3 } }}>
                          {sortedFinishedFights.map((fight) => (
                            <BettingCard 
                              key={fight.id} 
                              fight={fight}
                              disabled={!currentUser || currentUser.role === 'admin'}
                              isFinished={true}
                            />
                          ))}
                        </Box>
                      </Collapse>
                    </Box>
                  )}
                </Box>
              )}
            </Paper>
          </Box>
        </Box>
      )}

      {/* Footer con información colapsable */}
      <Box sx={{ 
        mx: { xs: 1, sm: 2, md: 3 }, 
        mb: { xs: 2, sm: 3 },
        p: { xs: 2, sm: 3 }, 
        bgcolor: 'primary.50', 
        borderRadius: { xs: 1, sm: 2 }, 
        border: 1, 
        borderColor: 'primary.200' 
      }}>
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            cursor: 'pointer'
          }}
          onClick={() => setShowInfo(!showInfo)}
        >
        </Box>
        
        <Collapse in={showInfo}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: { xs: 2, md: 4 }, 
            mt: { xs: 1.5, sm: 2 }
          }}>
            <Box>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                gutterBottom 
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, fontWeight: 'bold' }}
              >
                Cómo apostar:
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                • Selecciona un gallo (rojo o verde) y la cantidad
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                • Las ganancias se calculan en tiempo real
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                • Apuesta mínima: $100 MXN
              </Typography>
            </Box>
            <Box>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                gutterBottom 
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, fontWeight: 'bold' }}
              >
                Reglas:
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                • Las apuestas se emparejan automáticamente
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                • Debes apostar 100% de tus depósitos para retirar
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                • Comisión de la plataforma: 10%
              </Typography>
            </Box>
          </Box>
        </Collapse>
      </Box>

      {/* Panel de apuestas del usuario (solo para viewers) */}
      {currentUser?.role === 'viewer' && (
        <UserBetsPanel selectedEventId={selectedEvent?.id || null} />
      )}
    </Box>
  );
};

export default LiveStreamPage;
