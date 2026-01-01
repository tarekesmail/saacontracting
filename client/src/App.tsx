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
import ExpensesPage from './pages/ExpensesPage';
import ExpenseCategoriesPage from './pages/ExpenseCategoriesPage';
import ExpenseReportsPage from './pages/ExpenseReportsPage';
import ProfitLossPage from './pages/ProfitLossPage';
import InvoicesPage from './pages/InvoicesPage';
import CreateInvoicePage from './pages/CreateInvoicePage';
import GenerateMonthlyInvoicePage from './pages/GenerateMonthlyInvoicePage';
import ViewInvoicePage from './pages/ViewInvoicePage';
import PrintInvoicePage from './pages/PrintInvoicePage';
import TenantsPage from './pages/TenantsPage';
import UsersPage from './pages/UsersPage';
import CreditsPage from './pages/CreditsPage';
import CreditReportsPage from './pages/CreditReportsPage';
import SuppliesPage from './pages/SuppliesPage';
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
      <Route path="/print/invoice/:id" element={<PrintInvoicePage />} />
      
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
          <Route path="/expenses" element={<Layout><ExpensesPage /></Layout>} />
          <Route path="/expense-categories" element={<Layout><ExpenseCategoriesPage /></Layout>} />
          <Route path="/expense-reports" element={<Layout><ExpenseReportsPage /></Layout>} />
          <Route path="/reports" element={<Layout><ReportsPage /></Layout>} />
          <Route path="/profit-loss" element={<Layout><ProfitLossPage /></Layout>} />
          <Route path="/invoices" element={<Layout><InvoicesPage /></Layout>} />
          <Route path="/invoices/new" element={<Layout><CreateInvoicePage /></Layout>} />
          <Route path="/invoices/generate-monthly" element={<Layout><GenerateMonthlyInvoicePage /></Layout>} />
          <Route path="/invoices/:id" element={<Layout><ViewInvoicePage /></Layout>} />
          <Route path="/tenants" element={<Layout><TenantsPage /></Layout>} />
          <Route path="/users" element={<Layout><UsersPage /></Layout>} />
          <Route path="/credits" element={<Layout><CreditsPage /></Layout>} />
          <Route path="/credit-reports" element={<Layout><CreditReportsPage /></Layout>} />
          <Route path="/supplies" element={<Layout><SuppliesPage /></Layout>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      )}
    </Routes>
  );
}

export default App;