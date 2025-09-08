import { traducirErrorFirebase } from '../utils/traducirErrorFirebase';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Avatar,
  CircularProgress
} from '@mui/material';
import { db, storage } from '../config/firebase';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
//
import { Add, Event as EventIcon, Upload } from '@mui/icons-material';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { useAuth } from '../contexts/AuthContext';


type EventType = {
  id: string;
  name: string;
  date: string;
  location: string;
  image: string;
};


const EventsCalendarPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState<EventType[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    date: dayjs().format('YYYY-MM-DD'),
    location: '',
    image: null as File | null,
    imageUrl: '',
  });
  const [selectedDayEvents, setSelectedDayEvents] = useState<EventType[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [fullImage, setFullImage] = useState<string | null>(null);

  const isAdmin = ['admin', 'finance', 'streaming'].includes(String(currentUser?.role));

  // Handle image preview
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setForm((prev) => ({
      ...prev,
      image: file,
      imageUrl: file ? URL.createObjectURL(file) : '',
    }));
  };

  // Guardar evento en Firestore y subir imagen a Storage
  const handleSubmit = async () => {
    setLoading(true);
    try {
      let imageUrl = '';
      if (form.image) {
  const storageRef = ref(storage, `calendar-events/${Date.now()}_${form.image.name}`);
        await uploadBytes(storageRef, form.image);
        imageUrl = await getDownloadURL(storageRef);
      }
  await addDoc(collection(db, 'calendar-events'), {
        name: form.name,
        date: form.date,
        location: form.location,
        image: imageUrl,
        createdAt: new Date().toISOString(),
      });
      setForm({ name: '', date: dayjs().format('YYYY-MM-DD'), location: '', image: null, imageUrl: '' });
      setDialogOpen(false);
    } catch (err) {
      alert('Error al guardar el evento: ' + traducirErrorFirebase(err));
    } finally {
      setLoading(false);
    }
  };

  // Leer eventos en tiempo real
  useEffect(() => {
  const q = query(collection(db, 'calendar-events'), orderBy('date', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setEvents(
        snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as EventType[]
      );
    });
    return () => unsub();
  }, []);

  // Mostrar solo dos semanas y navegación
  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  dayjs.locale('es');
  const today = dayjs();
  const [weekOffset, setWeekOffset] = useState(0); // 0 = semana actual, 1 = siguiente, -1 = anterior, etc.
  // Calcular el lunes de la semana base (dayjs: 0=domingo, 1=lunes...)
  const baseMonday = today.day() === 0
    ? today.subtract(6, 'day').startOf('day').add(weekOffset * 14, 'day')
    : today.startOf('week').add(weekOffset * 14, 'day');
  // Generar los 14 días (2 semanas)
  const calendarDays = Array.from({ length: 14 }, (_, i) => baseMonday.add(i, 'day'));

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <EventIcon sx={{ mr: 1 }} />
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          Calendario de Próximos Eventos
        </Typography>
        {isAdmin && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}>
            Agregar Evento
          </Button>
        )}
      </Box>
      <Paper sx={{ p: 2, mb: 2, bgcolor: 'transparent', boxShadow: 'none' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Button variant="outlined" size="small" onClick={() => setWeekOffset((w) => w - 1)}>
            Semana anterior
          </Button>
          <Typography variant="caption" color="primary.main">
            {calendarDays[0].format('DD MMM')} - {calendarDays[13].format('DD MMM')}
          </Typography>
          <Button variant="outlined" size="small" onClick={() => setWeekOffset((w) => w + 1)}>
            Siguiente semana
          </Button>
        </Box>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)', md: 'repeat(7, 1fr)' },
            gap: 2,
          }}
        >
          {/* Celdas del calendario (2 semanas) */}
          {calendarDays.map((date, idx) => {
            const isCurrentMonth = date.month() === today.month();
            const dayEvents = events.filter((ev) => dayjs(ev.date).isSame(date, 'day'));
            const weekDayLabel = weekDays[date.day() === 0 ? 6 : date.day() - 1];
            return (
              <Box
                key={date.format('YYYY-MM-DD') + idx}
                sx={{
                  minHeight: { xs: 70, sm: 90, md: 120 },
                  borderRadius: 3,
                  p: { xs: 1, sm: 1.5 },
                  bgcolor: isCurrentMonth ? 'white' : '#f3f6fa',
                  border: isCurrentMonth ? '1px solid #e0e0e0' : '1px dashed #e0e0e0',
                  opacity: isCurrentMonth ? 1 : 0.5,
                  boxShadow: isCurrentMonth && dayEvents.length > 0 ? 3 : 0,
                  position: 'relative',
                  transition: 'box-shadow 0.2s',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: dayEvents.length > 0 ? 'pointer' : 'default',
                }}
                onClick={() => dayEvents.length > 0 && setSelectedDayEvents(dayEvents)}
              >
                <Typography variant="caption" color={isCurrentMonth ? 'primary.main' : 'text.disabled'} sx={{ fontWeight: 700, letterSpacing: 1, mb: 0.2 }}>
                  {weekDayLabel}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.5 }}>
                  <Typography variant="subtitle2" color={isCurrentMonth ? 'text.primary' : 'text.disabled'} sx={{ fontWeight: 600 }}>
                    {date.date()}
                  </Typography>
                  <Typography variant="caption" color={isCurrentMonth ? 'text.secondary' : 'text.disabled'} sx={{ fontWeight: 500 }}>
                    /{date.format('MM')}
                  </Typography>
                </Box>
                {dayEvents.length > 0 && (
                  <EventIcon color="primary" sx={{ fontSize: { xs: 22, sm: 28 } }} />
                )}
              </Box>
            );
          })}
      {/* Modal para mostrar eventos del día */}
      <Dialog open={!!selectedDayEvents} onClose={() => setSelectedDayEvents(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Eventos del día</DialogTitle>
        <DialogContent>
          {selectedDayEvents && selectedDayEvents.length > 0 ? (
            selectedDayEvents.map((ev) => (
              <Box key={ev.id} sx={{ mb: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {ev.image && (
                  <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', mb: 2 }}>
                    <Avatar
                      src={ev.image}
                      variant="rounded"
                      sx={{
                        width: { xs: 220, sm: 320 },
                        height: { xs: 160, sm: 220 },
                        maxWidth: '100%',
                        maxHeight: '40vh',
                        objectFit: 'cover',
                        boxShadow: 3,
                        cursor: 'pointer',
                      }}
                      onClick={() => setFullImage(ev.image)}
                    />
                  </Box>
                )}
      {/* Modal para imagen completa */}
      <Dialog open={!!fullImage} onClose={() => setFullImage(null)} maxWidth="md" fullWidth>
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: 'black', p: 2 }}>
          {fullImage && (
            <img
              src={fullImage}
              alt="Evento"
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                borderRadius: 12,
                boxShadow: '0 4px 32px rgba(0,0,0,0.7)',
                background: '#222',
                objectFit: 'contain',
              }}
              onClick={() => setFullImage(null)}
            />
          )}
          <Button onClick={() => setFullImage(null)} sx={{ mt: 2, color: 'white', borderColor: 'white' }} variant="outlined">
            Cerrar
          </Button>
        </Box>
      </Dialog>
                <Typography variant="subtitle1" fontWeight="bold" align="center">{ev.name}</Typography>
                <Typography variant="body2" color="text.secondary" align="center">{ev.location}</Typography>
                <Typography variant="caption" color="text.secondary" align="center">{dayjs(ev.date).format('DD/MM/YYYY')}</Typography>
              </Box>
            ))
          ) : (
            <Typography variant="body2" color="text.disabled">No hay eventos para este día.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedDayEvents(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
        </Box>
      </Paper>
      {/* Dialogo para agregar evento */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Agregar Evento</DialogTitle>
        <DialogContent>
          <TextField
            label="Nombre del Evento"
            fullWidth
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Fecha"
            type="date"
            fullWidth
            value={form.date}
            onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
            sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Lugar"
            fullWidth
            value={form.location}
            onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <Button
            variant="outlined"
            component="label"
            startIcon={<Upload />}
            fullWidth
            sx={{ mb: 2 }}
          >
            Subir Imagen
            <input type="file" hidden accept="image/*" onChange={handleImageChange} />
          </Button>
          {form.imageUrl && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <Avatar src={form.imageUrl} variant="rounded" sx={{ width: 80, height: 80 }} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!form.name || !form.date || !form.location || loading} startIcon={loading ? <CircularProgress size={20} color="inherit" /> : undefined}>
            {loading ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EventsCalendarPage;
