import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  ClockIcon, 
  CalendarDaysIcon, 
  PlusIcon,
  DocumentTextIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const bulkTimesheetSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  defaultOvertimeMultiplier: z.number().min(1).max(5),
  timesheets: z.array(z.object({
    laborerId: z.string().min(1),
    jobId: z.string().min(1),
    hoursWorked: z.number().min(0).max(24),
    overtime: z.number().min(0).max(24),
    overtimeMultiplier: z.number().min(1).max(5).optional(),
    notes: z.string().optional()
  }))
});

type BulkTimesheetForm = z.infer<typeof bulkTimesheetSchema>;

interface TimesheetEntry {
  laborerId: string;
  jobId: string;
  hoursWorked: number;
  overtime: number;
  overtimeMultiplier: number;
  notes: string;
}

export default function TimesheetsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [defaultOvertimeMultiplier, setDefaultOvertimeMultiplier] = useState(1.5);
  const [timesheetEntries, setTimesheetEntries] = useState<TimesheetEntry[]>([]);
  const [showSummary, setShowSummary] = useState(false);
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
    (data: BulkTimesheetForm) => api.post('/timesheets/bulk', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('timesheets');
        queryClient.invalidateQueries('timesheet-summary');
        toast.success('Timesheets saved successfully');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to save timesheets');
      }
    }
  );

  // Initialize timesheet entries when laborers load
  useEffect(() => {
    if (laborers && laborers.length > 0 && timesheetEntries.length === 0) {
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
  }, [laborers, timesheetEntries.length, defaultOvertimeMultiplier]);

  // Update entries with existing timesheet data
  useEffect(() => {
    if (existingTimesheets && timesheetEntries.length > 0) {
      const updatedEntries = timesheetEntries.map(entry => {
        const existing = existingTimesheets.find((ts: any) => ts.laborerId === entry.laborerId);
        if (existing) {
          return {
            ...entry,
            hoursWorked: parseFloat(existing.hoursWorked),
            overtime: parseFloat(existing.overtime),
            overtimeMultiplier: parseFloat(existing.overtimeMultiplier || defaultOvertimeMultiplier),
            notes: existing.notes || ''
          };
        }
        return entry;
      });
      setTimesheetEntries(updatedEntries);
    }
  }, [existingTimesheets, defaultOvertimeMultiplier]);

  const updateTimesheetEntry = (index: number, field: keyof TimesheetEntry, value: any) => {
    const updated = [...timesheetEntries];
    updated[index] = { ...updated[index], [field]: value };
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

    bulkCreateMutation.mutate({
      date: selectedDate,
      defaultOvertimeMultiplier: defaultOvertimeMultiplier,
      timesheets: validEntries
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
          <h1 className="text-2xl font-bold text-gray-900">Bulk Timesheet Entry</h1>
          <p className="mt-1 text-sm text-gray-500">
            Record hours worked for all laborers on a specific date
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowSummary(!showSummary)}
            className="btn-secondary"
          >
            <ChartBarIcon className="h-4 w-4 mr-2" />
            {showSummary ? 'Hide Summary' : 'Show Summary'}
          </button>
        </div>
      </div>

      {/* Date Selection and Quick Actions */}
      <div className="card p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input"
            />
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setAllHours(10)}
              className="btn-secondary text-sm"
            >
              Set All to 10h
            </button>
            <button
              onClick={clearAllHours}
              className="btn-secondary text-sm"
            >
              Clear All
            </button>
          </div>

          <div className="ml-auto">
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
              Save All Timesheets
            </button>
          </div>
        </div>
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
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Timesheet for {new Date(selectedDate).toLocaleDateString()}
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">Laborer</th>
                <th className="table-header-cell">Job</th>
                <th className="table-header-cell">Regular Hours</th>
                <th className="table-header-cell">Overtime Hours</th>
                <th className="table-header-cell">OT Rate</th>
                <th className="table-header-cell">Total Hours</th>
                <th className="table-header-cell">Labor Cost</th>
                <th className="table-header-cell">Client Charge</th>
                <th className="table-header-cell">Notes</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {timesheetEntries.map((entry, index) => {
                const laborer = laborers?.find((l: any) => l.id === entry.laborerId);
                const job = jobs?.find((j: any) => j.id === entry.jobId);
                const totalHours = entry.hoursWorked + entry.overtime;
                const laborCost = (entry.hoursWorked * parseFloat(laborer?.salaryRate || '0')) + 
                                 (entry.overtime * parseFloat(laborer?.salaryRate || '0') * entry.overtimeMultiplier);
                const clientCharge = (entry.hoursWorked * parseFloat(laborer?.orgRate || '0')) + 
                                   (entry.overtime * parseFloat(laborer?.orgRate || '0') * entry.overtimeMultiplier);

                return (
                  <tr key={entry.laborerId}>
                    <td className="table-cell">
                      <div>
                        <div className="font-medium">{laborer?.name}</div>
                        <div className="text-sm text-gray-500">{laborer?.idNumber}</div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="text-sm">
                        <span className="badge badge-success">{job?.name || 'No job'}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={entry.hoursWorked}
                        onChange={(e) => updateTimesheetEntry(index, 'hoursWorked', parseFloat(e.target.value) || 0)}
                        className="input w-20 text-center"
                      />
                    </td>
                    <td className="table-cell">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={entry.overtime}
                        onChange={(e) => updateTimesheetEntry(index, 'overtime', parseFloat(e.target.value) || 0)}
                        className="input w-20 text-center"
                      />
                    </td>
                    <td className="table-cell">
                      <select
                        value={entry.overtimeMultiplier}
                        onChange={(e) => updateTimesheetEntry(index, 'overtimeMultiplier', parseFloat(e.target.value))}
                        className="input text-sm w-20"
                      >
                        <option value={1.0}>1x</option>
                        <option value={1.5}>1.5x</option>
                        <option value={2.0}>2x</option>
                      </select>
                    </td>
                    <td className="table-cell font-medium">
                      {totalHours.toFixed(1)}h
                    </td>
                    <td className="table-cell text-blue-600 font-medium">
                      {laborCost.toFixed(2)} SAR
                    </td>
                    <td className="table-cell text-green-600 font-medium">
                      {clientCharge.toFixed(2)} SAR
                    </td>
                    <td className="table-cell">
                      <input
                        type="text"
                        value={entry.notes}
                        onChange={(e) => updateTimesheetEntry(index, 'notes', e.target.value)}
                        placeholder="Optional notes"
                        className="input text-sm"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {timesheetEntries.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            No laborers found. Add some laborers first to create timesheets.
          </div>
        )}
      </div>
    </div>
  );
}