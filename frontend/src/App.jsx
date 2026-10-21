import { Container, Typography, Box, Snackbar, Alert} from '@mui/material'
import {useState} from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import LoginForm from './components/auth/LoginForm.jsx';
import AppHeader from './components/layout/AppHeader.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';



function Dashboard(){
  const {user, logout} = useAuth()
  const [notification, setNotification] = useState(null)

  return (
    <>
      <BrowserRouter>
        <AppHeader username={user?.sub} role={user?.role} onLogout={logout}>
        <Routes>
          <Route path='/' element = {
            <Container maxWidth="lg" sx={{mt:4}}>
              <Typography variant='h5' component="h2" gutterBottom>
                Fleet Overview
              </Typography>
              
              
            </Container>
          } exact= {true}/>
    
          <Route path='*' element= {<Typography variant="h5" component="h2" gutterBottom>
                404
              </Typography>}/>
        </Routes>

        <Snackbar open={Boolean(notification)} autoHideDuration = {4000} onClose={() => setNotification(null)}>
          <Alert severity='success' onClose={() => setNotification(null)}>
            {notification}
          </Alert>
        </Snackbar>
        </AppHeader>
      </BrowserRouter>
    
    
    </>
  );
}


function AppContent() {
  const {isAuthenticated} = useAuth();
  return isAuthenticated ? <Dashboard /> : <LoginForm />;
}

function App(){
  
  return (
    <AuthProvider>
      <AppContent/>
    </AuthProvider>
  )
}

export default App;