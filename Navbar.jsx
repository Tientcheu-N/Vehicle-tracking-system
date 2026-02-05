import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Badge,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Chip,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  LocationOn,
  Route,
  Code,
  SettingsInputAntenna,
  People,
  LocationCity,
  BarChart,
  Notifications,
  Person,
  Logout,
  Settings,
  DirectionsBus,
  Brightness4,
  Brightness7,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, logout } = useAuth();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationsAnchor, setNotificationsAnchor] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  const navItems = [
    { path: '/dashboard', label: 'Tableau de Bord', icon: <Dashboard /> },
    { path: '/tracking', label: 'Suivi en Direct', icon: <LocationOn /> },
    { path: '/routes', label: 'Itinéraires', icon: <Route /> },
    { path: '/algorithms', label: 'Algorithmes', icon: <Code /> },
    { path: '/api-status', label: 'Statut API', icon: <SettingsInputAntenna /> },
    { path: '/drivers', label: 'Chauffeurs', icon: <People /> },
    { path: '/cities', label: 'Villes', icon: <LocationCity /> },
    { path: '/statistics', label: 'Statistiques', icon: <BarChart /> },
  ];

  const notifications = [
    { id: 1, text: 'Nouveau chauffeur enregistré', time: '2 min', read: false },
    { id: 2, text: 'Trafic élevé à Douala', time: '5 min', read: false },
    { id: 3, text: 'Maintenance système prévue', time: '1 heure', read: true },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleNotificationsOpen = (event) => {
    setNotificationsAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setNotificationsAnchor(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    handleMenuClose();
  };

  const handleNotificationClick = (id) => {
    console.log('Notification clicked:', id);
    handleMenuClose();
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    // Ici tu pourrais ajouter la logique pour changer le thème
  };

  const drawer = (
    <Box sx={{ width: 280 }}>
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2, borderBottom: 1, borderColor: 'divider' }}>
        <DirectionsBus sx={{ fontSize: 32, color: 'primary.main' }} />
        <Typography variant="h6" fontWeight="bold">
          Smart Transit
        </Typography>
      </Box>
      <List>
        {navItems.map((item) => (
          <ListItem
            key={item.path}
            component={Link}
            to={item.path}
            onClick={handleDrawerToggle}
            sx={{
              textDecoration: 'none',
              color: location.pathname === item.path ? 'primary.main' : 'text.primary',
              backgroundColor: location.pathname === item.path ? 'primary.50' : 'transparent',
              borderRadius: 2,
              mx: 1,
              my: 0.5,
              '&:hover': {
                backgroundColor: 'primary.100',
              },
            }}
          >
            <ListItemIcon sx={{ color: location.pathname === item.path ? 'primary.main' : 'inherit' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.label}
              primaryTypographyProps={{
                fontWeight: location.pathname === item.path ? 600 : 400,
              }}
            />
          </ListItem>
        ))}
      </List>
      <Divider sx={{ my: 2 }} />
      <Box sx={{ p: 2 }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<Route />}
          onClick={() => navigate('/routes')}
          sx={{ mb: 2 }}
        >
          Planifier un trajet
        </Button>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<Settings />}
          onClick={() => navigate('/settings')}
        >
          Paramètres
        </Button>
      </Box>
    </Box>
  );

  return (
    <>
      <AppBar 
        position="fixed" 
        sx={{ 
          background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: isMobile ? 0 : 1 }}>
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
            >
              <DirectionsBus sx={{ fontSize: 32 }} />
            </motion.div>
            <Typography
              variant="h6"
              component={Link}
              to="/"
              sx={{
                textDecoration: 'none',
                color: 'white',
                fontWeight: 700,
                letterSpacing: '-0.5px',
                display: { xs: 'none', sm: 'block' },
              }}
            >
              Smart Transit Cameroon
            </Typography>
            <Chip
              label="v2.0.0"
              size="small"
              sx={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                fontSize: '0.7rem',
                height: 20,
              }}
            />
          </Box>

          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mx: 3, flexGrow: 1 }}>
              {navItems.slice(0, 4).map((item) => (
                <Button
                  key={item.path}
                  component={Link}
                  to={item.path}
                  startIcon={item.icon}
                  sx={{
                    color: 'white',
                    backgroundColor: location.pathname === item.path ? 'rgba(255,255,255,0.2)' : 'transparent',
                    borderRadius: 3,
                    px: 2,
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      transform: 'translateY(-2px)',
                    },
                    transition: 'all 0.2s',
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Mode sombre">
              <IconButton color="inherit" onClick={toggleDarkMode}>
                {darkMode ? <Brightness7 /> : <Brightness4 />}
              </IconButton>
            </Tooltip>

            <Tooltip title="Notifications">
              <IconButton color="inherit" onClick={handleNotificationsOpen}>
                <Badge badgeContent={unreadCount} color="error">
                  <Notifications />
                </Badge>
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={notificationsAnchor}
              open={Boolean(notificationsAnchor)}
              onClose={handleMenuClose}
              PaperProps={{
                sx: { width: 320, maxHeight: 400 },
              }}
            >
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Notifications
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {notifications.map((notification) => (
                  <MenuItem
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification.id)}
                    sx={{
                      backgroundColor: notification.read ? 'transparent' : 'action.hover',
                      borderRadius: 1,
                      mb: 1,
                    }}
                  >
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2">{notification.text}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {notification.time}
                      </Typography>
                    </Box>
                    {!notification.read && (
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />
                    )}
                  </MenuItem>
                ))}
              </Box>
            </Menu>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label="Système en ligne"
                size="small"
                icon={<Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#10b981' }} />}
                sx={{
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  color: '#10b981',
                  display: { xs: 'none', sm: 'flex' },
                }}
              />
            </Box>

            <Tooltip title="Profil">
              <IconButton onClick={handleProfileMenuOpen} sx={{ ml: 1 }}>
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: 'white',
                    color: 'primary.main',
                    fontWeight: 'bold',
                  }}
                >
                  {user?.name?.[0] || 'U'}
                </Avatar>
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <Box sx={{ p: 2, minWidth: 200 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {user?.name || 'Utilisateur'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.email || 'admin@smarttransit.cm'}
                </Typography>
              </Box>
              <Divider />
              <MenuItem onClick={() => navigate('/profile')}>
                <ListItemIcon>
                  <Person fontSize="small" />
                </ListItemIcon>
                Mon profil
              </MenuItem>
              <MenuItem onClick={() => navigate('/settings')}>
                <ListItemIcon>
                  <Settings fontSize="small" />
                </ListItemIcon>
                Paramètres
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                Déconnexion
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="temporary"
        anchor="left"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 280,
            borderTopRightRadius: 20,
            borderBottomRightRadius: 20,
          },
        }}
      >
        {drawer}
      </Drawer>
    </>
  );
};

export default Navbar;