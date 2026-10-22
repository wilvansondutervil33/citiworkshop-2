import { useState } from 'react';
import {
  AppBar, Avatar, Box, Button, Drawer, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import { Analytics as AnalyticsIcon } from '@mui/icons-material';
import PeopleIcon from '@mui/icons-material/People';
import ApartmentIcon from '@mui/icons-material/Apartment';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useFacilityData } from '../../context/FacilityDataContext.jsx';
import ColorModeToggle from '../common/ColorModeToggle.jsx';
import { monoFont } from '../../theme';

const drawerWidth = 240;

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', icon: <DashboardIcon /> },
  { label: 'Tickets', path: '/tickets', icon: <ConfirmationNumberIcon /> },
  { label: 'Analytics', path: '/analytics', icon: <AnalyticsIcon /> },
  { label: 'Facilities', path: '/facilities', icon: <ApartmentIcon />, adminOnly: true },
  { label: 'Users', path: '/users', icon: <PeopleIcon />, adminOnly: true },
];

function AppHeader({ username, role, onLogout, children }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { me } = useFacilityData();
  const rail = theme.palette.rail;

  const handleLogout = () => {
    onLogout();
    navigate('/', { replace: true });
  };

  const displayName = me?.name ?? username;
  const initials = displayName?.split(/[\s.@]+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: rail.main, color: rail.contrastText, p: 1.75 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, px: 1, py: 1 }}>
        <Typography sx={{ fontFamily: 'h4.fontFamily', fontWeight: 800, fontSize: 22, fontStretch: '80%' }}>ACME</Typography>
        <Typography sx={{ fontFamily: monoFont, fontSize: 11, color: rail.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Facilities Desk
        </Typography>
      </Box>

      <Typography variant="overline" sx={{ color: rail.muted, px: 1, mt: 3 }}>Workspace</Typography>
      <List dense disablePadding>
        {NAV_ITEMS.filter((item) => !item.adminOnly || role === 'Facility Admin').map((item) => {
          const selected = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);
          return (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                component={RouterLink}
                to={item.path}
                selected={selected}
                onClick={() => setMobileOpen(false)}
                sx={{
                  borderRadius: 1,
                  color: 'inherit',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                  '&.Mui-selected, &.Mui-selected:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 36, opacity: 0.85 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Box sx={{ mt: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5, px: 1 }}>
        <ColorModeToggle sx={{ alignSelf: 'flex-start', '& .MuiToggleButton-root': { borderColor: 'rgba(255,255,255,0.16)' }, '& .Mui-selected': { bgcolor: 'rgba(255,255,255,0.14) !important' } }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Avatar sx={{ width: 30, height: 30, fontSize: 12, bgcolor: '#3a4a6e' }}>{initials}</Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap>{displayName}</Typography>
            <Typography variant="caption" sx={{ color: rail.muted }}>{role}</Typography>
          </Box>
        </Box>
        <Button onClick={handleLogout} startIcon={<LogoutIcon />} sx={{ color: 'inherit', justifyContent: 'flex-start' }}>
          Log out
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {isMobile && (
        <AppBar position="fixed" sx={{ bgcolor: rail.main, color: rail.contrastText }}>
          <Toolbar>
            <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(true)} aria-label="Open menu" sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
            <Typography sx={{ fontFamily: 'h4.fontFamily', fontWeight: 800, fontSize: 20 }}>ACME</Typography>
          </Toolbar>
        </AppBar>
      )}

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', border: 0 } }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: { xs: 2, md: 3 } }}>
        {isMobile && <Toolbar />}
        {children}
      </Box>
    </Box>
  );
}

export default AppHeader;
