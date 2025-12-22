import { useState } from 'react';
import { useQuery } from 'react-query';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import SearchableSelect from '../components/SearchableSelect';
import { 
  DocumentChartBarIcon,
  DocumentArrowDownIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  UsersIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

type ReportType = 'labor' | 'client';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('labor');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // 30 days ago
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]); // Today
  const [selectedLaborerId, setSelectedLaborerId] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const { user } = useAuth();

  const { data: laborers } = useQuery('laborers', async () => {
    const response = await api.get('/laborers?limit=1000');
    return response.data.laborers;
  });

  const { data: jobs } = useQuery('jobs', async () => {
    const response = await api.get('/jobs');
    return response.data;
  });

  // Prepare laborer options for searchable select
  const laborerOptions = laborers?.map((laborer: any) => ({
    value: laborer.id,
    label: `${laborer.name} (${laborer.idNumber})`
  })) || [];

  const { data: reportData, isLoading, refetch } = useQuery(
    ['reports', reportType, startDate, endDate, selectedLaborerId, selectedJobId],
    async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
        ...(selectedLaborerId && { laborerId: selectedLaborerId }),
        ...(selectedJobId && { jobId: selectedJobId })
      });
      
      const response = await api.get(`/reports/${reportType}?${params}`);
      return response.data;
    },
    {
      enabled: !!startDate && !!endDate
    }
  );

  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        ...(selectedLaborerId && { laborerId: selectedLaborerId }),
        ...(selectedJobId && { jobId: selectedJobId })
      });

      const response = await api.get(`/reports/${reportType}/excel?${params}`, {
        responseType: 'blob'
      });

      // Create blob and download
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportType}-report-${startDate}-${endDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Report exported successfully!');
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  const handleExportCSV = () => {
    if (!reportData?.data) return;

    const csvData = reportData.data.map((item: any) => {
      if (reportType === 'labor') {
        return {
          'Laborer Name': item.laborerName,
          'ID Number': item.laborerId,
          Job: item.jobName,
          'Days Worked': item.daysWorked,
          'Regular Hours': item.regularHours.toFixed(1),
          'Overtime Hours': item.overtimeHours.toFixed(1),
          'OT Rate': `${item.overtimeMultiplier}x`,
          'Total Hours': item.totalHours.toFixed(1),
          'Salary Rate (SAR)': item.salaryRate,
          'Regular Pay (SAR)': item.regularPay.toFixed(2),
          'Overtime Pay (SAR)': item.overtimePay.toFixed(2),
          'Total Pay (SAR)': item.totalPay.toFixed(2)
        };
      } else {
        return {
          'Laborer Name': item.laborerName,
          'ID Number': item.laborerId,
          Job: item.jobName,
          'Days Worked': item.daysWorked,
          'Regular Hours': item.regularHours.toFixed(1),
          'Overtime Hours': item.overtimeHours.toFixed(1),
          'OT Rate': `${item.overtimeMultiplier}x`,
          'Total Hours': item.totalHours.toFixed(1),
          'Org Rate (SAR)': item.orgRate,
          'Regular Charge (SAR)': item.regularCharge.toFixed(2),
          'Overtime Charge (SAR)': item.overtimeCharge.toFixed(2),
          'Total Charge (SAR)': item.totalCharge.toFixed(2),
          'Profit (SAR)': item.profit.toFixed(2)
        };
      }
    });

    const ws = XLSX.utils.json_to_sheet(csvData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${reportType} Report`);
    XLSX.writeFile(wb, `${reportType}-report-${startDate}-${endDate}.xlsx`);
    
    toast.success('Report exported successfully!');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="mt-1 text-sm text-gray-500">
            Generate labor and client reports with Excel export
          </p>
        </div>
      </div>

      {/* Report Controls */}
      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div>
            <label className="label">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="input"
            >
              <option value="labor">Labor Report (Salary Rates)</option>
              <option value="client">Client Report (Org Rates)</option>
            </select>
          </div>

          <div>
            <label className="label">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="label">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="label">Laborer (Optional)</label>
            <SearchableSelect
              options={laborerOptions}
              value={selectedLaborerId}
              onChange={setSelectedLaborerId}
              placeholder="All Laborers"
              className="w-full"
            />
          </div>

          <div>
            <label className="label">Job (Optional)</label>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="input"
            >
              <option value="">All Jobs</option>
              {jobs?.map((job: any) => (
                <option key={job.id} value={job.id}>
                  {job.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end space-x-2">
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="btn-primary"
            >
              {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {/* Report Summary */}
      {reportData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-6">
            <div className="flex items-center">
              <CalendarDaysIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {reportData.summary.totalHours.toFixed(1)}h
                </div>
                <div className="text-sm text-gray-500">Total Hours</div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <UsersIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {reportData.summary.recordCount}
                </div>
                <div className="text-sm text-gray-500">Records</div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {reportType === 'labor' 
                    ? reportData.summary.totalPay.toFixed(2)
                    : reportData.summary.totalCharge.toFixed(2)
                  } SAR
                </div>
                <div className="text-sm text-gray-500">
                  {reportType === 'labor' ? 'Total Labor Cost' : 'Total Client Charge'}
                </div>
              </div>
            </div>
          </div>

          {reportType === 'client' && (
            <div className="card p-6">
              <div className="flex items-center">
                <BuildingOfficeIcon className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {reportData.summary.totalProfit.toFixed(2)} SAR
                  </div>
                  <div className="text-sm text-gray-500">Total Profit</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Export Buttons */}
      {reportData && (
        <div className="card p-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Export Options</h3>
            <div className="flex space-x-3">
              <button
                onClick={handleExportCSV}
                className="btn-secondary"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                Export CSV
              </button>
              <button
                onClick={handleExportExcel}
                className="btn-primary"
              >
                <DocumentChartBarIcon className="h-4 w-4 mr-2" />
                Export Excel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Data Table */}
      {reportData && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {reportType === 'labor' ? 'Labor Report' : 'Client Report'} - 
              {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Laborer</th>
                  <th className="table-header-cell">ID</th>
                  <th className="table-header-cell">Job</th>
                  <th className="table-header-cell">Days Worked</th>
                  <th className="table-header-cell">Regular Hours</th>
                  <th className="table-header-cell">Overtime Hours</th>
                  <th className="table-header-cell">OT Rate</th>
                  <th className="table-header-cell">Total Hours</th>
                  {reportType === 'labor' ? (
                    <>
                      <th className="table-header-cell">Salary Rate</th>
                      <th className="table-header-cell">Regular Pay</th>
                      <th className="table-header-cell">Overtime Pay</th>
                      <th className="table-header-cell">Total Pay</th>
                    </>
                  ) : (
                    <>
                      <th className="table-header-cell">Org Rate</th>
                      <th className="table-header-cell">Regular Charge</th>
                      <th className="table-header-cell">Overtime Charge</th>
                      <th className="table-header-cell">Total Charge</th>
                      <th className="table-header-cell">Profit</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="table-body">
                {reportData.data.map((item: any, index: number) => (
                  <tr key={index}>
                    <td className="table-cell font-medium">{item.laborerName}</td>
                    <td className="table-cell">{item.laborerId}</td>
                    <td className="table-cell">
                      <span className="badge badge-success">{item.jobName}</span>
                    </td>
                    <td className="table-cell font-medium text-blue-600">{item.daysWorked}</td>
                    <td className="table-cell">{item.regularHours.toFixed(1)}</td>
                    <td className="table-cell">{item.overtimeHours.toFixed(1)}</td>
                    <td className="table-cell">{item.overtimeMultiplier}x</td>
                    <td className="table-cell font-medium">{item.totalHours.toFixed(1)}</td>
                    {reportType === 'labor' ? (
                      <>
                        <td className="table-cell">{item.salaryRate} SAR</td>
                        <td className="table-cell text-blue-600">{item.regularPay.toFixed(2)} SAR</td>
                        <td className="table-cell text-blue-600">{item.overtimePay.toFixed(2)} SAR</td>
                        <td className="table-cell font-bold text-blue-600">{item.totalPay.toFixed(2)} SAR</td>
                      </>
                    ) : (
                      <>
                        <td className="table-cell">{item.orgRate} SAR</td>
                        <td className="table-cell text-green-600">{item.regularCharge.toFixed(2)} SAR</td>
                        <td className="table-cell text-green-600">{item.overtimeCharge.toFixed(2)} SAR</td>
                        <td className="table-cell font-bold text-green-600">{item.totalCharge.toFixed(2)} SAR</td>
                        <td className="table-cell font-bold text-yellow-600">{item.profit.toFixed(2)} SAR</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {reportData.data.length === 0 && (
            <div className="p-6 text-center text-gray-500">
              No data found for the selected criteria.
            </div>
          )}
        </div>
      )}
    </div>
  );
}