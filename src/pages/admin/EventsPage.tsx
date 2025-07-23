import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Alert,
  Skeleton,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CalendarToday,
  AccessTime,
  People,
  AttachMoney,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { useEvents, useCreateEvent, useUpdateEvent, useDeleteEvent, useStreamingChannels } from '../../hooks/useFirestore';
import { useActivePalenques } from '../../hooks/useFirestore';
import type { Event } from '../../types';

interface EventFormData {
  palenqueId: string;
  name: string;
  description: string;
  date: Dayjs | null;
  startTime: Dayjs | null;
  entryCost: number;
  requiredFights: number;
  confirmedTeams: string[];
  numberOfCocks: number;
  streamingChannel: string;
  eventType: 'regular' | 'special' | 'tournament';
  status: 'scheduled' | 'in_progress' | 'finished' | 'cancelled';
}

const EventsPage: React.FC = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState<EventFormData>({
    palenqueId: '',
    name: '',
    description: '',
    date: null,
    startTime: null,
    entryCost: 0,
    requiredFights: 6,
    confirmedTeams: [],
    numberOfCocks: 12,
    streamingChannel: '',
    eventType: 'regular',
    status: 'scheduled',
  });
  const [error, setError] = useState('');

  // Queries and mutations
  const { data: events, isLoading, error: queryError } = useEvents();
  const { data: palenques } = useActivePalenques();
  const { data: streamingChannels } = useStreamingChannels();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const resetForm = () => {
    setFormData({
      palenqueId: '',
      name: '',
      description: '',
      date: null,
      startTime: null,
      entryCost: 0,
      requiredFights: 6,
      confirmedTeams: [],
      numberOfCocks: 12,
      streamingChannel: '',
      eventType: 'regular',
      status: 'scheduled',
    });
    setError('');
  };

  const handleOpenCreate = () => {
    resetForm();
    setEditingEvent(null);
    setIsCreateDialogOpen(true);
  };

  const handleOpenEdit = (event: Event) => {
    setFormData({
      palenqueId: event.palenqueId,
      name: event.name,
      description: event.description || '',
      date: dayjs(event.date.seconds * 1000),
      startTime: dayjs(event.startTime.seconds * 1000),
      entryCost: event.entryCost,
      requiredFights: event.requiredFights,
      confirmedTeams: event.confirmedTeams,
      numberOfCocks: event.numberOfCocks,
      streamingChannel: event.streamingChannel,
      eventType: event.eventType,
      status: event.status,
    });
    setEditingEvent(event);
    setIsCreateDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingEvent(null);
    resetForm();
  };

  const handleInputChange = (field: keyof EventFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any
  ) => {
    let value = event.target?.value;
    
    if (field === 'entryCost' || field === 'requiredFights' || field === 'numberOfCocks') {
      value = parseInt(value) || 0;
    }
    
    setFormData({ ...formData, [field]: value });
  };

  const handleDateChange = (field: 'date' | 'startTime') => (value: Dayjs | null) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.palenqueId || !formData.date || !formData.startTime) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setError('');
      
      // Combinar la fecha del DatePicker con la hora del TimePicker
      const eventDate = formData.date!.clone();
      const eventStartTime = eventDate.clone()
        .hour(formData.startTime!.hour())
        .minute(formData.startTime!.minute())
        .second(0)
        .millisecond(0);
      
      const eventData = {
        ...formData,
        date: eventDate.toDate() as any,
        startTime: eventStartTime.toDate() as any,
      };
      
      if (editingEvent) {
        await updateEvent.mutateAsync({
          id: editingEvent.id,
          updates: eventData,
        });
      } else {
        await createEvent.mutateAsync(eventData);
      }
      
      handleCloseDialog();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await deleteEvent.mutateAsync(id);
      } catch (err: any) {
        console.error('Error deleting event:', err);
      }
    }
  };

  const getStatusColor = (status: Event['status']) => {
    switch (status) {
      case 'scheduled': return 'primary';
      case 'in_progress': return 'success';
      case 'finished': return 'default';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: Event['status']) => {
    switch (status) {
      case 'scheduled': return 'Programado';
      case 'in_progress': return 'En Progreso';
      case 'finished': return 'Terminado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const handleStatusChange = async (eventId: string, newStatus: Event['status']) => {
    try {
      await updateEvent.mutateAsync({
        id: eventId,
        updates: { status: newStatus },
      });
    } catch (err: any) {
      console.error('Error updating event status:', err);
    }
  };

  const statusOptions: { value: Event['status']; label: string }[] = [
    { value: 'scheduled', label: 'Programado' },
    { value: 'in_progress', label: 'En Progreso' },
    { value: 'finished', label: 'Terminado' },
    { value: 'cancelled', label: 'Cancelado' },
  ];

  if (isLoading) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Events Management
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {[1, 2, 3].map((item) => (
            <Card key={item} sx={{ width: 320 }}>
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
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Events Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
          >
            Add Event
          </Button>
        </Box>

        {queryError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Error loading events: {queryError.message}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {events?.map((event) => (
            <Card key={event.id} sx={{ width: 350, display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" component="h3">
                    {event.name}
                  </Typography>
                  <Chip 
                    label={getStatusLabel(event.status)} 
                    color={getStatusColor(event.status)}
                    size="small"
                  />
                </Box>
                
                <Chip 
                  label={event.eventType} 
                  size="small" 
                  color={event.eventType === 'special' ? 'secondary' : 'default'}
                  sx={{ mb: 2 }}
                />
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {event.description}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CalendarToday fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2">
                    {new Date(event.date.seconds * 1000).toLocaleDateString()}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <AccessTime fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2">
                    {new Date(event.startTime.seconds * 1000).toLocaleTimeString()}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <People fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2">{event.requiredFights} fights</Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AttachMoney fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2">${event.entryCost} MXN</Typography>
                </Box>
              </CardContent>
              
              <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="Editar evento">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenEdit(event)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar evento">
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(event.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
                
                {/* Status Selector */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Estado:
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select
                      value={event.status}
                      onChange={(e) => handleStatusChange(event.id, e.target.value as Event['status'])}
                      size="small"
                      sx={{ fontSize: '0.875rem' }}
                    >
                      {statusOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </CardActions>
            </Card>
          ))}
        </Box>

        {events?.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No events found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create your first event to get started
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreate}
            >
              Add First Event
            </Button>
          </Box>
        )}

        {/* Create/Edit Dialog */}
        <Dialog 
          open={isCreateDialogOpen} 
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {editingEvent ? 'Edit Event' : 'Create New Event'}
          </DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth sx={{ mt: 1 }}>
                <InputLabel>Palenque</InputLabel>
                <Select
                  value={formData.palenqueId}
                  label="Palenque"
                  onChange={handleInputChange('palenqueId')}
                >
                  {palenques?.map((palenque) => (
                    <MenuItem key={palenque.id} value={palenque.id}>
                      {palenque.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                label="Event Name"
                value={formData.name}
                onChange={handleInputChange('name')}
              />
              
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={formData.description}
                onChange={handleInputChange('description')}
              />
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <DatePicker
                  label="Event Date"
                  value={formData.date}
                  onChange={handleDateChange('date')}
                  slotProps={{ textField: { fullWidth: true } }}
                />
                
                <TimePicker
                  label="Start Time"
                  value={formData.startTime}
                  onChange={handleDateChange('startTime')}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Event Type</InputLabel>
                  <Select
                    value={formData.eventType}
                    label="Event Type"
                    onChange={handleInputChange('eventType')}
                  >
                    <MenuItem value="regular">Regular</MenuItem>
                    <MenuItem value="special">Special</MenuItem>
                    <MenuItem value="tournament">Tournament</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    label="Status"
                    onChange={handleInputChange('status')}
                  >
                    <MenuItem value="scheduled">Scheduled</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="finished">Finished</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Entry Cost (MXN)"
                  type="number"
                  value={formData.entryCost}
                  onChange={handleInputChange('entryCost')}
                />
                
                <TextField
                  fullWidth
                  label="Required Fights"
                  type="number"
                  value={formData.requiredFights}
                  onChange={handleInputChange('requiredFights')}
                />
                
                <TextField
                  fullWidth
                  label="Number of Cocks"
                  type="number"
                  value={formData.numberOfCocks}
                  onChange={handleInputChange('numberOfCocks')}
                />
              </Box>
              
              <FormControl fullWidth>
                <InputLabel>Streaming Channel</InputLabel>
                <Select
                  value={formData.streamingChannel}
                  onChange={(e) => setFormData(prev => ({ ...prev, streamingChannel: e.target.value }))}
                  label="Streaming Channel"
                >
                  {streamingChannels?.map((channel) => (
                    <MenuItem key={channel.id} value={channel.id}>
                      {channel.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button 
              onClick={handleSubmit}
              variant="contained"
              disabled={createEvent.isPending || updateEvent.isPending}
            >
              {editingEvent ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default EventsPage;
