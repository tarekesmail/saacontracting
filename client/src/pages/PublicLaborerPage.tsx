import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  CalendarDaysIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UserIcon,
  BriefcaseIcon
} from '@heroicons/react/24/outline';

interface DailyData {
  date: string;
  day: number;
  regularHours: number;
  overtimeHours: number;
  overtimeMultiplier: number;
  totalHours: number;
  jobName: string;
  regularPay: number;
  overtimePay: number;
  totalPay: number;
  notes: string;
}

interface LaborerData {
  laborer: {
    name: string;
    idNumber: string;
    jobName: string;
    salaryRate: number;
    tenantName: string;
  };
  period: {
    year: number;
    month: number;
    monthName: string;
    daysInMonth: number;
    firstDayOfWeek: number;
  };
  dailyData: DailyData[];
  summary: {
    totalDaysWorked: number;
    totalRegularHours: number;
    totalOvertimeHours: number;
    totalHours: number;
    totalRegularPay: number;
    totalOvertimePay: number;
    totalPay: number;
  };
}

export default function PublicLaborerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [idNumber, setIdNumber] = useState(searchParams.get('id') || '');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [data, setData] = useState<LaborerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async (id: string, year: number, month: number) => {
    if (!id) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`/api/public/laborer-timesheet`, {
        params: {
          idNumber: id,
          year: year.toString(),
          month: month.toString()
        }
      });
      setData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load data');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (idNumber) {
      fetchData(idNumber, currentDate.getFullYear(), currentDate.getMonth() + 1);
    }
  }, [idNumber, currentDate]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (idNumber.trim()) {
      setSearchParams({ id: idNumber.trim() });
      fetchData(idNumber.trim(), currentDate.getFullYear(), currentDate.getMonth() + 1);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const getDayData = (day: number): DailyData | null => {
    return data?.dailyData.find(d => d.day === day) || null;
  };

  const renderCalendar = () => {
    if (!data) return null;

    const { daysInMonth, firstDayOfWeek } = data.period;
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayData = getDayData(day);
      const hasData = dayData !== null;
      
      days.push(
        <div
          key={day}
          className={`p-2 border rounded-lg min-h-[80px] ${
            hasData 
              ? 'bg-green-50 border-green-200' 
              : 'bg-gray-50 border-gray-200'
          }`}
        >
          <div className="font-medium text-sm mb-1">{day}</div>
          {hasData && (
            <div className="text-xs space-y-1">
              <div className="text-blue-600 font-medium">
                {dayData.totalHours}h
              </div>
              {dayData.overtimeHours > 0 && (
                <div className="text-orange-600">
                  OT: {dayData.overtimeHours}h
                </div>
              )}
              <div className="text-green-600 font-medium">
                {dayData.totalPay.toFixed(0)} SAR
              </div>
            </div>
          )}
        </div>
      );
    }
    
    return days;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">SAA Contracting</h1>
              <p className="text-sm text-gray-500">Laborer Timesheet Portal</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <form onSubmit={handleSearch} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter Your ID Number
              </label>
              <input
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="Enter your ID number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'View Timesheet'}
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {data && (
          <>
            {/* Laborer Info */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex items-center">
                  <UserIcon className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <div className="text-sm text-gray-500">Name</div>
                    <div className="font-medium">{data.laborer.name}</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <BriefcaseIcon className="h-8 w-8 text-green-600 mr-3" />
                  <div>
                    <div className="text-sm text-gray-500">Job</div>
                    <div className="font-medium">{data.laborer.jobName}</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <CurrencyDollarIcon className="h-8 w-8 text-purple-600 mr-3" />
                  <div>
                    <div className="text-sm text-gray-500">Salary Rate</div>
                    <div className="font-medium">{data.laborer.salaryRate} SAR/hour</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-gray-600 font-medium text-sm">
                      {data.laborer.tenantName.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Company</div>
                    <div className="font-medium">{data.laborer.tenantName}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Month Navigation */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                >
                  <ChevronLeftIcon className="h-5 w-5 mr-1" />
                  Previous
                </button>
                
                <h2 className="text-xl font-bold text-gray-900">
                  {data.period.monthName} {data.period.year}
                </h2>
                
                <button
                  onClick={() => navigateMonth('next')}
                  className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                >
                  Next
                  <ChevronRightIcon className="h-5 w-5 ml-1" />
                </button>
              </div>
            </div>

            {/* Monthly Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <CalendarDaysIcon className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <div className="text-2xl font-bold text-gray-900">
                      {data.summary.totalDaysWorked}
                    </div>
                    <div className="text-sm text-gray-500">Days Worked</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <ClockIcon className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <div className="text-2xl font-bold text-gray-900">
                      {data.summary.totalHours.toFixed(1)}h
                    </div>
                    <div className="text-sm text-gray-500">Total Hours</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <ClockIcon className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <div className="text-2xl font-bold text-gray-900">
                      {data.summary.totalOvertimeHours.toFixed(1)}h
                    </div>
                    <div className="text-sm text-gray-500">Overtime Hours</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <CurrencyDollarIcon className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <div className="text-2xl font-bold text-gray-900">
                      {data.summary.totalPay.toFixed(2)} SAR
                    </div>
                    <div className="text-sm text-gray-500">Total Pay</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Calendar */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2 text-center font-medium text-gray-500 text-sm">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {renderCalendar()}
              </div>
            </div>

            {/* Daily Details */}
            {data.dailyData.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6 mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Details</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Regular Hours
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Overtime Hours
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          OT Rate
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Hours
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Pay
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.dailyData.map((day, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {new Date(day.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {day.regularHours}h
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {day.overtimeHours}h
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {day.overtimeMultiplier}x
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {day.totalHours}h
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                            {day.totalPay.toFixed(2)} SAR
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {day.notes}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}