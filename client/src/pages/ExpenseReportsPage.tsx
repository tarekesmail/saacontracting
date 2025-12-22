import { useState } from 'react';
import { useQuery } from 'react-query';
import { api } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  DocumentChartBarIcon,
  DocumentArrowDownIcon,
  CurrencyDollarIcon,
  TagIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export default function ExpenseReportsPage() {
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // 30 days ago
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]); // Today
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  const { data: expenseCategories } = useQuery('expense-categories', async () => {
    const response = await api.get('/expense-categories');
    return response.data;
  });

  const { data: reportData, isLoading, refetch } = useQuery(
    ['expense-reports', startDate, endDate, selectedCategoryId],
    async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
        ...(selectedCategoryId && { categoryId: selectedCategoryId })
      });
      
      const response = await api.get(`/reports/expenses?${params}`);
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
        ...(selectedCategoryId && { categoryId: selectedCategoryId })
      });

      const response = await api.get(`/reports/expenses/excel?${params}`, {
        responseType: 'blob'
      });

      // Create blob and download
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `expense-report-${startDate}-${endDate}.xlsx`;
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

    const csvData = reportData.data.map((item: any) => ({
      'Category': item.categoryName,
      'Total Amount (SAR)': item.totalAmount.toFixed(2),
      'Expense Count': item.expenseCount
    }));

    const ws = XLSX.utils.json_to_sheet(csvData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expense Report');
    XLSX.writeFile(wb, `expense-report-${startDate}-${endDate}.xlsx`);
    
    toast.success('Report exported successfully!');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Reports</h1>
          <p className="mt-1 text-sm text-gray-500">
            Generate expense reports by category with Excel export
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
            <label className="label">Category (Optional)</label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="input"
            >
              <option value="">All Categories</option>
              {expenseCategories?.map((category: any) => (
                <option key={category.id} value={category.id}>
                  {category.name}
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

      {/* Report Summary */}
      {reportData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-6">
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {reportData.summary.totalAmount.toFixed(2)} SAR
                </div>
                <div className="text-sm text-gray-500">Total Expenses</div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <DocumentChartBarIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {reportData.summary.totalExpenses}
                </div>
                <div className="text-sm text-gray-500">Total Records</div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <TagIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">
                  {reportData.summary.categoryCount}
                </div>
                <div className="text-sm text-gray-500">Categories</div>
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

      {/* Report Data */}
      {reportData && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Expense Report by Category - 
              {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
            </h3>
          </div>
          
          {reportData.data.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No expense data found for the selected criteria.
            </div>
          ) : (
            <>
              {/* Category Summary Cards */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reportData.data.map((category: any, index: number) => (
                  <div
                    key={index}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.categoryColor }}
                        />
                        <h4 className="font-medium text-gray-900">{category.categoryName}</h4>
                      </div>
                      <ChartBarIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Amount:</span>
                        <span className="font-semibold text-red-600">
                          {category.totalAmount.toFixed(2)} SAR
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Expenses:</span>
                        <span className="font-medium text-gray-900">
                          {category.expenseCount}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Average:</span>
                        <span className="text-sm text-gray-700">
                          {(category.totalAmount / category.expenseCount).toFixed(2)} SAR
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Detailed Table */}
              <div className="border-t border-gray-200">
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead className="table-header">
                      <tr>
                        <th className="table-header-cell">Category</th>
                        <th className="table-header-cell">Color</th>
                        <th className="table-header-cell">Expense Count</th>
                        <th className="table-header-cell">Total Amount</th>
                        <th className="table-header-cell">Average Amount</th>
                        <th className="table-header-cell">Percentage</th>
                      </tr>
                    </thead>
                    <tbody className="table-body">
                      {reportData.data.map((category: any, index: number) => {
                        const percentage = (category.totalAmount / reportData.summary.totalAmount * 100);
                        return (
                          <tr key={index}>
                            <td className="table-cell font-medium">{category.categoryName}</td>
                            <td className="table-cell">
                              <div className="flex items-center space-x-2">
                                <div
                                  className="w-4 h-4 rounded-full border border-gray-300"
                                  style={{ backgroundColor: category.categoryColor }}
                                />
                                <span className="text-xs text-gray-500">{category.categoryColor}</span>
                              </div>
                            </td>
                            <td className="table-cell">
                              <span className="badge badge-primary">{category.expenseCount}</span>
                            </td>
                            <td className="table-cell font-bold text-red-600">
                              {category.totalAmount.toFixed(2)} SAR
                            </td>
                            <td className="table-cell text-gray-600">
                              {(category.totalAmount / category.expenseCount).toFixed(2)} SAR
                            </td>
                            <td className="table-cell">
                              <div className="flex items-center space-x-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-red-500 h-2 rounded-full"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium text-gray-700">
                                  {percentage.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}