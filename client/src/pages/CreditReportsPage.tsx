import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  ChartBarIcon,
  DocumentArrowDownIcon,
  CalendarIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface ReportData {
  period: string;
  deposits: number;
  withdrawals: number;
  advances: number;
  netFlow: number;
  runningBalance: number;
  transactionCount: number;
  transactions: any[];
}

interface ReportTotals {
  totalDeposits: number;
  totalWithdrawals: number;
  totalAdvances: number;
  totalTransactions: number;
  finalBalance: number;
}

interface CreditReport {
  reportData: ReportData[];
  totals: ReportTotals;
  filters: {
    startDate?: string;
    endDate?: string;
    groupBy: string;
  };
  generatedAt: string;
}

export default function CreditReportsPage() {
  const [report, setReport] = useState<CreditReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of current year
    endDate: new Date().toISOString().split('T')[0], // Today
    groupBy: 'month'
  });

  useEffect(() => {
    generateReport();
  }, []);

  const generateReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      params.append('groupBy', filters.groupBy);

      const response = await api.get(`/credits/reports/detailed?${params.toString()}`);
      setReport(response.data);
    } catch (error) {
      toast.error('Failed to generate credit report');
    } finally {
      setLoading(false);
    }
  };

  const togglePeriodExpansion = (period: string) => {
    const newExpanded = new Set(expandedPeriods);
    if (newExpanded.has(period)) {
      newExpanded.delete(period);
    } else {
      newExpanded.add(period);
    }
    setExpandedPeriods(newExpanded);
  };

  const formatPeriod = (period: string, groupBy: string) => {
    if (groupBy === 'day') {
      return new Date(period).toLocaleDateString();
    } else if (groupBy === 'week') {
      const date = new Date(period);
      const endDate = new Date(date);
      endDate.setDate(date.getDate() + 6);
      return `${date.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    } else if (groupBy === 'year') {
      return period;
    } else { // month
      const [year, month] = period.split('-');
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      });
    }
  };

  const exportToCSV = () => {
    if (!report) return;

    const csvData = [
      ['Period', 'Deposits (SAR)', 'Withdrawals (SAR)', 'Advances (SAR)', 'Net Flow (SAR)', 'Running Balance (SAR)', 'Transaction Count'],
      ...report.reportData.map(item => [
        formatPeriod(item.period, report.filters.groupBy),
        item.deposits.toFixed(2),
        item.withdrawals.toFixed(2),
        item.advances.toFixed(2),
        item.netFlow.toFixed(2),
        item.runningBalance.toFixed(2),
        item.transactionCount.toString()
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `credit-report-${filters.startDate}-to-${filters.endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'DEPOSIT': return 'text-green-600 bg-green-100';
      case 'WITHDRAWAL': return 'text-red-600 bg-red-100';
      case 'ADVANCE': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Credit Reports</h1>
          <p className="text-gray-600">Detailed analysis of credit transactions and balances</p>
        </div>
        <div className="flex items-center space-x-3">
          {report && (
            <button
              onClick={exportToCSV}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
            >
              <DocumentArrowDownIcon className="h-5 w-5" />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-4">Report Filters</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              Group By
            </label>
            <select
              value={filters.groupBy}
              onChange={(e) => setFilters({ ...filters, groupBy: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={generateReport}
              disabled={loading}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <ArrowPathIcon className="h-5 w-5" />
                  <span>Generate Report</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {report && !loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Deposits</p>
                  <p className="text-2xl font-bold text-green-600">
                    {report.totals.totalDeposits.toLocaleString()} SAR
                  </p>
                </div>
                <ArrowTrendingUpIcon className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Withdrawals</p>
                  <p className="text-2xl font-bold text-red-600">
                    {report.totals.totalWithdrawals.toLocaleString()} SAR
                  </p>
                </div>
                <ArrowTrendingDownIcon className="h-8 w-8 text-red-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Advances</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {report.totals.totalAdvances.toLocaleString()} SAR
                  </p>
                </div>
                <BanknotesIcon className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Final Balance</p>
                  <p className={`text-2xl font-bold ${report.totals.finalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {report.totals.finalBalance.toLocaleString()} SAR
                  </p>
                </div>
                <BanknotesIcon className={`h-8 w-8 ${report.totals.finalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Transactions</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {report.totals.totalTransactions}
                  </p>
                </div>
                <ChartBarIcon className="h-8 w-8 text-gray-600" />
              </div>
            </div>
          </div>

          {/* Report Data */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Credit Flow Analysis ({formatPeriod(report.reportData[0]?.period || '', report.filters.groupBy)} - {formatPeriod(report.reportData[report.reportData.length - 1]?.period || '', report.filters.groupBy)})
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Generated on {new Date(report.generatedAt).toLocaleString()}
              </p>
            </div>

            {report.reportData.length === 0 ? (
              <div className="text-center py-12">
                <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No data found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No credit transactions found for the selected date range.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Period
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Deposits
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Withdrawals
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Advances
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Net Flow
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Running Balance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Transactions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {report.reportData.map((item) => (
                      <React.Fragment key={item.period}>
                        <tr 
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => togglePeriodExpansion(item.period)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                              <span className="text-sm font-medium text-gray-900">
                                {formatPeriod(item.period, report.filters.groupBy)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-green-600">
                              +{item.deposits.toLocaleString()} SAR
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-red-600">
                              -{item.withdrawals.toLocaleString()} SAR
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-blue-600">
                              +{item.advances.toLocaleString()} SAR
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm font-medium ${item.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {item.netFlow >= 0 ? '+' : ''}{item.netFlow.toLocaleString()} SAR
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm font-medium ${item.runningBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {item.runningBalance.toLocaleString()} SAR
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900">
                              {item.transactionCount} transactions
                            </span>
                          </td>
                        </tr>
                        
                        {/* Expanded transaction details */}
                        {expandedPeriods.has(item.period) && (
                          <tr>
                            <td colSpan={7} className="px-6 py-4 bg-gray-50">
                              <div className="space-y-2">
                                <h4 className="text-sm font-medium text-gray-900 mb-3">
                                  Transaction Details for {formatPeriod(item.period, report.filters.groupBy)}
                                </h4>
                                <div className="grid gap-2">
                                  {item.transactions.map((transaction) => (
                                    <div key={transaction.id} className="flex items-center justify-between bg-white rounded p-3 border">
                                      <div className="flex items-center space-x-3">
                                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(transaction.type)}`}>
                                          {transaction.type}
                                        </span>
                                        <div>
                                          <div className="text-sm font-medium text-gray-900">
                                            {transaction.description}
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            {new Date(transaction.date).toLocaleDateString()}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className={`text-sm font-medium ${
                                          transaction.type === 'WITHDRAWAL' ? 'text-red-600' : 'text-green-600'
                                        }`}>
                                          {transaction.type === 'WITHDRAWAL' ? '-' : '+'}{transaction.amount.toLocaleString()} SAR
                                        </div>
                                        {transaction.notes && (
                                          <div className="text-xs text-gray-500">
                                            {transaction.notes}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}