import { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  ReceiptPercentIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface ExpenseCategory {
  id: string;
  name: string;
  color: string;
}

interface Expense {
  id: string;
  date: string;
  amount: number;
  description: string;
  notes?: string;
  receipt?: string;
  category: ExpenseCategory;
}

interface CalendarDay {
  date: Date;
  dateStr: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  expenses: Expense[];
  totalAmount: number;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showCalendar, setShowCalendar] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    description: '',
    notes: '',
    receipt: '',
    categoryId: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [currentMonth]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/expense-categories');
      setCategories(response.data);
    } catch (error) {
      toast.error('Failed to load categories');
    }
  };

  const fetchExpenses = async () => {
    try {
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      
      // Format dates using local timezone to avoid UTC conversion issues
      const formatDate = (d: Date) => 
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      const params = new URLSearchParams();
      params.append('startDate', formatDate(startDate));
      params.append('endDate', formatDate(endDate));

      const response = await api.get(`/expenses?${params.toString()}`);
      setExpenses(response.data);
    } catch (error) {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  // Generate calendar days
  const calendarDays = useMemo((): CalendarDay[] => {
    const days: CalendarDay[] = [];
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Group expenses by date (using local date to avoid timezone issues)
    const expensesByDate: { [key: string]: Expense[] } = {};
    expenses.forEach((expense) => {
      const expenseDate = new Date(expense.date);
      const dateStr = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}-${String(expenseDate.getDate()).padStart(2, '0')}`;
      if (!expensesByDate[dateStr]) {
        expensesByDate[dateStr] = [];
      }
      expensesByDate[dateStr].push(expense);
    });
    
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      const dayExpenses = expensesByDate[dateStr] || [];
      days.push({
        date: new Date(current),
        dateStr,
        isCurrentMonth: current.getMonth() === month,
        isToday: current.getTime() === today.getTime(),
        isSelected: dateStr === selectedDate,
        expenses: dayExpenses,
        totalAmount: dayExpenses.reduce((sum, e) => sum + e.amount, 0)
      });
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [currentMonth, expenses, selectedDate]);

  // Filter expenses for selected date or show all for the month
  const displayedExpenses = useMemo(() => {
    if (selectedDate) {
      return expenses.filter(e => {
        // Use local date comparison to avoid timezone issues
        const expenseDate = new Date(e.date);
        const localDateStr = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}-${String(expenseDate.getDate()).padStart(2, '0')}`;
        return localDateStr === selectedDate;
      });
    }
    return expenses;
  }, [expenses, selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const data = {
        ...formData,
        amount: parseFloat(formData.amount)
      };

      if (editingExpense) {
        await api.put(`/expenses/${editingExpense.id}`, data);
        toast.success('Expense updated successfully!');
      } else {
        await api.post('/expenses', data);
        toast.success('Expense created successfully!');
      }
      
      await fetchExpenses();
      resetForm();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      date: expense.date.split('T')[0],
      amount: expense.amount.toString(),
      description: expense.description,
      notes: expense.notes || '',
      receipt: expense.receipt || '',
      categoryId: expense.category.id
    });
    setShowForm(true);
  };

  const handleDelete = async (expense: Expense) => {
    if (!confirm(`Are you sure you want to delete this expense?`)) {
      return;
    }

    try {
      await api.delete(`/expenses/${expense.id}`);
      toast.success('Expense deleted successfully!');
      await fetchExpenses();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete expense');
    }
  };

  const resetForm = () => {
    setFormData({
      date: selectedDate || new Date().toISOString().split('T')[0],
      amount: '',
      description: '',
      notes: '',
      receipt: '',
      categoryId: ''
    });
    setEditingExpense(null);
    setShowForm(false);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(newMonth.getMonth() - 1);
      } else {
        newMonth.setMonth(newMonth.getMonth() + 1);
      }
      return newMonth;
    });
    setSelectedDate(null);
  };

  const selectDate = (day: CalendarDay) => {
    if (selectedDate === day.dateStr) {
      setSelectedDate(null); // Deselect if clicking same date
    } else {
      setSelectedDate(day.dateStr);
    }
  };

  const handleAddExpenseForDate = (dateStr: string) => {
    setFormData({
      ...formData,
      date: dateStr
    });
    setShowForm(true);
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const totalAmount = displayedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const monthlyTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);

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
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-600">Track and manage your business expenses</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
              showCalendar ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <CalendarDaysIcon className="h-5 w-5" />
            <span>Calendar</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center space-x-2"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Calendar View */}
      {showCalendar && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">
                {formatMonthYear(currentMonth)}
              </h3>
              <p className="text-sm text-gray-500">
                Monthly Total: <span className="font-medium text-primary-600">{monthlyTotal.toLocaleString()} SAR</span>
              </p>
            </div>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-xs font-medium py-2 text-gray-500">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => (
              <button
                key={index}
                onClick={() => selectDate(day)}
                className={`
                  relative p-2 text-sm rounded-lg transition-all min-h-[70px] flex flex-col
                  ${!day.isCurrentMonth ? 'text-gray-300 bg-gray-50' : 'hover:bg-gray-100'}
                  ${day.isToday ? 'ring-2 ring-primary-500' : ''}
                  ${day.isSelected ? 'bg-primary-600 text-white hover:bg-primary-700' : ''}
                `}
              >
                <div className="font-medium">{day.date.getDate()}</div>
                {day.totalAmount > 0 && day.isCurrentMonth && (
                  <div className={`text-xs mt-auto ${day.isSelected ? 'text-white' : 'text-red-600'}`}>
                    {day.totalAmount.toLocaleString()}
                  </div>
                )}
                {day.expenses.length > 0 && day.isCurrentMonth && (
                  <div className={`text-xs ${day.isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                    {day.expenses.length} item{day.expenses.length > 1 ? 's' : ''}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Selected Date Info */}
          {selectedDate && (
            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  Showing expenses for: <span className="font-medium">{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                </span>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-xs text-primary-600 hover:text-primary-800"
                >
                  Show all
                </button>
              </div>
              <button
                onClick={() => handleAddExpenseForDate(selectedDate)}
                className="text-sm text-primary-600 hover:text-primary-800 flex items-center"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add expense for this date
              </button>
            </div>
          )}
        </div>
      )}

      {/* Summary Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {selectedDate ? 'Daily Total' : 'Monthly Total'}
            </h3>
            <p className="text-3xl font-bold text-primary-600">
              {totalAmount.toLocaleString()} SAR
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Records</p>
            <p className="text-2xl font-semibold text-gray-900">{displayedExpenses.length}</p>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              {editingExpense ? 'Edit Expense' : 'Add New Expense'}
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
                  Category *
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
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
                  Receipt/Reference
                </label>
                <input
                  type="text"
                  value={formData.receipt}
                  onChange={(e) => setFormData({ ...formData, receipt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Receipt number or reference"
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
                  <span>{editingExpense ? 'Update' : 'Create'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expenses List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">
            {selectedDate 
              ? new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
              : formatMonthYear(currentMonth)
            }
          </h3>
          <span className="text-sm text-gray-500">{displayedExpenses.length} expenses</span>
        </div>

        {displayedExpenses.length === 0 ? (
          <div className="text-center py-12">
            <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No expenses found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {selectedDate 
                ? 'No expenses recorded for this date.'
                : 'No expenses recorded for this month.'
              }
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowForm(true)}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center space-x-2 mx-auto"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Add Expense</span>
              </button>
            </div>
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
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Receipt
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayedExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {new Date(expense.date).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {expense.description}
                        </div>
                        {expense.notes && (
                          <div className="text-sm text-gray-500 mt-1">
                            {expense.notes}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: expense.category.color }}
                        />
                        <span className="text-sm text-gray-900">
                          {expense.category.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <CurrencyDollarIcon className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-sm font-medium text-gray-900">
                          {expense.amount.toLocaleString()} SAR
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {expense.receipt ? (
                        <div className="flex items-center">
                          <ReceiptPercentIcon className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="text-sm text-gray-600">
                            {expense.receipt}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(expense)}
                          className="text-primary-600 hover:text-primary-900"
                          title="Edit expense"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(expense)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete expense"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
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
