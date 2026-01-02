import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { api } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import * as XLSX from 'xlsx';
import { 
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  PencilIcon,
  DocumentTextIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

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

interface LaborerEntry {
  laborerId: string;
  jobId: string;
  totalHours: number;
  overtime: number;
  overtimeMultiplier: number;
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

interface ImportedRow {
  iqamaNo: string;
  name: string;
  hours: number;
  matched: boolean;
  laborerId?: string;
  laborerName?: string;
}

export default function TimesheetsPage() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'hours' | 'pay'>('name');
  const [editMode, setEditMode] = useState(false);
  const [entries, setEntries] = useState<LaborerEntry[]>([]);
  const [workingDays, setWorkingDays] = useState(26);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedData, setImportedData] = useState<ImportedRow[]>([]);
  const [importStats, setImportStats] = useState({ matched: 0, unmatched: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const formatDate = (d: Date) => 
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const startDate = formatDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1));
  const endDate = formatDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0));
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();

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

  const bulkSaveMutation = useMutation(
    async (data: { entries: LaborerEntry[], workingDays: number }) => {
      for (let day = 1; day <= data.workingDays && day <= daysInMonth; day++) {
        const date = formatDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
        const dailyEntries = data.entries
          .filter(e => e.totalHours > 0)
          .map(e => ({
            laborerId: e.laborerId,
            jobId: e.jobId,
            hoursWorked: e.totalHours / data.workingDays,
            overtime: e.overtime / data.workingDays,
            overtimeMultiplier: e.overtime > 0 ? e.overtimeMultiplier : undefined,
          }));
        
        if (dailyEntries.length > 0) {
          await api.post('/timesheets/bulk', {
            date,
            defaultOvertimeMultiplier: 1.5,
            timesheets: dailyEntries
          });
        }
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('monthly-timesheets');
        toast.success('Monthly timesheets saved successfully');
        setEditMode(false);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to save timesheets');
      }
    }
  );

  const resetMonthMutation = useMutation(
    async () => {
      const response = await api.delete(`/timesheets/bulk/range?startDate=${startDate}&endDate=${endDate}`);
      return response.data;
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('monthly-timesheets');
        toast.success(`Deleted ${data.count} timesheet records`);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to reset month');
      }
    }
  );

  const handleResetMonth = () => {
    if (!confirm(`Are you sure you want to delete ALL timesheet records for ${formatMonthYear(currentMonth)}? This cannot be undone.`)) {
      return;
    }
    resetMonthMutation.mutate();
  };

  // Initialize entries when entering edit mode
  useEffect(() => {
    if (editMode && laborers) {
      const newEntries = laborers.map(laborer => {
        const existingData = laborerSummaries.find(s => s.laborer.id === laborer.id);
        return {
          laborerId: laborer.id,
          jobId: laborer.jobId,
          totalHours: existingData?.totalRegularHours || 0,
          overtime: existingData?.totalOvertimeHours || 0,
          overtimeMultiplier: 1.5,
        };
      });
      setEntries(newEntries);
    }
  }, [editMode, laborers]);

  // Calculate summary per laborer
  const laborerSummaries = useMemo((): LaborerSummary[] => {
    if (!laborers || !monthlyTimesheets) return [];

    const summaryMap = new Map<string, LaborerSummary>();

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

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'hours': return b.totalHours - a.totalHours;
        case 'pay': return b.totalCharge - a.totalCharge;
        default: return a.laborer.name.localeCompare(b.laborer.name);
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
    }), { regularHours: 0, overtimeHours: 0, totalHours: 0, totalPay: 0, totalCharge: 0, profit: 0, laborersWorked: 0 });
  }, [filteredSummaries]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(newMonth.getMonth() + (direction === 'prev' ? -1 : 1));
      return newMonth;
    });
    setEditMode(false);
  };

  const formatMonthYear = (date: Date) => date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const updateEntry = (laborerId: string, field: keyof LaborerEntry, value: number) => {
    setEntries(prev => prev.map(e => e.laborerId === laborerId ? { ...e, [field]: value } : e));
  };

  const setAllHours = (hours: number) => {
    setEntries(prev => prev.map(e => ({ ...e, totalHours: hours })));
  };

  const handleSave = () => {
    const validEntries = entries.filter(e => e.totalHours > 0 || e.overtime > 0);
    if (validEntries.length === 0) {
      toast.error('Please enter hours for at least one laborer');
      return;
    }
    bulkSaveMutation.mutate({ entries: validEntries, workingDays });
  };

  const getEntryForLaborer = (laborerId: string) => {
    return entries.find(e => e.laborerId === laborerId) || { laborerId, jobId: '', totalHours: 0, overtime: 0, overtimeMultiplier: 1.5 };
  };

  // Excel Import Functions
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        // Find header row and column indices
        let headerRowIndex = -1;
        let iqamaColIndex = -1;
        let nameColIndex = -1;
        let hoursColIndex = -1;

        // Search first 10 rows for headers
        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
          const row = jsonData[i];
          if (!row) continue;
          
          for (let j = 0; j < row.length; j++) {
            const cell = String(row[j] || '').toLowerCase().trim();
            
            // Match IQAMA column - look for "iqama" anywhere in the cell
            if (cell.includes('iqama')) {
              iqamaColIndex = j;
              headerRowIndex = i;
            }
            
            // Match name column
            if (cell.includes('姓名') || cell === 'name' || cell.includes('name')) {
              nameColIndex = j;
            }
            
            // Match hours column - 总工时 or contains "工时" or "hours"
            if (cell.includes('总工时') || cell.includes('工时') || cell.includes('hours') || cell.includes('hour')) {
              hoursColIndex = j;
            }
          }
        }

        // Debug: log what we found
        console.log('Excel parsing:', { headerRowIndex, iqamaColIndex, nameColIndex, hoursColIndex });
        console.log('First few rows:', jsonData.slice(0, 5));

        if (iqamaColIndex === -1 || hoursColIndex === -1) {
          toast.error('Could not find IQAMA NO or Hours (总工时) columns in the Excel file');
          return;
        }

        // Parse data rows and aggregate by IQAMA
        const hoursMap = new Map<string, { name: string; hours: number }>();
        
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row) continue;

          const iqamaNo = String(row[iqamaColIndex] || '').trim();
          const name = nameColIndex >= 0 ? String(row[nameColIndex] || '').trim() : '';
          const hours = parseFloat(String(row[hoursColIndex] || '0')) || 0;

          if (!iqamaNo || hours <= 0) continue;

          // Aggregate hours for duplicate IQAMA numbers
          if (hoursMap.has(iqamaNo)) {
            const existing = hoursMap.get(iqamaNo)!;
            existing.hours += hours;
          } else {
            hoursMap.set(iqamaNo, { name, hours });
          }
        }

        // Match with laborers
        const imported: ImportedRow[] = [];
        let matched = 0;
        let unmatched = 0;

        hoursMap.forEach((data, iqamaNo) => {
          const laborer = laborers?.find(l => l.idNumber === iqamaNo);
          if (laborer) {
            imported.push({
              iqamaNo,
              name: data.name,
              hours: data.hours,
              matched: true,
              laborerId: laborer.id,
              laborerName: laborer.name,
            });
            matched++;
          } else {
            imported.push({
              iqamaNo,
              name: data.name,
              hours: data.hours,
              matched: false,
            });
            unmatched++;
          }
        });

        // Sort: matched first, then unmatched
        imported.sort((a, b) => {
          if (a.matched && !b.matched) return -1;
          if (!a.matched && b.matched) return 1;
          return 0;
        });

        setImportedData(imported);
        setImportStats({ matched, unmatched, total: matched + unmatched });
        setShowImportModal(true);
      } catch (error) {
        console.error('Error parsing Excel:', error);
        toast.error('Failed to parse Excel file');
      }
    };
    reader.readAsArrayBuffer(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const applyImportedData = () => {
    if (!laborers) return;

    // Create new entries with imported hours (only matched ones)
    const newEntries = laborers.map(laborer => {
      const imported = importedData.find(d => d.matched && d.laborerId === laborer.id);
      return {
        laborerId: laborer.id,
        jobId: laborer.jobId,
        totalHours: imported?.hours || 0,
        overtime: 0,
        overtimeMultiplier: 1.5,
      };
    });

    setEntries(newEntries);
    setEditMode(true);
    setShowImportModal(false);
    toast.success(`Imported ${importStats.matched} laborers. ${importStats.unmatched} skipped (not found).`);
  };

  if (loadingLaborers || loadingTimesheets) {
    return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monthly Timesheets</h1>
          <p className="mt-1 text-sm text-gray-500">
            {editMode ? 'Enter total hours for the month' : 'View hours worked for all laborers'}
          </p>
        </div>
        <div className="flex space-x-2">
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx,.xls"
            className="hidden"
          />
          <button
            onClick={handleResetMonth}
            disabled={resetMonthMutation.isLoading || !monthlyTimesheets?.length}
            className="btn-secondary text-red-600 hover:bg-red-50 disabled:opacity-50"
            title="Delete all timesheets for this month"
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Reset Month
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary"
          >
            <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
            Import Excel
          </button>
          <button
            onClick={() => setEditMode(!editMode)}
            className={editMode ? 'btn-secondary' : 'btn-primary'}
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            {editMode ? 'Cancel Edit' : 'Edit Hours'}
          </button>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <button onClick={() => navigateMonth('prev')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <h3 className="text-xl font-semibold text-gray-900">{formatMonthYear(currentMonth)}</h3>
          <button onClick={() => navigateMonth('next')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Edit Mode Controls */}
      {editMode && (
        <div className="card p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Working Days</label>
              <input
                type="number"
                min="1"
                max={daysInMonth}
                value={workingDays}
                onChange={(e) => setWorkingDays(parseInt(e.target.value) || 26)}
                className="input w-24 text-center"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Quick Set:</span>
              <button onClick={() => setAllHours(workingDays * 10)} className="btn-secondary text-sm py-1">
                All {workingDays * 10}h
              </button>
              <button onClick={() => setAllHours(workingDays * 8)} className="btn-secondary text-sm py-1">
                All {workingDays * 8}h
              </button>
              <button onClick={() => setAllHours(0)} className="btn-secondary text-sm py-1">Clear</button>
            </div>
            <button
              onClick={handleSave}
              disabled={bulkSaveMutation.isLoading}
              className="btn-primary ml-auto"
            >
              {bulkSaveMutation.isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : <DocumentTextIcon className="h-4 w-4 mr-2" />}
              Save Monthly Hours
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards - Only show in view mode */}
      {!editMode && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="card p-4">
            <div className="flex items-center space-x-2 text-gray-500 mb-1">
              <UserGroupIcon className="h-4 w-4" /><span className="text-xs">Laborers Worked</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{totals.laborersWorked}</div>
          </div>
          <div className="card p-4">
            <div className="flex items-center space-x-2 text-gray-500 mb-1">
              <ClockIcon className="h-4 w-4" /><span className="text-xs">Regular Hours</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{totals.regularHours.toFixed(1)}</div>
          </div>
          <div className="card p-4">
            <div className="flex items-center space-x-2 text-gray-500 mb-1">
              <ClockIcon className="h-4 w-4" /><span className="text-xs">Overtime Hours</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">{totals.overtimeHours.toFixed(1)}</div>
          </div>
          <div className="card p-4">
            <div className="flex items-center space-x-2 text-gray-500 mb-1">
              <ChartBarIcon className="h-4 w-4" /><span className="text-xs">Total Hours</span>
            </div>
            <div className="text-2xl font-bold text-primary-600">{totals.totalHours.toFixed(1)}</div>
          </div>
          <div className="card p-4">
            <div className="flex items-center space-x-2 text-gray-500 mb-1">
              <CurrencyDollarIcon className="h-4 w-4" /><span className="text-xs">Labor Cost</span>
            </div>
            <div className="text-2xl font-bold text-red-600">{totals.totalPay.toLocaleString()} SAR</div>
          </div>
          <div className="card p-4">
            <div className="flex items-center space-x-2 text-gray-500 mb-1">
              <CurrencyDollarIcon className="h-4 w-4" /><span className="text-xs">Client Charge</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{totals.totalCharge.toLocaleString()} SAR</div>
          </div>
        </div>
      )}

      {/* Search */}
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
          {!editMode && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Sort by:</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="input text-sm">
                <option value="name">Name</option>
                <option value="hours">Total Hours</option>
                <option value="pay">Client Charge</option>
              </select>
            </div>
          )}
        </div>
      </div>


      {/* Table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">{formatMonthYear(currentMonth)} {editMode ? 'Entry' : 'Summary'}</h3>
          <span className="text-sm text-gray-500">{filteredSummaries.length} laborers</span>
        </div>
        
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="table">
            <thead className="table-header sticky top-0 bg-gray-50 z-10">
              <tr>
                <th className="table-header-cell">Laborer</th>
                <th className="table-header-cell">Job</th>
                {editMode ? (
                  <>
                    <th className="table-header-cell text-center w-32">Total Hours</th>
                    <th className="table-header-cell text-center w-32">Overtime</th>
                    <th className="table-header-cell text-center w-20">OT Rate</th>
                  </>
                ) : (
                  <>
                    <th className="table-header-cell text-center">Days</th>
                    <th className="table-header-cell text-center">Regular</th>
                    <th className="table-header-cell text-center">Overtime</th>
                    <th className="table-header-cell text-center">Total</th>
                    <th className="table-header-cell text-right">Labor Cost</th>
                    <th className="table-header-cell text-right">Client Charge</th>
                    <th className="table-header-cell text-right">Profit</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="table-body">
              {filteredSummaries.map((summary) => {
                const entry = getEntryForLaborer(summary.laborer.id);
                const hasHours = editMode ? (entry.totalHours > 0 || entry.overtime > 0) : summary.daysWorked > 0;
                
                return (
                  <tr key={summary.laborer.id} className={hasHours ? 'bg-green-50' : ''}>
                    <td className="table-cell">
                      <div>
                        <div className="font-medium">{summary.laborer.name}</div>
                        <div className="text-xs text-gray-500">{summary.laborer.idNumber}</div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="badge badge-success text-xs">{summary.laborer.job?.name || '-'}</span>
                    </td>
                    {editMode ? (
                      <>
                        <td className="table-cell">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={entry.totalHours || ''}
                            onChange={(e) => updateEntry(summary.laborer.id, 'totalHours', parseFloat(e.target.value) || 0)}
                            className="input w-28 text-center text-sm"
                            placeholder="0"
                          />
                        </td>
                        <td className="table-cell">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={entry.overtime || ''}
                            onChange={(e) => updateEntry(summary.laborer.id, 'overtime', parseFloat(e.target.value) || 0)}
                            className="input w-28 text-center text-sm"
                            placeholder="0"
                          />
                        </td>
                        <td className="table-cell">
                          <select
                            value={entry.overtime > 0 ? entry.overtimeMultiplier : ''}
                            onChange={(e) => updateEntry(summary.laborer.id, 'overtimeMultiplier', parseFloat(e.target.value))}
                            disabled={entry.overtime === 0}
                            className={`input text-sm w-16 ${entry.overtime === 0 ? 'bg-gray-100 text-gray-400' : ''}`}
                          >
                            <option value="">-</option>
                            <option value={1.0}>1x</option>
                            <option value={1.5}>1.5x</option>
                            <option value={2.0}>2x</option>
                          </select>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="table-cell text-center">
                          <span className={summary.daysWorked > 0 ? 'font-medium' : 'text-gray-400'}>{summary.daysWorked || '-'}</span>
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
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
            {!editMode && (
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
            )}
          </table>
        </div>

        {filteredSummaries.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            {searchQuery ? 'No laborers match your search.' : 'No laborers found.'}
          </div>
        )}
      </div>


      {/* Import Preview Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Import Preview</h3>
                <p className="text-sm text-gray-500">Review imported data before applying</p>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Stats */}
            <div className="px-6 py-4 bg-gray-50 border-b flex gap-6">
              <div className="flex items-center space-x-2">
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                <span className="text-sm"><strong>{importStats.matched}</strong> matched</span>
              </div>
              <div className="flex items-center space-x-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                <span className="text-sm"><strong>{importStats.unmatched}</strong> not found (will be skipped)</span>
              </div>
              <div className="text-sm text-gray-500">
                Total: {importStats.total} entries
              </div>
            </div>

            {/* Data Table */}
            <div className="overflow-y-auto max-h-[400px]">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">IQAMA NO</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Excel Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">System Name</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {importedData.map((row, index) => (
                    <tr key={index} className={row.matched ? 'bg-green-50' : 'bg-yellow-50'}>
                      <td className="px-4 py-2">
                        {row.matched ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        ) : (
                          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm font-mono">{row.iqamaNo}</td>
                      <td className="px-4 py-2 text-sm">{row.name}</td>
                      <td className="px-4 py-2 text-sm">
                        {row.matched ? (
                          <span className="text-green-700">{row.laborerName}</span>
                        ) : (
                          <span className="text-yellow-700 italic">Not found</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-medium">{row.hours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => setShowImportModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={applyImportedData}
                disabled={importStats.matched === 0}
                className="btn-primary"
              >
                Apply {importStats.matched} Matched Entries
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
