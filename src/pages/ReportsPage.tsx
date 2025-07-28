import React, { useState } from 'react';

import * as XLSX from 'xlsx';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  Box,
  Container,
  Tabs,
  Tab,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

// Componente para el reporte de apuestas
type ApuestasReportProps = {
  bets: any[];
  isLoading: boolean;
};
function ApuestasReport({ bets, isLoading }: ApuestasReportProps) {
  console.log('ApuestasReport - isLoading:', isLoading, 'bets:', bets);
  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Fecha</TableCell>
            <TableCell>Usuario</TableCell>
            <TableCell>Evento</TableCell>
            <TableCell>Pelea</TableCell>
            <TableCell>Monto</TableCell>
            <TableCell>Resultado</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} align="center">
                <CircularProgress size={24} />
              </TableCell>
            </TableRow>
          ) : bets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center">Sin datos</TableCell>
            </TableRow>
          ) : (
            bets.map((b: any) => (
              <TableRow key={b.id}>
                <TableCell>{
                  b.creationDate
                    ? (typeof b.creationDate.toDate === 'function'
                        ? b.creationDate.toDate().toLocaleString('es-MX')
                        : typeof b.creationDate.seconds === 'number'
                          ? new Date(b.creationDate.seconds * 1000).toLocaleString('es-MX')
                          : new Date(b.creationDate).toLocaleString('es-MX'))
                    : b.createdAt
                      ? (typeof b.createdAt.toDate === 'function'
                          ? b.createdAt.toDate().toLocaleString('es-MX')
                          : typeof b.createdAt.seconds === 'number'
                            ? new Date(b.createdAt.seconds * 1000).toLocaleString('es-MX')
                            : new Date(b.createdAt).toLocaleString('es-MX'))
                      : '-'
                }</TableCell>
                <TableCell>{b.userName || b.userId || '-'}</TableCell>
                <TableCell>{b.eventName || b.eventId || '-'}</TableCell>
                <TableCell>{b.fightName || b.fightId || '-'}</TableCell>
                <TableCell>${b.amount?.toLocaleString('es-MX')} MXN</TableCell>
                <TableCell>{b.result || b.status || '-'}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
const REPORTS = [
  'Transacciones',
  'Apuestas',
  'Comisiones',
  'Usuarios',
  'Eventos y Palenques',
  'Correcciones',
  'Saldos',
  'Actividad en Vivo',
];

const ReportsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState(0);

  // Query apuestas
  const { data: bets = [], isLoading: loadingBets } = useQuery({
    queryKey: ['allBets'],
    queryFn: async () => {
      try {
        // Quitar orderBy para ver si hay documentos sin createdAt
        const betsSnap = await getDocs(collection(db, 'bets'));
        const result = betsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('Firestore bets fetched:', result);
        return result;
      } catch (err) {
        console.error('Firestore bets error:', err);
        throw err;
      }
    },
  });

  if (!currentUser || (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.FINANCE)) {
    return (
      <Container maxWidth="md" sx={{ mt: 6 }}>
        <Alert severity="error">No tienes permisos para ver los reportes.</Alert>
      </Container>
    );
  }

  // Query transacciones (depósitos y retiros)
  const { data: transactions = [], isLoading: loadingTransactions } = useQuery({
    queryKey: ['allTransactions'],
    queryFn: async () => {
      const depositsSnap = await getDocs(query(collection(db, 'deposits'), orderBy('createdAt', 'desc')));
      const withdrawalsSnap = await getDocs(query(collection(db, 'withdrawals'), orderBy('createdAt', 'desc')));
      const deposits = depositsSnap.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, type: 'deposit', createdAt: data.createdAt };
      });
      const withdrawals = withdrawalsSnap.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, type: 'withdrawal', createdAt: data.createdAt };
      });
      return [...deposits, ...withdrawals].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    },
  });

  return (
    <Container maxWidth={false} sx={{ py: { xs: 2, md: 4 } }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Reportes
      </Typography>
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_e, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {REPORTS.map(label => (
            <Tab key={label} label={label} />
          ))}
        </Tabs>
      </Paper>
      <Divider sx={{ mb: 3 }} />
      {tab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" gutterBottom>Reporte de Transacciones</Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                const exportData = transactions.map((t: any) => ({
                  Fecha: t.createdAt
                    ? (typeof t.createdAt.toDate === 'function'
                        ? t.createdAt.toDate().toLocaleString('es-MX')
                        : typeof t.createdAt.seconds === 'number'
                          ? new Date(t.createdAt.seconds * 1000).toLocaleString('es-MX')
                          : new Date(t.createdAt).toLocaleString('es-MX'))
                    : '-',
                  Usuario: t.userName || t.userId || '-',
                  Tipo: t.type === 'deposit' ? 'Depósito' : 'Retiro',
                  Monto: t.amount,
                  Estado: t.status ? t.status.charAt(0).toUpperCase() + t.status.slice(1) : '-',
                }));
                const ws = XLSX.utils.json_to_sheet(exportData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Transacciones');
                XLSX.writeFile(wb, 'reporte_transacciones.xlsx');
              }}
              disabled={transactions.length === 0}
            >
              Exportar a Excel
            </Button>
          </Box>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Monto</TableCell>
                  <TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingTransactions ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">Sin datos</TableCell>
                  </TableRow>
                ) : (
                  transactions.map((t: any) => (
                    <TableRow key={t.id + t.type}>
                      <TableCell>{
                        t.createdAt
                          ? (typeof t.createdAt.toDate === 'function'
                              ? t.createdAt.toDate().toLocaleString('es-MX')
                              : typeof t.createdAt.seconds === 'number'
                                ? new Date(t.createdAt.seconds * 1000).toLocaleString('es-MX')
                                : new Date(t.createdAt).toLocaleString('es-MX'))
                          : '-'
                      }</TableCell>
                      <TableCell>{t.userName || t.userId || '-'}</TableCell>
                      <TableCell>{t.type === 'deposit' ? 'Depósito' : 'Retiro'}</TableCell>
                      <TableCell>${t.amount?.toLocaleString('es-MX')} MXN</TableCell>
                      <TableCell>{t.status ? t.status.charAt(0).toUpperCase() + t.status.slice(1) : '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
      {tab === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>Reporte de Apuestas</Typography>
          <ApuestasReport bets={bets} isLoading={loadingBets} />
        </Box>
      )}




      {tab === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom>Reporte de Comisiones</Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Mes</TableCell>
                  <TableCell>Comisión Apuestas</TableCell>
                  <TableCell>Comisión Retiros</TableCell>
                  <TableCell>Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={4} align="center">Sin datos</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
      {tab === 3 && (
        <Box>
          <Typography variant="h6" gutterBottom>Reporte de Usuarios</Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Correo</TableCell>
                  <TableCell>Registrado</TableCell>
                  <TableCell>Saldo</TableCell>
                  <TableCell>Total Apostado</TableCell>
                  <TableCell>Total Depositado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={6} align="center">Sin datos</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
      {tab === 4 && (
        <Box>
          <Typography variant="h6" gutterBottom>Reporte de Eventos y Palenques</Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Evento</TableCell>
                  <TableCell>Palenque</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Peleas</TableCell>
                  <TableCell>Apuestas</TableCell>
                  <TableCell>Recaudación</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={6} align="center">Sin datos</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
      {tab === 5 && (
        <Box>
          <Typography variant="h6" gutterBottom>Reporte de Correcciones</Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Pelea</TableCell>
                  <TableCell>Evento</TableCell>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Motivo</TableCell>
                  <TableCell>Fecha</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={5} align="center">Sin datos</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
      {tab === 6 && (
        <Box>
          <Typography variant="h6" gutterBottom>Reporte de Saldos</Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Saldo</TableCell>
                  <TableCell>Última actualización</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={3} align="center">Sin datos</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
      {tab === 7 && (
        <Box>
          <Typography variant="h6" gutterBottom>Reporte de Actividad en Vivo</Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha/Hora</TableCell>
                  <TableCell>Evento</TableCell>
                  <TableCell>Pelea</TableCell>
                  <TableCell>Apuestas en Vivo</TableCell>
                  <TableCell>Volumen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={5} align="center">Sin datos</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Container>
  );
};

export default ReportsPage;
