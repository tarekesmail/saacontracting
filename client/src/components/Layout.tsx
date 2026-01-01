import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import LoadingSpinner from './LoadingSpinner';
import toast from 'react-hot-toast';
import {
  HomeIcon,
  UsersIcon,
  BriefcaseIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  BuildingOfficeIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  ClockIcon,
  DocumentChartBarIcon,
  CurrencyDollarIcon,
  ChevronRightIcon,
  ChartBarSquareIcon,
  DocumentTextIcon,
  UserGroupIcon,
  CreditCardIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Laborers', href: '/laborers', icon: UsersIcon },
  { name: 'Jobs', href: '/jobs', icon: BriefcaseIcon },
  { name: 'Timesheets', href: '/timesheets', icon: ClockIcon },
  { name: 'Invoices', href: '/invoices', icon: DocumentTextIcon },
  { 
    name: 'Expenses', 
    icon: CurrencyDollarIcon,
    children: [
      { name: 'Manage Expenses', href: '/expenses' },
      { name: 'Categories', href: '/expense-categories' },
      { name: 'Expense Reports', href: '/expense-reports' }
    ]
  },
  { name: 'Reports', href: '/reports', icon: DocumentChartBarIcon },
  { name: 'P&L Report', href: '/profit-loss', icon: ChartBarSquareIcon },
  { name: 'Credits', href: '/credits', icon: CreditCardIcon },
  { name: 'Supplies', href: '/supplies', icon: CubeIcon },
  { name: 'Tenants', href: '/tenants', icon: Cog6ToothIcon },
  { name: 'Users', href: '/users', icon: UserGroupIcon },
];

interface Tenant {
  id: string;
  name: string;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tenantDropdownOpen, setTenantDropdownOpen] = useState(false);
  const [expenseDropdownOpen, setExpenseDropdownOpen] = useState(false);
  const [reportsDropdownOpen, setReportsDropdownOpen] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [switchingTenant, setSwitchingTenant] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const expenseDropdownRef = useRef<HTMLDivElement>(null);
  const reportsDropdownRef = useRef<HTMLDivElement>(null);
  const { user, switchTenant, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setTenantDropdownOpen(false);
      }
      if (expenseDropdownRef.current && !expenseDropdownRef.current.contains(event.target as Node)) {
        setExpenseDropdownOpen(false);
      }
      if (reportsDropdownRef.current && !reportsDropdownRef.current.contains(event.target as Node)) {
        setReportsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch tenants when dropdown is opened
  const fetchTenants = async (force = false) => {
    if (tenants.length > 0 && !force) return; // Already loaded
    
    setLoadingTenants(true);
    try {
      const response = await api.get('/auth/tenants');
      setTenants(response.data);
    } catch (error) {
      toast.error('Failed to load tenants');
    } finally {
      setLoadingTenants(false);
    }
  };

  const handleTenantDropdownToggle = () => {
    if (!tenantDropdownOpen) {
      fetchTenants();
    }
    setTenantDropdownOpen(!tenantDropdownOpen);
  };

  const refreshTenants = () => {
    fetchTenants(true);
  };

  const switchToTenant = async (tenantId: string) => {
    if (!user) return;
    
    setSwitchingTenant(tenantId);
    setTenantDropdownOpen(false);
    
    try {
      await switchTenant(tenantId);
      toast.success('Switched tenant successfully!');
    } catch (error) {
      toast.error('Failed to switch tenant');
    } finally {
      setSwitchingTenant(null);
    }
  };

  const goToTenantSelection = () => {
    setTenantDropdownOpen(false);
    navigate('/tenant-selection');
  };

  const handleLogout = () => {
    setTenants([]); // Clear tenant list
    setTenantDropdownOpen(false);
    setExpenseDropdownOpen(false);
    setReportsDropdownOpen(false);
    logout();
  };

  const NavigationItem = ({ item }: { item: any }) => {
    if (item.children) {
      const isActive = item.children.some((child: any) => location.pathname === child.href);
      const isOpen = item.name === 'Expenses' ? expenseDropdownOpen : 
                    item.name === 'Reports' ? reportsDropdownOpen : false;
      
      return (
        <div className="relative" ref={
          item.name === 'Expenses' ? expenseDropdownRef : 
          item.name === 'Reports' ? reportsDropdownRef : undefined
        }>
          <button
            onClick={() => {
              if (item.name === 'Expenses') {
                setExpenseDropdownOpen(!expenseDropdownOpen);
              } else if (item.name === 'Reports') {
                setReportsDropdownOpen(!reportsDropdownOpen);
              }
            }}
            className={`group flex items-center w-full px-2 py-2 text-sm font-medium rounded-md transition-colors ${
              isActive
                ? 'bg-primary-100 text-primary-900'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
            {item.name}
            <ChevronRightIcon className={`ml-auto h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
          </button>
          
          {isOpen && (
            <div className="ml-6 mt-1 space-y-1">
              {item.children.map((child: any) => (
                <Link
                  key={child.name}
                  to={child.href}
                  onClick={() => {
                    setSidebarOpen(false);
                    setExpenseDropdownOpen(false);
                    setReportsDropdownOpen(false);
                  }}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                    location.pathname === child.href
                      ? 'bg-primary-100 text-primary-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {child.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }

    const isActive = location.pathname === item.href;
    return (
      <Link
        to={item.href}
        onClick={() => setSidebarOpen(false)}
        className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
          isActive
            ? 'bg-primary-100 text-primary-900'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}
      >
        <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
        {item.name}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}>
        <div className={`fixed inset-0 bg-gray-600 transition-opacity ${sidebarOpen ? 'opacity-75' : 'opacity-0'}`} onClick={() => setSidebarOpen(false)} />
        <div className={`fixed inset-y-0 left-0 flex w-64 flex-col bg-white transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">SAA Contracting</h1>
            <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => (
              <NavigationItem key={item.name} item={item} />
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">SAA Contracting</h1>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => (
              <NavigationItem key={item.name} item={item} />
            ))}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1" />
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <div className="flex items-center space-x-4">
                {/* Tenant Switcher */}
                {user?.tenant && (
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={handleTenantDropdownToggle}
                      className="flex items-center space-x-2 px-3 py-2 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                    >
                      <BuildingOfficeIcon className="h-4 w-4 text-primary-600" />
                      <div className="text-sm">
                        <p className="font-medium text-primary-900">{user.tenant.name}</p>
                      </div>
                      <ChevronDownIcon className="h-4 w-4 text-primary-600" />
                    </button>
                    
                    {/* Dropdown Menu */}
                    {tenantDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                        <div className="py-1">
                          {/* Current Tenant Header */}
                          <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                            Current Tenant
                          </div>
                          <div className="px-4 py-2 bg-primary-50">
                            <div className="flex items-center">
                              <BuildingOfficeIcon className="h-4 w-4 text-primary-600 mr-2" />
                              <span className="text-sm font-medium text-primary-900">{user.tenant.name}</span>
                            </div>
                          </div>
                          
                          {/* Available Tenants */}
                          <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                            Switch to
                          </div>
                          
                          {loadingTenants ? (
                            <div className="px-4 py-3 flex items-center justify-center">
                              <LoadingSpinner size="sm" />
                              <span className="ml-2 text-sm text-gray-500">Loading tenants...</span>
                            </div>
                          ) : (
                            <>
                              {tenants
                                .filter(tenant => tenant.id !== user.tenant?.id)
                                .map((tenant) => (
                                <button
                                  key={tenant.id}
                                  onClick={() => switchToTenant(tenant.id)}
                                  disabled={switchingTenant === tenant.id}
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                      <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mr-2" />
                                      <span>{tenant.name}</span>
                                    </div>
                                    {switchingTenant === tenant.id && (
                                      <LoadingSpinner size="sm" />
                                    )}
                                  </div>
                                </button>
                              ))}
                              
                              {tenants.filter(tenant => tenant.id !== user.tenant?.id).length === 0 && (
                                <div className="px-4 py-2 text-sm text-gray-500">
                                  No other tenants available
                                </div>
                              )}
                            </>
                          )}
                          
                          {/* Manage Tenants Link */}
                          <div className="border-t border-gray-100">
                            <button
                              onClick={refreshTenants}
                              disabled={loadingTenants}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                            >
                              <div className="flex items-center">
                                <ArrowPathIcon className={`h-4 w-4 mr-2 ${loadingTenants ? 'animate-spin' : ''}`} />
                                Refresh List
                              </div>
                            </button>
                            <button
                              onClick={goToTenantSelection}
                              className="block w-full text-left px-4 py-2 text-sm text-primary-600 hover:bg-gray-100"
                            >
                              Manage Tenants
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* User Info */}
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{user?.username}</p>
                </div>
                
                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Logout"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
