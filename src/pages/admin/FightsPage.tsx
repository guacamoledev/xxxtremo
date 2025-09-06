import { useState, useRef } from 'react';
import {
  Box,
  Button,
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
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
// Importa xlsx para parsear archivos Excel
import * as XLSX from 'xlsx';
// Solo la definición de la interfaz fuera del componente
interface BulkFightRow {
  'Gallo Rojo': string;
  'Gallo Verde': string;
  'Apuesta mínima': number;
  'Fecha/Hora (opcional)'?: string;
}
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Sports as SportsIcon,
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

// ...existing code...


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

function FightsPage() {
  // ...existing code...
  // Estados para carga masiva
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkEventId, setBulkEventId] = useState('');
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handler para abrir modal de carga masiva
  const handleBulkOpen = () => {
    setBulkOpen(true);
    setBulkEventId('');
    setBulkFile(null);
    setBulkError(null);
    setBulkSuccess(null);
  };

  const handleBulkClose = () => {
    setBulkOpen(false);
    setBulkEventId('');
    setBulkFile(null);
    setBulkError(null);
    setBulkSuccess(null);
  };

  // Handler para archivo
  const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBulkFile(e.target.files[0]);
      setBulkError(null);
      setBulkSuccess(null);
    }
  };

  // Handler para importar peleas
  const handleBulkImport = async () => {
    if (!bulkEventId || !bulkFile) {
      setBulkError('Selecciona un evento y un archivo.');
      return;
    }
    setBulkLoading(true);
    setBulkError(null);
    setBulkSuccess(null);
    try {
      // Leer archivo Excel
      const data = await bulkFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: BulkFightRow[] = XLSX.utils.sheet_to_json(sheet);
      if (!rows.length) throw new Error('El archivo está vacío o mal formateado.');

      // Validar evento
      const selectedEvent = events.find((ev: any) => ev.id === bulkEventId);
      if (!selectedEvent) throw new Error('Evento no encontrado.');

      // Obtener el siguiente número de pelea
      let nextFightNumber = getNextFightNumber(bulkEventId);

      // Validar y preparar peleas
      const fightsToCreate = rows.map((row, idx) => {
        if (!row['Gallo Rojo'] || !row['Gallo Verde'] || !row['Apuesta mínima']) {
          throw new Error(`Fila ${idx + 2}: Faltan datos obligatorios.`);
        }
        const minBet = Number(row['Apuesta mínima']);
        if (isNaN(minBet) || minBet < 100) {
          throw new Error(`Fila ${idx + 2}: La apuesta mínima debe ser al menos $100.`);
        }
        let scheduledTime = selectedEvent.startTime;
        if (row['Fecha/Hora (opcional)']) {
          // Intentar parsear fecha/hora DD/MM/YYYY HH:mm
          const d = dayjs(row['Fecha/Hora (opcional)'], 'DD/MM/YYYY HH:mm');
          if (d.isValid()) scheduledTime = { toDate: () => d.toDate() } as any;
        }
        return {
          eventId: bulkEventId,
          fightNumber: nextFightNumber++,
          redFighter: row['Gallo Rojo'],
          greenFighter: row['Gallo Verde'],
          status: 'scheduled' as FightStatus,
          minBet,
          winner: null,
          cock1: { name: row['Gallo Rojo'], breed: '', weight: 0, owner: '' },
          cock2: { name: row['Gallo Verde'], breed: '', weight: 0, owner: '' },
          bettingEnabled: true,
          scheduledTime,
        };
      });

      // Crear peleas en batch (secuencial para feedback)
      for (const fight of fightsToCreate) {
        // eslint-disable-next-line no-await-in-loop
        await createFightMutation.mutateAsync(fight);
      }
      setBulkSuccess(`¡${fightsToCreate.length} peleas importadas correctamente!`);
      setBulkFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setBulkError(err.message || 'Error al importar peleas.');
    } finally {
      setBulkLoading(false);
    }
  };
  const { data: fights = [], isLoading: fightsLoading, error: fightsError } = useFights();
  const { data: events = [], isLoading: eventsLoading } = useEvents();
  
  const [open, setOpen] = useState(false);
  const [editingFight, setEditingFight] = useState<Fight | null>(null);
  const [formData, setFormData] = useState<FightFormData>(initialFormData);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [fightToDelete, setFightToDelete] = useState<Fight | null>(null);
  const [tabIndex, setTabIndex] = useState(0);
  // Estados para búsqueda, paginación, ordenamiento y filtro de status de la tabla de peleas
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState<'fightNumber' | 'cock1' | 'cock2' | 'status' | 'minBet' | 'scheduledTime'>('fightNumber');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<FightStatus[]>([]);

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
            <Paper key={item} sx={{ width: 400, p: 2 }}>
              <Skeleton variant="text" sx={{ fontSize: '1.5rem' }} />
              <Skeleton variant="text" />
              <Skeleton variant="text" />
            </Paper>
          ))}
        </Box>
      </Box>
    );
  }

  // Un evento está "finalizado" si todas sus peleas están finalizadas Y tiene al menos una pelea
  // Si no tiene peleas, debe considerarse como no finalizado (activo)
  const nonFinishedEvents = events
    .filter(event => {
      const eventFights = fights.filter(f => f.eventId === event.id);
      if (eventFights.length === 0) return true;
      return eventFights.some(f => f.status !== 'finished');
    })
    .sort((a, b) => b.startTime.toDate().getTime() - a.startTime.toDate().getTime());
 

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Gestión de Peleas
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpen()}
            >
              Nueva Pelea
            </Button>
            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              onClick={handleBulkOpen}
            >
              Subir peleas
            </Button>
          </Box>
        {/* Modal de carga masiva de peleas */}
        <Dialog open={bulkOpen} onClose={handleBulkClose} maxWidth="sm" fullWidth>
          <DialogTitle>Cargar peleas desde Excel</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <FormControl fullWidth required>
                <InputLabel>Evento</InputLabel>
                <Select
                  value={bulkEventId}
                  label="Evento"
                  onChange={e => setBulkEventId(e.target.value)}
                >
                  {events.filter(e => e.status !== 'finished').map(event => (
                    <MenuItem key={event.id} value={event.id}>
                      {event.name} - {dayjs(event.startTime.toDate()).format('DD/MM/YYYY')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                component="label"
                startIcon={<UploadFileIcon />}
                disabled={!bulkEventId || bulkLoading}
              >
                Seleccionar archivo Excel
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  hidden
                  ref={fileInputRef}
                  onChange={handleBulkFileChange}
                />
              </Button>
              {bulkFile && (
                <Typography variant="body2" color="text.secondary">
                  Archivo seleccionado: {bulkFile.name}
                </Typography>
              )}
              <Alert severity="info">
                El archivo debe tener las siguientes columnas: <b>Gallo Rojo</b>, <b>Gallo Verde</b>, <b>Apuesta mínima</b>, <b>Fecha/Hora (opcional)</b>.<br/>
                Descarga una <a href="/plantilla_peleas.xlsx" download>plantilla aquí</a>.
              </Alert>
              {bulkError && <Alert severity="error">{bulkError}</Alert>}
              {bulkSuccess && <Alert severity="success">{bulkSuccess}</Alert>}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleBulkClose} disabled={bulkLoading}>Cancelar</Button>
            <Button
              onClick={handleBulkImport}
              variant="contained"
              disabled={!bulkEventId || !bulkFile || bulkLoading}
            >
              {bulkLoading ? 'Importando...' : 'Importar'}
            </Button>
          </DialogActions>
        </Dialog>
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
          <Box>
            <Tabs
              value={tabIndex}
              onChange={(_, newValue) => setTabIndex(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ mb: 3 }}
            >
              {nonFinishedEvents.map((event) => (
                <Tab key={event.id} label={event.name + ' (' + dayjs(event.startTime.toDate()).format('DD/MM/YYYY') + ')'} />
              ))}
            </Tabs>
            {nonFinishedEvents.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No hay eventos activos.
                </Typography>
              </Paper>
            ) : (() => {
              // Tabla de peleas para el evento seleccionado
              const event = nonFinishedEvents[tabIndex];
              if (!event) return null;
              let fightsByEvent = fights.filter(f => f.eventId === event.id);
              // Filtro por status
              if (statusFilter.length > 0) {
                fightsByEvent = fightsByEvent.filter(f => statusFilter.includes(f.status));
              }
              if (search) {
                const s = search.toLowerCase();
                fightsByEvent = fightsByEvent.filter(f =>
                  f.cock1.name.toLowerCase().includes(s) ||
                  f.cock2.name.toLowerCase().includes(s) ||
                  ('' + f.fightNumber).includes(s)
                );
              }
              // Ordenar por columna seleccionada
              fightsByEvent = [...fightsByEvent].sort((a, b) => {
                let aValue: any;
                let bValue: any;
                switch (orderBy) {
                  case 'fightNumber':
                    aValue = a.fightNumber;
                    bValue = b.fightNumber;
                    break;
                  case 'cock1':
                    aValue = a.cock1.name.toLowerCase();
                    bValue = b.cock1.name.toLowerCase();
                    break;
                  case 'cock2':
                    aValue = a.cock2.name.toLowerCase();
                    bValue = b.cock2.name.toLowerCase();
                    break;
                  case 'status':
                    aValue = a.status;
                    bValue = b.status;
                    break;
                  case 'minBet':
                    aValue = a.minBet;
                    bValue = b.minBet;
                    break;
                  case 'scheduledTime':
                    aValue = a.scheduledTime ? a.scheduledTime.toDate().getTime() : 0;
                    bValue = b.scheduledTime ? b.scheduledTime.toDate().getTime() : 0;
                    break;
                  default:
                    aValue = a.fightNumber;
                    bValue = b.fightNumber;
                }
                if (aValue < bValue) return order === 'asc' ? -1 : 1;
                if (aValue > bValue) return order === 'asc' ? 1 : -1;
                return 0;
              });
              const paginatedFights = fightsByEvent.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
              // Handler para ordenar columnas
              const handleSort = (property: typeof orderBy) => {
                if (orderBy === property) {
                  setOrder(order === 'asc' ? 'desc' : 'asc');
                } else {
                  setOrderBy(property);
                  setOrder('asc');
                }
              };
              // Handler para filtro de status
              const handleStatusFilterChange = (e: SelectChangeEvent<FightStatus[]>) => {
                const value = e.target.value;
                setStatusFilter(typeof value === 'string' ? value.split(',') as FightStatus[] : value as FightStatus[]);
                setPage(0);
              };
              return (
                <Box key={event.id}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, gap: 2, flexWrap: 'wrap' }}>
                    <Typography variant="h6">Peleas del evento</Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <FormControl size="small" sx={{ minWidth: 180 }}>
                        <InputLabel>Status</InputLabel>
                        <Select
                          multiple
                          value={statusFilter}
                          onChange={handleStatusFilterChange}
                          label="Status"
                          renderValue={(selected) =>
                            (selected as FightStatus[]).map(s => statusLabels[s]).join(', ') || 'Todos'
                          }
                        >
                          {Object.entries(statusLabels).map(([key, label]) => (
                            <MenuItem key={key} value={key}>
                              <Chip size="small" label={label} color={statusColors[key as FightStatus]} sx={{ mr: 1 }} />
                              {label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <TextField
                        size="small"
                        placeholder="Buscar pelea, gallo..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        sx={{ width: 260 }}
                      />
                    </Box>
                  </Box>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell
                            onClick={() => handleSort('fightNumber')}
                            style={{ cursor: 'pointer' }}
                          >
                            # {orderBy === 'fightNumber' ? (order === 'asc' ? '▲' : '▼') : ''}
                          </TableCell>
                          <TableCell
                            onClick={() => handleSort('cock1')}
                            style={{ cursor: 'pointer' }}
                          >
                            Gallo Rojo {orderBy === 'cock1' ? (order === 'asc' ? '▲' : '▼') : ''}
                          </TableCell>
                          <TableCell
                            onClick={() => handleSort('cock2')}
                            style={{ cursor: 'pointer' }}
                          >
                            Gallo Verde {orderBy === 'cock2' ? (order === 'asc' ? '▲' : '▼') : ''}
                          </TableCell>
                          <TableCell
                            onClick={() => handleSort('status')}
                            style={{ cursor: 'pointer' }}
                          >
                            Estado {orderBy === 'status' ? (order === 'asc' ? '▲' : '▼') : ''}
                          </TableCell>
                          <TableCell
                            onClick={() => handleSort('minBet')}
                            style={{ cursor: 'pointer' }}
                          >
                            Apuesta mínima {orderBy === 'minBet' ? (order === 'asc' ? '▲' : '▼') : ''}
                          </TableCell>
                          <TableCell
                            onClick={() => handleSort('scheduledTime')}
                            style={{ cursor: 'pointer' }}
                          >
                            Fecha/Hora {orderBy === 'scheduledTime' ? (order === 'asc' ? '▲' : '▼') : ''}
                          </TableCell>
                          <TableCell>Acciones</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {paginatedFights.map(fight => (
                          <TableRow key={fight.id}>
                            <TableCell>{fight.fightNumber}</TableCell>
                            <TableCell>{fight.cock1.name}</TableCell>
                            <TableCell>{fight.cock2.name}</TableCell>
                            <TableCell>
                              <Chip
                                label={statusLabels[fight.status]}
                                color={statusColors[fight.status]}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>${fight.minBet}</TableCell>
                            <TableCell>
                              {fight.scheduledTime ? dayjs(fight.scheduledTime.toDate()).format('DD/MM/YYYY HH:mm') : ''}
                            </TableCell>
                            <TableCell>
                              <Tooltip title="Editar pelea">
                                <IconButton size="small" onClick={() => handleOpen(fight)}>
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
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
                                <IconButton size="small" onClick={() => confirmDelete(fight)} color="error">
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                        {paginatedFights.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={9} align="center">
                              No hay peleas para este evento.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    component="div"
                    count={fightsByEvent.length}
                    page={page}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={e => {
                      setRowsPerPage(parseInt(e.target.value, 10));
                      setPage(0);
                    }}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                  />
                </Box>
              );
            })()}
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
                  {events
                    .filter(event => event.status !== 'finished')
                    .map((event) => (
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
                  <Typography variant="subtitle1" gutterBottom color="secondary">
                    Gallo Verde
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      label="Nombre del Partido"
                      fullWidth
                      value={formData.cock2.name}
                      onChange={(e) => setFormData({
                        ...formData,
                        cock2: { ...formData.cock2, name: e.target.value }
                      })}
                      required
                    />
                  </Box>
                </Box>

                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" gutterBottom color="primary">
                    Gallo Rojo
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      label="Nombre del Partido"
                      fullWidth
                      value={formData.cock1.name}
                      onChange={(e) => setFormData({
                        ...formData,
                        cock1: { ...formData.cock1, name: e.target.value }
                      })}
                      required
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

export default FightsPage;
