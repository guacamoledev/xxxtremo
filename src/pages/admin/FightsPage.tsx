import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  TextField,
  Typography,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Sports as SportsIcon,
  Event as EventIcon,
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

import { useFights, useEvents, useCreateFight, useUpdateFight, useDeleteFight } from '../../hooks/useFirestore';
import { betService } from '../../services/betService';
import type { Fight, FightStatus } from '../../types';

dayjs.locale('es');

interface FightFormData {
  eventId: string;
  cock1: {
    name: string;
    weight: number;
  };
  cock2: {
    name: string;
    weight: number;
  };
  status: FightStatus;
  minBet: number;
  winner?: 'red' | 'green' | null;
}

const initialFormData: FightFormData = {
  eventId: '',
  cock1: {
    name: '',
    weight: 0,
  },
  cock2: {
    name: '',
    weight: 0,
  },
  status: 'scheduled',
  minBet: 100,
  winner: null,
};

const statusColors = {
  scheduled: 'default',
  betting_open: 'info',
  in_progress: 'warning',
  betting_closed: 'warning',
  finished: 'success',
} as const;

const statusLabels = {
  scheduled: 'Programada',
  betting_open: 'Apuestas Abiertas',
  in_progress: 'En Progreso',
  betting_closed: 'Apuestas Cerradas',
  finished: 'Finalizada',
};

export default function FightsPage() {
  const [open, setOpen] = useState(false);
  const [editingFight, setEditingFight] = useState<Fight | null>(null);
  const [formData, setFormData] = useState<FightFormData>(initialFormData);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [fightToDelete, setFightToDelete] = useState<Fight | null>(null);

  const { data: fights = [], isLoading: fightsLoading, error: fightsError } = useFights();
  const { data: events = [], isLoading: eventsLoading } = useEvents();
  const createFightMutation = useCreateFight();
  const updateFightMutation = useUpdateFight();
  const deleteFightMutation = useDeleteFight();

  const handleOpen = (fight?: Fight) => {
    if (fight) {
      setEditingFight(fight);
      setFormData({
        eventId: fight.eventId,
        cock1: {
          name: fight.cock1.name,
          weight: fight.cock1.weight,
        },
        cock2: {
          name: fight.cock2.name,
          weight: fight.cock2.weight,
        },
        status: fight.status,
        minBet: fight.minBet,
        winner: fight.winner || null,
      });
    } else {
      setEditingFight(null);
      setFormData(initialFormData);
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingFight(null);
    setFormData(initialFormData);
  };

  const getNextFightNumber = (eventId: string): number => {
    const eventFights = fights.filter(f => f.eventId === eventId);
    const maxFightNumber = eventFights.reduce((max, fight) => 
      Math.max(max, fight.fightNumber || 0), 0
    );
    return maxFightNumber + 1;
  };

  const handleSubmit = async () => {
    if (!formData.eventId || !formData.cock1.name || !formData.cock2.name) {
      return;
    }

    const selectedEvent = events.find(e => e.id === formData.eventId);
    if (!selectedEvent) {
      console.error('Event not found');
      return;
    }

    try {
      if (editingFight) {
        const updates: Partial<Fight> = {
          eventId: formData.eventId,
          redFighter: formData.cock1.name,
          greenFighter: formData.cock2.name,
          status: formData.status,
          minBet: formData.minBet,
          winner: formData.winner,
          cock1: {
            name: formData.cock1.name,
            breed: '', // Default empty since we removed this field
            weight: formData.cock1.weight,
            owner: '', // Default empty since we removed this field
          },
          cock2: {
            name: formData.cock2.name,
            breed: '', // Default empty since we removed this field
            weight: formData.cock2.weight,
            owner: '', // Default empty since we removed this field
          },
          bettingEnabled: true,
          // Use the event's date as scheduled time
          scheduledTime: selectedEvent.startTime,
        };

        await updateFightMutation.mutateAsync({
          id: editingFight.id,
          updates,
        });

        // Si la pelea está finalizada y tiene ganador/empate, resolver las apuestas
        if (formData.status === 'finished' && !editingFight.resolved) {
          try {
            await betService.resolveBets(editingFight.id, formData.winner || null);
            console.log('✅ Apuestas resueltas automáticamente');
          } catch (error) {
            console.error('❌ Error al resolver apuestas:', error);
            // Continuar sin fallar - el admin puede resolver manualmente después
          }
        }
      } else {
        const nextFightNumber = getNextFightNumber(formData.eventId);
        
        const newFight: Omit<Fight, 'id'> = {
          eventId: formData.eventId,
          fightNumber: nextFightNumber,
          redFighter: formData.cock1.name,
          greenFighter: formData.cock2.name,
          status: formData.status,
          minBet: formData.minBet,
          winner: formData.winner,
          cock1: {
            name: formData.cock1.name,
            breed: '', // Default empty since we removed this field
            weight: formData.cock1.weight,
            owner: '', // Default empty since we removed this field
          },
          cock2: {
            name: formData.cock2.name,
            breed: '', // Default empty since we removed this field
            weight: formData.cock2.weight,
            owner: '', // Default empty since we removed this field
          },
          bettingEnabled: true,
          // Use the event's date as scheduled time
          scheduledTime: selectedEvent.startTime,
        };

        await createFightMutation.mutateAsync(newFight);
      }

      handleClose();
    } catch (error) {
      console.error('Error saving fight:', error);
    }
  };

  const handleDelete = async () => {
    if (!fightToDelete) return;

    try {
      await deleteFightMutation.mutateAsync(fightToDelete.id);
      setDeleteConfirmOpen(false);
      setFightToDelete(null);
    } catch (error) {
      console.error('Error deleting fight:', error);
    }
  };

  const handleResolveBets = async (fight: Fight) => {
    if (!fight.winner && fight.winner !== null) {
      console.error('No se puede resolver apuestas sin ganador definido');
      return;
    }

    try {
      await betService.resolveBets(fight.id, fight.winner);
      console.log('✅ Apuestas resueltas manualmente');
      // Las mutaciones deberían recargar los datos automáticamente
    } catch (error) {
      console.error('❌ Error al resolver apuestas:', error);
    }
  };

  const confirmDelete = (fight: Fight) => {
    setFightToDelete(fight);
    setDeleteConfirmOpen(true);
  };

  if (fightsError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Error al cargar peleas: {fightsError.message}
        </Alert>
      </Box>
    );
  }

  if (fightsLoading || eventsLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Gestión de Peleas
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {[1, 2, 3].map((item) => (
            <Card key={item} sx={{ width: 400 }}>
              <CardContent>
                <Skeleton variant="text" sx={{ fontSize: '1.5rem' }} />
                <Skeleton variant="text" />
                <Skeleton variant="text" />
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Gestión de Peleas
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
          >
            Nueva Pelea
          </Button>
        </Box>

        {fights.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <SportsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No hay peleas registradas
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Comienza creando tu primera pelea de gallos.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpen()}
            >
              Crear Primera Pelea
            </Button>
          </Paper>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {fights.map((fight) => {
              const event = events.find(e => e.id === fight.eventId);
              return (
                <Card key={fight.id} sx={{ width: 420 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" component="h3">
                          Pelea #{fight.fightNumber}
                        </Typography>
                        <Typography variant="subtitle1" color="text.secondary">
                          {fight.cock1.name} vs {fight.cock2.name}
                        </Typography>
                      </Box>
                      <Chip
                        label={statusLabels[fight.status]}
                        color={statusColors[fight.status]}
                        size="small"
                      />
                    </Box>

                    {event && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <EventIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {event.name}
                        </Typography>
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ flex: 1, mr: 1 }}>
                        <Typography variant="subtitle2" color="primary">
                          Gallo 1
                        </Typography>
                        <Typography variant="body2">
                          <strong>{fight.cock1.name}</strong>
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Peso: {fight.cock1.weight}kg
                        </Typography>
                      </Box>

                      <Box sx={{ flex: 1, ml: 1 }}>
                        <Typography variant="subtitle2" color="secondary">
                          Gallo 2
                        </Typography>
                        <Typography variant="body2">
                          <strong>{fight.cock2.name}</strong>
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Peso: {fight.cock2.weight}kg
                        </Typography>
                      </Box>
                    </Box>

                    {fight.scheduledTime && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Fecha: {dayjs(fight.scheduledTime.toDate()).format('DD/MM/YYYY HH:mm')}
                      </Typography>
                    )}

                    <Typography variant="body2" color="text.secondary">
                      Apuesta mínima: ${fight.minBet} MXN
                    </Typography>

                    {/* Información del ganador */}
                    {fight.status === 'finished' && (
                      <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                        {fight.winner ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <SportsIcon sx={{ fontSize: 16, color: fight.winner === 'red' ? 'error.main' : 'success.main' }} />
                            <Typography variant="body2" fontWeight="bold" color={fight.winner === 'red' ? 'error.main' : 'success.main'}>
                              Ganador: {fight.winner === 'red' ? "ROJO" : "VERDE"}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Sin ganador / Empate
                          </Typography>
                        )}
                        {fight.resolved && (
                          <Typography variant="caption" color="success.main">
                            ✅ Apuestas resueltas
                          </Typography>
                        )}
                      </Box>
                    )}
                  </CardContent>

                  <CardActions>
                    <Tooltip title="Editar pelea">
                      <IconButton
                        size="small"
                        onClick={() => handleOpen(fight)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    
                    {/* Botón para resolver apuestas manualmente */}
                    {fight.status === 'finished' && fight.winner !== undefined && !fight.resolved && (
                      <Tooltip title="Resolver apuestas">
                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          onClick={() => handleResolveBets(fight)}
                          sx={{ mr: 1 }}
                        >
                          Resolver Apuestas
                        </Button>
                      </Tooltip>
                    )}
                    
                    <Tooltip title="Eliminar pelea">
                      <IconButton
                        size="small"
                        onClick={() => confirmDelete(fight)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              );
            })}
          </Box>
        )}

        {/* Create/Edit Fight Dialog */}
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingFight ? 'Editar Pelea' : 'Nueva Pelea'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <FormControl fullWidth required>
                <InputLabel>Evento</InputLabel>
                <Select
                  value={formData.eventId}
                  label="Evento"
                  onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
                >
                  {events.map((event) => (
                    <MenuItem key={event.id} value={event.id}>
                      {event.name} - {dayjs(event.startTime.toDate()).format('DD/MM/YYYY')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {formData.eventId && (
                <Alert severity="info" sx={{ mb: 1 }}>
                  La pelea será programada automáticamente para la fecha del evento seleccionado.
                  El número de pelea será asignado consecutivamente.
                </Alert>
              )}

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" gutterBottom color="primary">
                    Gallo 1
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      label="Nombre del Gallo"
                      fullWidth
                      value={formData.cock1.name}
                      onChange={(e) => setFormData({
                        ...formData,
                        cock1: { ...formData.cock1, name: e.target.value }
                      })}
                      required
                    />
                    <TextField
                      label="Peso (kg)"
                      type="number"
                      fullWidth
                      value={formData.cock1.weight}
                      onChange={(e) => setFormData({
                        ...formData,
                        cock1: { ...formData.cock1, weight: parseFloat(e.target.value) || 0 }
                      })}
                      inputProps={{ min: 0, step: 0.1 }}
                    />
                  </Box>
                </Box>

                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" gutterBottom color="secondary">
                    Gallo 2
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      label="Nombre del Gallo"
                      fullWidth
                      value={formData.cock2.name}
                      onChange={(e) => setFormData({
                        ...formData,
                        cock2: { ...formData.cock2, name: e.target.value }
                      })}
                      required
                    />
                    <TextField
                      label="Peso (kg)"
                      type="number"
                      fullWidth
                      value={formData.cock2.weight}
                      onChange={(e) => setFormData({
                        ...formData,
                        cock2: { ...formData.cock2, weight: parseFloat(e.target.value) || 0 }
                      })}
                      inputProps={{ min: 0, step: 0.1 }}
                    />
                  </Box>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Estado</InputLabel>
                  <Select
                    value={formData.status}
                    label="Estado"
                    onChange={(e) => {
                      const newStatus = e.target.value as FightStatus;
                      setFormData({ 
                        ...formData, 
                        status: newStatus,
                        // Resetear winner si no está finalizada
                        winner: newStatus === 'finished' ? formData.winner : null
                      });
                    }}
                  >
                    <MenuItem value="scheduled">Programada</MenuItem>
                    <MenuItem value="betting_open">Apuestas Abiertas</MenuItem>
                    <MenuItem value="in_progress">En Progreso</MenuItem>
                    <MenuItem value="betting_closed">Apuestas Cerradas</MenuItem>
                    <MenuItem value="finished">Finalizada</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Apuesta Mínima (MXN)"
                  type="number"
                  fullWidth
                  value={formData.minBet}
                  onChange={(e) => setFormData({ ...formData, minBet: parseFloat(e.target.value) || 100 })}
                  inputProps={{ min: 100, step: 50 }}
                />
              </Box>

              {/* Campo de ganador - solo mostrar cuando está finalizada */}
              {formData.status === 'finished' && (
                <Box sx={{ mt: 2 }}>
                  <FormControl fullWidth>
                    <InputLabel>Gallo Ganador</InputLabel>
                    <Select
                      value={formData.winner || ''}
                      label="Gallo Ganador"
                      onChange={(e) => setFormData({ ...formData, winner: e.target.value as 'red' | 'green' | null })}
                    >
                      <MenuItem value="">Sin ganador / Empate</MenuItem>
                      <MenuItem value="red">{formData.cock1.name || 'Gallo Rojo'}</MenuItem>
                      <MenuItem value="green">{formData.cock2.name || 'Gallo Verde'}</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={!formData.eventId || !formData.cock1.name || !formData.cock2.name}
            >
              {editingFight ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
          <DialogTitle>Confirmar Eliminación</DialogTitle>
          <DialogContent>
            <Typography>
              ¿Estás seguro de que deseas eliminar la pelea "{fightToDelete?.cock1.name} vs {fightToDelete?.cock2.name}"?
              Esta acción no se puede deshacer.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={handleDelete} color="error" variant="contained">
              Eliminar
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
}
