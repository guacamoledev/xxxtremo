import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  Avatar,
  Divider,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Casino as BetIcon,
  AttachMoney as MoneyIcon,
  Sports as FightIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { usePlaceBet, useBetsByFight } from '../hooks/useFirestore';
import { useAuth } from '../contexts/AuthContext';
import type { Fight } from '../types';

interface BettingCardProps {
  fight: Fight;
  disabled?: boolean;
  isFinished?: boolean;
}

const BettingCard: React.FC<BettingCardProps> = ({ fight, disabled = false, isFinished = false }) => {
  const [open, setOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState<'red' | 'green' | null>(null);
  const [betAmount, setBetAmount] = useState<number>(100);
  const [error, setError] = useState('');
  
  const { currentUser } = useAuth();
  const placeBetMutation = usePlaceBet();
  const { data: bets = [], isLoading: betsLoading } = useBetsByFight(fight.id);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Función para obtener el estado y color del chip
  const getStatusChip = () => {
    switch (fight.status) {
      case 'betting_open':
        return { label: 'Apuestas Abiertas', color: 'success' as const };
      case 'betting_closed':
        return { label: 'Cerrado', color: 'default' as const };
      case 'in_progress':
        return { label: 'En Progreso', color: 'info' as const };
      case 'finished':
        return { 
          label: fight.winner ? `TERMINADA - Ganó ${fight.winner === 'red' ? 'Rojo' : 'Verde'}` : 'TERMINADA', 
          color: 'error' as const 
        };
      default:
        return { label: 'Cerrado', color: 'default' as const };
    }
  };

  const statusChip = getStatusChip();
  const redBets = bets.filter(bet => bet.color === 'red' && bet.status !== 'refunded');
  const greenBets = bets.filter(bet => bet.color === 'green' && bet.status !== 'refunded');
  
  const totalRedAmount = redBets.reduce((sum, bet) => sum + (bet.matchedAmount || bet.amount), 0);
  const totalGreenAmount = greenBets.reduce((sum, bet) => sum + (bet.matchedAmount || bet.amount), 0);
  const totalBets = totalRedAmount + totalGreenAmount;
  
  // Obtener apuestas del usuario actual para esta pelea
  const userBets = currentUser 
    ? bets.filter(bet => bet.userId === currentUser.id && bet.status !== 'refunded')
    : [];
  
  const userActiveBets = userBets.filter(bet => bet.status === 'pending' || bet.status === 'matched');
  
  const redPercentage = totalBets > 0 ? (totalRedAmount / totalBets) * 100 : 50;
  const greenPercentage = totalBets > 0 ? (totalGreenAmount / totalBets) * 100 : 50;

  const canBet = fight.bettingEnabled && 
                 fight.status === 'betting_open' && 
                 !disabled && 
                 !isFinished &&
                 currentUser && 
                 currentUser.role !== 'admin';

  const handleOpenBet = (color: 'red' | 'green') => {
    if (!canBet) return;
    
    setSelectedColor(color);
    setError('');
    setBetAmount(Math.max(100, fight.minBet));
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedColor(null);
    setError('');
    setBetAmount(100);
  };

  const handlePlaceBet = async () => {
    if (!currentUser || !selectedColor || betAmount < 100) return;

    // Validaciones
    if (betAmount > currentUser.balance) {
      setError('Saldo insuficiente');
      return;
    }

    if (betAmount < fight.minBet) {
      setError(`La apuesta mínima es $${fight.minBet} MXN`);
      return;
    }

    try {
      await placeBetMutation.mutateAsync({
        userId: currentUser.id,
        fightId: fight.id,
        color: selectedColor,
        amount: betAmount,
      });
      
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Error al realizar la apuesta');
    }
  };

  const getBetButtonColor = (color: 'red' | 'green') => {
    return color === 'red' ? 'error' : 'success';
  };

  const getColorName = (color: 'red' | 'green') => {
    return color === 'red' ? 'Rojo' : 'Verde';
  };

  if (betsLoading) {
    return (
      <Card>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card sx={{ 
        mb: 2, 
        borderRadius: { xs: 1, sm: 2 },
        // Estilos para peleas terminadas
        ...(isFinished && {
          bgcolor: 'grey.100',
          opacity: 0.8,
          '& .MuiCardContent-root': {
            color: 'text.secondary'
          }
        })
      }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          {/* Header de la pelea */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            mb: 2,
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1, sm: 0 }
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <FightIcon sx={{ mr: 1, color: 'text.secondary', fontSize: { xs: 20, sm: 24 } }} />
              <Typography variant={isMobile ? "subtitle1" : "h6"}>
                Pelea #{fight.fightNumber}
              </Typography>
              {/* Icono de candado para peleas terminadas */}
              {isFinished && (
                <LockIcon sx={{ ml: 1, color: 'text.disabled', fontSize: { xs: 16, sm: 18 } }} />
              )}
            </Box>
            <Chip 
              label={statusChip.label}
              color={statusChip.color}
              size={isMobile ? "small" : "medium"}
              sx={{ ml: { xs: 0, sm: 2 } }}
            />
          </Box>

          <Typography 
            variant={isMobile ? "body1" : "subtitle1"} 
            gutterBottom
            sx={{ 
              fontWeight: 'bold',
              textAlign: { xs: 'center', sm: 'left' },
              fontSize: { xs: '1rem', sm: '1.125rem' }
            }}
          >
            {fight.cock1.name} vs {fight.cock2.name}
          </Typography>

          {/* Estadísticas de apuestas */}
          {totalBets > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total apostado: ${totalBets.toLocaleString()} MXN
              </Typography>
              
              <Box sx={{ 
                display: 'flex', 
                gap: { xs: 1.5, sm: 2 }, 
                mb: 2,
                flexDirection: { xs: 'column', sm: 'row' }
              }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="error" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      {fight.cock1.name} (Rojo)
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, fontWeight: 'bold' }}>
                      {redPercentage.toFixed(1)}%
                    </Typography>
                  </Box>
                  <Box 
                    sx={{ 
                      height: { xs: 6, sm: 8 }, 
                      bgcolor: 'grey.200', 
                      borderRadius: 1,
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <Box 
                      sx={{ 
                        height: '100%', 
                        bgcolor: 'error.main',
                        width: `${redPercentage}%`,
                        transition: 'width 0.3s ease'
                      }} 
                    />
                  </Box>
                </Box>

                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="success.main" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      {fight.cock2.name} (Verde)
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, fontWeight: 'bold' }}>
                      {greenPercentage.toFixed(1)}%
                    </Typography>
                  </Box>
                  <Box 
                    sx={{ 
                      height: { xs: 6, sm: 8 }, 
                      bgcolor: 'grey.200', 
                      borderRadius: 1,
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <Box 
                      sx={{ 
                        height: '100%', 
                        bgcolor: 'success.main',
                        width: `${greenPercentage}%`,
                        transition: 'width 0.3s ease'
                      }} 
                    />
                  </Box>
                </Box>
              </Box>
            </Box>
          )}

          {/* Botones de apuesta */}
          <Box sx={{ 
            display: 'flex', 
            gap: { xs: 1.5, sm: 2 },
            flexDirection: { xs: 'column', sm: 'row' }
          }}>
            <Button
              variant="contained"
              color={getBetButtonColor('red')}
              fullWidth
              size={isMobile ? "medium" : "large"}
              startIcon={<BetIcon />}
              onClick={() => handleOpenBet('red')}
              disabled={!canBet}
              sx={{ 
                py: { xs: 1, sm: 1.5 }, 
                flex: 1,
                minHeight: { xs: 48, sm: 56 }
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant={isMobile ? "body2" : "body1"} sx={{ fontWeight: 'bold' }}>
                  Apostar Rojo
                </Typography>
                <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                  {fight.cock1.name}
                </Typography>
              </Box>
            </Button>
            
            <Button
              variant="contained"
              color={getBetButtonColor('green')}
              fullWidth
              size={isMobile ? "medium" : "large"}
              startIcon={<BetIcon />}
              onClick={() => handleOpenBet('green')}
              disabled={!canBet}
              sx={{ 
                py: { xs: 1, sm: 1.5 }, 
                flex: 1,
                minHeight: { xs: 48, sm: 56 }
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant={isMobile ? "body2" : "body1"} sx={{ fontWeight: 'bold' }}>
                  Apostar Verde
                </Typography>
                <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                  {fight.cock2.name}
                </Typography>
              </Box>
            </Button>
          </Box>

          {/* Información adicional */}
          <Box sx={{ 
            mt: { xs: 2, sm: 2 }, 
            pt: { xs: 1.5, sm: 2 }, 
            borderTop: 1, 
            borderColor: 'divider',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 0.5, sm: 2 },
            justifyContent: 'space-between'
          }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
              Apuesta mínima: ${fight.minBet} MXN
            </Typography>
            {currentUser && (
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, fontWeight: 'bold' }}>
                Tu saldo: ${currentUser.balance.toLocaleString()} MXN
              </Typography>
            )}
          </Box>

          {/* Apuestas del usuario en esta pelea */}
          {userActiveBets.length > 0 && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', color: 'grey.700' }}>
                <BetIcon sx={{ mr: 1, fontSize: 16 }} />
                Tus apuestas en esta pelea
              </Typography>
              {userActiveBets.map((bet, index) => {
                // Determinar si es una apuesta parcialmente emparejada
                const isPartiallyMatched = bet.status === 'pending' && bet.matchedAmount && bet.matchedAmount < bet.amount;
                const isFullyMatched = bet.status === 'matched';
                
                const getStatusLabel = () => {
                  if (isPartiallyMatched) return 'Aceptada - Ajustada';
                  if (isFullyMatched) return 'Emparejada';
                  return 'Pendiente';
                };
                
                const getStatusColor = () => {
                  if (isPartiallyMatched) return 'info';
                  if (isFullyMatched) return 'success';
                  return 'warning';
                };
                
                return (
                  <Box key={bet.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: index < userActiveBets.length - 1 ? 1 : 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Chip
                        label={bet.color === 'red' ? 'Rojo' : 'Verde'}
                        color={bet.color === 'red' ? 'error' : 'success'}
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      <Typography variant="body2" sx={{ color: 'grey.700' }}>
                        ${bet.matchedAmount?.toLocaleString()} MXN
                        {isPartiallyMatched && (
                          <Typography component="span" variant="caption" sx={{ ml: 1, color: 'grey.600' }}>
                            (Ajustada: ${bet.matchedAmount?.toLocaleString()})
                          </Typography>
                        )}
                      </Typography>
                    </Box>
                    <Chip
                      label={getStatusLabel()}
                      color={getStatusColor()}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                );
              })}
            </Box>
          )}

          {!canBet && (
            <Alert severity="info" sx={{ mt: 2 }}>
              {!currentUser 
                ? 'Inicia sesión para apostar'
                : fight.status !== 'betting_open'
                ? userActiveBets.length > 0 
                  ? 'Las apuestas están cerradas. Puedes ver tus apuestas activas arriba.'
                  : 'Las apuestas están cerradas para esta pelea'
                : currentUser.role === 'admin'
                ? 'Los administradores no pueden apostar'
                : 'Las apuestas no están disponibles'
              }
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Dialog para realizar apuesta */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar 
              sx={{ 
                bgcolor: selectedColor === 'red' ? 'error.main' : 'success.main',
                mr: 2 
              }}
            >
              <BetIcon />
            </Avatar>
            <Box>
              <Typography variant="h6">
                Apostar al {getColorName(selectedColor || 'red')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedColor === 'red' ? fight.cock1.name : fight.cock2.name}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <TextField
              label="Cantidad a apostar"
              type="number"
              fullWidth
              value={betAmount}
              onChange={(e) => setBetAmount(Math.max(0, parseFloat(e.target.value) || 0))}
              inputProps={{ min: fight.minBet, step: 10 }}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                endAdornment: <Typography sx={{ ml: 1 }}>MXN</Typography>,
              }}
              sx={{ mb: 2 }}
            />

            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              {[100, 500, 1000, 2000].map((amount) => (
                <Button
                  key={amount}
                  variant="outlined"
                  size="small"
                  onClick={() => setBetAmount(amount)}
                  disabled={currentUser ? amount > currentUser.balance : true}
                >
                  ${amount}
                </Button>
              ))}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Resumen de la apuesta
              </Typography>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Gallo:</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {selectedColor === 'red' ? fight.cock1.name : fight.cock2.name}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Color:</Typography>
                <Chip 
                  label={getColorName(selectedColor || 'red')}
                  color={selectedColor === 'red' ? 'error' : 'success'}
                  size="small"
                />
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Cantidad:</Typography>
                <Typography variant="body2" fontWeight="medium">
                  ${betAmount.toLocaleString()} MXN
                </Typography>
              </Box>

              {currentUser && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                  <Typography variant="body2">Saldo después:</Typography>
                  <Typography 
                    variant="body2" 
                    fontWeight="medium"
                    color={currentUser.balance - betAmount >= 0 ? 'text.primary' : 'error.main'}
                  >
                    ${(currentUser.balance - betAmount).toLocaleString()} MXN
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handlePlaceBet}
            variant="contained"
            color={selectedColor === 'red' ? 'error' : 'success'}
            disabled={
              placeBetMutation.isPending ||
              betAmount < fight.minBet ||
              (currentUser ? betAmount > currentUser.balance : true)
            }
            startIcon={placeBetMutation.isPending ? <CircularProgress size={20} /> : <MoneyIcon />}
          >
            {placeBetMutation.isPending ? 'Procesando...' : 'Confirmar Apuesta'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BettingCard;
