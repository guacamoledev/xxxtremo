import { traducirErrorFirebase } from '../utils/traducirErrorFirebase';
import React, { useState } from 'react';
import { Box, Typography, Chip, TableContainer, Paper, Table, TableHead, TableRow, TableCell, TableBody, Button, CircularProgress, Alert } from '@mui/material';
import { useBetsByUser } from '../hooks/useFirestore';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
// import { db } from '../config/firebase';
import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

interface UserFinancesProps {
  userId: string;
  user: any;
}

import { useQueryClient } from '@tanstack/react-query';

const UserFinances: React.FC<UserFinancesProps> = ({ userId, user: initialUser }) => {
  // Obtener apuestas del usuario
  const { data: bets = [] } = useBetsByUser(userId);
  // Obtener depósitos aprobados
  const {
    data: userDeposits = [],
    refetch: refetchDeposits
  } = useQuery({
    queryKey: ['userDeposits', userId],
    queryFn: async () => {
      const depositsRef = collection(db, 'deposits');
      const q = query(
        depositsRef,
        where('userId', '==', userId),
        where('status', '==', 'approved')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    enabled: !!userId
  });
  // Obtener retiros
  const {
    data: userWithdrawals = [],
    refetch: refetchWithdrawals
  } = useQuery({
    queryKey: ['userWithdrawals', userId],
    queryFn: async () => {
      const withdrawalsRef = collection(db, 'withdrawals');
      const q = query(
        withdrawalsRef,
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    enabled: !!userId
  });

  // Calcular métricas financieras
  const totalDeposited = userDeposits.reduce((sum: number, deposit: any) => sum + deposit.amount, 0);
  const totalWithdrawn = userWithdrawals.filter((w: any) => w.status === 'approved').reduce((sum: number, w: any) => sum + w.amount, 0);
  const pendingWithdrawals = userWithdrawals.filter((w: any) => w.status === 'pending').reduce((sum: number, w: any) => sum + w.amount, 0);
  const totalWagered = bets.filter((b: any) => b.status !== 'refunded').reduce((sum: number, b: any) => sum + (b.matchedAmount || b.amount), 0);
  const totalWon = bets.filter((b: any) => b.status === 'won').reduce((sum: number, b: any) => sum + (b.profit || 0), 0);
  const totalLost = bets.filter((b: any) => b.status === 'lost').reduce((sum: number, b: any) => sum + (b.matchedAmount || b.amount), 0);
  const netProfit = totalWon - totalLost;
  const [user, setUser] = useState(initialUser);
  const saldoActual = user.balance || 0;
  const saldoEsperado = totalDeposited - totalWithdrawn - pendingWithdrawals - totalLost + totalWon;
  const diferencia = saldoEsperado - saldoActual;

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateSuccess, setDeactivateSuccess] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const handleDeactivateUser = async () => {
    setDeactivating(true);
    setDeactivateError(null);
    setDeactivateSuccess(false);
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { active: false });
      setDeactivateSuccess(true);
      setUser((prev: any) => ({ ...prev, active: false }));
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      await queryClient.invalidateQueries({ queryKey: ['user', userId] });
      setTimeout(() => setDeactivateSuccess(false), 2000);
    } catch (err) {
      setDeactivateError('Error al desactivar usuario: ' + traducirErrorFirebase(err));
    } finally {
      setDeactivating(false);
    }
  };
  const queryClient = useQueryClient();

  const handleAjustarBalance = async () => {
    setLoading(true);
    setSuccess(false);
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { balance: saldoEsperado });
      // Refrescar datos relacionados
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['users'] }),
        queryClient.invalidateQueries({ queryKey: ['user', userId] }),
        refetchDeposits(),
        refetchWithdrawals()
      ]);
      // Obtener el usuario actualizado directamente de Firestore
      const updatedUserSnap = await getDoc(userRef);
      if (updatedUserSnap.exists()) {
        setUser({ id: user.id, ...updatedUserSnap.data() });
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      alert('Error al ajustar el balance: ' + traducirErrorFirebase(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Resumen financiero</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2, alignItems: 'center' }}>
        <Chip label={`Saldo actual: $${saldoActual.toLocaleString()} MXN`} color="primary" />
        <Chip label={`Saldo esperado: $${saldoEsperado.toLocaleString()} MXN`} color={diferencia === 0 ? 'success' : 'warning'} />
        <Chip label={`Diferencia: ${diferencia >= 0 ? '+' : ''}$${diferencia.toLocaleString()} MXN`} color={diferencia === 0 ? 'success' : diferencia > 0 ? 'primary' : 'error'} />
        <Button
          size="small"
          variant="contained"
          color="secondary"
          sx={{ ml: 1, minWidth: 0, px: 1.5 }}
          onClick={handleAjustarBalance}
          disabled={loading || diferencia === 0}
        >
          {loading ? <CircularProgress size={18} /> : 'Ajustar Balance'}
        </Button>
        {success && (
          <Typography variant="body2" color="success.main" sx={{ ml: 1 }}>
            ¡Balance ajustado!
          </Typography>
        )}
      </Box>
      {/* Botón para desactivar usuario */}
      <Box sx={{ mt: 2, mb: 2 }}>
        <Button
          variant="outlined"
          color="error"
          disabled={deactivating || user.active === false}
          onClick={handleDeactivateUser}
        >
          {deactivating ? <CircularProgress size={18} /> : user.active === false ? 'Usuario desactivado' : 'Desactivar usuario'}
        </Button>
        {deactivateSuccess && (
          <Alert severity="success" sx={{ mt: 1 }}>¡Usuario desactivado!</Alert>
        )}
        {deactivateError && (
          <Alert severity="error" sx={{ mt: 1 }}>{deactivateError}</Alert>
        )}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>
        <Box>
          <Typography variant="body2">Total depositado: <strong>${totalDeposited.toLocaleString()} MXN</strong></Typography>
          <Typography variant="body2">Total retirado: <strong>${totalWithdrawn.toLocaleString()} MXN</strong></Typography>
          <Typography variant="body2">Retiros pendientes: <strong>${pendingWithdrawals.toLocaleString()} MXN</strong></Typography>
        </Box>
        <Box>
          <Typography variant="body2">Total apostado: <strong>${totalWagered.toLocaleString()} MXN</strong></Typography>
          <Typography variant="body2">Total ganado: <strong>${totalWon.toLocaleString()} MXN</strong></Typography>
          <Typography variant="body2">Total perdido: <strong>${totalLost.toLocaleString()} MXN</strong></Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 2, borderTop: 1, borderColor: 'divider', mb: 2 }}>
        <Typography variant="h6">Ganancia neta:</Typography>
        <Typography variant="h6" color={netProfit >= 0 ? 'success.main' : 'error.main'}>
          {netProfit >= 0 ? '+' : ''}${netProfit.toLocaleString()} MXN
        </Typography>
      </Box>
      <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Historial de apuestas</Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Pelea</TableCell>
              <TableCell>Color</TableCell>
              <TableCell align="right">Cantidad</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Ganancia</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">No hay apuestas registradas</TableCell>
              </TableRow>
            ) : (
              bets.map((bet: any) => (
                <TableRow key={bet.id}>
                  <TableCell>{bet.creationDate?.toDate ? bet.creationDate.toDate().toLocaleString() : ''}</TableCell>
                  <TableCell>{bet.fightId}</TableCell>
                  <TableCell>{bet.color}</TableCell>
                  <TableCell align="right">${(bet.matchedAmount || bet.amount).toLocaleString()} MXN</TableCell>
                  <TableCell>{bet.status}</TableCell>
                  <TableCell align="right">{bet.status === 'won' ? `+${bet.profit?.toLocaleString()} MXN` : bet.status === 'lost' ? `-${(bet.matchedAmount || bet.amount).toLocaleString()} MXN` : bet.status === 'refunded' ? 'Reembolso' : 'Pendiente'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default UserFinances;
