import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Paper,
  Container,
  Skeleton,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Casino as BetIcon,
  CheckCircle,
  Cancel,
  Pending,
} from '@mui/icons-material';
import { useBetsByUser, useUserWithdrawals } from '../hooks/useFirestore';
import { useAuth } from '../contexts/AuthContext';
import UserBetNotifications from '../components/UserBetNotifications';
import dayjs from 'dayjs';
import type { Bet } from '../types';

// Importaciones para obtener depósitos
import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

const MyBetsPage: React.FC = () => {
  // ...existing code...
  const { currentUser } = useAuth();
  const { 
    data: bets = [], 
    isLoading, 
    error 
  } = useBetsByUser(currentUser?.id || '');

  // Hook para obtener retiros del usuario
  const { data: userWithdrawals = [] } = useUserWithdrawals(currentUser?.id || '');

  // Hook para obtener depósitos aprobados del usuario
  const { data: userDeposits = [] } = useQuery({
    queryKey: ['userDeposits', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const depositsRef = collection(db, 'deposits');
      const q = query(
        depositsRef, 
        where('userId', '==', currentUser.id),
        where('status', '==', 'approved')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    enabled: !!currentUser?.id
  });

  // Calcular estadísticas básicas
  const totalBets = bets.length;
  const wonBets = bets.filter(bet => bet.status === 'won').length;
  const lostBets = bets.filter(bet => bet.status === 'lost').length;
  const pendingBets = bets.filter(bet => bet.status === 'pending' || bet.status === 'matched').length;
  
  // Usar matchedAmount para cálculos precisos, excluyendo apuestas reembolsadas
  const totalWagered = bets.filter(bet => bet.status !== 'refunded').reduce((sum, bet) => sum + (bet.matchedAmount || bet.amount), 0);
  const totalWon = bets.filter(bet => bet.status === 'won').reduce((sum, bet) => sum + (bet.profit || 0), 0);
  const totalLost = bets.filter(bet => bet.status === 'lost').reduce((sum, bet) => sum + (bet.matchedAmount || bet.amount), 0);
  const netProfit = totalWon - totalLost;

  // Nuevas métricas para el resumen financiero expandido
  const totalIngresado = userDeposits.reduce((sum: number, deposit: any) => sum + deposit.amount, 0);
  // Elegibilidad para retiros: solo apuestas ganadas o perdidas cuentan
  const totalApostadoElegible = bets
    .filter(bet => bet.status === 'won' || bet.status === 'lost')
    .reduce((sum, bet) => sum + (bet.matchedAmount || bet.amount), 0);
  const esElegibleRetiro = totalApostadoElegible >= totalIngresado;
  const apuestasActivas = bets
    .filter(bet => bet.status === 'pending' || bet.status === 'matched')
    .reduce((sum, bet) => sum + (bet.matchedAmount || bet.amount), 0);
  
  const totalRetirado = userWithdrawals
    .filter((withdrawal: any) => withdrawal.status === 'approved')
    .reduce((sum: number, withdrawal: any) => sum + withdrawal.amount, 0);
  
  const retirosPendientes = userWithdrawals
    .filter((withdrawal: any) => withdrawal.status === 'pending')
    .reduce((sum: number, withdrawal: any) => sum + withdrawal.amount, 0);

  const saldoActual = currentUser?.balance || 0;
  
  // DEBUG: Logs para revisar datos del usuario test2@test.com
  if (currentUser?.email === 'test2@test.com') {
    console.log('🔍 DEBUG - Datos del usuario test2@test.com:');
    console.log('📊 User Deposits:', userDeposits);
    console.log('📊 User Withdrawals:', userWithdrawals);
    console.log('📊 User Bets:', bets);
    console.log('📊 Current User Balance:', currentUser?.balance);
    console.log('📊 Estados de apuestas:');
    const betsByStatus = bets.reduce((acc, bet) => {
      acc[bet.status] = (acc[bet.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log('  - Apuestas por estado:', betsByStatus);
    console.log('  - Apuestas ganadas:', bets.filter(bet => bet.status === 'won'));
    console.log('  - Apuestas perdidas:', bets.filter(bet => bet.status === 'lost'));
    console.log('  - Apuestas activas:', bets.filter(bet => bet.status === 'pending' || bet.status === 'matched'));
    console.log('📊 Cálculos:');
    console.log('  - Total Ingresado:', totalIngresado);
    console.log('  - Total Retirado:', totalRetirado);
    console.log('  - Retiros Pendientes:', retirosPendientes);
    console.log('  - Total Apostado:', totalWagered);
    console.log('  - Total Ganado:', totalWon);
    console.log('  - Total Perdido:', totalLost);
    console.log('  - Apuestas Activas:', apuestasActivas);
    console.log('  - Saldo Actual:', saldoActual);
  }
  
  // Fórmula del Saldo Esperado (verificación de integridad basada en transacciones históricas)
  // Saldo Esperado = Lo que ingresó - Lo que retiró - Lo pendiente de retirar - Lo que apostó + Lo que ganó
  const saldoEsperado = totalIngresado - totalRetirado - retirosPendientes - totalLost + totalWon - apuestasActivas;
  const diferencia = saldoEsperado - saldoActual;

  const winRate = totalBets > 0 ? (wonBets / (wonBets + lostBets)) * 100 : 0;

  const getStatusIcon = (status: Bet['status']) => {
    switch (status) {
      case 'won':
        return <CheckCircle color="success" />;
      case 'lost':
        return <Cancel color="error" />;
      case 'pending':
      case 'matched':
        return <Pending color="warning" />;
      case 'refunded':
        return <Cancel color="info" />;
      default:
        return <Pending />;
    }
  };

  const getStatusColor = (status: Bet['status']) => {
    switch (status) {
      case 'won':
        return 'success';
      case 'lost':
        return 'error';
      case 'pending':
      case 'matched':
        return 'warning';
      case 'refunded':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: Bet['status']) => {
    switch (status) {
      case 'won':
        return 'Ganada';
      case 'lost':
        return 'Perdida';
      case 'pending':
        return 'Pendiente';
      case 'matched':
        return 'Emparejada';
      case 'refunded':
        return 'Reembolsada';
      default:
        return status;
    }
  };

  const getColorChip = (color: 'red' | 'green') => (
    <Chip
      label={color === 'red' ? 'Rojo' : 'Verde'}
      color={color === 'red' ? 'error' : 'success'}
      size="small"
      variant="outlined"
    />
  );

  if (!currentUser) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Alert severity="warning">
            Debes iniciar sesión para ver tu historial de apuestas.
          </Alert>
        </Box>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Mis Apuestas
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[1, 2, 3].map((item) => (
              <Paper key={item} sx={{ p: 3 }}>
                <Skeleton variant="text" sx={{ fontSize: '1.5rem', mb: 1 }} />
                <Skeleton variant="text" />
                <Skeleton variant="text" />
              </Paper>
            ))}
          </Box>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Mis Apuestas
          </Typography>
          <Alert severity="error">
            Error al cargar tus apuestas: {error.message}
          </Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container
      maxWidth={false}
      disableGutters
      sx={{
        px: { xs: 0, sm: 0 },
        pt: 'env(safe-area-inset-top)',
        pb: 'env(safe-area-inset-bottom)',
        minHeight: '100vh',
        width: '100vw',
        overflowX: 'hidden',
      }}
    >
      <Box sx={{ my: { xs: 2, sm: 4 }, px: { xs: 1, sm: 0 } }}>
        {/* Header */}
        <Typography variant="h4" component="h1" gutterBottom>
          📊 Mis Apuestas
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Historial completo de tus apuestas y estadísticas
        </Typography>

        {/* Notificaciones de usuario */}
        <UserBetNotifications />

        {/* Estadísticas */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
          <Card sx={{ minWidth: 200, flex: 1 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <BetIcon />
                </Avatar>
                <Box>
                  <Typography variant="h5">{totalBets}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Apuestas
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ minWidth: 200, flex: 1 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <TrendingUp />
                </Avatar>
                <Box>
                  <Typography variant="h5">{wonBets}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ganadas
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ minWidth: 200, flex: 1 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Avatar sx={{ bgcolor: 'error.main', mr: 2 }}>
                  <TrendingDown />
                </Avatar>
                <Box>
                  <Typography variant="h5">{lostBets}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Perdidas
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ minWidth: 200, flex: 1 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Avatar sx={{ bgcolor: wonBets + lostBets > 0 && winRate >= 50 ? 'success.main' : 'error.main', mr: 2 }}>
                  {winRate >= 50 ? <TrendingUp /> : <TrendingDown />}
                </Avatar>
                <Box>
                  <Typography variant="h5">{winRate.toFixed(1)}%</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tasa de Éxito
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Resumen financiero */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📊 Resumen Financiero Detallado
            </Typography>
            {/* Alerta de elegibilidad para retiros */}
            {!esElegibleRetiro && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Debes apostar el 100% de tus depósitos en apuestas ganadas o perdidas antes de poder solicitar un retiro.
              </Alert>
            )}
            
            {/* Primera fila - Métricas principales */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body1">💰 Total Ingresado:</Typography>
                  <Typography variant="body1" fontWeight="medium" color="success.main">
                    ${totalIngresado.toLocaleString()} MXN
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body1">💸 Total Retirado:</Typography>
                  <Typography variant="body1" fontWeight="medium" color="error.main">
                    ${totalRetirado.toLocaleString()} MXN
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body1">⏳ Retiros Pendientes:</Typography>
                  <Typography variant="body1" fontWeight="medium" color="warning.main">
                    ${retirosPendientes.toLocaleString()} MXN
                  </Typography>
                </Box>
              </Box>
              
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body1">🎯 Total Apostado:</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    ${totalWagered.toLocaleString()} MXN
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body1">✅ Total Ganado:</Typography>
                  <Typography variant="body1" fontWeight="medium" color="success.main">
                    ${totalWon.toLocaleString()} MXN
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body1">❌ Total Perdido:</Typography>
                  <Typography variant="body1" fontWeight="medium" color="error.main">
                    ${totalLost.toLocaleString()} MXN
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body1">🕐 Apuestas Activas:</Typography>
                  <Typography variant="body1" fontWeight="medium" color="info.main">
                    ${apuestasActivas.toLocaleString()} MXN
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Segunda fila - Saldos y diferencias */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, 
              gap: 2, 
              p: 2, 
              bgcolor: 'darkgrey.50', 
              borderRadius: 1,
              mb: 2 
            }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="subtitle2" color="text.primary">
                  Saldo Actual
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  ${saldoActual.toLocaleString()} MXN
                </Typography>
              </Box>
              
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="subtitle2" color="text.primary">
                  Saldo Esperado
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  ${saldoEsperado.toLocaleString()} MXN
                </Typography>
              </Box>
              
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="subtitle2" color="text.primary">
                  Diferencia
                </Typography>
                <Typography 
                  variant="h6" 
                  fontWeight="bold"
                  color={diferencia === 0 ? 'text.primary' : diferencia > 0 ? 'success.main' : 'error.main'}
                >
                  {diferencia >= 0 ? '+' : ''}${diferencia.toLocaleString()} MXN
                </Typography>
              </Box>
            </Box>

            {/* Resumen final */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="h6">Ganancia Neta:</Typography>
              <Typography 
                variant="h6" 
                fontWeight="bold"
                color={netProfit >= 0 ? 'success.main' : 'error.main'}
              >
                {netProfit >= 0 ? '+' : ''}${netProfit.toLocaleString()} MXN
              </Typography>
            </Box>
            
            {/* Alertas informativas */}
            {pendingBets > 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Tienes {pendingBets} apuesta{pendingBets !== 1 ? 's' : ''} pendiente{pendingBets !== 1 ? 's' : ''} por resolver.
              </Alert>
            )}
            
            {Math.abs(diferencia) > 0 && (
              <Alert severity={diferencia > 0 ? "warning" : "error"} sx={{ mt: 1 }}>
                <Typography variant="body2" fontWeight="bold">
                  {diferencia > 0 ? '⚠️ Discrepancia Detectada' : '� Verificación de Saldos'}
                </Typography>
                <Typography variant="body2">
                  {diferencia > 0 
                    ? `El saldo actual es ${diferencia.toLocaleString()} MXN mayor al esperado según transacciones históricas. Revisar inconsistencias.`
                    : `El saldo actual es ${Math.abs(diferencia).toLocaleString()} MXN menor al esperado. Verificar transacciones pendientes o errores.`
                  }
                </Typography>
                <Typography variant="caption" sx={{ mt: 1, display: 'block', opacity: 0.8 }}>
                  💡 El saldo esperado se calcula como: Ingresado - Retirado - Retiros Pendientes - Total Apostado + Total Ganado
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Tabla de apuestas */}
        {bets.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 600, mx: 'auto' }}>
            <BetIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No has realizado apuestas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ve a la sección de Apuestas para empezar a apostar en las peleas de gallos.
            </Typography>
          </Paper>
        ) : (
          <TableContainer
            component={Paper}
            sx={{
              width: '100%',
              overflowX: 'auto',
              maxWidth: '100vw',
              boxShadow: 0,
              mx: { xs: -1, sm: 0 },
            }}
          >
            <Table
              size="small"
              sx={{
                minWidth: 600,
                width: '100%',
                tableLayout: 'fixed',
              }}
            >
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
                {bets.map((bet) => (
                  <TableRow key={bet.id}>
                    <TableCell>
                      {dayjs(bet.creationDate.toDate()).format('DD/MM/YYYY HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        Pelea #{bet.fightId.slice(-6)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {getColorChip(bet.color)}
                    </TableCell>
                    <TableCell align="right">
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          ${(bet.matchedAmount || bet.amount).toLocaleString()} MXN
                        </Typography>
                        {bet.matchedAmount && bet.matchedAmount < bet.amount && (
                          <Typography variant="caption" color="text.secondary">
                            Original: ${bet.amount.toLocaleString()}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getStatusIcon(bet.status)}
                        <Chip
                          label={getStatusLabel(bet.status)}
                          color={getStatusColor(bet.status)}
                          size="small"
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      {bet.status === 'won' && bet.profit ? (
                        <Typography variant="body2" fontWeight="medium" color="success.main">
                          +${bet.profit.toLocaleString()} MXN
                        </Typography>
                      ) : bet.status === 'lost' ? (
                        <Typography variant="body2" fontWeight="medium" color="error.main">
                          -${(bet.matchedAmount || bet.amount).toLocaleString()} MXN
                        </Typography>
                      ) : bet.status === 'refunded' ? (
                        <Typography variant="body2" fontWeight="medium" color="info.main">
                          Reembolso
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Pendiente
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Container>
  );
};

export default MyBetsPage;
