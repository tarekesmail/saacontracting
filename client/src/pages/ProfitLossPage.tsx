import { useState } from 'react';
import { useQuery } from 'react-query';
import { api } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  DocumentChartBarIcon,
  DocumentArrowDownIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BanknotesIcon,
  ReceiptPercentIcon,
  ChartBarIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export default function ProfitLossPage() {
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // 30 days ago
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]); // Today
  const [selectedJobId, setSelectedJobId] = useState('');

  const { data: jobs } = useQuery('jobs', async () => {
    const response = await api.get('/jobs');
    return response.data;
  });

  const { data: reportData, isLoading, refetch } = useQuery(
    ['profit-loss-report', startDate, endDate, selectedJobId],
    async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
        ...(selectedJobId && { jobId: selectedJobId })
      });
      
      const response = await api.get(`/reports/profit-loss?${params}`);
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
        ...(selectedJobId && { jobId: selectedJobId })
      });

      const response = await api.get(`/reports/profit-loss/excel?${params}`, {
        responseType: 'blob'
      });

      // Create blob and download
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `profit-loss-report-${startDate}-${endDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('P&L Report exported successfully!');
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  const handleExportCSV = () => {
    if (!reportData) return;

    const csvData = [
      {
        'Metric': 'Total Revenue',
        'Amount (SAR)': reportData.summary.totalRevenue.toFixed(2)
      },
      {
        'Metric': 'Labor Costs',
        'Amount (SAR)': reportData.summary.totalLaborCosts.toFixed(2)
      },
      {
        'Metric': 'Gross Profit',
        'Amount (SAR)': reportData.summary.grossProfit.toFixed(2)
      },
      {
        'Metric': 'Total Expenses',
        'Amount (SAR)': reportData.summary.totalExpenses.toFixed(2)
      },
      {
        'Metric': 'Net Profit',
        'Amount (SAR)': reportData.summary.netProfit.toFixed(2)
      }
    ];

    const ws = XLSX.utils.json_to_sheet(csvData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'P&L Summary');
    XLSX.writeFile(wb, `profit-loss-summary-${startDate}-${endDate}.xlsx`);
    
    toast.success('P&L Summary exported successfully!');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profit & Loss Report</h1>
          <p className="mt-1 text-sm text-gray-500">
            Comprehensive financial analysis with revenue, costs, and profitability
          </p>
        </div>
      </div>

      {/* Report Controls */}
      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

          <div className="flex items-end">
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics Summary */}
      {reportData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-6">
            <div className="flex items-center">
              <BanknotesIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {reportData.summary.totalRevenue.toFixed(0)} SAR
                </div>
                <div className="text-sm text-gray-500">Total Revenue</div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <ReceiptPercentIcon className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {reportData.summary.totalCosts.toFixed(0)} SAR
                </div>
                <div className="text-sm text-gray-500">Total Costs</div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              {reportData.summary.netProfit >= 0 ? (
                <ArrowTrendingUpIcon className="h-8 w-8 text-green-600" />
              ) : (
                <ArrowTrendingDownIcon className="h-8 w-8 text-red-600" />
              )}
              <div className="ml-4">
                <div className={`text-2xl font-bold ${
                  reportData.summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {reportData.summary.netProfit.toFixed(0)} SAR
                </div>
                <div className="text-sm text-gray-500">Net Profit</div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <div className={`text-2xl font-bold ${
                  reportData.summary.netMargin >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {reportData.summary.netMargin.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-500">Net Margin</div>
              </div>
            </div>
          </div>
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

      {/* Detailed P&L Statement */}
      {reportData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* P&L Statement */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-medium text-gray-900">
                Profit & Loss Statement
              </h3>
              <p className="text-sm text-gray-600">
                {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Revenue Section */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">REVENUE</h4>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">Total Revenue</span>
                  <span className="font-semibold text-green-600">
                    {reportData.summary.totalRevenue.toLocaleString()} SAR
                  </span>
                </div>
              </div>

              {/* Cost of Goods Sold */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">COST OF GOODS SOLD</h4>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">Labor Costs</span>
                  <span className="font-medium text-red-600">
                    {reportData.summary.totalLaborCosts.toLocaleString()} SAR
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b-2 border-gray-200 font-semibold">
                  <span className="text-gray-900">Gross Profit</span>
                  <span className={reportData.summary.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {reportData.summary.grossProfit.toLocaleString()} SAR
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 text-sm">
                  <span className="text-gray-600">Gross Margin</span>
                  <span className={reportData.summary.grossMargin >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {reportData.summary.grossMargin.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Operating Expenses */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">OPERATING EXPENSES</h4>
                {reportData.expensesBreakdown.map((expense: any, index: number) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <div className="flex items-center">
                      <div
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: expense.categoryColor }}
                      />
                      <span className="text-gray-700">{expense.categoryName}</span>
                    </div>
                    <span className="font-medium text-red-600">
                      {expense.amount.toLocaleString()} SAR
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-center py-2 border-b-2 border-gray-200 font-semibold">
                  <span className="text-gray-900">Total Expenses</span>
                  <span className="text-red-600">
                    {reportData.summary.totalExpenses.toLocaleString()} SAR
                  </span>
                </div>
              </div>

              {/* Net Profit */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">NET PROFIT</span>
                  <span className={`text-xl font-bold ${
                    reportData.summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {reportData.summary.netProfit.toLocaleString()} SAR
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm text-gray-600">Net Margin</span>
                  <span className={`text-sm font-medium ${
                    reportData.summary.netMargin >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {reportData.summary.netMargin.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Job Performance Breakdown */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-medium text-gray-900">Job Performance</h3>
              <p className="text-sm text-gray-600">Revenue and profitability by job</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">Job</th>
                    <th className="table-header-cell">Hours</th>
                    <th className="table-header-cell">Revenue</th>
                    <th className="table-header-cell">Profit</th>
                    <th className="table-header-cell">Margin</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {reportData.jobBreakdown.map((job: any, index: number) => (
                    <tr key={index}>
                      <td className="table-cell font-medium">{job.jobName}</td>
                      <td className="table-cell">{job.hours.toFixed(1)}h</td>
                      <td className="table-cell text-green-600 font-medium">
                        {job.revenue.toLocaleString()} SAR
                      </td>
                      <td className={`table-cell font-medium ${
                        job.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {job.grossProfit.toLocaleString()} SAR
                      </td>
                      <td className={`table-cell ${
                        job.margin >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {job.margin.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {reportData.jobBreakdown.length === 0 && (
              <div className="p-6 text-center text-gray-500">
                No job data found for the selected period.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Additional Metrics */}
      {reportData && (
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {reportData.summary.totalHours.toFixed(0)}h
              </div>
              <div className="text-sm text-gray-500">Total Hours</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {reportData.summary.averageHourlyRevenue.toFixed(0)} SAR
              </div>
              <div className="text-sm text-gray-500">Avg. Hourly Revenue</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {reportData.summary.averageHourlyLaborCost.toFixed(0)} SAR
              </div>
              <div className="text-sm text-gray-500">Avg. Hourly Labor Cost</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {reportData.summary.totalJobs}
              </div>
              <div className="text-sm text-gray-500">Active Jobs</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}