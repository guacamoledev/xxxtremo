// src/pages/ReportsPage.tsx
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

import * as XLSX from 'xlsx';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  Alert,
  Box,
  Button,
  Container,
  Divider,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material';

/* ===========================
 * Utilidades
 * =========================== */
const toNum = (v: any) => (typeof v === 'number' ? v : Number(v) || 0);
const add = (a: number, b: number) => Math.round((a + b) * 100) / 100;
const pct = (x: number, p: number) => Math.round(x * p * 100) / 100;

function parseMaybeTimestamp(raw: any): Date | null {
  if (!raw) return null;
  try {
    if (typeof raw?.toDate === 'function') return raw.toDate();
    if (typeof raw?.seconds === 'number') return new Date(raw.seconds * 1000);
    if (typeof raw === 'number') return new Date(raw);
    if (typeof raw === 'string' || raw instanceof String) {
      const d = new Date(String(raw));
      return isNaN(d.getTime()) ? null : d;
    }
  } catch {
    // noop
  }
  return null;
}

function fmtMXN(n: number) {
  return `$${(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 2 })} MXN`;
}

/* =========================================================================
 * Componente: ComisionesPorEvento
 *   - SOLO devuelve <TableRow> dentro del <TableBody>
 *   - Calcula totales y los envía al padre mediante un ref de callback (sin loop)
 *   - Deduplicación por apuesta y mapeo fightId → eventId
 * ========================================================================= */
type Totales = { total: number; comision: number; count: number };

function ComisionesPorEvento({
  bets,
  onTotalsChange,
}: {
  bets: any[];
  onTotalsChange: (t: Totales) => void;
}) {
  const [eventos, setEventos] = useState<
    Record<string, { total: number; comision: number; count: number; montos: number[] }>
  >({});
  const [eventNames, setEventNames] = useState<Record<string, string>>({});
  const [eventosExtra, setEventosExtra] = useState<Record<string, { name?: string; date?: any }>>({});
  const [loading, setLoading] = useState(true);

  // refs para export y callback estable
  const eventosRef = useRef<Record<string, { total: number; comision: number; count: number; montos: number[] }>>({});
  const fightToEventRef = useRef<Record<string, { eventId: string; eventName?: string }>>({});
  const totalsCbRef = useRef(onTotalsChange);
  // mantener actualizado el ref (sin cambiar la identidad en deps del efecto)
  React.useEffect(() => {
    totalsCbRef.current = onTotalsChange;
  }, [onTotalsChange]);

  // Buscar eventos faltantes si no están en eventNames
  React.useEffect(() => {
    const eventIds = Object.keys(eventos).filter((eid) => !eventNames[eid]);
    if (eventIds.length === 0) return;
    let isMounted = true;
    (async () => {
      for (let i = 0; i < eventIds.length; i += 10) {
        const batch = eventIds.slice(i, i + 10);
        const snap = await getDocs(query(collection(db, 'events'), where('__name__', 'in', batch)));
        const found: Record<string, { name?: string; date?: any }> = {};
        snap.docs.forEach((doc: any) => {
          const data = doc.data();
          found[doc.id] = { name: data.name, date: data.date };
        });
        if (isMounted) setEventosExtra((prev) => ({ ...prev, ...found }));
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [eventos, eventNames]);

  // Cargar y agregar apuestas ganadas por evento usando fightId -> eventId
  React.useEffect(() => {
    let isMounted = true;
    async function fetchEventData() {
      if (!isMounted) return;
      setLoading(true);

      const ganadas = bets.filter((b) => (b?.status || '').toLowerCase() === 'won' && b?.fightId);
      const fightIds = Array.from(new Set(ganadas.map((b) => String(b.fightId)))).filter(Boolean);

      let allFights: any[] = [];
      for (let i = 0; i < fightIds.length; i += 10) {
        const snap = await getDocs(query(collection(db, 'fights'), where('__name__', 'in', fightIds.slice(i, i + 10))));
        allFights = allFights.concat(snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })));
      }

      const fightToEvent: Record<string, { eventId: string; eventName?: string }> = {};
      allFights.forEach((f) => {
        if (f?.id && f?.eventId) {
          fightToEvent[String(f.id)] = { eventId: String(f.eventId), eventName: f.eventName };
        }
      });

      const eventosTmp: Record<string, { total: number; comision: number; count: number; montos: number[] }> = {};
      const eventNamesTmp: Record<string, string> = {};

      ganadas.forEach((b) => {
        const fight = fightToEvent[String(b.fightId)];
        if (!fight?.eventId) return;
        const key = fight.eventId;
        if (!eventosTmp[key]) eventosTmp[key] = { total: 0, comision: 0, count: 0, montos: [] };

        const monto = toNum(b?.matchedAmount) || toNum(b?.amount);
        eventosTmp[key].total = add(eventosTmp[key].total, monto);
        eventosTmp[key].comision = add(eventosTmp[key].comision, pct(monto, 0.1));
        eventosTmp[key].count += 1;
        eventosTmp[key].montos.push(monto);

        if (fight.eventName) eventNamesTmp[key] = String(fight.eventName);
      });

      const rowsTmp = Object.entries(eventosTmp).sort((a, b) => b[1].total - a[1].total);

      if (!isMounted) return;
      setEventos(eventosTmp);
      setEventNames(eventNamesTmp);
      eventosRef.current = eventosTmp;
      fightToEventRef.current = fightToEvent;

      // Calcular y enviar totales con ref (no dispara deps)
      const totals: Totales = rowsTmp.reduce(
        (acc, [, v]) => {
          acc.total = add(acc.total, v.total);
          acc.comision = add(acc.comision, v.comision);
          acc.count += v.count;
          return acc;
        },
        { total: 0, comision: 0, count: 0 }
      );
      totalsCbRef.current?.(totals);

      setLoading(false);

      // Logs JSON opcionales
      // console.log('EVENTOS_JSON_START'); console.log(JSON.stringify(eventosTmp)); console.log('EVENTOS_JSON_END');
      // console.log('ROWS_JSON_START'); console.log(JSON.stringify(rowsTmp)); console.log('ROWS_JSON_END');
    }

    fetchEventData();
    return () => {
      isMounted = false;
    };
    // MUY IMPORTANTE: NO dependemos de onTotalsChange aquí
  }, [bets]);

  function handleExportExcel() {
    const betEventId: Record<string, string> = {};
    bets.forEach((b: any) => {
      const status = (b?.status || '').toLowerCase();
      if (status !== 'won' || !b?.fightId) return;
      const mapping = fightToEventRef.current[String(b.fightId)];
      if (mapping?.eventId) betEventId[String(b.id)] = mapping.eventId;
    });

    const ganadas: any[] = [];
    const seen = new Set<string>();

    Object.entries(eventosRef.current).forEach(([eventId]) => {
      bets.forEach((b: any) => {
        const status = (b?.status || '').toLowerCase();
        const bid = String(b?.id || '');
        if (!bid) return;

        if (status === 'won' && b?.fightId && betEventId[bid] === eventId) {
          if (seen.has(bid)) return;
          seen.add(bid);

          const monto = toNum(b?.matchedAmount) || toNum(b?.amount);

          ganadas.push({
            Evento: eventNames[eventId] || eventId,
            __id__: bid,
            amount: monto,
            color: b?.color ?? '',
            creationDate: b?.creationDate ?? '',
            fightId: b?.fightId ?? '',
            isResidual: !!b?.isResidual,
            matchedAmount: b?.matchedAmount ?? '',
            matches: JSON.stringify(b?.matches ?? null),
            originalAmount: b?.originalAmount ?? '',
            profit: toNum(b?.profit),
            status: b?.status ?? '',
            userId: b?.userId ?? '',
          });
        }
      });
    });

    const ws = XLSX.utils.json_to_sheet(ganadas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ApuestasGanadas');
    XLSX.writeFile(wb, 'apuestas_ganadas_comisiones.xlsx');
  }

  if (loading) {
    return (
      <TableRow>
        <TableCell colSpan={6} align="center">
          Cargando...
        </TableCell>
      </TableRow>
    );
  }

  const rows = Object.entries(eventos).sort((a, b) => b[1].total - a[1].total);
  if (rows.length === 0) {
    return (
      <>
        <TableRow>
          <TableCell colSpan={6} align="right">
            <Button variant="contained" color="primary" onClick={handleExportExcel} sx={{ mt: 1, mb: 1 }}>
              Exportar a Excel
            </Button>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell colSpan={6} align="center">
            Sin datos
          </TableCell>
        </TableRow>
      </>
    );
  }

  return (
    <>
      <TableRow>
        <TableCell colSpan={6} align="right">
          <Button variant="contained" color="primary" onClick={handleExportExcel} sx={{ mt: 1, mb: 1 }}>
            Exportar a Excel
          </Button>
        </TableCell>
      </TableRow>

      {rows.map(([eventId, vals]) => {
        let display = eventNames[eventId] || eventosExtra[eventId]?.name || eventId;

        let fechaStr = '';
        const d = parseMaybeTimestamp(eventosExtra[eventId]?.date);
        if (d) {
          fechaStr = d.toLocaleDateString('es-MX');
        } else if (eventNames[eventId] && /\d{4}-\d{2}-\d{2}/.test(eventNames[eventId])) {
          const m = eventNames[eventId].match(/\d{4}-\d{2}-\d{2}/)?.[0];
          if (m) fechaStr = m;
        }

        return (
          <TableRow key={eventId}>
            <TableCell>{display}</TableCell>
            <TableCell>{fechaStr}</TableCell>
            <TableCell>{fmtMXN(vals.total)}</TableCell>
            <TableCell>{fmtMXN(vals.comision)}</TableCell>
            <TableCell>{vals.count}</TableCell>
          </TableRow>
        );
      })}
    </>
  );
}

/* =========================================
 * Pestañas de reportes y página principal
 * ========================================= */
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

  // Totales de comisiones para el <TableFooter> del Tab 2
  const [comisionesTotals, setComisionesTotals] = useState<Totales>({
    total: 0,
    comision: 0,
    count: 0,
  });

  /* ===========================
   * Query: Apuestas (para Comisiones)
   * =========================== */
  const { data: bets = [] } = useQuery({
    queryKey: ['allBets'],
    queryFn: async () => {
      const betsSnap = await getDocs(collection(db, 'bets'));
      return betsSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    },
  });

  /* ===========================
   * Query: Transacciones
   * =========================== */
  const { data: transactions = [] } = useQuery({
    queryKey: ['allTransactions'],
    queryFn: async () => {
      const [depositsSnap, withdrawalsSnap] = await Promise.all([
        getDocs(collection(db, 'deposits')),
        getDocs(collection(db, 'withdrawals')),
      ]);
      const deposits = depositsSnap.docs.map((doc: any) => {
        const data = doc.data();
        return { id: doc.id, ...data, type: 'deposit', createdAt: data.createdAt };
      });
      const withdrawals = withdrawalsSnap.docs.map((doc: any) => {
        const data = doc.data();
        return { id: doc.id, ...data, type: 'withdrawal', createdAt: data.createdAt };
      });
      return [...deposits, ...withdrawals].sort((a: any, b: any) => (b?.createdAt || 0) - (a?.createdAt || 0));
    },
  });

  // IDs de aprobadores y usuarios
  const approverIds = useMemo(() => {
    const ids = new Set<string>();
    (transactions || []).forEach((t: any) => {
      if (t?.approvedBy) ids.add(String(t.approvedBy));
      if (t?.processedBy) ids.add(String(t.processedBy));
    });
    return Array.from(ids).filter(Boolean);
  }, [transactions]);

  const { data: approvers = [] } = useQuery({
    queryKey: ['approvers', approverIds],
    enabled: approverIds.length > 0,
    queryFn: async () => {
      if (approverIds.length === 0) return [];
      const batches: Promise<any>[] = [];
      for (let i = 0; i < approverIds.length; i += 10) {
        const batchIds = approverIds.slice(i, i + 10);
        batches.push(getDocs(query(collection(db, 'users'), where('__name__', 'in', batchIds))));
      }
      const results = await Promise.all(batches);
      return results.flatMap((snap: any) =>
        snap.docs.map((doc: any) => ({ ...doc.data(), id: doc.id }))
      );
    },
  });

  const approverMap = useMemo(() => {
    const map: Record<string, { name?: string; email?: string }> = {};
    (approvers || []).forEach((u: any) => {
      if (u?.id !== undefined && u?.id !== null) map[String(u.id)] = { name: u?.name, email: u?.email };
    });
    return map;
  }, [approvers]);

  const userIds = useMemo(() => {
    const ids = new Set<string>();
    (transactions || []).forEach((t: any) => {
      if (t?.userId) ids.add(String(t.userId));
    });
    return Array.from(ids).filter(Boolean);
  }, [transactions]);

  const { data: usersForTx = [] } = useQuery({
    queryKey: ['usersForTx', userIds],
    enabled: userIds.length > 0,
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const batches: Promise<any>[] = [];
      for (let i = 0; i < userIds.length; i += 10) {
        const batchIds = userIds.slice(i, i + 10);
        batches.push(getDocs(query(collection(db, 'users'), where('__name__', 'in', batchIds))));
      }
      const results = await Promise.all(batches);
      return results.flatMap((snap: any) =>
        snap.docs.map((doc: any) => ({ ...doc.data(), id: doc.id }))
      );
    },
  });

  const userMap = useMemo(() => {
    const map: Record<string, { name?: string; email?: string }> = {};
    (usersForTx || []).forEach((u: any) => {
      if (u?.id !== undefined && u?.id !== null) map[String(u.id)] = { name: u?.name, email: u?.email };
    });
    return map;
  }, [usersForTx]);

  // Seguridad (reforzar con reglas del lado servidor)
  if (!currentUser || (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.FINANCE)) {
    return (
      <Container maxWidth="md" sx={{ mt: 6 }}>
        <Alert severity="error">No tienes permisos para ver los reportes.</Alert>
      </Container>
    );
  }

  // Memoizar el callback para que NO cambie identidad en cada render
  const handleTotalsChange = useCallback((t: Totales) => {
    setComisionesTotals(t);
  }, []);

  /* ===========================
   * Export de Transacciones (xlsx)
   * =========================== */
  function exportTransaccionesXLSX() {
    const rows = (transactions || []).map((t: any) => {
      let aprobadorStr = '-';
      if (t?.processedBy) {
        const user = approverMap[String(t.processedBy)];
        aprobadorStr = user ? (user.name ? `${user.name} (${user.email || t.processedBy})` : user.email || String(t.processedBy)) : String(t.processedBy);
      } else if (t?.approvedBy) {
        if (t?.method && String(t.method).startsWith('Manual')) {
          aprobadorStr = String(t.approvedBy);
        } else {
          const user = approverMap[String(t.approvedBy)];
          aprobadorStr = user ? (user.name ? `${user.name} (${user.email || t.approvedBy})` : user.email || String(t.approvedBy)) : String(t.approvedBy);
        }
      }
      const d = parseMaybeTimestamp(t?.createdAt);
      const fecha = d ? d.toLocaleString('es-MX') : '';
      const user = t?.userId ? userMap[String(t.userId)] : null;
      const usuario = user ? user.name || user.email || String(t.userId) : t?.userName || t?.userEmail || t?.userId || '-';

      return {
        Tipo: t?.type === 'deposit' ? 'Depósito' : 'Retiro',
        Monto: toNum(t?.amount),
        Usuario: usuario,
        Fecha: fecha,
        Aprobador: aprobadorStr || '-',
        Estado: t?.status || '-',
        __id__: String(t?.id || ''),
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transacciones');
    XLSX.writeFile(wb, 'reporte_transacciones.xlsx');
  }

  return (
    <Container maxWidth={false} sx={{ py: { xs: 2, md: 4 } }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Reportes
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          {REPORTS.map((label) => (
            <Tab key={label} label={label} />
          ))}
        </Tabs>
      </Paper>
      <Divider sx={{ mb: 3 }} />

      {/* Tab 0: Transacciones */}
      {tab === 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Reporte de Transacciones
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
            <Button variant="contained" color="primary" onClick={exportTransaccionesXLSX}>
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
                {(transactions || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      Sin transacciones
                    </TableCell>
                  </TableRow>
                ) : (
                  (transactions || []).map((t: any) => {
                    let aprobadorStr = '-';
                    if (t?.processedBy) {
                      const user = approverMap[String(t.processedBy)];
                      aprobadorStr = user
                        ? user.name
                          ? `${user.name} (${user.email || t.processedBy})`
                          : user.email || String(t.processedBy)
                        : String(t.processedBy);
                    } else if (t?.approvedBy) {
                      if (t?.method && String(t.method).startsWith('Manual')) {
                        aprobadorStr = String(t.approvedBy);
                      } else {
                        const user = approverMap[String(t.approvedBy)];
                        aprobadorStr = user
                          ? user.name
                            ? `${user.name} (${user.email || t.approvedBy})`
                            : user.email || String(t.approvedBy)
                          : String(t.approvedBy);
                      }
                    }
                    const d = parseMaybeTimestamp(t?.createdAt);
                    const fecha = d ? d.toLocaleString('es-MX') : '';
                    const usuario = (() => {
                      const user = t?.userId ? userMap[String(t.userId)] : null;
                      return user ? user.name || user.email || String(t.userId) : t?.userName || t?.userEmail || t?.userId || '-';
                    })();

                    return (
                      <TableRow key={String(t?.id || Math.random())}>
                        <TableCell>{t?.type === 'deposit' ? 'Depósito' : 'Retiro'}</TableCell>
                        <TableCell>{fmtMXN(toNum(t?.amount))}</TableCell>
                        <TableCell>{usuario}</TableCell>
                        <TableCell>{fecha}</TableCell>
                        <TableCell>{aprobadorStr || '-'}</TableCell>
                        <TableCell>{t?.status || '-'}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Tab 1: Apuestas (placeholder) */}
      {tab === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Reporte de Apuestas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            (Próximamente: aquí irá el reporte de apuestas)
          </Typography>
        </Box>
      )}

      {/* Tab 2: Comisiones por evento */}
      {tab === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Comisiones por Evento
          </Typography>
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

              {/* TableBody y TableFooter como hermanos (sin hidratación rota) */}
              <TableBody>
                <ComisionesPorEvento bets={bets} onTotalsChange={handleTotalsChange} />
              </TableBody>

              <TableFooter>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Totales</TableCell>
                  <TableCell />
                  <TableCell sx={{ fontWeight: 'bold' }}>{fmtMXN(comisionesTotals.total)}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{fmtMXN(comisionesTotals.comision)}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{comisionesTotals.count}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Container>
  );
};

export default ReportsPage;
