import { AppBar, Toolbar, Typography, Box, Button, Link, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import {Analytics as AnalyticsIcon} from '@mui/icons-material';
import SettingsIcon from '@mui/icons-material/Settings';
import ReportIcon from '@mui/icons-material/Report';
import PersonIcon from '@mui/icons-material/Person';
import { useNavigate } from 'react-router-dom';

//added username, role, onLogout to function params
function AppHeader({username, role, onLogout, children}) {

  const drawerWidth = 240;
  const navigate = useNavigate();
  const handleLogout = () => {
    onLogout();
    navigate('/', { replace: true });
  };
  

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
          position="fixed"
          sx={{
            backgroundColor: 'blue',
            width: `calc(100% - ${drawerWidth}px)`,
            ml: `${drawerWidth}px`,
            zIndex: (theme) => theme.zIndex.drawer + 1, // sit above the drawer
          }}
        >
        <Toolbar sx={{display: 'flex', justifyContent: 'space-around'}}>
          <Typography variant="h6" component="h1">
            ACME 
          </Typography>
          {username && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 20}}>
              <Typography variant="body2">{username} ({role})</Typography>
            </Box>
          )}
          
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          },
        }}
      >
        
        <List sx={{paddingTop: '40px'}}>

          <Link href="/" sx={{ textDecoration: 'none', color: 'text.primary'}}>
            <ListItem disablePadding>
                <ListItemButton>
                  <ListItemIcon>
                    <HomeIcon />
                  </ListItemIcon>
                  <ListItemText primary="Home" />
                </ListItemButton>            
            </ListItem>
          </Link>

          <Link href="/analytics" sx={{ textDecoration: 'none', color: 'text.primary'}}>
            <ListItem disablePadding>
                <ListItemButton>
                  <ListItemIcon>
                    <AnalyticsIcon />
                  </ListItemIcon>
                  <ListItemText primary="Analytics" />
                </ListItemButton>            
            </ListItem>
          </Link>

          <Link href="/workorders" sx={{ textDecoration: 'none', color: 'text.primary'}}>
            <ListItem disablePadding>
                <ListItemButton>
                  <ListItemIcon>
                    <SettingsIcon />
                  </ListItemIcon>
                  <ListItemText primary="Work Orders" />
                </ListItemButton>            
            </ListItem>
          </Link>

          <Link href="/reports" sx={{ textDecoration: 'none', color: 'text.primary'}}>
            <ListItem disablePadding>
                <ListItemButton>
                  <ListItemIcon>
                    <ReportIcon />
                  </ListItemIcon>
                  <ListItemText primary="Diagnostic Reports" />
                </ListItemButton>            
            </ListItem>
          </Link>

          {role == 'Clinical Admin' && <Link href="/users" sx={{ textDecoration: 'none', color: 'text.primary'}}>
            <ListItem disablePadding>
                <ListItemButton>
                  <ListItemIcon>
                    <PersonIcon />
                  </ListItemIcon>
                  <ListItemText primary="Users" />
                </ListItemButton>            
            </ListItem>
          </Link>}

          {role == 'Clinical Admin' && <Link href="/deactive" sx={{ textDecoration: 'none', color: 'text.primary'}}>
            <ListItem disablePadding>
                <ListItemButton>
                  <ListItemIcon>
                    <PersonIcon />
                  </ListItemIcon>
                  <ListItemText primary="Deactive" />
                </ListItemButton>            
            </ListItem>
          </Link>}

        </List>

        <List sx={{paddingBottom:'40px'}}>
          <ListItem disablePadding>
            <ListItemButton>
              <Button color="inherit" onClick={handleLogout}>Log Out</Button>
            </ListItemButton>     
          </ListItem>

        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar /> {/* spacer so content starts below the AppBar */}
        {children}
      </Box>
    </Box>
  );
}

export default AppHeader;