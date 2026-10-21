import { Alert, CssBaseline, LinearProgress, ThemeProvider } from '@mui/material';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import LoginForm from './components/auth/LoginForm.jsx';
import AppHeader from './components/layout/AppHeader.jsx';
import TicketDrawer from './components/tickets/TicketDrawer.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { FacilityDataProvider, useFacilityData } from './context/FacilityDataContext.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import TicketsPage from './pages/TicketsPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import FacilitiesPage from './pages/FacilitiesPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import theme from './theme';


function AppRoutes() {
  const { loading, failed, role } = useFacilityData();

  if (loading) return <LinearProgress />;

  return (
    <>
      {failed.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Some data could not be loaded from the API ({failed.join(', ')}). Those sections may show placeholders.
        </Alert>
      )}
      <Routes>
        <Route path='/' element={<DashboardPage />} />
        <Route path='/tickets' element={<TicketsPage />} />
        <Route path='/analytics' element={<AnalyticsPage />} />
        <Route path='/facilities' element={role === 'Facility Admin' ? <FacilitiesPage /> : <Navigate to='/' replace />} />
        <Route path='/users' element={role === 'Facility Admin' ? <UsersPage /> : <Navigate to='/' replace />} />
        <Route path='*' element={<NotFoundPage />} />
      </Routes>
    </>
  );
}


function Dashboard(){
  const {user, logout} = useAuth()

  return (
    <BrowserRouter>
      <FacilityDataProvider>
        <AppHeader username={user?.sub} role={user?.role} onLogout={logout}>
          <AppRoutes />
        </AppHeader>
        <TicketDrawer />
      </FacilityDataProvider>
    </BrowserRouter>
  );
}


function AppContent() {
  const {isAuthenticated} = useAuth();
  return isAuthenticated ? <Dashboard /> : <LoginForm />;
}

function App(){

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AppContent/>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App;
