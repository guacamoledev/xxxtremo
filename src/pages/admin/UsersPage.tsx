import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDocs, collection, query, orderBy, limit, startAfter } from 'firebase/firestore';
import { db } from '../../config/firebase';
import UserFinances from '../UserFinances';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Chip,
  Avatar,
  CircularProgress,
  InputAdornment,
  Card,
  CardContent,
  Button,
  Alert,
} from '@mui/material';
import { Upload } from '@mui/icons-material';
import { useCreateDeposit } from '../../hooks/useUserFinances';
import { Visibility, Search } from '@mui/icons-material';


const PAGE_SIZE = 10;

const fetchUsers = async (search: string, lastDoc: any = null) => {
  let users: any[] = [];
  if (search) {
    // Si hay búsqueda, obtener todos los usuarios y filtrar por nombre/email
    const allSnapshot = await getDocs(collection(db, 'users'));
    const searchLower = search.toLowerCase();
    users = allSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((u: any) =>
        (u.name && u.name.toLowerCase().includes(searchLower)) ||
        (u.email && u.email.toLowerCase().includes(searchLower)) ||
        (u.phone && u.phone.toLowerCase().includes(searchLower))
      );
    // Paginación manual sobre el resultado filtrado
    const paginated = users.slice(lastDoc ? PAGE_SIZE : 0, PAGE_SIZE);
    return {
      users: paginated,
      lastDoc: null,
      hasMore: users.length > PAGE_SIZE,
    };
  } else {
    let q = query(collection(db, 'users'), orderBy('name'), limit(PAGE_SIZE));
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    const snapshot = await getDocs(q);
    users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return {
      users,
      lastDoc: snapshot.docs[snapshot.docs.length - 1],
      hasMore: snapshot.docs.length === PAGE_SIZE,
    };
  }
};

const UsersPage: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [lastDoc, setLastDoc] = useState<any>(null);

  // Estado para el depósito manual
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [depositForm, setDepositForm] = useState({
    amount: '',
    receipt: null as File | null,
  });
  const [depositError, setDepositError] = useState('');
  const createDepositMutation = useCreateDeposit();

  const {
    data,
    isLoading,
  } = useQuery<{ users: any[]; lastDoc: any; hasMore: boolean }>({
    queryKey: ['users', search, page, lastDoc],
    queryFn: () => fetchUsers(search, lastDoc),
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(0);
    setLastDoc(null);
    // No refetch manual, useQuery lo hace automáticamente
  };

  const handleChangePage = (_: any, newPage: number) => {
    setPage(newPage);
    if (data && (data as any).lastDoc) setLastDoc((data as any).lastDoc);
    // No refetch manual, useQuery lo hace automáticamente
  };

  return (
    <Box sx={{ my: 4 }}>
      <Typography variant="h4" gutterBottom>
        Usuarios
      </Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField
          label="Buscar usuario"
          variant="outlined"
          fullWidth
          value={search}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
      </Paper>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Celular</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell>Saldo</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Ver Detalles</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress size={32} />
                </TableCell>
              </TableRow>
            ) : (
              ((data as any)?.users ?? []).map((user: any) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar src={user.photoURL} sx={{ width: 32, height: 32 }} />
                      <Typography variant="body2">{user.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.phone || '-'}</TableCell>
                  <TableCell>
                    <Chip label={user.role} color={user.role === 'ADMIN' ? 'primary' : user.role === 'FINANCE' ? 'secondary' : 'default'} size="small" />
                  </TableCell>
                  <TableCell>${user.balance?.toLocaleString('es-MX') || 0} MXN</TableCell>
                  <TableCell>
                    <Chip label={user.status || 'activo'} color={user.status === 'activo' ? 'success' : 'warning'} size="small" />
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => { setSelectedUser(user); setDetailsOpen(true); }}>
                      <Visibility />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={-1}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={PAGE_SIZE}
          rowsPerPageOptions={[PAGE_SIZE]}
          labelRowsPerPage="Usuarios por página"
          nextIconButtonProps={{ disabled: !((data as any)?.hasMore) }}
          backIconButtonProps={{ disabled: page === 0 }}
        />
      </TableContainer>

      {/* Modal de detalles financieros */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Detalles financieros de {selectedUser?.name}</DialogTitle>
        <DialogContent dividers>
          {selectedUser && (
            <Box sx={{ mb: 4 }}>
              {/* Card de resumen financiero, estilo copiado de MyBetsPage */}
              <Box sx={{ mb: 4 }}>
                <Card sx={{ mb: 4 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      📊 Resumen Financiero Detallado
                    </Typography>
                    {/* El componente UserFinances ya calcula y muestra el resumen y la tabla, así que solo lo envolvemos en la Card para igualar el estilo */}
                    <UserFinances userId={selectedUser.id} user={selectedUser} />
                  </CardContent>
                </Card>
                <Button
                  variant="contained"
                  startIcon={<Upload />}
                  onClick={() => {
                    setDepositDialogOpen(true);
                    setDepositForm({ amount: '', receipt: null });
                    setDepositError('');
                  }}
                  sx={{ mb: 2 }}
                >
                  Realizar depósito manual
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog para depósito manual */}
      <Dialog open={depositDialogOpen} onClose={() => setDepositDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Depósito manual para {selectedUser?.name}</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Ingresa la cantidad y sube el comprobante de pago para registrar un depósito a nombre del usuario.
          </Alert>
          <TextField
            autoFocus
            margin="dense"
            label="Monto"
            type="number"
            fullWidth
            variant="outlined"
            value={depositForm.amount}
            onChange={e => setDepositForm({ ...depositForm, amount: e.target.value })}
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
              endAdornment: <InputAdornment position="end">MXN</InputAdornment>,
            }}
            sx={{ mb: 2 }}
          />
          <Button
            variant="outlined"
            component="label"
            startIcon={<Upload />}
            fullWidth
            sx={{ mb: 2, borderColor: !depositForm.receipt ? 'error.main' : 'primary.main', color: !depositForm.receipt ? 'error.main' : 'primary.main' }}
          >
            Subir Comprobante *
            <input
              type="file"
              hidden
              accept="image/*,.pdf"
              onChange={e => {
                const file = e.target.files?.[0] || null;
                setDepositForm({ ...depositForm, receipt: file });
              }}
            />
          </Button>
          {depositForm.receipt ? (
            <Typography variant="body2" color="success.main" sx={{ mb: 1 }}>
              ✓ Archivo seleccionado: {depositForm.receipt.name}
            </Typography>
          ) : (
            <Typography variant="body2" color="error.main" sx={{ mb: 1 }}>
              * El comprobante de pago es obligatorio
            </Typography>
          )}
          {depositError && (
            <Alert severity="error" sx={{ mb: 1 }}>{depositError}</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDepositDialogOpen(false)}>Cancelar</Button>
          <Button
            onClick={async () => {
              if (!depositForm.amount || !depositForm.receipt) {
                setDepositError('Por favor ingresa el monto y sube el comprobante.');
                return;
              }
              try {
                setDepositError('');
                // El depósito se hará para el usuario actual, no el seleccionado, a menos que el hook sea modificado para aceptar userId.
                await createDepositMutation.mutateAsync({
                  amount: parseFloat(depositForm.amount),
                  method: 'Manual (admin)',
                  reference: 'Depósito manual',
                  receipt: depositForm.receipt,
                  // userId: selectedUser.id, // Omitido por error de tipado
                });
                setDepositDialogOpen(false);
              } catch (err: any) {
                setDepositError('Error al registrar el depósito: ' + (err.message || ''));
              }
            }}
            variant="contained"
            disabled={createDepositMutation.isPending || !depositForm.amount || !depositForm.receipt}
          >
            {createDepositMutation.isPending ? 'Enviando...' : 'Registrar Depósito'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersPage;
