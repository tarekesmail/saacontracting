import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import TenantSelectionPage from './pages/TenantSelectionPage';
import DashboardPage from './pages/DashboardPage';
import LaborersPage from './pages/LaborersPage';
import JobsPage from './pages/JobsPage';
import TimesheetsPage from './pages/TimesheetsPage';
import ReportsPage from './pages/ReportsPage';
import TenantsPage from './pages/TenantsPage';
import PublicLaborerPage from './pages/PublicLaborerPage';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/laborer" element={<PublicLaborerPage />} />
      
      {/* Authentication routes */}
      {!user ? (
        <>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      ) : !user.tenant ? (
        <>
          <Route path="/tenant-selection" element={<TenantSelectionPage />} />
          <Route path="*" element={<Navigate to="/tenant-selection" replace />} />
        </>
      ) : (
        <>
          {/* Authenticated routes */}
          <Route path="/" element={<Layout><DashboardPage /></Layout>} />
          <Route path="/laborers" element={<Layout><LaborersPage /></Layout>} />
          <Route path="/jobs" element={<Layout><JobsPage /></Layout>} />
          <Route path="/timesheets" element={<Layout><TimesheetsPage /></Layout>} />
          <Route path="/reports" element={<Layout><ReportsPage /></Layout>} />
          <Route path="/tenants" element={<Layout><TenantsPage /></Layout>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      )}
    </Routes>
  );
}

export default App;