import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  Paper,
  Container,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  Collapse,
  Tabs,
  Tab,
  Badge,
} from '@mui/material';
import {
  EmojiEvents,
  Casino as BetIcon,
  CheckCircle,
  Pending,
  Warning,
  ExpandMore,
  ExpandLess,
  PauseCircle,
  PlayCircle,
  Person,
  AttachMoney,
  Stop,
  Schedule,
  PlayArrow,
  Flag,
} from '@mui/icons-material';
import { useFights, useResolveBets, useBets, useUpdateFightStatus, useSetFightWinner } from '../hooks/useFirestore';
import BetMatchingNotifications from '../components/BetMatchingNotifications';
import dayjs from 'dayjs';
import type { Fight } from '../types';

const BettingAdminPage: React.FC = () => {
  const { data: fights = [], isLoading, error } = useFights();
  const { data: allBets = [], isLoading: betsLoading } = useBets();
  const resolveBetsMutation = useResolveBets();
  const updateFightStatusMutation = useUpdateFightStatus();
  const setFightWinnerMutation = useSetFightWinner();
  
  const [selectedFight, setSelectedFight] = useState<Fight | null>(null);
  const [winner, setWinner] = useState<'red' | 'green' | 'draw'>('red');
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [finishDialogOpen, setFinishDialogOpen] = useState(false);
  const [selectedFinishFight, setSelectedFinishFight] = useState<Fight | null>(null);
  const [expandedFights, setExpandedFights] = useState<Set<string>>(new Set());
  const [currentTab, setCurrentTab] = useState(0);

  // Filtrar peleas por tabs y ordenar por número de pelea
  const scheduledFights = fights
    .filter(fight => fight.status === 'scheduled')
    .sort((a, b) => a.fightNumber - b.fightNumber);
  const activeFights = fights
    .filter(fight => 
      fight.status === 'betting_open' || 
      fight.status === 'betting_closed' || 
      fight.status === 'in_progress'
    )
    .sort((a, b) => a.fightNumber - b.fightNumber);
  const finishedFights = fights
    .filter(fight => fight.status === 'finished')
    .sort((a, b) => a.fightNumber - b.fightNumber);

  // Optimizar cálculo de apuestas por pelea
  const betsByFight = useMemo(() => {
    const groupedBets: Record<string, typeof allBets> = {};
    allBets.forEach(bet => {
      if (!groupedBets[bet.fightId]) {
        groupedBets[bet.fightId] = [];
      }
      groupedBets[bet.fightId].push(bet);
    });
    return groupedBets;
  }, [allBets]);

  const handleOpenResolveDialog = (fight: Fight) => {
    setSelectedFight(fight);
    setWinner('red');
    setResolveDialogOpen(true);
  };

  const handleCloseResolveDialog = () => {
    setResolveDialogOpen(false);
    setSelectedFight(null);
  };

  const handleToggleBetting = async (fight: Fight) => {
    try {
      const newStatus = fight.status === 'betting_open' ? 'betting_closed' : 'betting_open';
      await updateFightStatusMutation.mutateAsync({
        id: fight.id,
        status: newStatus
      });
    } catch (error) {
      console.error('Error updating fight status:', error);
    }
  };

  const handleToggleExpand = (fightId: string) => {
    const newExpanded = new Set(expandedFights);
    if (newExpanded.has(fightId)) {
      newExpanded.delete(fightId);
    } else {
      newExpanded.add(fightId);
    }
    setExpandedFights(newExpanded);
  };

  const handleResolveFight = async () => {
    if (!selectedFight) return;

    try {
      const resolvedWinner = winner === 'draw' ? null : winner;
      
      // Primero, guardar el resultado en la colección de peleas (ganador o empate)
      await setFightWinnerMutation.mutateAsync({
        id: selectedFight.id,
        winner: resolvedWinner
      });
      console.log(`✅ Resultado guardado: ${resolvedWinner ? (resolvedWinner === 'red' ? 'Rojo' : 'Verde') : 'Empate'}`);
      
      // Luego, resolver las apuestas
      await resolveBetsMutation.mutateAsync({
        fightId: selectedFight.id,
        winner: resolvedWinner
      });
      
      handleCloseResolveDialog();
    } catch (error) {
      console.error('Error resolving fight:', error);
    }
  };

  const handleOpenFinishDialog = (fight: Fight) => {
    setSelectedFinishFight(fight);
    setFinishDialogOpen(true);
  };

  const handleCloseFinishDialog = () => {
    setFinishDialogOpen(false);
    setSelectedFinishFight(null);
  };

  const handleFinishFight = async () => {
    if (!selectedFinishFight) return;

    try {
      await updateFightStatusMutation.mutateAsync({
        id: selectedFinishFight.id,
        status: 'finished'
      });
      
      handleCloseFinishDialog();
    } catch (error) {
      console.error('Error finishing fight:', error);
    }
  };

  const handleActivateFight = async (fight: Fight) => {
    try {
      await updateFightStatusMutation.mutateAsync({
        id: fight.id,
        status: 'in_progress'
      });
    } catch (error) {
      console.error('Error activating fight:', error);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const getCurrentTabFights = () => {
    switch (currentTab) {
      case 0: return scheduledFights;
      case 1: return activeFights;
      case 2: return finishedFights;
      default: return [];
    }
  };

  const getCurrentTabStats = () => {
    const currentFights = getCurrentTabFights();
    const totalBets = currentFights.reduce((sum, fight) => sum + getTotalBetAmount(fight.id), 0);
    return {
      count: currentFights.length,
      totalBets
    };
  };

  const renderActionColumns = (fight: Fight) => {
    switch (currentTab) {
      case 0: // Programadas
        return (
          <TableCell align="center">
            <Button
              variant="contained"
              color="success"
              size="small"
              onClick={() => handleActivateFight(fight)}
              startIcon={<PlayArrow />}
              disabled={updateFightStatusMutation.isPending}
            >
              Activar
            </Button>
          </TableCell>
        );
      
      case 1: // Activas
        return (
          <>
            <TableCell align="center">
              <Tooltip title={fight.status === 'betting_open' ? 'Cerrar Apuestas' : 'Abrir Apuestas'}>
                <IconButton
                  onClick={() => handleToggleBetting(fight)}
                  color={fight.status === 'betting_open' ? 'warning' : 'success'}
                  disabled={updateFightStatusMutation.isPending}
                >
                  {fight.status === 'betting_open' ? <PauseCircle /> : <PlayCircle />}
                </IconButton>
              </Tooltip>
            </TableCell>
            <TableCell align="center">
              <Button
                variant="contained"
                color="primary"
                size="small"
                onClick={() => handleOpenResolveDialog(fight)}
                startIcon={<CheckCircle />}
                disabled={fight.status !== 'betting_closed' && fight.status !== 'in_progress'}
              >
                Resolver
              </Button>
            </TableCell>
            <TableCell align="center">
              <Button
                variant="contained"
                color="error"
                size="small"
                onClick={() => handleOpenFinishDialog(fight)}
                startIcon={<Stop />}
                disabled={!fight.resolved}
              >
                Terminar
              </Button>
            </TableCell>
          </>
        );
      
      case 2: // Terminadas
        return (
          <>
            <TableCell align="center">
              <Chip
                label="Completada"
                color="success"
                size="small"
                icon={<Flag />}
              />
            </TableCell>
            <TableCell align="center">
              {fight.winner ? (
                <Chip
                  label={fight.winner === 'red' ? 'Rojo' : 'Verde'}
                  size="small"
                  sx={{
                    backgroundColor: fight.winner === 'red' ? '#f44336' : '#4caf50',
                    color: 'white',
                    fontWeight: 'bold',
                  }}
                />
              ) : (
                <Chip
                  label="Empate"
                  size="small"
                  color="default"
                />
              )}
            </TableCell>
          </>
        );
      
      default:
        return null;
    }
  };

  const getTableHeaders = () => {
    const baseHeaders = ['#', 'Pelea', 'Fecha/Hora', 'Estado', 'Palenque', 'Apuestas'];
    
    switch (currentTab) {
      case 0: // Programadas
        return [...baseHeaders, 'Activar Pelea', 'Detalles'];
      case 1: // Activas
        return [...baseHeaders, 'Control Apuestas', 'Resolver', 'Terminar Pelea', 'Detalles'];
      case 2: // Terminadas
        return [...baseHeaders, 'Resultado', 'Ganador', 'Detalles'];
      default:
        return baseHeaders;
    }
  };

  const getTotalBetAmount = (fightId: string) => {
    const fightBets = allBets.filter(bet => bet.fightId === fightId);
    return fightBets.reduce((sum: number, bet: any) => sum + bet.amount, 0);
  };

  const getBetsByColor = (fightId: string, color: 'red' | 'green') => {
    return allBets.filter(bet => bet.fightId === fightId && bet.color === color);
  };

  const getColorStats = (fightId: string, color: 'red' | 'green') => {
    const colorBets = getBetsByColor(fightId, color);
    const totalAmount = colorBets.reduce((sum: number, bet: any) => sum + bet.amount, 0);
    const betCount = colorBets.length;
    return { totalAmount, betCount };
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Administración de Apuestas
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
            Administración de Apuestas
          </Typography>
          <Alert severity="error">
            Error al cargar las peleas: {error.message}
          </Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        {/* Header */}
        <Typography variant="h4" component="h1" gutterBottom>
          🎯 Administración de Apuestas
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Gestiona y resuelve las apuestas de las peleas activas
        </Typography>

        {/* Stats Overview */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
          <Card sx={{ minWidth: 250, flex: 1 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                  {currentTab === 0 ? <Schedule /> : currentTab === 1 ? <Pending /> : <Flag />}
                </Avatar>
                <Box>
                  <Typography variant="h5">{getCurrentTabStats().count}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {currentTab === 0 ? 'Peleas Programadas' : currentTab === 1 ? 'Peleas Activas' : 'Peleas Terminadas'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ minWidth: 250, flex: 1 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <BetIcon />
                </Avatar>
                <Box>
                  <Typography variant="h5">
                    {getCurrentTabStats().totalBets.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total en Apuestas (MXN)
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Tabs Navigation */}
        <Paper sx={{ mb: 3 }}>
          <Tabs 
            value={currentTab} 
            onChange={handleTabChange}
            centered
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab 
              label={
                <Badge badgeContent={scheduledFights.length} color="warning" max={999}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Schedule />
                    Programadas
                  </Box>
                </Badge>
              }
            />
            <Tab 
              label={
                <Badge badgeContent={activeFights.length} color="error" max={999}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Pending />
                    Activas
                  </Box>
                </Badge>
              }
            />
            <Tab 
              label={
                <Badge badgeContent={finishedFights.length} color="success" max={999}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Flag />
                    Terminadas
                  </Box>
                </Badge>
              }
            />
          </Tabs>
        </Paper>

        {/* Tab Content */}
        {getCurrentTabFights().length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <EmojiEvents sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {currentTab === 0 ? 'No hay peleas programadas' : 
               currentTab === 1 ? 'No hay peleas activas' : 
               'No hay peleas terminadas'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {currentTab === 0 ? 'Las peleas programadas aparecerán aquí.' :
               currentTab === 1 ? 'Todas las peleas han sido resueltas o no hay peleas en progreso.' :
               'Las peleas completadas aparecerán aquí.'}
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  {getTableHeaders().map((header, index) => (
                    <TableCell key={index} align={index === 0 || index >= 6 ? "center" : "left"}>
                      {header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {getCurrentTabFights().map((fight) => {
                  // Obtener apuestas desde el memoized object
                  const fightSpecificBets = betsByFight[fight.id] || [];
                  
                  return (
                    <React.Fragment key={fight.id}>
                      <TableRow>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Chip 
                              label={`#${fight.fightNumber}`} 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="medium">
                              {fight.cock1.name} vs {fight.cock2.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ID: {fight.id.slice(-8)}
                            </Typography>
                          </Box>
                        </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {fight.scheduledTime ? dayjs(fight.scheduledTime.toDate()).format('DD/MM/YYYY') : 'Sin fecha'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {fight.scheduledTime ? dayjs(fight.scheduledTime.toDate()).format('HH:mm') : ''}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          fight.status === 'scheduled' ? 'Programada' :
                          fight.status === 'in_progress' ? 'En Vivo' : 
                          fight.status === 'betting_open' ? 'Apuestas Abiertas' : 
                          fight.status === 'betting_closed' ? 'Apuestas Cerradas' :
                          fight.status === 'finished' ? 'Terminada' : fight.status
                        }
                        color={
                          fight.status === 'scheduled' ? 'default' :
                          fight.status === 'in_progress' ? 'error' : 
                          fight.status === 'betting_open' ? 'warning' : 
                          fight.status === 'betting_closed' ? 'info' :
                          fight.status === 'finished' ? 'success' : 'default'
                        }
                        size="small"
                        icon={
                          fight.status === 'scheduled' ? <Schedule /> :
                          fight.status === 'in_progress' ? <EmojiEvents /> : 
                          fight.status === 'finished' ? <Flag /> : <Pending />
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {fight.eventId?.slice(-8) || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        ${getTotalBetAmount(fight.id).toLocaleString()} MXN
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Rojas: ${getColorStats(fight.id, 'red').totalAmount.toLocaleString()} | Verdes: ${getColorStats(fight.id, 'green').totalAmount.toLocaleString()}
                      </Typography>
                    </TableCell>
                    {renderActionColumns(fight)}
                    <TableCell align="center">
                      <Tooltip title="Ver detalles de apuestas">
                        <IconButton
                          onClick={() => handleToggleExpand(fight.id)}
                          color="primary"
                        >
                          {expandedFights.has(fight.id) ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                  
                  {/* Fila expandible con detalles de apuestas */}
                  <TableRow>
                    <TableCell colSpan={getTableHeaders().length} sx={{ py: 0 }}>
                      <Collapse in={expandedFights.has(fight.id)} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 2 }}>
                          <Typography variant="h6" gutterBottom component="div">
                            Apuestas Detalladas - {fight.cock1.name} vs {fight.cock2.name}
                          </Typography>
                          
                          {/* Componente de notificaciones de emparejamiento */}
                          <BetMatchingNotifications fightId={fight.id} />
                          
                          {fightSpecificBets.length === 0 ? (
                            betsLoading ? (
                              <Alert severity="info">
                                Cargando apuestas...
                              </Alert>
                            ) : (
                              <Alert severity="info">
                                No hay apuestas registradas para esta pelea
                              </Alert>
                            )
                          ) : (
                            <Box sx={{ display: 'flex', gap: 2 }}>
                              {/* Apuestas Rojas */}
                              <Box sx={{ flex: 1 }}>
                                <Card>
                                  <CardContent>
                                    <Typography variant="h6" color="error.main" gutterBottom>
                                      🔴 Apuestas Rojas ({fight.cock1.name})
                                    </Typography>
                                    <Table size="small">
                                      <TableHead>
                                        <TableRow>
                                          <TableCell>Usuario</TableCell>
                                          <TableCell align="right">Monto</TableCell>
                                          <TableCell>Estado</TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {fightSpecificBets.filter(bet => bet.color === 'red').map((bet) => (
                                          <TableRow key={`red-${bet.id}`}>
                                            <TableCell>
                                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Person fontSize="small" />
                                                <Typography variant="body2">
                                                  {bet.userId.slice(-8)}
                                                </Typography>
                                              </Box>
                                            </TableCell>
                                            <TableCell align="right">
                                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                                                <AttachMoney fontSize="small" />
                                                <Typography variant="body2" fontWeight="medium">
                                                  {bet.amount.toLocaleString()}
                                                </Typography>
                                              </Box>
                                            </TableCell>
                                            <TableCell>
                                              <Chip
                                                label={bet.status === 'pending' ? 'Pendiente' : bet.status === 'matched' ? 'Emparejada' : 'Resuelta'}
                                                size="small"
                                                color={bet.status === 'pending' ? 'warning' : bet.status === 'matched' ? 'info' : 'success'}
                                              />
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </CardContent>
                                </Card>
                              </Box>
                              
                              {/* Apuestas Verdes */}
                              <Box sx={{ flex: 1 }}>
                                <Card>
                                  <CardContent>
                                    <Typography variant="h6" color="success.main" gutterBottom>
                                      🟢 Apuestas Verdes ({fight.cock2.name})
                                    </Typography>
                                    <Table size="small">
                                      <TableHead>
                                        <TableRow>
                                          <TableCell>Usuario</TableCell>
                                          <TableCell align="right">Monto</TableCell>
                                          <TableCell>Estado</TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {fightSpecificBets.filter(bet => bet.color === 'green').map((bet) => (
                                          <TableRow key={`green-${bet.id}`}>
                                            <TableCell>
                                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Person fontSize="small" />
                                                <Typography variant="body2">
                                                  {bet.userId.slice(-8)}
                                                </Typography>
                                              </Box>
                                            </TableCell>
                                            <TableCell align="right">
                                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                                                <AttachMoney fontSize="small" />
                                                <Typography variant="body2" fontWeight="medium">
                                                  {bet.amount.toLocaleString()}
                                                </Typography>
                                              </Box>
                                            </TableCell>
                                            <TableCell>
                                              <Chip
                                                label={bet.status === 'pending' ? 'Pendiente' : bet.status === 'matched' ? 'Emparejada' : 'Resuelta'}
                                                size="small"
                                                color={bet.status === 'pending' ? 'warning' : bet.status === 'matched' ? 'info' : 'success'}
                                              />
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </CardContent>
                                </Card>
                              </Box>
                            </Box>
                          )}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Resolve Fight Dialog */}
        <Dialog open={resolveDialogOpen} onClose={handleCloseResolveDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EmojiEvents />
              Resolver Pelea
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedFight && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  {selectedFight.cock1.name} vs {selectedFight.cock2.name}
                </Typography>
                

                {/* Betting Summary como botones de selección */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Resumen de Apuestas:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    {/* Gallo Rojo */}
                    <Card
                      sx={{
                        flex: 1,
                        backgroundColor: winner === 'red' ? 'error.main' : 'grey.100',
                        color: winner === 'red' ? 'error.contrastText' : 'grey.500',
                        cursor: 'pointer',
                        border: winner === 'red' ? 3 : 1,
                        borderColor: winner === 'red' ? 'error.dark' : 'transparent',
                        boxShadow: winner === 'red' ? 12 : 1,
                        transform: winner === 'red' ? 'scale(1.04)' : 'scale(1)',
                        zIndex: winner === 'red' ? 2 : 1,
                        transition: 'all 0.18s cubic-bezier(.4,2,.6,1)',
                        outline: winner === 'red' ? '3px solid #d32f2f' : 'none',
                        filter: winner === 'red' ? 'none' : 'grayscale(0.7)',
                        opacity: winner === 'red' ? 1 : 0.7,
                      }}
                      onClick={() => setWinner('red')}
                      tabIndex={0}
                      aria-selected={winner === 'red'}
                    >
                      <CardContent sx={{ py: 2 }}>
                        <Typography variant="h6">Gallo Rojo</Typography>
                        <Typography variant="h4">
                          ${getColorStats(selectedFight.id, 'red').totalAmount.toLocaleString()}
                        </Typography>
                        <Typography variant="body2">
                          {getColorStats(selectedFight.id, 'red').betCount} apuesta{getColorStats(selectedFight.id, 'red').betCount !== 1 ? 's' : ''}
                        </Typography>
                      </CardContent>
                    </Card>
                    {/* Empate */}
                    <Card
                      sx={{
                        flex: 1,
                        backgroundColor: winner === 'draw' ? 'grey.800' : 'grey.100',
                        color: winner === 'draw' ? 'grey.100' : 'grey.500',
                        cursor: 'pointer',
                        border: winner === 'draw' ? 3 : 1,
                        borderColor: winner === 'draw' ? 'grey.900' : 'transparent',
                        boxShadow: winner === 'draw' ? 12 : 1,
                        transform: winner === 'draw' ? 'scale(1.04)' : 'scale(1)',
                        zIndex: winner === 'draw' ? 2 : 1,
                        transition: 'all 0.18s cubic-bezier(.4,2,.6,1)',
                        outline: winner === 'draw' ? '3px solid #333' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        filter: winner === 'draw' ? 'none' : 'grayscale(0.7)',
                        opacity: winner === 'draw' ? 1 : 0.7,
                      }}
                      onClick={() => setWinner('draw')}
                      tabIndex={0}
                      aria-selected={winner === 'draw'}
                    >
                      <CardContent sx={{ py: 2, textAlign: 'center' }}>
                        <Typography variant="h6">Empate</Typography>
                        <Typography variant="h4">-</Typography>
                        <Typography variant="body2">Reembolso a todos</Typography>
                      </CardContent>
                    </Card>
                    {/* Gallo Verde */}
                    <Card
                      sx={{
                        flex: 1,
                        backgroundColor: winner === 'green' ? 'success.main' : 'grey.100',
                        color: winner === 'green' ? 'success.contrastText' : 'grey.500',
                        cursor: 'pointer',
                        border: winner === 'green' ? 3 : 1,
                        borderColor: winner === 'green' ? 'success.dark' : 'transparent',
                        boxShadow: winner === 'green' ? 12 : 1,
                        transform: winner === 'green' ? 'scale(1.04)' : 'scale(1)',
                        zIndex: winner === 'green' ? 2 : 1,
                        transition: 'all 0.18s cubic-bezier(.4,2,.6,1)',
                        outline: winner === 'green' ? '3px solid #388e3c' : 'none',
                        filter: winner === 'green' ? 'none' : 'grayscale(0.7)',
                        opacity: winner === 'green' ? 1 : 0.7,
                      }}
                      onClick={() => setWinner('green')}
                      tabIndex={0}
                      aria-selected={winner === 'green'}
                    >
                      <CardContent sx={{ py: 2 }}>
                        <Typography variant="h6">Gallo Verde</Typography>
                        <Typography variant="h4">
                          ${getColorStats(selectedFight.id, 'green').totalAmount.toLocaleString()}
                        </Typography>
                        <Typography variant="body2">
                          {getColorStats(selectedFight.id, 'green').betCount} apuesta{getColorStats(selectedFight.id, 'green').betCount !== 1 ? 's' : ''}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Box>
                  <Typography variant="body1" fontWeight="medium">
                    Total apostado: ${getTotalBetAmount(selectedFight.id).toLocaleString()} MXN
                  </Typography>
                </Box>


                {/* Eliminado: selección de ganador con RadioGroup, ahora se selecciona con los CardContent de arriba */}

                {winner === 'draw' && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    En caso de empate, todas las apuestas serán reembolsadas a los usuarios.
                  </Alert>
                )}

                {winner !== 'draw' && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      Al resolver esta pelea:
                    </Typography>
                    <Typography component="ul" variant="body2" sx={{ ml: 2, mb: 0 }}>
                      <li>Las apuestas ganadoras recibirán sus ganancias</li>
                      <li>Las apuestas perdedoras perderán su dinero</li>
                      <li>Esta acción NO se puede deshacer</li>
                    </Typography>
                  </Alert>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseResolveDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleResolveFight}
              variant="contained"
              color={winner === 'draw' ? 'info' : 'primary'}
              disabled={resolveBetsMutation.isPending}
              startIcon={winner === 'draw' ? <Warning /> : <CheckCircle />}
            >
              {resolveBetsMutation.isPending
                ? 'Resolviendo...'
                : winner === 'draw'
                ? 'Reembolsar Apuestas'
                : 'Resolver Pelea'
              }
            </Button>
          </DialogActions>
        </Dialog>

        {/* Finish Fight Dialog */}
        <Dialog open={finishDialogOpen} onClose={handleCloseFinishDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Stop />
              Terminar Pelea
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedFinishFight && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  {selectedFinishFight.cock1.name} vs {selectedFinishFight.cock2.name}
                </Typography>
                
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    ¿Estás seguro de terminar la pelea?
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Esta acción cambiará el estado de la pelea a "Terminada" y activará automáticamente la siguiente pelea del evento.
                  </Typography>
                </Alert>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseFinishDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleFinishFight}
              variant="contained"
              color="error"
              disabled={updateFightStatusMutation.isPending}
              startIcon={<Stop />}
            >
              {updateFightStatusMutation.isPending ? 'Terminando...' : 'Terminar Pelea'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default BettingAdminPage;
