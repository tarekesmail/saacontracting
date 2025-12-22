import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import TenantSelectionPage from './pages/TenantSelectionPage';
import DashboardPage from './pages/DashboardPage';
import LaborersPage from './pages/LaborersPage';
import GroupsPage from './pages/GroupsPage';
import JobsPage from './pages/JobsPage';
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

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // If user is logged in but no tenant is selected, show tenant selection
  if (!user.tenant) {
    return (
      <Routes>
        <Route path="/tenant-selection" element={<TenantSelectionPage />} />
        <Route path="*" element={<Navigate to="/tenant-selection" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/laborers" element={<LaborersPage />} />
        <Route path="/groups" element={<GroupsPage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;