import React, { useState } from 'react';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  LiveTv,
  History,
  AccountBalance,
  AdminPanelSettings,
  Assessment,
  Logout,
  Person,
  AccountBalanceWallet,
  Event,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

const drawerWidth = 240;

interface LayoutProps {
  children: React.ReactNode;
  noPadding?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, noPadding = false }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  const { currentUser, logout } = useAuth();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
    handleProfileMenuClose();
  };

  // Navigation items based on user role
  const getNavigationItems = () => {
    const baseItems = [
      { text: 'Inicio', icon: <Dashboard />, path: '/dashboard' },
      { text: 'Peleas en vivo', icon: <LiveTv />, path: '/live' },
      { text: 'Eventos', icon: <Event />, path: '/eventos' },
      { text: 'Historial de apuestas', icon: <History />, path: '/history' },
      { text: 'Finanzas', icon: <AccountBalance />, path: '/finances' },
    ];

    // Solo ADMIN y FINANCE ven la opción Usuarios
    if (currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.FINANCE) {
      baseItems.push({ text: 'Usuarios', icon: <Person />, path: '/users' });
    }

    if (currentUser?.role === UserRole.ADMIN) {
      baseItems.push(
        { text: 'Admin Panel', icon: <AdminPanelSettings />, path: '/admin' },
        { text: 'Admin Finanzas', icon: <AccountBalanceWallet />, path: '/admin/finances' },
        { text: 'Reportes', icon: <Assessment />, path: '/reports' }
      );
    }

    if (currentUser?.role === UserRole.FINANCE) {
      baseItems.push(
        { text: 'Admin Finanzas', icon: <AccountBalanceWallet />, path: '/admin/finances' },
        { text: 'Reportes', icon: <Assessment />, path: '/reports' }
      );
    }

    if (currentUser?.role === UserRole.STREAMING) {
      baseItems.push(
        { text: 'Streaming Panel', icon: <LiveTv />, path: '/streaming-panel' }
      );
    }

    return baseItems;
  };

  const drawer = (
    <div>
      <Toolbar>
      </Toolbar>
      <Divider />
      <List>
        {getNavigationItems().map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                if (window.innerWidth < 600) setMobileOpen(false);
              }}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ color: location.pathname === item.path ? 'white' : 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text} 
                sx={{ color: location.pathname === item.path ? 'white' : 'inherit' }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  if (!currentUser) {
    return <>{children}</>;
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: { xs: 2.5, sm: 4 } }}>
            <img
              src="/logo.png"
              alt="XXXTREMO Logo"
              className="xxxtremo-logo"
            />
          </Box>
          
          {/* User balance */}
          <Chip
            label={`$${currentUser.balance.toLocaleString('es-MX')} MXN`}
            color="secondary"
            sx={{ mr: 2 }}
          />
          
          {/* User profile */}
          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-controls="primary-search-account-menu"
            aria-haspopup="true"
            onClick={handleProfileMenuOpen}
            color="inherit"
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
              {currentUser.name.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Profile menu */}
      <Menu
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        keepMounted
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
      >
        <MenuItem disabled>
          <Typography variant="subtitle2">{currentUser.name}</Typography>
        </MenuItem>
        <MenuItem disabled>
          <Chip label={currentUser.role} size="small" />
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { navigate('/perfil'); handleProfileMenuClose(); }}>
          <ListItemIcon>
            <Person fontSize="small" />
          </ListItemIcon>
          Perfil
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          p: noPadding ? 0 : 3, 
          width: { sm: `calc(100% - ${drawerWidth}px)` } 
        }}
      >
        {!noPadding && <Toolbar />}
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
