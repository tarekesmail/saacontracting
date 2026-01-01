import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BanknotesIcon,
  CalendarIcon,
  UserIcon,
  PhoneIcon,
  FunnelIcon,
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface Credit {
  id: string;
  date: string;
  amount: number;
  description: string;
  notes?: string;
  reference?: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'ADVANCE';
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  accountantName: string;
  accountantPhone?: string;
}

export default function CreditsPage() {
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCredit, setEditingCredit] = useState<Credit | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    description: '',
    notes: '',
    type: 'DEPOSIT' as const,
  });
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    type: '',
    status: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Check user permissions
  const canEdit = user?.role === 'ADMIN';
  const canDelete = user?.role === 'ADMIN';

  useEffect(() => {
    fetchCredits();
  }, []);

  useEffect(() => {
    fetchCredits();
  }, [filters]);

  const fetchCredits = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.type) params.append('type', filters.type);
      if (filters.status) params.append('status', filters.status);

      const response = await api.get(`/credits?${params.toString()}`);
      setCredits(response.data);
    } catch (error) {
      toast.error('Failed to load credit records');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const data = {
        ...formData,
        amount: parseFloat(formData.amount),
        // Set default values for removed fields
        reference: '',
        status: 'CONFIRMED' as const,
        accountantName: 'Company Accountant',
        accountantPhone: ''
      };

      if (editingCredit) {
        await api.put(`/credits/${editingCredit.id}`, data);
        toast.success('Credit record updated successfully!');
      } else {
        await api.post('/credits', data);
        toast.success('Credit record created successfully!');
      }
      
      await fetchCredits();
      resetForm();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save credit record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (credit: Credit) => {
    setEditingCredit(credit);
    setFormData({
      date: credit.date.split('T')[0],
      amount: credit.amount.toString(),
      description: credit.description,
      notes: credit.notes || '',
      type: credit.type,
    });
    setShowForm(true);
  };

  const handleDelete = async (credit: Credit) => {
    if (!confirm(`Are you sure you want to delete this credit record?`)) {
      return;
    }

    try {
      await api.delete(`/credits/${credit.id}`);
      toast.success('Credit record deleted successfully!');
      await fetchCredits();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete credit record');
    }
  };

  const handleStatusChange = async (credit: Credit, newStatus: string) => {
    try {
      await api.patch(`/credits/${credit.id}/status`, { status: newStatus });
      toast.success('Status updated successfully!');
      await fetchCredits();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update status');
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      description: '',
      notes: '',
      type: 'DEPOSIT',
    });
    setEditingCredit(null);
    setShowForm(false);
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      type: '',
      status: ''
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'DEPOSIT': return 'text-green-600 bg-green-100';
      case 'WITHDRAWAL': return 'text-red-600 bg-red-100';
      case 'ADVANCE': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return <CheckCircleIcon className="h-4 w-4 text-green-600" />;
      case 'PENDING': return <ClockIcon className="h-4 w-4 text-yellow-600" />;
      case 'CANCELLED': return <XCircleIcon className="h-4 w-4 text-red-600" />;
      default: return <ClockIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'text-green-600 bg-green-100';
      case 'PENDING': return 'text-yellow-600 bg-yellow-100';
      case 'CANCELLED': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Calculate totals
  const totalDeposits = credits.filter(c => c.type === 'DEPOSIT').reduce((sum, c) => sum + c.amount, 0);
  const totalWithdrawals = credits.filter(c => c.type === 'WITHDRAWAL').reduce((sum, c) => sum + c.amount, 0);
  const totalAdvances = credits.filter(c => c.type === 'ADVANCE').reduce((sum, c) => sum + c.amount, 0);
  const netBalance = totalDeposits + totalAdvances - totalWithdrawals;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Credit Management</h1>
          <p className="text-gray-600">Track deposits and transactions with company accountant</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center space-x-2"
          >
            <FunnelIcon className="h-5 w-5" />
            <span>Filters</span>
          </button>
          {canEdit && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center space-x-2"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Add Credit</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Deposits</p>
              <p className="text-2xl font-bold text-green-600">
                {totalDeposits.toLocaleString()} SAR
              </p>
            </div>
            <BanknotesIcon className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Withdrawals</p>
              <p className="text-2xl font-bold text-red-600">
                {totalWithdrawals.toLocaleString()} SAR
              </p>
            </div>
            <BanknotesIcon className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Advances</p>
              <p className="text-2xl font-bold text-blue-600">
                {totalAdvances.toLocaleString()} SAR
              </p>
            </div>
            <BanknotesIcon className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Net Balance</p>
              <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {netBalance.toLocaleString()} SAR
              </p>
            </div>
            <BanknotesIcon className={`h-8 w-8 ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">Filters</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="DEPOSIT">Deposit</option>
                <option value="WITHDRAWAL">Withdrawal</option>
                <option value="ADVANCE">Advance</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              {editingCredit ? 'Edit Credit Record' : 'Add New Credit Record'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                >
                  <option value="DEPOSIT">Deposit (Money given to accountant)</option>
                  <option value="WITHDRAWAL">Withdrawal (Money taken back)</option>
                  <option value="ADVANCE">Advance (Advance payment)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (SAR) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  {submitting && <LoadingSpinner size="sm" />}
                  <span>{editingCredit ? 'Update' : 'Create'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credits List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {credits.length === 0 ? (
          <div className="text-center py-12">
            <BanknotesIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No credit records found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {Object.values(filters).some(v => v) 
                ? 'Try adjusting your filters or add a new credit record.'
                : 'Get started by adding your first credit record.'
              }
            </p>
            {canEdit && (
              <div className="mt-6">
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center space-x-2 mx-auto"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span>Add Credit</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Accountant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {credits.map((credit) => (
                  <tr key={credit.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {new Date(credit.date).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(credit.type)}`}>
                        {credit.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {credit.description}
                        </div>
                        {credit.notes && (
                          <div className="text-sm text-gray-500 mt-1">
                            {credit.notes}
                          </div>
                        )}
                        {credit.reference && (
                          <div className="text-xs text-gray-400 mt-1">
                            Ref: {credit.reference}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm text-gray-900">{credit.accountantName}</div>
                          {credit.accountantPhone && (
                            <div className="text-xs text-gray-500 flex items-center mt-1">
                              <PhoneIcon className="h-3 w-3 mr-1" />
                              {credit.accountantPhone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <BanknotesIcon className="h-4 w-4 text-gray-400 mr-1" />
                        <span className={`text-sm font-medium ${
                          credit.type === 'DEPOSIT' || credit.type === 'ADVANCE' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {credit.type === 'WITHDRAWAL' ? '-' : '+'}{credit.amount.toLocaleString()} SAR
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(credit.status)}
                        <span className={`ml-2 inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(credit.status)}`}>
                          {credit.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {canEdit && (
                          <button
                            onClick={() => handleEdit(credit)}
                            className="text-primary-600 hover:text-primary-900"
                            title="Edit credit record"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(credit)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete credit record"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}