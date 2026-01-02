import { useState, useMemo } from 'react';
import { useQuery } from 'react-query';
import { api } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

interface Laborer {
  id: string;
  name: string;
  idNumber: string;
  salaryRate: number;
  orgRate: number;
  job?: { id: string; name: string };
  jobId: string;
}

interface Timesheet {
  id: string;
  date: string;
  hoursWorked: number;
  overtime: number;
  overtimeMultiplier: number | null;
  laborerId: string;
  laborer: Laborer;
}

interface LaborerSummary {
  laborer: Laborer;
  totalRegularHours: number;
  totalOvertimeHours: number;
  totalHours: number;
  daysWorked: number;
  totalPay: number;
  totalCharge: number;
  profit: number;
}

export default function TimesheetsPage() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'hours' | 'pay'>('name');

  const formatDate = (d: Date) => 
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const startDate = formatDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1));
  const endDate = formatDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0));

  const { data: laborers, isLoading: loadingLaborers } = useQuery('laborers', async () => {
    const response = await api.get('/laborers?limit=1000');
    return response.data.laborers as Laborer[];
  });

  const { data: monthlyTimesheets, isLoading: loadingTimesheets } = useQuery(
    ['monthly-timesheets', startDate, endDate],
    async () => {
      const response = await api.get(`/timesheets?startDate=${startDate}&endDate=${endDate}&limit=50000`);
      return response.data.timesheets as Timesheet[];
    }
  );


  // Calculate summary per laborer
  const laborerSummaries = useMemo((): LaborerSummary[] => {
    if (!laborers || !monthlyTimesheets) return [];

    const summaryMap = new Map<string, LaborerSummary>();

    // Initialize all laborers with zero values
    laborers.forEach(laborer => {
      summaryMap.set(laborer.id, {
        laborer,
        totalRegularHours: 0,
        totalOvertimeHours: 0,
        totalHours: 0,
        daysWorked: 0,
        totalPay: 0,
        totalCharge: 0,
        profit: 0,
      });
    });

    // Aggregate timesheet data
    monthlyTimesheets.forEach(ts => {
      const summary = summaryMap.get(ts.laborerId);
      if (summary) {
        const regularHours = parseFloat(String(ts.hoursWorked)) || 0;
        const overtimeHours = parseFloat(String(ts.overtime)) || 0;
        const multiplier = ts.overtimeMultiplier ? parseFloat(String(ts.overtimeMultiplier)) : 1.5;
        
        summary.totalRegularHours += regularHours;
        summary.totalOvertimeHours += overtimeHours;
        summary.totalHours += regularHours + overtimeHours;
        summary.daysWorked += 1;
        
        const salaryRate = parseFloat(String(summary.laborer.salaryRate)) || 0;
        const orgRate = parseFloat(String(summary.laborer.orgRate)) || 0;
        
        summary.totalPay += (regularHours * salaryRate) + (overtimeHours * salaryRate * multiplier);
        summary.totalCharge += (regularHours * orgRate) + (overtimeHours * orgRate * multiplier);
        summary.profit = summary.totalCharge - summary.totalPay;
      }
    });

    return Array.from(summaryMap.values());
  }, [laborers, monthlyTimesheets]);

  // Filter and sort
  const filteredSummaries = useMemo(() => {
    let filtered = laborerSummaries;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.laborer.name.toLowerCase().includes(query) ||
        s.laborer.idNumber.toLowerCase().includes(query) ||
        s.laborer.job?.name?.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'hours':
          return b.totalHours - a.totalHours;
        case 'pay':
          return b.totalCharge - a.totalCharge;
        default:
          return a.laborer.name.localeCompare(b.laborer.name);
      }
    });

    return filtered;
  }, [laborerSummaries, searchQuery, sortBy]);

  // Calculate totals
  const totals = useMemo(() => {
    return filteredSummaries.reduce((acc, s) => ({
      regularHours: acc.regularHours + s.totalRegularHours,
      overtimeHours: acc.overtimeHours + s.totalOvertimeHours,
      totalHours: acc.totalHours + s.totalHours,
      totalPay: acc.totalPay + s.totalPay,
      totalCharge: acc.totalCharge + s.totalCharge,
      profit: acc.profit + s.profit,
      laborersWorked: acc.laborersWorked + (s.daysWorked > 0 ? 1 : 0),
    }), {
      regularHours: 0,
      overtimeHours: 0,
      totalHours: 0,
      totalPay: 0,
      totalCharge: 0,
      profit: 0,
      laborersWorked: 0,
    });
  }, [filteredSummaries]);

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
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  if (loadingLaborers || loadingTimesheets) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monthly Timesheets</h1>
          <p className="mt-1 text-sm text-gray-500">
            View hours worked for all laborers
          </p>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <h3 className="text-xl font-semibold text-gray-900">
            {formatMonthYear(currentMonth)}
          </h3>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>


      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="card p-4">
          <div className="flex items-center space-x-2 text-gray-500 mb-1">
            <UserGroupIcon className="h-4 w-4" />
            <span className="text-xs">Laborers Worked</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{totals.laborersWorked}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center space-x-2 text-gray-500 mb-1">
            <ClockIcon className="h-4 w-4" />
            <span className="text-xs">Regular Hours</span>
          </div>
          <div className="text-2xl font-bold text-blue-600">{totals.regularHours.toFixed(1)}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center space-x-2 text-gray-500 mb-1">
            <ClockIcon className="h-4 w-4" />
            <span className="text-xs">Overtime Hours</span>
          </div>
          <div className="text-2xl font-bold text-orange-600">{totals.overtimeHours.toFixed(1)}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center space-x-2 text-gray-500 mb-1">
            <ChartBarIcon className="h-4 w-4" />
            <span className="text-xs">Total Hours</span>
          </div>
          <div className="text-2xl font-bold text-primary-600">{totals.totalHours.toFixed(1)}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center space-x-2 text-gray-500 mb-1">
            <CurrencyDollarIcon className="h-4 w-4" />
            <span className="text-xs">Labor Cost</span>
          </div>
          <div className="text-2xl font-bold text-red-600">{totals.totalPay.toLocaleString()} SAR</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center space-x-2 text-gray-500 mb-1">
            <CurrencyDollarIcon className="h-4 w-4" />
            <span className="text-xs">Client Charge</span>
          </div>
          <div className="text-2xl font-bold text-green-600">{totals.totalCharge.toLocaleString()} SAR</div>
        </div>
      </div>

      {/* Search and Sort */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, ID, or job..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'hours' | 'pay')}
              className="input text-sm"
            >
              <option value="name">Name</option>
              <option value="hours">Total Hours</option>
              <option value="pay">Client Charge</option>
            </select>
          </div>
        </div>
        {searchQuery && (
          <div className="mt-2 text-sm text-gray-500">
            Showing {filteredSummaries.length} of {laborerSummaries.length} laborers
          </div>
        )}
      </div>

      {/* Laborers Table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">
            {formatMonthYear(currentMonth)} Summary
          </h3>
          <span className="text-sm text-gray-500">
            {filteredSummaries.filter(s => s.daysWorked > 0).length} laborers with hours
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">Laborer</th>
                <th className="table-header-cell">Job</th>
                <th className="table-header-cell text-center">Days</th>
                <th className="table-header-cell text-center">Regular</th>
                <th className="table-header-cell text-center">Overtime</th>
                <th className="table-header-cell text-center">Total Hours</th>
                <th className="table-header-cell text-right">Labor Cost</th>
                <th className="table-header-cell text-right">Client Charge</th>
                <th className="table-header-cell text-right">Profit</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {filteredSummaries.map((summary) => (
                <tr 
                  key={summary.laborer.id} 
                  className={summary.daysWorked > 0 ? 'bg-green-50' : ''}
                >
                  <td className="table-cell">
                    <div>
                      <div className="font-medium">{summary.laborer.name}</div>
                      <div className="text-xs text-gray-500">{summary.laborer.idNumber}</div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className="badge badge-success text-xs">
                      {summary.laborer.job?.name || '-'}
                    </span>
                  </td>
                  <td className="table-cell text-center">
                    <span className={summary.daysWorked > 0 ? 'font-medium' : 'text-gray-400'}>
                      {summary.daysWorked || '-'}
                    </span>
                  </td>
                  <td className="table-cell text-center">
                    <span className={summary.totalRegularHours > 0 ? 'text-blue-600 font-medium' : 'text-gray-400'}>
                      {summary.totalRegularHours > 0 ? summary.totalRegularHours.toFixed(1) : '-'}
                    </span>
                  </td>
                  <td className="table-cell text-center">
                    <span className={summary.totalOvertimeHours > 0 ? 'text-orange-600 font-medium' : 'text-gray-400'}>
                      {summary.totalOvertimeHours > 0 ? summary.totalOvertimeHours.toFixed(1) : '-'}
                    </span>
                  </td>
                  <td className="table-cell text-center">
                    <span className={summary.totalHours > 0 ? 'text-primary-600 font-bold' : 'text-gray-400'}>
                      {summary.totalHours > 0 ? summary.totalHours.toFixed(1) : '-'}
                    </span>
                  </td>
                  <td className="table-cell text-right">
                    <span className={summary.totalPay > 0 ? 'text-red-600' : 'text-gray-400'}>
                      {summary.totalPay > 0 ? summary.totalPay.toLocaleString() : '-'}
                    </span>
                  </td>
                  <td className="table-cell text-right">
                    <span className={summary.totalCharge > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                      {summary.totalCharge > 0 ? summary.totalCharge.toLocaleString() : '-'}
                    </span>
                  </td>
                  <td className="table-cell text-right">
                    <span className={summary.profit > 0 ? 'text-green-700 font-bold' : summary.profit < 0 ? 'text-red-600' : 'text-gray-400'}>
                      {summary.profit !== 0 ? summary.profit.toLocaleString() : '-'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Totals Row */}
            <tfoot className="bg-gray-100 font-semibold">
              <tr>
                <td className="table-cell" colSpan={2}>Total</td>
                <td className="table-cell text-center">{totals.laborersWorked}</td>
                <td className="table-cell text-center text-blue-600">{totals.regularHours.toFixed(1)}</td>
                <td className="table-cell text-center text-orange-600">{totals.overtimeHours.toFixed(1)}</td>
                <td className="table-cell text-center text-primary-600">{totals.totalHours.toFixed(1)}</td>
                <td className="table-cell text-right text-red-600">{totals.totalPay.toLocaleString()}</td>
                <td className="table-cell text-right text-green-600">{totals.totalCharge.toLocaleString()}</td>
                <td className="table-cell text-right text-green-700">{totals.profit.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {filteredSummaries.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            {searchQuery ? 'No laborers match your search.' : 'No laborers found.'}
          </div>
        )}
      </div>
    </div>
  );
}
