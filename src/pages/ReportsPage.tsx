import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

import * as XLSX from 'xlsx';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Container, Typography, Paper, Tabs, Tab, Divider, Box, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Alert, Button } from '@mui/material';



// Componente auxiliar para calcular y mostrar comisiones por evento usando fightId -> eventId
function ComisionesPorEvento({ bets }: { bets: any[] }) {
  const [eventos, setEventos] = useState<Record<string, { total: number; comision: number; count: number, montos: number[] }>>({});
  const [eventNames, setEventNames] = useState<Record<string, string>>({});
  // Buscar eventos faltantes si no están en eventNames
  const [eventosExtra, setEventosExtra] = useState<Record<string, { name?: string; date?: any }>>({});

  React.useEffect(() => {
    const eventIds = Object.keys(eventos).filter(eid => !eventNames[eid]);
    if (eventIds.length === 0) return;
    let isMounted = true;
    (async () => {
      for (let i = 0; i < eventIds.length; i += 10) {
        const batch = eventIds.slice(i, i + 10);
        const snap = await getDocs(query(collection(db, 'events'), where('__name__', 'in', batch)));
        const found: Record<string, { name?: string; date?: any }> = {};
        snap.docs.forEach(doc => {
          const data = doc.data();
          found[doc.id] = { name: data.name, date: data.date };
        });
        if (isMounted) setEventosExtra(prev => ({ ...prev, ...found }));
      }
    })();
    return () => { isMounted = false; };
  }, [eventos, eventNames]);
  const [loading, setLoading] = useState(true);
  const eventosRef = useRef<Record<string, { total: number; comision: number; count: number, montos: number[] }>>({});

  // Declarar la función fuera de useEffect para evitar warning TS6133

  function handleExportExcel() {
    // Junta todas las apuestas ganadas por evento
    const ganadas: any[] = [];
    Object.entries(eventosRef.current).forEach(([eventId, vals]) => {
      if (!Array.isArray(vals.montos)) return;
      // Busca las apuestas ganadas originales para este evento
      // Como no guardamos los objetos completos en eventosTmp, hay que filtrar de bets
      bets.forEach(b => {
        let status = '';
        if (typeof b.status === 'string') status = b.status.toLowerCase();
        if (status === 'won' && b.fightId && b.amount && vals.montos.includes(b.amount)) {
          const fight = eventNames[eventId] || eventId;
          ganadas.push({
            Evento: fight,
            __id__: b.id,
            amount: b.amount,
            color: b.color,
            creationDate: b.creationDate,
            fightId: b.fightId,
            isResidual: b.isResidual,
            matchedAmount: b.matchedAmount,
            matches: JSON.stringify(b.matches),
            originalAmount: b.originalAmount,
            profit: b.profit,
            status: b.status,
            userId: b.userId,
          });
        }
      });
    });
    const ws = XLSX.utils.json_to_sheet(ganadas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ApuestasGanadas');
    XLSX.writeFile(wb, 'apuestas_ganadas_comisiones.xlsx');
  }

  React.useEffect(() => {
    async function fetchEventData() {
      const ganadas = bets.filter(b => {
        let status = '';
        if (typeof b.status === 'string') status = b.status.toLowerCase();
        return status === 'won' && b.fightId;
      });
      console.log('[ComisionesPorEvento] Total apuestas ganadas:', ganadas.length);
      console.log('[ComisionesPorEvento] IDs de apuestas ganadas:', ganadas.map(b => b.id));
      console.log('[ComisionesPorEvento] Montos de apuestas ganadas:', ganadas.map(b => b.amount));
      console.log('[ComisionesPorEvento] IDs y montos:', ganadas.map(b => ({ id: b.id, amount: b.amount })));
      const fightIds = Array.from(new Set(ganadas.map(b => b.fightId)));
      let allFights: any[] = [];
      for (let i = 0; i < fightIds.length; i += 10) {
        const snap = await getDocs(query(collection(db, 'fights'), where('__name__', 'in', fightIds.slice(i, i+10))));
        allFights = allFights.concat(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
      const fightToEvent: Record<string, { eventId: string, eventName?: string }> = {};
      allFights.forEach(f => { fightToEvent[f.id] = { eventId: f.eventId, eventName: f.eventName }; });
      const eventosTmp: Record<string, { total: number; comision: number; count: number, montos: number[] }> = {};
      const eventNamesTmp: Record<string, string> = {};
      ganadas.forEach(b => {
        const fight = fightToEvent[b.fightId];
        if (!fight || !fight.eventId) return;
        const key = fight.eventId;
        if (!eventosTmp[key]) eventosTmp[key] = { total: 0, comision: 0, count: 0, montos: [] };
        // Usar matchedAmount si existe, si no amount, si no 0
        const monto = (typeof b.matchedAmount === 'number' ? b.matchedAmount : (b.amount || 0));
        eventosTmp[key].total += monto;
        eventosTmp[key].comision += monto * 0.10;
        eventosTmp[key].count += 1;
        eventosTmp[key].montos.push(monto);
        if (fight.eventName) eventNamesTmp[key] = fight.eventName;
      });
      // Log detallado por evento
      Object.entries(eventosTmp).forEach(([eventId, vals]) => {
        console.log(`[ComisionesPorEvento][${eventId}] Total apuestas:`, vals.count);
        console.log(`[ComisionesPorEvento][${eventId}] Montos:`, vals.montos);
        console.log(`[ComisionesPorEvento][${eventId}] Suma total:`, vals.total);
        console.log(`[ComisionesPorEvento][${eventId}] Comisión 10%:`, vals.comision);
      });
      setEventos(eventosTmp);
      setEventNames(eventNamesTmp);
      eventosRef.current = eventosTmp;
      setLoading(false);
    }
    setLoading(true);
    fetchEventData();
  }, [bets]);

  if (loading) {
    return (
      <TableRow>
        <TableCell colSpan={5} align="center">Cargando...</TableCell>
      </TableRow>
    );
  }
  const rows = Object.entries(eventos).sort((a, b) => b[1].total - a[1].total);
  if (rows.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={4} align="center">Sin datos</TableCell>
      </TableRow>
    );
  }
  return <>
    <TableRow>
      <TableCell colSpan={6} align="right">
        <Button variant="contained" color="primary" onClick={handleExportExcel} sx={{ mt: 1, mb: 1 }}>
          Exportar a Excel
        </Button>
      </TableCell>
    </TableRow>
    {rows.map(([eventId, vals]) => {
      // Mostrar nombre y fecha del evento si existen
      let display = eventNames[eventId] || eventosExtra[eventId]?.name || eventId;
      let fecha = '';
      if (eventosExtra[eventId]?.date) {
        const d = eventosExtra[eventId].date.seconds ? new Date(eventosExtra[eventId].date.seconds * 1000) : new Date(eventosExtra[eventId].date);
        fecha = d.toLocaleDateString('es-MX');
      }
      if (!fecha && eventNames[eventId] && /\d{4}-\d{2}-\d{2}/.test(eventNames[eventId])) {
        fecha = eventNames[eventId].match(/\d{4}-\d{2}-\d{2}/)?.[0] || '';
      }
      return (
        <TableRow key={eventId}>
          <TableCell>{display}</TableCell>
          <TableCell>{fecha}</TableCell>
          <TableCell>${vals.total.toLocaleString('es-MX', { maximumFractionDigits: 2 })} MXN</TableCell>
          <TableCell>${vals.comision.toLocaleString('es-MX', { maximumFractionDigits: 2 })} MXN</TableCell>
          <TableCell>{vals.count}</TableCell>
        </TableRow>
      );
    })}
  </>;
}
// ...eliminado código suelto y duplicado fuera de función...
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
  const { data: bets = [] } = useQuery({
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
  const { data: transactions = [] } = useQuery({
    queryKey: ['allTransactions'],
    queryFn: async () => {
      const [depositsSnap, withdrawalsSnap] = await Promise.all([
        getDocs(collection(db, 'deposits')),
        getDocs(collection(db, 'withdrawals')),
      ]);
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

  // Batch fetch approver user info for transactions
  const approverIds = React.useMemo(() => {
    const ids = new Set<string>();
    transactions.forEach((t: any) => {
      if (t.approvedBy) ids.add(t.approvedBy);
      if (t.processedBy) ids.add(t.processedBy);
    });
    return Array.from(ids).filter(Boolean);
  }, [transactions]);

  // Batch fetch approver user info for transactions
  const { data: approvers = [] } = useQuery({
    queryKey: ['approvers', approverIds],
    enabled: approverIds.length > 0,
    queryFn: async () => {
      if (approverIds.length === 0) return [];
      // Firestore get by document ID (batch)
      const batches = [];
      for (let i = 0; i < approverIds.length; i += 10) {
        const batchIds = approverIds.slice(i, i + 10);
        const col = collection(db, 'users');
        batches.push(getDocs(query(col, where('__name__', 'in', batchIds))));
      }
      const results = await Promise.all(batches);
      // Flatten batches and inner arrays
      return results.flatMap(snap => snap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    },
  });

  // Map approver id to user info
  const approverMap = React.useMemo(() => {
    const map: Record<string, { name: string; email: string }> = {};
    (approvers || []).forEach((u: any) => {
      if (u.id !== undefined && u.id !== null) map[String(u.id)] = { name: u.name, email: u.email };
    });
    return map;
  }, [approvers]);


  // Batch fetch userIds for transactions
  const userIds = React.useMemo(() => {
    const ids = new Set<string>();
    transactions.forEach((t: any) => {
      if (t.userId) ids.add(t.userId);
    });
    return Array.from(ids).filter(Boolean);
  }, [transactions]);

  // Batch fetch user info for transactions
  const { data: usersForTx = [] } = useQuery({
    queryKey: ['usersForTx', userIds],
    enabled: userIds.length > 0,
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const batches = [];
      for (let i = 0; i < userIds.length; i += 10) {
        const batchIds = userIds.slice(i, i + 10);
        const col = collection(db, 'users');
        batches.push(getDocs(query(col, where('__name__', 'in', batchIds))));
      }
      const results = await Promise.all(batches);
      return results.flatMap(snap => snap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    },
  });

  // Map userId to user info
  const userMap = React.useMemo(() => {
    const map: Record<string, { name: string; email: string }> = {};
    usersForTx.forEach((u: any) => {
      if (u.id !== undefined && u.id !== null) map[String(u.id)] = { name: u.name, email: u.email };
    });
    return map;
  }, [usersForTx]);

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
          <Typography variant="h6" gutterBottom>Reporte de Transacciones</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
            <Button variant="contained" color="primary" onClick={() => {
              // Exportar a Excel las transacciones
              const rows = transactions.map((t: any) => {
                // Solo uno de los dos campos existe por transacción
                let aprobadorStr = '-';
                if (t.processedBy) {
                  const user = approverMap[t.processedBy];
                  aprobadorStr = user
                    ? (user.name ? `${user.name} (${user.email || t.processedBy})` : (user.email || t.processedBy))
                    : t.processedBy;
                } else if (t.approvedBy) {
                  // Puede ser email directo o un ID
                  if (t.method && t.method.startsWith('Manual')) {
                    aprobadorStr = t.approvedBy;
                  } else {
                    const user = approverMap[t.approvedBy];
                    aprobadorStr = user
                      ? (user.name ? `${user.name} (${user.email || t.approvedBy})` : (user.email || t.approvedBy))
                      : t.approvedBy;
                  }
                }
                const date = t.createdAt ? new Date(t.createdAt.seconds ? t.createdAt.seconds * 1000 : t.createdAt).toLocaleString('es-MX') : '';
                const user = t.userId ? userMap[t.userId] : null;
                const usuario = user ? (user.name || user.email || t.userId) : (t.userName || t.userEmail || t.userId || '-');
                return {
                  Tipo: t.type === 'deposit' ? 'Depósito' : 'Retiro',
                  Monto: t.amount || 0,
                  Usuario: usuario,
                  Fecha: date,
                  Aprobador: aprobadorStr || '-',
                  Estado: t.status || '-',
                  __id__: t.id,
                };
              });
              const ws = XLSX.utils.json_to_sheet(rows);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, 'Transacciones');
              XLSX.writeFile(wb, 'reporte_transacciones.xlsx');
            }}>
              Exportar a Excel
            </Button>
          </Box>
          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Monto</TableCell>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Aprobador</TableCell>
                  <TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">Sin transacciones</TableCell>
                  </TableRow>
                ) : (
                  transactions.map((t: any) => {
                    // Solo uno de los dos campos existe por transacción
                    let aprobadorStr = '-';
                    if (t.processedBy) {
                      const user = approverMap[t.processedBy];
                      aprobadorStr = user
                        ? (user.name ? `${user.name} (${user.email || t.processedBy})` : (user.email || t.processedBy))
                        : t.processedBy;
                    } else if (t.approvedBy) {
                      if (t.method && t.method.startsWith('Manual')) {
                        aprobadorStr = t.approvedBy;
                      } else {
                        const user = approverMap[t.approvedBy];
                        aprobadorStr = user
                          ? (user.name ? `${user.name} (${user.email || t.approvedBy})` : (user.email || t.approvedBy))
                          : t.approvedBy;
                      }
                    }
                    const date = t.createdAt ? new Date(t.createdAt.seconds ? t.createdAt.seconds * 1000 : t.createdAt).toLocaleString('es-MX') : '';
                    return (
                      <TableRow key={t.id}>
                        <TableCell>{t.type === 'deposit' ? 'Depósito' : 'Retiro'}</TableCell>
                        <TableCell>${(t.amount || 0).toLocaleString('es-MX', { maximumFractionDigits: 2 })} MXN</TableCell>
                        <TableCell>{(() => {
                          const user = t.userId ? userMap[t.userId] : null;
                          return user ? (user.name || user.email || t.userId) : (t.userName || t.userEmail || t.userId || '-');
                        })()}</TableCell>
                        <TableCell>{date}</TableCell>
                        <TableCell>{aprobadorStr || '-'}</TableCell>
                        <TableCell>{t.status || '-'}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
      {tab === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>Reporte de Apuestas</Typography>
          <Typography variant="body2" color="text.secondary">(Próximamente: aquí irá el reporte de apuestas)</Typography>
        </Box>
      )}
      {tab === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom>Comisiones por Evento</Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Evento</TableCell>
                  <TableCell>Fecha del Evento</TableCell>
                  <TableCell>Total Apostado</TableCell>
                  <TableCell>Comisión (10%)</TableCell>
                  <TableCell>Número de Apuestas</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <ComisionesPorEvento bets={bets} />
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
  {/* Otros tabs pueden ir aquí, pero solo muestran placeholders o componentes válidos */}
    </Container>
  );
};

export default ReportsPage;
