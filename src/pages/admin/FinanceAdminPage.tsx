import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Avatar,
  Alert,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Visibility,
  CheckCircle,
  Cancel,
  Receipt,
  AccountBalance,
  PendingActions,
  TrendingUp,
  TrendingDown
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import {
  usePendingDeposits,
  usePendingWithdrawals,
  useTransactionHistory,
  useApproveDeposit,
  useRejectDeposit,
  useApproveWithdrawal,
  useRejectWithdrawal
} from '../../hooks/useFinanceAdmin';

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
      id={`finance-tabpanel-${index}`}
      aria-labelledby={`finance-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function FinanceAdminPage() {
  const { currentUser } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'view'>('view');
  const [rejectionReason, setRejectionReason] = useState('');

  // Queries para obtener datos de Firebase
  const { data: pendingDeposits = [], isLoading: isLoadingDeposits, error: depositsError } = usePendingDeposits();
  const { data: pendingWithdrawals = [], isLoading: isLoadingWithdrawals, error: withdrawalsError } = usePendingWithdrawals();
  const { data: transactionHistory = [], isLoading: isLoadingHistory } = useTransactionHistory();

  // Obtener todas las apuestas de una vez para evitar llamadas condicionales de hooks
  const { data: allBets = [] } = useQuery({
    queryKey: ['all-bets-for-admin'],
    queryFn: async () => {
      const betsRef = collection(db, 'bets');
      const snapshot = await getDocs(betsRef);
      return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    },
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  // Función para calcular estadísticas reales de apuestas del usuario
  const calculateUserStats = (userId: string) => {
    // Filter bets for this specific user
    const userBets = allBets.filter((bet: any) => bet.userId === userId);
    
    const totalBetAmount = userBets.reduce((sum: number, bet: any) => sum + (bet.matchedAmount || bet.amount), 0);
    const approvedDeposits = pendingDeposits
      .filter(deposit => deposit.userId === userId && deposit.status === 'approved')
      .reduce((sum, deposit) => sum + deposit.amount, 0);
    
    const isEligibleForWithdrawal = totalBetAmount >= approvedDeposits;
    const percentageBet = approvedDeposits > 0 ? (totalBetAmount / approvedDeposits) * 100 : 0;
    
    return {
      totalBetAmount,
      totalDeposited: approvedDeposits,
      isEligibleForWithdrawal,
      percentageBet
    };
  };

  // Mutations para procesar transacciones
  const approveDepositMutation = useApproveDeposit();
  const rejectDepositMutation = useRejectDeposit();
  const approveWithdrawalMutation = useApproveWithdrawal();
  const rejectWithdrawalMutation = useRejectWithdrawal();

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleViewTransaction = (transaction: any, type: string) => {
    setSelectedTransaction({ ...transaction, type });
    setActionType('view');
    setDialogOpen(true);
  };

  const handleApproveTransaction = (transaction: any, type: string) => {
    setSelectedTransaction({ ...transaction, type });
    setActionType('approve');
    setDialogOpen(true);
  };

  const handleRejectTransaction = (transaction: any, type: string) => {
    setSelectedTransaction({ ...transaction, type });
    setActionType('reject');
    setDialogOpen(true);
  };

  const confirmAction = async () => {
    if (!selectedTransaction || !currentUser) return;
    
    try {
      const adminId = currentUser.id;

      if (actionType === 'approve') {
        if (selectedTransaction.type === 'deposit') {
          await approveDepositMutation.mutateAsync({ 
            depositId: selectedTransaction.id, 
            adminId 
          });
        } else {
          await approveWithdrawalMutation.mutateAsync({ 
            withdrawalId: selectedTransaction.id, 
            adminId 
          });
        }
      } else if (actionType === 'reject') {
        if (selectedTransaction.type === 'deposit') {
          await rejectDepositMutation.mutateAsync({ 
            depositId: selectedTransaction.id, 
            adminId, 
            reason: rejectionReason 
          });
        } else {
          await rejectWithdrawalMutation.mutateAsync({ 
            withdrawalId: selectedTransaction.id, 
            adminId, 
            reason: rejectionReason 
          });
        }
      }

      setDialogOpen(false);
      setRejectionReason('');
    } catch (error) {
      console.error('Error processing transaction:', error);
      alert('Error al procesar la transacción. Inténtalo de nuevo.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'approved': return 'Aprobado';
      case 'rejected': return 'Rechazado';
      default: return status;
    }
  };

  // Estadísticas generales usando datos reales
  const totalPendingDeposits = pendingDeposits.reduce((sum: number, d: any) => sum + d.amount, 0);
  const totalPendingWithdrawals = pendingWithdrawals.reduce((sum: number, w: any) => sum + w.amount, 0);
  const pendingCount = pendingDeposits.length + pendingWithdrawals.length;

  // Loading y error states
  const isLoading = isLoadingDeposits || isLoadingWithdrawals;
  const hasError = depositsError || withdrawalsError;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Administración Financiera
      </Typography>

      {/* Error alerts */}
      {hasError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Error al cargar los datos financieros. Por favor, recarga la página.
        </Alert>
      )}

      {/* Estadísticas generales */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
        <Box sx={{ flex: '1 1 240px', minWidth: '240px' }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PendingActions color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">
                    {isLoading ? <CircularProgress size={20} /> : pendingCount}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Transacciones Pendientes
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
        
        <Box sx={{ flex: '1 1 240px', minWidth: '240px' }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUp color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">
                    {isLoading ? <CircularProgress size={20} /> : `$${totalPendingDeposits.toLocaleString()}`}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Depósitos Pendientes
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
        
        <Box sx={{ flex: '1 1 240px', minWidth: '240px' }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingDown color="error" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">
                    {isLoading ? <CircularProgress size={20} /> : `$${totalPendingWithdrawals.toLocaleString()}`}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Retiros Pendientes
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
        
        <Box sx={{ flex: '1 1 240px', minWidth: '240px' }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AccountBalance color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">
                    {isLoading ? (
                      <CircularProgress size={20} />
                    ) : (
                      `$${(totalPendingDeposits - totalPendingWithdrawals).toLocaleString()}`
                    )}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Balance Neto
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Alerta informativa sobre validaciones */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2" fontWeight="bold" gutterBottom>
          📊 Validaciones de Elegibilidad para Retiros
        </Typography>
        <Typography variant="body2">
          • Los usuarios deben apostar el 100% de sus depósitos aprobados antes de poder retirar<br/>
          • Las filas rojas indican usuarios que NO son elegibles para retiro<br/>
          • El cálculo se basa en las apuestas reales (matchedAmount) del usuario
        </Typography>
      </Alert>

      {/* Alerta de pendientes */}
      {pendingCount > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Tienes {pendingCount} transacciones pendientes que requieren revisión.
        </Alert>
      )}

      {/* Tabs de navegación */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label={`Depósitos Pendientes (${pendingDeposits.length})`} />
            <Tab label={`Retiros Pendientes (${pendingWithdrawals.length})`} />
            <Tab label="Historial Completo" />
          </Tabs>
        </Box>

        {/* Tab 0: Depósitos Pendientes */}
        <TabPanel value={tabValue} index={0}>
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Monto</TableCell>
                  <TableCell>Método</TableCell>
                  <TableCell>Referencia</TableCell>
                  <TableCell>Comprobante</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoadingDeposits ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : depositsError ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Alert severity="error">Error al cargar depósitos</Alert>
                    </TableCell>
                  </TableRow>
                ) : pendingDeposits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography variant="body2" color="textSecondary">
                        No hay depósitos pendientes
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingDeposits.map((deposit) => (
                  <TableRow key={deposit.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                          {deposit.userName.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {deposit.userName}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {deposit.userEmail}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="h6" color="success.main">
                        ${deposit.amount.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>{deposit.method}</TableCell>
                    <TableCell>{deposit.reference}</TableCell>
                    <TableCell>
                      {deposit.receipt ? (
                        deposit.receipt.status === 'uploaded' ? (
                          <Chip 
                            label="✅ Subido" 
                            color="success" 
                            size="small"
                            icon={<Receipt />}
                          />
                        ) : deposit.receipt.status === 'uploading' ? (
                          <Chip 
                            label="📤 Subiendo..." 
                            color="info" 
                            size="small"
                            icon={<CircularProgress size={12} />}
                          />
                        ) : deposit.receipt.status === 'failed' ? (
                          <Chip 
                            label="❌ Error" 
                            color="error" 
                            size="small"
                          />
                        ) : (
                          <Chip 
                            label="📎 Adjunto" 
                            color="warning" 
                            size="small"
                            icon={<Receipt />}
                          />
                        )
                      ) : (
                        <Chip 
                          label="Sin archivo" 
                          color="default" 
                          size="small"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {dayjs(deposit.createdAt).format('DD/MM/YYYY HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={getStatusText(deposit.status)} 
                        color={getStatusColor(deposit.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Ver detalles">
                          <IconButton 
                            size="small" 
                            onClick={() => handleViewTransaction(deposit, 'deposit')}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Aprobar">
                          <IconButton 
                            size="small" 
                            color="success"
                            onClick={() => handleApproveTransaction(deposit, 'deposit')}
                          >
                            <CheckCircle />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Rechazar">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleRejectTransaction(deposit, 'deposit')}
                          >
                            <Cancel />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                )))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Tab 1: Retiros Pendientes */}
        <TabPanel value={tabValue} index={1}>
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Estadísticas</TableCell>
                  <TableCell>Monto Solicitado</TableCell>
                  <TableCell>Comisión</TableCell>
                  <TableCell>Monto Neto</TableCell>
                  <TableCell>Cuenta Bancaria</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoadingWithdrawals ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : withdrawalsError ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <Alert severity="error">Error al cargar retiros</Alert>
                    </TableCell>
                  </TableRow>
                ) : pendingWithdrawals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <Typography variant="body2" color="textSecondary">
                        No hay retiros pendientes
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingWithdrawals.map((withdrawal) => {
                    const userStats = calculateUserStats(withdrawal.userId);
                    
                    return (
                  <TableRow 
                    key={withdrawal.id}
                    sx={{ 
                      backgroundColor: !userStats.isEligibleForWithdrawal ? 'error.50' : 'inherit',
                      '&:hover': {
                        backgroundColor: !userStats.isEligibleForWithdrawal ? 'error.100' : 'inherit'
                      }
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                          {withdrawal.userName.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {withdrawal.userName}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {withdrawal.userEmail}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          Apostado: ${userStats.totalBetAmount.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Depositado: ${userStats.totalDeposited.toLocaleString()}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color={userStats.isEligibleForWithdrawal ? 'success.main' : 'error.main'}
                          fontWeight="bold"
                        >
                          {userStats.isEligibleForWithdrawal ? '✓ Elegible' : '✗ No elegible'} 
                          ({userStats.percentageBet.toFixed(1)}%)
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="h6" color="error.main">
                        ${withdrawal.amount.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        ${withdrawal.commission.toLocaleString()} (1%)
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="h6" color="success.main">
                        ${withdrawal.netAmount.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {withdrawal.bankAccount}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        CLABE: {withdrawal.clabe}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {dayjs(withdrawal.createdAt).format('DD/MM/YYYY HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={getStatusText(withdrawal.status)} 
                        color={getStatusColor(withdrawal.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Ver detalles">
                          <IconButton 
                            size="small" 
                            onClick={() => handleViewTransaction(withdrawal, 'withdrawal')}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Aprobar">
                          <IconButton 
                            size="small" 
                            color="success"
                            onClick={() => handleApproveTransaction(withdrawal, 'withdrawal')}
                          >
                            <CheckCircle />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Rechazar">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleRejectTransaction(withdrawal, 'withdrawal')}
                          >
                            <Cancel />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Tab 2: Historial Completo */}
        <TabPanel value={tabValue} index={2}>
          {isLoadingHistory ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Usuario</TableCell>
                    <TableCell>Monto</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Procesado Por</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactionHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography variant="body2" color="textSecondary">
                          No hay transacciones en el historial
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactionHistory.slice(0, 50).map((transaction: any) => (
                      <TableRow key={`${transaction.type}-${transaction.id}`}>
                        <TableCell>
                          <Chip 
                            label={transaction.type === 'deposit' ? 'Depósito' : 'Retiro'} 
                            color={transaction.type === 'deposit' ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ mr: 2, bgcolor: 'primary.main', width: 32, height: 32 }}>
                              {transaction.userName?.charAt(0) || 'U'}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {transaction.userName || 'Usuario'}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {transaction.userEmail}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="h6" 
                            color={transaction.type === 'deposit' ? 'success.main' : 'error.main'}>
                            ${transaction.amount?.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={getStatusText(transaction.status)} 
                            color={getStatusColor(transaction.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {dayjs(transaction.createdAt).format('DD/MM/YYYY HH:mm')}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {transaction.processedBy || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Ver detalles">
                            <IconButton 
                              size="small" 
                              onClick={() => handleViewTransaction(transaction, transaction.type)}
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>
      </Card>

      {/* Dialog para ver/procesar transacciones */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {actionType === 'view' ? 'Detalles de la Transacción' : 
           actionType === 'approve' ? 'Aprobar Transacción' : 'Rechazar Transacción'}
        </DialogTitle>
        <DialogContent>
          {selectedTransaction && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 3, 
                '& > *': { flex: '1 1 280px', minWidth: '280px' } 
              }}>
                <Box sx={{ flex: '1 1 280px', minWidth: '280px' }}>
                  <Typography variant="subtitle2" gutterBottom>Usuario</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedTransaction.userName}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {selectedTransaction.userEmail}
                  </Typography>
                </Box>
                
                <Box sx={{ flex: '1 1 280px', minWidth: '280px' }}>
                  <Typography variant="subtitle2" gutterBottom>Monto</Typography>
                  <Typography variant="h6" 
                    color={selectedTransaction.type === 'deposit' ? 'success.main' : 'error.main'}>
                    ${selectedTransaction.amount?.toLocaleString()}
                  </Typography>
                </Box>

                {selectedTransaction.type === 'deposit' && (
                  <>
                    <Box sx={{ flex: '1 1 280px', minWidth: '280px' }}>
                      <Typography variant="subtitle2" gutterBottom>Método</Typography>
                      <Typography variant="body1">{selectedTransaction.method}</Typography>
                    </Box>
                    
                    <Box sx={{ flex: '1 1 280px', minWidth: '280px' }}>
                      <Typography variant="subtitle2" gutterBottom>Referencia</Typography>
                      <Typography variant="body1">{selectedTransaction.reference}</Typography>
                    </Box>

                    <Box sx={{ flex: '1 1 100%', width: '100%' }}>
                      <Typography variant="subtitle2" gutterBottom>Comprobante</Typography>
                      {selectedTransaction.receipt ? (
                        <Box>
                          <Typography variant="body2" color="textSecondary" gutterBottom>
                            <strong>Archivo:</strong> {selectedTransaction.receipt.fileName}
                          </Typography>
                          <Typography variant="body2" color="textSecondary" gutterBottom>
                            <strong>Tamaño:</strong> {(selectedTransaction.receipt.fileSize / 1024 / 1024).toFixed(2)} MB
                          </Typography>
                          <Typography variant="body2" color="textSecondary" gutterBottom>
                            <strong>Tipo:</strong> {selectedTransaction.receipt.fileType}
                          </Typography>
                          
                          {selectedTransaction.receipt.status === 'uploading' && (
                            <Alert severity="info" sx={{ mt: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CircularProgress size={16} />
                                <Typography variant="body2">
                                  📤 Subiendo comprobante: <strong>{selectedTransaction.receipt.fileName}</strong>
                                </Typography>
                              </Box>
                            </Alert>
                          )}
                          
                          {selectedTransaction.receipt.status === 'pending_upload' && (
                            <Alert severity="warning" sx={{ mt: 1 }}>
                              <Typography variant="body2">
                                📁 Archivo seleccionado: <strong>{selectedTransaction.receipt.fileName}</strong>
                              </Typography>
                              <Typography variant="body2" sx={{ mt: 1 }}>
                                ⚠️ Se necesita implementar Firebase Storage para visualizar el comprobante.
                              </Typography>
                            </Alert>
                          )}
                          
                          {selectedTransaction.receipt.status === 'uploaded' && selectedTransaction.receipt.fileUrl && (
                            <Box>
                              <Button
                                variant="outlined"
                                startIcon={<Receipt />}
                                onClick={() => window.open(selectedTransaction.receipt.fileUrl, '_blank')}
                                sx={{ mt: 1 }}
                              >
                                Ver Comprobante
                              </Button>
                              <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                                📅 Subido: {selectedTransaction.receipt.uploadedAt && 
                                  dayjs(selectedTransaction.receipt.uploadedAt).format('DD/MM/YYYY HH:mm')}
                              </Typography>
                            </Box>
                          )}
                          
                          {selectedTransaction.receipt.status === 'failed' && (
                            <Alert severity="error" sx={{ mt: 1 }}>
                              <Typography variant="body2">
                                ❌ Error al subir el comprobante: <strong>{selectedTransaction.receipt.fileName}</strong>
                              </Typography>
                              <Typography variant="body2" sx={{ mt: 1 }}>
                                El depósito fue creado pero el archivo no se pudo subir.
                              </Typography>
                            </Alert>
                          )}
                        </Box>
                      ) : (
                        <Alert severity="info" sx={{ mt: 1 }}>
                          <Typography variant="body2">
                            📄 No se adjuntó comprobante para este depósito
                          </Typography>
                        </Alert>
                      )}
                    </Box>
                  </>
                )}

                {selectedTransaction.type === 'withdrawal' && (
                  <>
                    <Box sx={{ flex: '1 1 280px', minWidth: '280px' }}>
                      <Typography variant="subtitle2" gutterBottom>Comisión (1%)</Typography>
                      <Typography variant="body1">
                        ${selectedTransaction.commission?.toLocaleString()}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ flex: '1 1 280px', minWidth: '280px' }}>
                      <Typography variant="subtitle2" gutterBottom>Monto Neto</Typography>
                      <Typography variant="h6" color="success.main">
                        ${selectedTransaction.netAmount?.toLocaleString()}
                      </Typography>
                    </Box>

                    <Box sx={{ flex: '1 1 280px', minWidth: '280px' }}>
                      <Typography variant="subtitle2" gutterBottom>Cuenta Bancaria</Typography>
                      <Typography variant="body1">{selectedTransaction.bankAccount}</Typography>
                    </Box>
                    
                    <Box sx={{ flex: '1 1 280px', minWidth: '280px' }}>
                      <Typography variant="subtitle2" gutterBottom>CLABE</Typography>
                      <Typography variant="body1">{selectedTransaction.clabe}</Typography>
                    </Box>
                  </>
                )}

                <Box sx={{ flex: '1 1 100%', width: '100%' }}>
                  <Typography variant="subtitle2" gutterBottom>Fecha de Solicitud</Typography>
                  <Typography variant="body1">
                    {dayjs(selectedTransaction.createdAt).format('DD/MM/YYYY HH:mm:ss')}
                  </Typography>
                </Box>

                {actionType === 'reject' && (
                  <Box sx={{ flex: '1 1 100%', width: '100%' }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Razón del rechazo"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      required
                      helperText="Explica por qué se rechaza esta transacción"
                    />
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            Cancelar
          </Button>
          {actionType !== 'view' && (
            <Button
              onClick={confirmAction}
              variant="contained"
              color={actionType === 'approve' ? 'success' : 'error'}
              disabled={actionType === 'reject' && !rejectionReason.trim()}
            >
              {actionType === 'approve' ? 'Aprobar' : 'Rechazar'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
