import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Typography,
  Collapse,
  IconButton,
  Badge,
  List,
  ListItem,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  TrendingUp,
  History,
  Casino,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useBetsByUser, useFights } from '../hooks/useFirestore';
import type { Bet, Fight } from '../types';

interface UserBetsPanelProps {
  selectedEventId: string | null;
}

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
      id={`bets-tabpanel-${index}`}
      aria-labelledby={`bets-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 1 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const BetItem: React.FC<{ bet: Bet; fight: Fight | undefined }> = ({ bet, fight }) => {
  const theme = useTheme();
  
  const getStatusColor = (status: string, bet?: Bet) => {
    // Detectar apuestas parcialmente emparejadas
    const isPartiallyMatched = bet && status === 'pending' && bet.matchedAmount && bet.matchedAmount < bet.amount;
    
    if (isPartiallyMatched) return theme.palette.info.main;
    
    switch (status) {
      case 'pending': return theme.palette.warning.main;
      case 'matched': return theme.palette.info.main;
      case 'won': return theme.palette.success.main;
      case 'lost': return theme.palette.error.main;
      case 'rejected': return theme.palette.grey[500];
      default: return theme.palette.grey[400];
    }
  };

  const getStatusText = (status: string, bet?: Bet) => {
    // Detectar apuestas parcialmente emparejadas
    const isPartiallyMatched = bet && status === 'pending' && bet.matchedAmount && bet.matchedAmount < bet.amount;
    
    if (isPartiallyMatched) return 'Aceptada - Ajustada';
    
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'matched': return 'Emparejada';
      case 'won': return 'Ganada';
      case 'lost': return 'Perdida';
      case 'rejected': return 'Reembolsada';
      default: return status;
    }
  };

  const colorText = bet.color === 'red' ? 'Rojo' : 'Verde';
  const fightNumber = fight?.fightNumber || 'N/A';
  
  // Determinar si es parcialmente emparejada para mostrar información adicional
  const isPartiallyMatched = bet.status === 'pending' && bet.matchedAmount && bet.matchedAmount < bet.amount;

  return (
    <ListItem
      sx={{
        flexDirection: 'column',
        alignItems: 'stretch',
        border: 1,
        borderColor: alpha(getStatusColor(bet.status, bet), 0.3),
        borderRadius: 1,
        mb: 1,
        backgroundColor: alpha(getStatusColor(bet.status, bet), 0.05),
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Casino sx={{ color: bet.color === 'red' ? theme.palette.error.main : theme.palette.success.main }} />
          <Typography variant="body2" fontWeight="bold">
            Pelea {fightNumber}
          </Typography>
          <Chip
            label={colorText}
            size="small"
            sx={{
              backgroundColor: bet.color === 'red' ? theme.palette.error.main : theme.palette.success.main,
              color: 'white',
              fontWeight: 'bold',
            }}
          />
        </Box>
        <Chip
          label={getStatusText(bet.status, bet)}
          size="small"
          sx={{
            backgroundColor: getStatusColor(bet.status, bet),
            color: 'white',
            fontWeight: 'bold',
          }}
        />
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, width: '100%' }}>
        <Typography variant="body2" color="text.secondary">
          Apuesta inicial: ${bet.amount?.toLocaleString()} 
          {isPartiallyMatched && (
            <Typography component="span" variant="caption" sx={{ ml: 1, color: 'info.main', display: 'block' }}>
              Emparejada: ${bet.matchedAmount?.toLocaleString()} MXN
            </Typography>
          )}
        </Typography>
        
        {bet.status === 'won' && bet.profit && (
          <Typography variant="body2" color="success.main" fontWeight="bold">
            +${bet.profit.toLocaleString()} MXN
          </Typography>
        )}
        
        {bet.status === 'matched' && (
          <Typography variant="body2" color="info.main">
            Emparejada: ${(bet.matchedAmount || bet.amount).toLocaleString()} MXN
          </Typography>
        )}
      </Box>
    </ListItem>
  );
};

export const UserBetsPanel: React.FC<UserBetsPanelProps> = ({ selectedEventId }) => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  
  const { data: userBets = [] } = useBetsByUser(currentUser?.id || '');
  const { data: allFights = [] } = useFights();

  // Finanzas: depósitos, retiros y balance
  // useUserDeposits y useUserWithdrawals de useUserFinances.ts
  // useUserBalance de useFirestore.ts
  // Los hooks devuelven { data } con arrays o valores
  // Si no existen, mostrar 0
  // Importar los hooks si no están
  // @ts-ignore
  const { data: userDeposits = [] } = (window.useUserDeposits ? window.useUserDeposits() : { data: [] });
  // @ts-ignore
  const { data: userWithdrawals = [] } = (window.useUserWithdrawals ? window.useUserWithdrawals() : { data: [] });
  // @ts-ignore
  const { data: userBalance = 0 } = (window.useUserBalance ? window.useUserBalance(currentUser?.id || '') : { data: 0 });

  // Filtrar apuestas por evento seleccionado
  const eventBets = useMemo(() => {
    if (!selectedEventId) return [];
    const eventFights = allFights.filter(fight => fight.eventId === selectedEventId);
    const eventFightIds = eventFights.map(fight => fight.id);
    return userBets.filter(bet => eventFightIds.includes(bet.fightId));
  }, [userBets, allFights, selectedEventId]);

  // Separar apuestas activas y historial
  const activeBets = eventBets.filter(bet => ['pending', 'matched'].includes(bet.status));
  const historicalBets = eventBets.filter(bet => ['won', 'lost', 'rejected'].includes(bet.status));

  const totalActiveBets = activeBets.length;
  const totalHistoricalBets = historicalBets.length;


  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (!currentUser || currentUser.role !== 'viewer') {
    return null;
  }

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        maxHeight: expanded ? '70vh' : 'auto',
        overflow: 'hidden',
      }}
    >
      {/* Header del panel */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          backgroundColor: theme.palette.primary.main,
          color: 'white',
          cursor: 'pointer',
        }}
        onClick={handleExpandClick}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUp />
          <Typography variant="h6" fontWeight="bold">
            Mis Apuestas del evento
          </Typography>
          {(totalActiveBets > 0 || totalHistoricalBets > 0) && (
            <Badge
              badgeContent={totalActiveBets + totalHistoricalBets}
              color="secondary"
              sx={{
                '& .MuiBadge-badge': {
                  backgroundColor: theme.palette.secondary.main,
                  color: 'white',
                  fontWeight: 'bold',
                }
              }}
            />
          )}
        </Box>
        <IconButton
          sx={{ color: 'white' }}
          aria-label={expanded ? 'contraer' : 'expandir'}
        >
          {expanded ? <ExpandMore /> : <ExpandLess />}
        </IconButton>
      </Box>

      {/* RESUMEN FINANCIERO DETALLADO */}
      <Collapse in={expanded}>
        <Box sx={{ maxHeight: '60vh', overflow: 'auto' }}>
          {/* Tabs */}
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': {
                minHeight: 48,
              }
            }}
          >
            <Tab
              icon={
                <Badge badgeContent={totalActiveBets} color="primary">
                  <TrendingUp />
                </Badge>
              }
              label="Activas"
              id="bets-tab-0"
              aria-controls="bets-tabpanel-0"
            />
            <Tab
              icon={
                <Badge badgeContent={totalHistoricalBets} color="secondary">
                  <History />
                </Badge>
              }
              label="Historial"
              id="bets-tab-1"
              aria-controls="bets-tabpanel-1"
            />
          </Tabs>
          {/* Tab Panels */}
          <TabPanel value={tabValue} index={0}>
            {activeBets.length > 0 ? (
              <List dense>
                {activeBets.map((bet) => {
                  const fight = allFights.find(f => f.id === bet.fightId);
                  return (
                    <BetItem key={bet.id} bet={bet} fight={fight} />
                  );
                })}
              </List>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Casino sx={{ fontSize: 48, color: theme.palette.grey[400], mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  No tienes apuestas activas en este evento
                </Typography>
              </Box>
            )}
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            {historicalBets.length > 0 ? (
              <List dense>
                {historicalBets.map((bet) => {
                  const fight = allFights.find(f => f.id === bet.fightId);
                  return (
                    <BetItem key={bet.id} bet={bet} fight={fight} />
                  );
                })}
              </List>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <History sx={{ fontSize: 48, color: theme.palette.grey[400], mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  No hay historial de apuestas en este evento
                </Typography>
              </Box>
            )}
          </TabPanel>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default UserBetsPanel;
