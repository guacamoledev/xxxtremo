import React, { useState } from 'react';
import {
  Box,
  Avatar,
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
  useMediaQuery,
  useTheme,
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
  useUserTransactions,
} from '../hooks/useUserFinances';
import dayjs from 'dayjs';
import { traducirErrorFirebase } from '../utils/traducirErrorFirebase';

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
      {value === index && <Box sx={{ p: { xs: 1, sm: 3 } }}>{children}</Box>}
    </div>
  );
}

const FinancesPage: React.FC = () => {
  const { currentUser } = useAuth();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));

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
      if (!currentUser?.id) return [] as any[];
      const depositsRef = collection(db, 'deposits');
      const q = query(
        depositsRef,
        where('userId', '==', currentUser.id),
        where('status', '==', 'approved')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    },
    enabled: !!currentUser?.id,
  });

  // Calcular estadísticas de elegibilidad
  const totalWagered = bets.reduce(
    (sum: number, bet: any) => sum + (bet.matchedAmount || bet.amount),
    0
  );
  const totalDeposited = userDeposits.reduce(
    (sum: number, deposit: any) => sum + deposit.amount,
    0
  );
  const withdrawalProgress = totalDeposited > 0 ? (totalWagered / totalDeposited) * 100 : 0;
  const isEligibleForWithdrawal = withdrawalProgress >= 100;
  const remainingToWager = Math.max(0, totalDeposited - totalWagered);

  // Estados para formularios
  const [depositForm, setDepositForm] = useState({
    amount: '',
    reference: '',
    receipt: null as File | null,
  });

  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    bank: '',
    accountNumber: '',
    clabe: '',
    holderName: '',
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
        receipt: depositForm.receipt,
      });

      // Éxito
      alert('¡Depósito enviado! Será revisado por nuestro equipo.');
      setDepositDialogOpen(false);
      setDepositForm({ amount: '', reference: '', receipt: null });
    } catch (error: any) {
      console.error('Error creando depósito:', error);
      alert(traducirErrorFirebase(error));
    }
  };

  const handleWithdrawSubmit = async () => {
    try {
      if (
        !withdrawForm.amount ||
        !withdrawForm.bank ||
        !withdrawForm.accountNumber ||
        !withdrawForm.clabe ||
        !withdrawForm.holderName
      ) {
        alert('Por favor completa todos los campos requeridos');
        return;
      }

      await createWithdrawalMutation.mutateAsync({
        amount: parseFloat(withdrawForm.amount),
        bankAccount: `${withdrawForm.bank} - ${withdrawForm.accountNumber}`,
        clabe: withdrawForm.clabe,
        holderName: withdrawForm.holderName,
      });

      // Éxito
      alert('¡Retiro solicitado! Será procesado en máximo 48 horas.');
      setWithdrawDialogOpen(false);
      setWithdrawForm({ amount: '', bank: '', accountNumber: '', clabe: '', holderName: '' });
    } catch (error: any) {
      console.error('Error creando retiro:', error);
      alert(traducirErrorFirebase(error));
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <TrendingUp color="success" />;
      case 'withdrawal':
        return <TrendingDown color="error" />;
      default:
        return <History />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Aprobado';
      case 'pending':
        return 'Pendiente';
      case 'rejected':
        return 'Rechazado';
      default:
        return status;
    }
  };

  if (!currentUser) {
    return (
      <Container maxWidth={false} disableGutters sx={{ px: { xs: 1, sm: 2 } }}>
        <Box sx={{ my: 4 }}>
          <Alert severity="warning">Debes iniciar sesión para acceder a tus finanzas.</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container
      maxWidth={false}
      disableGutters
      sx={{
        px: { xs: 1, sm: 2 },
        pt: 'env(safe-area-inset-top)',
        pb: 'env(safe-area-inset-bottom)',
        minHeight: '100vh',
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
      }}
    >
      <Box sx={{ my: { xs: 2, sm: 4 } }}>
        {/* Header */}
        <Typography variant="h4" component="h1" gutterBottom sx={{ overflowWrap: 'anywhere' }}>
          💰 Finanzas
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setDepositDialogOpen(true)}
          sx={{
            minWidth: { xs: 'auto', sm: 120 },
            width: { xs: '100%', sm: 'auto' },
            maxWidth: '100%',
            mb: 2,
            px: { xs: 1.5, sm: 2.5 },
            py: { xs: 1, sm: 1.25 },
          }}
        >
          Depositar
        </Button>

        <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ overflowWrap: 'anywhere' }}>
          Gestiona tus depósitos, retiros y historial financiero
        </Typography>

        {/* Resumen de cuenta - estilo AdminPanel */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 3,
            mb: { xs: 2, md: 4 },
            '& > *': { minWidth: 0 }, // evita overflow en hijos flex
          }}
        >
          <Card
            sx={{
              flex: '1 1 160px',
              minWidth: { xs: 120, sm: 160 },
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' }, '& > *': { minWidth: 0 } }}>
                <Avatar sx={{ bgcolor: 'primary.dark', mr: 2 }}>
                  <AccountBalance />
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h4" fontWeight="bold" sx={{ overflowWrap: 'anywhere' }}>
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

        {/* Estado de elegibilidad para retiros - Versión expandida */}
        <Card sx={{ mb: { xs: 2, md: 3 } }}>
          <CardContent sx={{ width: '100%', maxWidth: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' }, '& > *': { minWidth: 0 } }}>
              <Typography variant="h6" sx={{ overflowWrap: 'anywhere' }}>
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
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, flexWrap: { xs: 'wrap', sm: 'nowrap' }, '& > *': { minWidth: 0 } }}>
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
                    backgroundColor: isEligibleForWithdrawal ? 'success.main' : 'warning.main',
                  },
                }}
              />
            </Box>

            {isEligibleForWithdrawal ? (
              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="body2" fontWeight="bold" sx={{ overflowWrap: 'anywhere' }}>
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
                <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                  Necesitas apostar ${remainingToWager.toLocaleString()} MXN más para poder retirar dinero.
                  <br />
                  <strong>Regla:</strong> Debes apostar el 100% de tus depósitos antes de poder retirar.
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Pestañas principales */}
        <Paper sx={{ width: '100%', maxWidth: '100%', overflowX: 'hidden', boxShadow: { xs: 0, sm: 1 }, background: 'transparent' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', overflowX: 'auto' }}>
            <Tabs
              value={currentTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{
                width: '100%',
                minHeight: 0,
                '& .MuiTab-root': {
                  fontSize: { xs: '0.85rem', sm: '1rem' },
                  minWidth: 80,
                  px: 1,
                  textOverflow: 'ellipsis',
                  maxWidth: 140,
                },
              }}
            >
              <Tab label="Resumen" icon={<AccountBalance />} />
              <Tab label="Depósitos" icon={<TrendingUp />} />
              <Tab label="Retiros" icon={<TrendingDown />} />
              <Tab label="Historial" icon={<History />} />
            </Tabs>
          </Box>

          {/* Tab 0: Resumen */}
          <TabPanel value={currentTab} index={0}>
            <Box sx={{ px: { xs: 0, sm: 1 }, '& > *': { minWidth: 0 } }}>
              <Typography variant="h6" gutterBottom sx={{ overflowWrap: 'anywhere' }}>
                Acciones Rápidas
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  gap: { xs: 1, sm: 2 },
                  mb: { xs: 2, sm: 4 },
                  flexWrap: 'wrap',
                  '& > *': { minWidth: 0 },
                }}
              >
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setDepositDialogOpen(true)}
                  sx={{ minWidth: { xs: 'auto', sm: 150 }, px: { xs: 1.5, sm: 2.5 }, py: { xs: 1, sm: 1.25 } }}
                >
                  Depositar
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<Remove />}
                  onClick={() => setWithdrawDialogOpen(true)}
                  disabled={!isEligibleForWithdrawal}
                  sx={{ minWidth: { xs: 'auto', sm: 150 }, px: { xs: 1.5, sm: 2.5 }, py: { xs: 1, sm: 1.25 } }}
                >
                  Retirar
                </Button>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom sx={{ overflowWrap: 'anywhere' }}>
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
                  <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                    <strong>Tarjeta:</strong> 4741 7406 0220 7885
                  </Typography>
                  <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
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
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'stretch', sm: 'center' },
                mb: { xs: 2, sm: 3 },
                gap: { xs: 1, sm: 0 },
                '& > *': { minWidth: 0 },
              }}
            >
              <Typography variant="h6" sx={{ overflowWrap: 'anywhere' }}>
                Gestión de Depósitos
              </Typography>
              <Button variant="contained" startIcon={<Add />} onClick={() => setDepositDialogOpen(true)}>
                Nuevo Depósito
              </Button>
            </Box>

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Proceso de depósito:</strong>
              </Typography>
              <Typography variant="body2">1. Realiza la transferencia a nuestra cuenta bancaria</Typography>
              <Typography variant="body2">2. Sube el comprobante y llena el formulario</Typography>
              <Typography variant="body2">3. Espera la aprobación (máximo 24 horas)</Typography>
            </Alert>

            {/* Lista de depósitos */}
            <Box sx={{ width: '100%', maxWidth: '100vw', overflowX: 'auto' }}>
              <TableContainer component={Paper} sx={{ minWidth: 0, boxShadow: 0 }}>
                <Table
                  size="small"
                  sx={{
                    width: 'max-content',
                    minWidth: 480,
                    tableLayout: 'fixed',
                  }}
                >
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Monto</TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Método</TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Referencia</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Motivo de Rechazo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions
                    .filter((t) => t.type === 'deposit')
                    .map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                          {dayjs(transaction.createdAt).format('DD/MM/YYYY HH:mm')}
                        </TableCell>
                        <TableCell>
                          <Typography variant="h6" color="success.main" sx={{ overflowWrap: 'anywhere' }}>
                            ${transaction.amount?.toLocaleString()} MXN
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{transaction.method || 'Transferencia'}</TableCell>
                        <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                          <Typography variant="body2" fontFamily="monospace" sx={{ overflowWrap: 'anywhere' }}>
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
                            <Typography variant="body2" color="error.main" sx={{ overflowWrap: 'anywhere' }}>
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
                  {transactions.filter((t) => t.type === 'deposit').length === 0 && (
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
          </Box>
          </TabPanel>
          {/* Tab 2: Retiros */}
          <TabPanel value={currentTab} index={2}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'stretch', sm: 'center' },
                mb: { xs: 2, sm: 3 },
                gap: { xs: 1, sm: 0 },
                '& > *': { minWidth: 0 },
              }}
            >
              <Typography variant="h6" sx={{ overflowWrap: 'anywhere' }}>
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
              <Typography variant="body2">• Comisión del 1% sobre el monto retirado</Typography>
              <Typography variant="body2">• Tiempo de procesamiento: hasta 48 horas</Typography>
              <Typography variant="body2">• Debes haber apostado el 100% de tus depósitos</Typography>
            </Alert>

            {/* Lista de retiros */}
            <TableContainer component={Paper} sx={{ width: '100%', overflowX: 'auto', boxShadow: 0 }}>
              <Table
                size="small"
                sx={{ minWidth: { xs: 0, sm: 480 }, tableLayout: 'fixed', width: '100%', maxWidth: '100%' }}
              >
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
                  {transactions
                    .filter((t) => t.type === 'withdrawal')
                    .map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                          {dayjs(transaction.createdAt).format('DD/MM/YYYY HH:mm')}
                        </TableCell>
                        <TableCell>
                          <Typography variant="h6" color="error.main" sx={{ overflowWrap: 'anywhere' }}>
                            ${transaction.amount?.toLocaleString()} MXN
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="textSecondary">
                            ${(transaction.amount * 0.01)?.toLocaleString()} MXN
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="h6" color="success.main" sx={{ overflowWrap: 'anywhere' }}>
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
                            <Typography variant="body2" color="error.main" sx={{ overflowWrap: 'anywhere' }}>
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
                  {transactions.filter((t) => t.type === 'withdrawal').length === 0 && (
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
            <Typography variant="h6" gutterBottom sx={{ px: { xs: 0, sm: 1 }, overflowWrap: 'anywhere' }}>
              Historial Completo de Transacciones
            </Typography>

            {transactionsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper} sx={{ width: '100%', overflowX: 'auto', boxShadow: 0 }}>
                <Table
                  size="small"
                  sx={{ minWidth: { xs: 0, sm: 480 }, tableLayout: 'fixed', width: '100%', maxWidth: '100%' }}
                >
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
                          <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                            {dayjs(transaction.createdAt).format('DD/MM/YYYY HH:mm')}
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body2"
                              color={transaction.type === 'withdrawal' ? 'error.main' : 'success.main'}
                              fontWeight="medium"
                              sx={{ overflowWrap: 'anywhere' }}
                            >
                              {transaction.type === 'withdrawal' ? '-' : '+'}${transaction.amount?.toLocaleString()} MXN
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={getStatusLabel(transaction.status)}
                              color={getStatusColor(transaction.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                            <Typography variant="body2" fontFamily="monospace" sx={{ overflowWrap: 'anywhere' }}>
                              {transaction.type === 'deposit' ? (transaction as any).reference || 'N/A' : 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {transaction.status === 'rejected' && transaction.rejectionReason ? (
                              <Typography variant="body2" color="error.main" sx={{ overflowWrap: 'anywhere' }}>
                                {transaction.rejectionReason}
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="textSecondary">-</Typography>
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
        <Dialog
          open={depositDialogOpen}
          onClose={() => setDepositDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          fullScreen={isXs}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUp />
              Nuevo Depósito
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 3, p: 2, border: '2px solid #1976d2', borderRadius: 2, bgcolor: 'background.paper', boxShadow: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
                Datos para Depósitos
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                <strong>Banco:</strong> Banregio<br />
                <strong>Tarjeta:</strong> 4741 7406 0220 7885<br />
                <strong>CLABE:</strong> 058320000000893020<br />
                <strong>Beneficiario:</strong> XXXTREMO
              </Typography>
            </Box>
            <Alert 
              severity="warning" 
              icon={false}
              sx={{ mb: 3, bgcolor: 'error.main', color: 'white', fontWeight: 'bold', fontSize: 18, border: '2px solid #ff1100ff', boxShadow: 3, textAlign: 'center', letterSpacing: 0.5 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                <TrendingUp sx={{ fontSize: 32, color: 'white' }} />
                <span style={{ fontWeight: 700, textTransform: 'uppercase' }}>
                  ¡IMPORTANTE! Primero realiza la transferencia a nuestra cuenta y luego llena este formulario.
                </span>
              </Box>
            </Alert>
            <TextField
              autoFocus
              margin="dense"
              label="Monto"
              type="number"
              fullWidth
              variant="outlined"
              value={depositForm.amount}
              onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
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
              onChange={(e) => setDepositForm({ ...depositForm, reference: e.target.value })}
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
                color: !depositForm.receipt ? 'error.main' : 'primary.main',
              }}
            >
              Subir Comprobante *
              <input
                type="file"
                hidden
                accept="image/*,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setDepositForm({ ...depositForm, receipt: file });
                }}
              />
            </Button>
            {depositForm.receipt ? (
              <Typography variant="body2" color="success.main" sx={{ mb: 1, overflowWrap: 'anywhere' }}>
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
              disabled={
                createDepositMutation.isPending || !depositForm.receipt || !depositForm.amount || !depositForm.reference
              }
            >
              {createDepositMutation.isPending ? 'Enviando...' : 'Enviar Depósito'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog de Retiro */}
        <Dialog
          open={withdrawDialogOpen}
          onClose={() => setWithdrawDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          fullScreen={isXs}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingDown />
              Solicitar Retiro
            </Box>
          </DialogTitle>
          <DialogContent>
            {/* Alerta de elegibilidad */}
            <Alert severity={isEligibleForWithdrawal ? 'success' : 'warning'} sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                Estado de Elegibilidad para Retiros
              </Typography>
              <Typography variant="body2">Apostado: ${totalWagered.toLocaleString()} MXN ({withdrawalProgress.toFixed(1)}%)</Typography>
              <Typography variant="body2">Depositado: ${totalDeposited.toLocaleString()} MXN</Typography>
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
              onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
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
              onChange={(e) => setWithdrawForm({ ...withdrawForm, bank: e.target.value })}
              sx={{ mb: 2 }}
            />

            <TextField
              margin="dense"
              label="Número de Cuenta"
              fullWidth
              variant="outlined"
              value={withdrawForm.accountNumber}
              onChange={(e) => setWithdrawForm({ ...withdrawForm, accountNumber: e.target.value })}
              sx={{ mb: 2 }}
            />

            <TextField
              margin="dense"
              label="CLABE"
              fullWidth
              variant="outlined"
              value={withdrawForm.clabe}
              onChange={(e) => setWithdrawForm({ ...withdrawForm, clabe: e.target.value })}
              sx={{ mb: 2 }}
            />

            <TextField
              margin="dense"
              label="Nombre del Titular"
              fullWidth
              variant="outlined"
              value={withdrawForm.holderName}
              onChange={(e) => setWithdrawForm({ ...withdrawForm, holderName: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setWithdrawDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleWithdrawSubmit} variant="contained" disabled={createWithdrawalMutation.isPending || !isEligibleForWithdrawal}>
              {createWithdrawalMutation.isPending ? 'Enviando...' : 'Solicitar Retiro'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default FinancesPage;
