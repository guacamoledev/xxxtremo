import React from 'react';
import { Alert, Button, Box, Typography, Fade, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from 'react-router-dom';

interface UserZeroBalanceNotificationProps {
  show: boolean;
  onClose?: () => void;
}

const UserZeroBalanceNotification: React.FC<UserZeroBalanceNotificationProps> = ({ show, onClose }) => {
  const navigate = useNavigate();

  if (!show) return null;

  return (
    <Fade in={show} timeout={500}>
      <Box sx={{ mb: 2 }}>
        <Alert
          severity="warning"
          action={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                color="primary"
                variant="contained"
                size="small"
                onClick={() => navigate('/finances')}
              >
                Generar Depósito
              </Button>
              {onClose && (
                <IconButton
                  aria-label="cerrar"
                  color="inherit"
                  size="small"
                  onClick={onClose}
                  sx={{ ml: 1 }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          }
        >
          <Typography variant="body2">
            Tu saldo es <b>$0 MXN</b>. Para seguir apostando, realiza un depósito.
          </Typography>
        </Alert>
      </Box>
    </Fade>
  );
};

export default UserZeroBalanceNotification;
