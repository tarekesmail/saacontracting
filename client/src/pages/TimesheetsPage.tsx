import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface TimesheetEntry {
  laborerId: string;
  jobId: string;
  hoursWorked: number;
  overtime: number;
  overtimeMultiplier: number;
  notes: string;
}

interface CalendarDay {
  date: Date;
  dateStr: string;
  dayOfWeek: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasTimesheets: boolean;
  totalHours: number;
}

export default function TimesheetsPage() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [defaultOvertimeMultiplier, setDefaultOvertimeMultiplier] = useState(1.5);
  const [timesheetEntries, setTimesheetEntries] = useState<TimesheetEntry[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [showCalendar, setShowCalendar] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: laborers, isLoading: loadingLaborers } = useQuery('laborers', async () => {
    const response = await api.get('/laborers?limit=1000');
    return response.data.laborers;
  });

  const { data: jobs, isLoading: loadingJobs } = useQuery('jobs', async () => {
    const response = await api.get('/jobs');
    return response.data;
  });

  const { data: existingTimesheets } = useQuery(
    ['timesheets', selectedDate],
    async () => {
      const response = await api.get(`/timesheets?date=${selectedDate}&limit=1000`);
      return response.data.timesheets;
    },
    { enabled: !!selectedDate }
  );

  // Get monthly timesheet summary for calendar
  const { data: monthlyTimesheets } = useQuery(
    ['monthly-timesheets', currentMonth.toISOString()],
    async () => {
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      const response = await api.get(`/timesheets?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}&limit=10000`);
      return response.data.timesheets;
    }
  );

  const { data: summary } = useQuery(
    ['timesheet-summary', selectedDate],
    async () => {
      const startDate = selectedDate;
      const endDate = selectedDate;
      const response = await api.get(`/timesheets/summary?startDate=${startDate}&endDate=${endDate}`);
      return response.data;
    },
    { enabled: showSummary && !!selectedDate }
  );

  const bulkCreateMutation = useMutation(
    (data: any) => api.post('/timesheets/bulk', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('timesheets');
        queryClient.invalidateQueries('timesheet-summary');
        queryClient.invalidateQueries('monthly-timesheets');
        toast.success('Timesheets saved successfully');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to save timesheets');
      }
    }
  );

  // Generate calendar days for current month
  const calendarDays = useMemo((): CalendarDay[] => {
    const days: CalendarDay[] = [];
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // First day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from Sunday of the week containing the first day
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    // End on Saturday of the week containing the last day
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Group monthly timesheets by date (using local date to avoid timezone issues)
    const timesheetsByDate: { [key: string]: number } = {};
    if (monthlyTimesheets) {
      monthlyTimesheets.forEach((ts: any) => {
        const tsDate = new Date(ts.date);
        const dateStr = `${tsDate.getFullYear()}-${String(tsDate.getMonth() + 1).padStart(2, '0')}-${String(tsDate.getDate()).padStart(2, '0')}`;
        timesheetsByDate[dateStr] = (timesheetsByDate[dateStr] || 0) + parseFloat(ts.hoursWorked) + parseFloat(ts.overtime);
      });
    }
    
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
      days.push({
        date: new Date(current),
        dateStr,
        dayOfWeek: current.getDay(),
        isCurrentMonth: current.getMonth() === month,
        isToday: current.getTime() === today.getTime(),
        hasTimesheets: !!timesheetsByDate[dateStr],
        totalHours: timesheetsByDate[dateStr] || 0
      });
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [currentMonth, monthlyTimesheets]);

  // Filter laborers based on search
  const filteredLaborers = useMemo(() => {
    if (!laborers) return [];
    if (!searchQuery.trim()) return laborers;
    
    const query = searchQuery.toLowerCase();
    return laborers.filter((laborer: any) => 
      laborer.name.toLowerCase().includes(query) ||
      laborer.idNumber.toLowerCase().includes(query) ||
      laborer.job?.name?.toLowerCase().includes(query)
    );
  }, [laborers, searchQuery]);

  // Initialize timesheet entries when laborers load
  useEffect(() => {
    if (laborers && laborers.length > 0) {
      const entries = laborers.map((laborer: any) => ({
        laborerId: laborer.id,
        jobId: laborer.jobId,
        hoursWorked: 0,
        overtime: 0,
        overtimeMultiplier: defaultOvertimeMultiplier,
        notes: ''
      }));
      setTimesheetEntries(entries);
    }
  }, [laborers, defaultOvertimeMultiplier]);

  // Update entries with existing timesheet data
  useEffect(() => {
    if (existingTimesheets && laborers) {
      const updatedEntries = laborers.map((laborer: any) => {
        const existing = existingTimesheets.find((ts: any) => ts.laborerId === laborer.id);
        if (existing) {
          return {
            laborerId: laborer.id,
            jobId: laborer.jobId,
            hoursWorked: parseFloat(existing.hoursWorked),
            overtime: parseFloat(existing.overtime),
            overtimeMultiplier: existing.overtimeMultiplier ? parseFloat(existing.overtimeMultiplier) : defaultOvertimeMultiplier,
            notes: existing.notes || ''
          };
        }
        return {
          laborerId: laborer.id,
          jobId: laborer.jobId,
          hoursWorked: 0,
          overtime: 0,
          overtimeMultiplier: defaultOvertimeMultiplier,
          notes: ''
        };
      });
      setTimesheetEntries(updatedEntries);
    }
  }, [existingTimesheets, laborers, defaultOvertimeMultiplier]);

  const updateTimesheetEntry = (laborerId: string, field: keyof TimesheetEntry, value: any) => {
    const updated = timesheetEntries.map(entry => {
      if (entry.laborerId !== laborerId) return entry;
      
      const newEntry = { ...entry, [field]: value };
      
      if (field === 'overtime' && value === 0) {
        newEntry.overtimeMultiplier = 1.5;
      } else if (field === 'overtime' && value > 0 && !entry.overtimeMultiplier) {
        newEntry.overtimeMultiplier = defaultOvertimeMultiplier;
      }
      
      return newEntry;
    });
    setTimesheetEntries(updated);
  };

  const handleBulkSave = () => {
    const validEntries = timesheetEntries.filter(entry => 
      entry.hoursWorked > 0 || entry.overtime > 0
    );

    if (validEntries.length === 0) {
      toast.error('Please enter hours for at least one laborer');
      return;
    }

    const processedEntries = validEntries.map(entry => ({
      laborerId: entry.laborerId,
      jobId: entry.jobId,
      hoursWorked: entry.hoursWorked,
      overtime: entry.overtime,
      overtimeMultiplier: entry.overtime > 0 ? entry.overtimeMultiplier : undefined,
      notes: entry.notes
    }));

    bulkCreateMutation.mutate({
      date: selectedDate,
      defaultOvertimeMultiplier: defaultOvertimeMultiplier,
      timesheets: processedEntries
    });
  };

  const setAllHours = (hours: number) => {
    const updated = timesheetEntries.map(entry => ({
      ...entry,
      hoursWorked: hours
    }));
    setTimesheetEntries(updated);
  };

  const clearAllHours = () => {
    const updated = timesheetEntries.map(entry => ({
      ...entry,
      hoursWorked: 0,
      overtime: 0,
      notes: ''
    }));
    setTimesheetEntries(updated);
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
  };

  const selectDate = (day: CalendarDay) => {
    setSelectedDate(day.dateStr);
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getEntryForLaborer = (laborerId: string) => {
    return timesheetEntries.find(e => e.laborerId === laborerId) || {
      laborerId,
      jobId: '',
      hoursWorked: 0,
      overtime: 0,
      overtimeMultiplier: defaultOvertimeMultiplier,
      notes: ''
    };
  };

  if (loadingLaborers || loadingJobs) {
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
          <h1 className="text-2xl font-bold text-gray-900">Timesheet Entry</h1>
          <p className="mt-1 text-sm text-gray-500">
            Record hours worked for all laborers • {laborers?.length || 0} laborers
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className={`btn-secondary ${showCalendar ? 'bg-primary-100' : ''}`}
          >
            <CalendarDaysIcon className="h-4 w-4 mr-2" />
            Calendar
          </button>
          <button
            onClick={() => setShowSummary(!showSummary)}
            className="btn-secondary"
          >
            <ChartBarIcon className="h-4 w-4 mr-2" />
            {showSummary ? 'Hide Summary' : 'Summary'}
          </button>
        </div>
      </div>

      {/* Calendar View */}
      {showCalendar && (
        <div className="card p-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-semibold text-gray-900">
              {formatMonthYear(currentMonth)}
            </h3>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
              <div
                key={day}
                className="text-center text-xs font-medium py-2 text-gray-500"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const isSelected = day.dateStr === selectedDate;
              
              return (
                <button
                  key={index}
                  onClick={() => selectDate(day)}
                  className={`
                    relative p-2 text-sm rounded-lg transition-all
                    ${!day.isCurrentMonth ? 'text-gray-300' : ''}
                    ${day.isToday ? 'ring-2 ring-primary-500' : ''}
                    ${isSelected ? 'bg-primary-600 text-white' : ''}
                    ${!isSelected && day.isCurrentMonth ? 'hover:bg-gray-100' : ''}
                  `}
                >
                  <div className="font-medium">{day.date.getDate()}</div>
                  {day.hasTimesheets && day.isCurrentMonth && (
                    <div className={`text-xs mt-1 ${isSelected ? 'text-white' : 'text-green-600'}`}>
                      {day.totalHours.toFixed(0)}h
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected Date Info */}
          <div className="mt-4 pt-4 border-t text-center">
            <span className="text-sm text-gray-500">
              Selected: <span className="font-medium">{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
            </span>
          </div>
        </div>
      )}

      {/* Quick Actions & Search */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
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

          {/* Quick Set Buttons */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Quick:</span>
            <button
              onClick={() => setAllHours(10)}
              className="btn-secondary text-sm py-1"
            >
              All 10h
            </button>
            <button
              onClick={() => setAllHours(8)}
              className="btn-secondary text-sm py-1"
            >
              All 8h
            </button>
            <button
              onClick={clearAllHours}
              className="btn-secondary text-sm py-1"
            >
              Clear
            </button>
          </div>

          {/* Save Button */}
          <button
            onClick={handleBulkSave}
            disabled={bulkCreateMutation.isLoading}
            className="btn-primary"
          >
            {bulkCreateMutation.isLoading ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : (
              <DocumentTextIcon className="h-4 w-4 mr-2" />
            )}
            Save Timesheets
          </button>
        </div>

        {/* Search Results Count */}
        {searchQuery && (
          <div className="mt-2 text-sm text-gray-500">
            Showing {filteredLaborers.length} of {laborers?.length || 0} laborers
          </div>
        )}
      </div>

      {/* Summary Section */}
      {showSummary && summary && (
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {summary.reduce((sum: number, s: any) => sum + s.stats.totalHours, 0).toFixed(1)}h
              </div>
              <div className="text-sm text-blue-600">Total Hours</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {summary.reduce((sum: number, s: any) => sum + s.stats.totalPay, 0).toFixed(2)} SAR
              </div>
              <div className="text-sm text-green-600">Total Labor Cost</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {summary.reduce((sum: number, s: any) => sum + s.stats.totalCharge, 0).toFixed(2)} SAR
              </div>
              <div className="text-sm text-purple-600">Total Client Charge</div>
            </div>
          </div>
        </div>
      )}

      {/* Timesheet Entry Table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">
            {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </h3>
          <span className="text-sm text-gray-500">
            {filteredLaborers.length} laborers
          </span>
        </div>
        
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="table">
            <thead className="table-header sticky top-0 bg-gray-50 z-10">
              <tr>
                <th className="table-header-cell">Laborer</th>
                <th className="table-header-cell">Job</th>
                <th className="table-header-cell w-24">Regular</th>
                <th className="table-header-cell w-24">Overtime</th>
                <th className="table-header-cell w-20">OT Rate</th>
                <th className="table-header-cell w-20">Total</th>
                <th className="table-header-cell">Notes</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {filteredLaborers.map((laborer: any) => {
                const entry = getEntryForLaborer(laborer.id);
                const job = jobs?.find((j: any) => j.id === laborer.jobId);
                const totalHours = entry.hoursWorked + entry.overtime;

                return (
                  <tr key={laborer.id} className={totalHours > 0 ? 'bg-green-50' : ''}>
                    <td className="table-cell">
                      <div>
                        <div className="font-medium">{laborer.name}</div>
                        <div className="text-xs text-gray-500">{laborer.idNumber}</div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="badge badge-success text-xs">{job?.name || '-'}</span>
                    </td>
                    <td className="table-cell">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={entry.hoursWorked || ''}
                        onChange={(e) => updateTimesheetEntry(laborer.id, 'hoursWorked', parseFloat(e.target.value) || 0)}
                        className="input w-20 text-center text-sm"
                        placeholder="0"
                      />
                    </td>
                    <td className="table-cell">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={entry.overtime || ''}
                        onChange={(e) => updateTimesheetEntry(laborer.id, 'overtime', parseFloat(e.target.value) || 0)}
                        className="input w-20 text-center text-sm"
                        placeholder="0"
                      />
                    </td>
                    <td className="table-cell">
                      <select
                        value={entry.overtime > 0 ? entry.overtimeMultiplier : ''}
                        onChange={(e) => updateTimesheetEntry(laborer.id, 'overtimeMultiplier', parseFloat(e.target.value))}
                        disabled={entry.overtime === 0}
                        className={`input text-sm w-16 ${entry.overtime === 0 ? 'bg-gray-100 text-gray-400' : ''}`}
                      >
                        <option value="">-</option>
                        <option value={1.0}>1x</option>
                        <option value={1.5}>1.5x</option>
                        <option value={2.0}>2x</option>
                      </select>
                    </td>
                    <td className="table-cell">
                      <span className={`font-medium ${totalHours > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                        {totalHours > 0 ? `${totalHours}h` : '-'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <input
                        type="text"
                        value={entry.notes}
                        onChange={(e) => updateTimesheetEntry(laborer.id, 'notes', e.target.value)}
                        placeholder="Notes..."
                        className="input text-sm w-full"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredLaborers.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            {searchQuery ? 'No laborers match your search.' : 'No laborers found. Add some laborers first.'}
          </div>
        )}
      </div>
    </div>
  );
}
