import React, { useState } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  Card,
  CardContent,
  Button,
  Alert,
  Tab,
  Tabs,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Divider,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import {
  AccountBalance,
  TrendingUp,
  TrendingDown,
  Add,
  Remove,
  History,
  Upload,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useBetsByUser } from '../hooks/useFirestore';
import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  useCreateDeposit, 
  useCreateWithdrawal, 
  useUserTransactions 
} from '../hooks/useUserFinances';
import dayjs from 'dayjs';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: { xs: 1, sm: 3 } }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const FinancesPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [currentTab, setCurrentTab] = useState(0);
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  
  // Hooks para transacciones
  const createDepositMutation = useCreateDeposit();
  const createWithdrawalMutation = useCreateWithdrawal();
  const { data: transactions = [], isLoading: transactionsLoading } = useUserTransactions();
  
  // Hook para obtener apuestas del usuario (para elegibilidad de retiros)
  const { data: bets = [] } = useBetsByUser(currentUser?.id || '');
  
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
  
  // Calcular estadísticas de elegibilidad
  const totalWagered = bets.reduce((sum: number, bet: any) => sum + (bet.matchedAmount || bet.amount), 0);
  const totalDeposited = userDeposits.reduce((sum: number, deposit: any) => sum + deposit.amount, 0);
  const withdrawalProgress = totalDeposited > 0 ? (totalWagered / totalDeposited) * 100 : 0;
  const isEligibleForWithdrawal = withdrawalProgress >= 100;
  const remainingToWager = Math.max(0, totalDeposited - totalWagered);
  
  // Estados para formularios
  const [depositForm, setDepositForm] = useState({
    amount: '',
    reference: '',
    receipt: null as File | null
  });
  
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    bank: '',
    accountNumber: '',
    clabe: '',
    holderName: ''
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleDepositSubmit = async () => {
    try {
      if (!depositForm.amount || !depositForm.reference) {
        alert('Por favor completa todos los campos requeridos');
        return;
      }

      if (!depositForm.receipt) {
        alert('El comprobante de pago es obligatorio para realizar un depósito');
        return;
      }

      await createDepositMutation.mutateAsync({
        amount: parseFloat(depositForm.amount),
        method: 'Transferencia Bancaria',
        reference: depositForm.reference,
        receipt: depositForm.receipt
      });

      // Éxito
      alert('¡Depósito enviado! Será revisado por nuestro equipo.');
      setDepositDialogOpen(false);
      setDepositForm({ amount: '', reference: '', receipt: null });
    } catch (error) {
      console.error('Error creating deposit:', error);
      alert('Error al enviar el depósito. Inténtalo de nuevo.');
    }
  };

  const handleWithdrawSubmit = async () => {
    try {
      if (!withdrawForm.amount || !withdrawForm.bank || !withdrawForm.accountNumber || !withdrawForm.clabe || !withdrawForm.holderName) {
        alert('Por favor completa todos los campos requeridos');
        return;
      }

      await createWithdrawalMutation.mutateAsync({
        amount: parseFloat(withdrawForm.amount),
        bankAccount: `${withdrawForm.bank} - ${withdrawForm.accountNumber}`,
        clabe: withdrawForm.clabe,
        holderName: withdrawForm.holderName
      });

      // Éxito
      alert('¡Retiro solicitado! Será procesado en máximo 48 horas.');
      setWithdrawDialogOpen(false);
      setWithdrawForm({ amount: '', bank: '', accountNumber: '', clabe: '', holderName: '' });
    } catch (error: any) {
      console.error('Error creating withdrawal:', error);
      alert(error.message || 'Error al solicitar el retiro. Inténtalo de nuevo.');
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit': return <TrendingUp color="success" />;
      case 'withdrawal': return <TrendingDown color="error" />;
      default: return <History />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Aprobado';
      case 'pending': return 'Pendiente';
      case 'rejected': return 'Rechazado';
      default: return status;
    }
  };

  if (!currentUser) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Alert severity="warning">
            Debes iniciar sesión para acceder a tus finanzas.
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
      <Box sx={{ my: { xs: 2, sm: 4 } }}>
        {/* Header */}
        <Typography variant="h4" component="h1" gutterBottom>
          💰 Finanzas  <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setDepositDialogOpen(true)}
                  size="large"
                  sx={{ minWidth: 150 }}
                >
                  Depositar
                </Button>
        </Typography>
        
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Gestiona tus depósitos, retiros y historial financiero
        </Typography>

        {/* Resumen de cuenta */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: 2, md: 3 }, mb: { xs: 2, md: 4 } }}>
          <Box sx={{ flex: 1 }}>
            <Card sx={{ background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', color: 'white' }}>
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      ${currentUser.balance.toLocaleString()} MXN
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Saldo Disponible
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h5" fontWeight="medium">
                      ${currentUser.totalDeposited.toLocaleString()} MXN
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Depositado
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h5" fontWeight="medium">
                      ${currentUser.totalBet.toLocaleString()} MXN
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Apostado
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Estado de elegibilidad para retiros - Versión expandida */}
        <Card sx={{ mb: { xs: 2, md: 3 } }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography variant="h6">
                💰 Elegibilidad para Retiros
              </Typography>
              <Chip 
                label={isEligibleForWithdrawal ? 'Elegible' : 'No Elegible'}
                color={isEligibleForWithdrawal ? 'success' : 'warning'}
                size="small"
                variant="filled"
              />
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Progreso de Apuestas
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {withdrawalProgress.toFixed(1)}%
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={Math.min(withdrawalProgress, 100)} 
                sx={{ 
                  height: 8, 
                  borderRadius: 4,
                  backgroundColor: 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: isEligibleForWithdrawal ? 'success.main' : 'warning.main'
                  }
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body1">Total Depositado:</Typography>
              <Typography variant="body1" fontWeight="medium">
                ${totalDeposited.toLocaleString()} MXN
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body1">Total Apostado:</Typography>
              <Typography variant="body1" fontWeight="medium">
                ${totalWagered.toLocaleString()} MXN
              </Typography>
            </Box>
            
            {isEligibleForWithdrawal ? (
              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="body2" fontWeight="bold">
                  ✅ ¡Eres elegible para realizar retiros!
                </Typography>
                <Typography variant="body2">
                  Has apostado el 100% de tus depósitos. Puedes solicitar un retiro desde esta página.
                </Typography>
              </Alert>
            ) : (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2" fontWeight="bold">
                  ⏳ Aún no eres elegible para retiros
                </Typography>
                <Typography variant="body2">
                  Necesitas apostar ${remainingToWager.toLocaleString()} MXN más para poder retirar dinero.
                  <br />
                  <strong>Regla:</strong> Debes apostar el 100% de tus depósitos antes de poder retirar.
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Pestañas principales */}
        <Paper sx={{ width: '100%', overflowX: 'hidden', boxShadow: { xs: 0, sm: 1 }, background: 'transparent' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', overflowX: { xs: 'auto', sm: 'visible' } }}>
            <Tabs value={currentTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
              <Tab label="Resumen" icon={<AccountBalance />} />
              <Tab label="Depósitos" icon={<TrendingUp />} />
              <Tab label="Retiros" icon={<TrendingDown />} />
              <Tab label="Historial" icon={<History />} />
            </Tabs>
          </Box>

          {/* Tab 0: Resumen */}
          <TabPanel value={currentTab} index={0}>
            <Box sx={{ px: { xs: 0, sm: 1 } }}>
              <Typography variant="h6" gutterBottom>
                Acciones Rápidas
              </Typography>
              
              <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, mb: { xs: 2, sm: 4 }, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setDepositDialogOpen(true)}
                  size="large"
                  sx={{ minWidth: 150 }}
                >
                  Depositar
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<Remove />}
                  onClick={() => setWithdrawDialogOpen(true)}
                  disabled={!isEligibleForWithdrawal}
                  size="large"
                  sx={{ minWidth: 150 }}
                >
                  Retirar
                </Button>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom>
                Información Bancaria
              </Typography>
              
              <Paper sx={{ p: { xs: 2, sm: 3 }, bgcolor: 'primary.50', border: 1, borderColor: 'primary.200' }}>
                <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                  Datos para Depósitos
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="body2">
                    <strong>Banco:</strong> Banregio
                  </Typography>
                  <Typography variant="body2">
                    <strong>Tarjeta:</strong> 4741 7406 0220 7885
                  </Typography>
                  <Typography variant="body2">
                    <strong>CLABE:</strong> 058320000000893020
                  </Typography>
                  <Typography variant="body2">
                    <strong>Beneficiario:</strong> XXXTREMO
                  </Typography>
                </Box>
                
                <Alert severity="info" sx={{ mt: 2 }}>
                  Realiza tu transferencia a esta cuenta y sube el comprobante para procesar tu depósito.
                </Alert>
              </Paper>
            </Box>
          </TabPanel>

          {/* Tab 1: Depósitos */}
          <TabPanel value={currentTab} index={1}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, mb: { xs: 2, sm: 3 }, gap: { xs: 1, sm: 0 } }}>
              <Typography variant="h6">
                Gestión de Depósitos
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setDepositDialogOpen(true)}
              >
                Nuevo Depósito
              </Button>
            </Box>

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Proceso de depósito:</strong>
              </Typography>
              <Typography variant="body2">
                1. Realiza la transferencia a nuestra cuenta bancaria
              </Typography>
              <Typography variant="body2">
                2. Sube el comprobante y llena el formulario
              </Typography>
              <Typography variant="body2">
                3. Espera la aprobación (máximo 24 horas)
              </Typography>
            </Alert>

            {/* Lista de depósitos */}
            <TableContainer component={Paper} sx={{ width: '100%', overflowX: 'auto', boxShadow: 0, maxWidth: '100vw' }}>
              <Table size="small" sx={{ minWidth: 600, width: '100%' }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Monto</TableCell>
                    <TableCell>Método</TableCell>
                    <TableCell>Referencia</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Motivo de Rechazo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.filter(t => t.type === 'deposit').map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {dayjs(transaction.createdAt).format('DD/MM/YYYY HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Typography variant="h6" color="success.main">
                          ${transaction.amount?.toLocaleString()} MXN
                        </Typography>
                      </TableCell>
                      <TableCell>{transaction.method || 'Transferencia'}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {transaction.reference || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(transaction.status)}
                          color={getStatusColor(transaction.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {transaction.status === 'rejected' && transaction.rejectionReason ? (
                          <Typography variant="body2" color="error.main">
                            {transaction.rejectionReason}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            -
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {transactions.filter(t => t.type === 'deposit').length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="textSecondary">
                          No hay depósitos registrados
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Tab 2: Retiros */}
          <TabPanel value={currentTab} index={2}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, mb: { xs: 2, sm: 3 }, gap: { xs: 1, sm: 0 } }}>
              <Typography variant="h6">
                Gestión de Retiros
              </Typography>
              <Button
                variant="contained"
                startIcon={<Remove />}
                onClick={() => setWithdrawDialogOpen(true)}
                disabled={!isEligibleForWithdrawal}
              >
                Nuevo Retiro
              </Button>
            </Box>

            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Información importante sobre retiros:</strong>
              </Typography>
              <Typography variant="body2">
                • Comisión del 1% sobre el monto retirado
              </Typography>
              <Typography variant="body2">
                • Tiempo de procesamiento: hasta 48 horas
              </Typography>
              <Typography variant="body2">
                • Debes haber apostado el 100% de tus depósitos
              </Typography>
            </Alert>

            {/* Lista de retiros */}
            <TableContainer component={Paper} sx={{ width: '100%', overflowX: 'auto', boxShadow: 0, maxWidth: '100vw' }}>
              <Table size="small" sx={{ minWidth: 600, width: '100%' }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Monto Solicitado</TableCell>
                    <TableCell>Comisión</TableCell>
                    <TableCell>Monto Neto</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Motivo de Rechazo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.filter(t => t.type === 'withdrawal').map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {dayjs(transaction.createdAt).format('DD/MM/YYYY HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Typography variant="h6" color="error.main">
                          ${transaction.amount?.toLocaleString()} MXN
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="textSecondary">
                          ${(transaction.amount * 0.01)?.toLocaleString()} MXN
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="h6" color="success.main">
                          ${(transaction.amount * 0.99)?.toLocaleString()} MXN
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(transaction.status)}
                          color={getStatusColor(transaction.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {transaction.status === 'rejected' && transaction.rejectionReason ? (
                          <Typography variant="body2" color="error.main">
                            {transaction.rejectionReason}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            -
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {transactions.filter(t => t.type === 'withdrawal').length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="textSecondary">
                          No hay retiros registrados
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Tab 3: Historial */}
          <TabPanel value={currentTab} index={3}>
            <Typography variant="h6" gutterBottom sx={{ px: { xs: 0, sm: 1 } }}>
              Historial Completo de Transacciones
            </Typography>
            
            {transactionsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper} sx={{ width: '100%', overflowX: 'auto', boxShadow: 0, maxWidth: '100vw' }}>
                <Table size="small" sx={{ minWidth: 600, width: '100%' }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Fecha</TableCell>
                      <TableCell align="right">Monto</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Referencia</TableCell>
                      <TableCell>Motivo de Rechazo</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography variant="body2" color="textSecondary">
                            No hay transacciones registradas
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {getTransactionIcon(transaction.type)}
                              <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                                {transaction.type === 'deposit' ? 'Depósito' : 'Retiro'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {dayjs(transaction.createdAt).format('DD/MM/YYYY HH:mm')}
                          </TableCell>
                          <TableCell align="right">
                            <Typography 
                              variant="body2" 
                              color={transaction.type === 'withdrawal' ? 'error.main' : 'success.main'}
                              fontWeight="medium"
                            >
                              {transaction.type === 'withdrawal' ? '-' : '+'}
                              ${transaction.amount?.toLocaleString()} MXN
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={getStatusLabel(transaction.status)}
                              color={getStatusColor(transaction.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontFamily="monospace">
                              {transaction.type === 'deposit' ? (transaction as any).reference || 'N/A' : 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {transaction.status === 'rejected' && transaction.rejectionReason ? (
                              <Typography variant="body2" color="error.main">
                                {transaction.rejectionReason}
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="textSecondary">
                                -
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>
        </Paper>

        {/* Dialog de Depósito */}
        <Dialog open={depositDialogOpen} onClose={() => setDepositDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUp />
              Nuevo Depósito
            </Box>
          </DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 3 }}>
              Primero realiza la transferencia a nuestra cuenta y luego llena este formulario.
            </Alert>
            <TextField
              autoFocus
              margin="dense"
              label="Monto"
              type="number"
              fullWidth
              variant="outlined"
              value={depositForm.amount}
              onChange={(e) => setDepositForm({...depositForm, amount: e.target.value})}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                endAdornment: <InputAdornment position="end">MXN</InputAdornment>,
              }}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Referencia de Transferencia"
              fullWidth
              variant="outlined"
              value={depositForm.reference}
              onChange={(e) => setDepositForm({...depositForm, reference: e.target.value})}
              sx={{ mb: 2 }}
            />
            <Button
              variant="outlined"
              component="label"
              startIcon={<Upload />}
              fullWidth
              sx={{ 
                mb: 2,
                borderColor: !depositForm.receipt ? 'error.main' : 'primary.main',
                color: !depositForm.receipt ? 'error.main' : 'primary.main'
              }}
            >
              Subir Comprobante *
              <input
                type="file"
                hidden
                accept="image/*,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setDepositForm({...depositForm, receipt: file});
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
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDepositDialogOpen(false)}>Cancelar</Button>
            <Button 
              onClick={handleDepositSubmit} 
              variant="contained"
              disabled={createDepositMutation.isPending || !depositForm.receipt || !depositForm.amount || !depositForm.reference}
            >
              {createDepositMutation.isPending ? 'Enviando...' : 'Enviar Depósito'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog de Retiro */}
        <Dialog open={withdrawDialogOpen} onClose={() => setWithdrawDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingDown />
              Solicitar Retiro
            </Box>
          </DialogTitle>
          <DialogContent>
            {/* Alerta de elegibilidad */}
            <Alert 
              severity={isEligibleForWithdrawal ? "success" : "warning"} 
              sx={{ mb: 2 }}
            >
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                Estado de Elegibilidad para Retiros
              </Typography>
              <Typography variant="body2">
                Apostado: ${totalWagered.toLocaleString()} MXN ({withdrawalProgress.toFixed(1)}%)
              </Typography>
              <Typography variant="body2">
                Depositado: ${totalDeposited.toLocaleString()} MXN
              </Typography>
              {!isEligibleForWithdrawal && (
                <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
                  ⚠️ Debes apostar ${remainingToWager.toLocaleString()} MXN más para ser elegible
                </Typography>
              )}
            </Alert>
            
            <Alert severity="warning" sx={{ mb: 3 }}>
              Se aplicará una comisión del 1% sobre el monto a retirar.
            </Alert>
            
            <TextField
              autoFocus
              margin="dense"
              label="Monto a Retirar"
              type="number"
              fullWidth
              variant="outlined"
              value={withdrawForm.amount}
              onChange={(e) => setWithdrawForm({...withdrawForm, amount: e.target.value})}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                endAdornment: <InputAdornment position="end">MXN</InputAdornment>,
              }}
              sx={{ mb: 2 }}
            />
            
            <TextField
              margin="dense"
              label="Banco"
              fullWidth
              variant="outlined"
              value={withdrawForm.bank}
              onChange={(e) => setWithdrawForm({...withdrawForm, bank: e.target.value})}
              sx={{ mb: 2 }}
            />
            
            <TextField
              margin="dense"
              label="Número de Cuenta"
              fullWidth
              variant="outlined"
              value={withdrawForm.accountNumber}
              onChange={(e) => setWithdrawForm({...withdrawForm, accountNumber: e.target.value})}
              sx={{ mb: 2 }}
            />
            
            <TextField
              margin="dense"
              label="CLABE"
              fullWidth
              variant="outlined"
              value={withdrawForm.clabe}
              onChange={(e) => setWithdrawForm({...withdrawForm, clabe: e.target.value})}
              sx={{ mb: 2 }}
            />
            
            <TextField
              margin="dense"
              label="Nombre del Titular"
              fullWidth
              variant="outlined"
              value={withdrawForm.holderName}
              onChange={(e) => setWithdrawForm({...withdrawForm, holderName: e.target.value})}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setWithdrawDialogOpen(false)}>Cancelar</Button>
            <Button 
              onClick={handleWithdrawSubmit} 
              variant="contained"
              disabled={createWithdrawalMutation.isPending || !isEligibleForWithdrawal}
            >
              {createWithdrawalMutation.isPending ? 'Enviando...' : 'Solicitar Retiro'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default FinancesPage;
