import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import Pagination from '../components/Pagination';
import AdvancedSearch from '../components/AdvancedSearch';
import { 
  PlusIcon, 
  EyeIcon, 
  DocumentArrowDownIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function InvoicesPage() {
  const [searchParams, setSearchParams] = useState<Record<string, any>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: invoicesData, isLoading } = useQuery(
    ['invoices', currentPage, searchParams, pageSize],
    async () => {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...searchParams
      });
      const response = await api.get(`/invoices?${queryParams}`);
      return response.data;
    },
    {
      keepPreviousData: true,
      staleTime: 30000,
    }
  );

  const updateStatusMutation = useMutation(
    ({ id, status, paidDate, paymentMethod }: { 
      id: string; 
      status: string; 
      paidDate?: string; 
      paymentMethod?: string; 
    }) => api.patch(`/invoices/${id}/status`, { status, paidDate, paymentMethod }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('invoices');
        toast.success('Invoice status updated successfully');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to update invoice status');
      }
    }
  );

  const handleSearch = (newSearchParams: Record<string, any>) => {
    setSearchParams(newSearchParams);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  const handleStatusChange = (invoiceId: string, newStatus: string) => {
    const updateData: any = { id: invoiceId, status: newStatus };
    
    if (newStatus === 'PAID') {
      updateData.paidDate = new Date().toISOString().split('T')[0];
      updateData.paymentMethod = 'Bank Transfer'; // Default, could be made configurable
    }
    
    updateStatusMutation.mutate(updateData);
  };

  const downloadPDF = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const response = await api.get(`/invoices/${invoiceId}/pdf`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to download PDF');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'SENT':
        return <ClockIcon className="h-5 w-5 text-blue-500" />;
      case 'OVERDUE':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'CANCELLED':
        return <XCircleIcon className="h-5 w-5 text-gray-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
      case 'PAID':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'SENT':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'OVERDUE':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'CANCELLED':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const searchFilters = [
    {
      field: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { value: 'DRAFT', label: 'Draft' },
        { value: 'SENT', label: 'Sent' },
        { value: 'PAID', label: 'Paid' },
        { value: 'OVERDUE', label: 'Overdue' },
        { value: 'CANCELLED', label: 'Cancelled' }
      ]
    }
  ];

  if (isLoading) {
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
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your KSA tax-compliant invoices
          </p>
        </div>
        <button 
          onClick={() => window.location.href = '/invoices/new'}
          className="btn-primary"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Invoice
        </button>
      </div>

      {/* Advanced Search */}
      <AdvancedSearch
        onSearch={handleSearch}
        filters={searchFilters}
        placeholder="Search invoices by number or customer name..."
        showAdvanced={true}
      />

      {/* Results Summary */}
      {invoicesData && (
        <div className="flex justify-between items-center text-sm text-gray-600">
          <div>
            {Object.keys(searchParams).length > 0 ? (
              <span>
                Found <strong>{invoicesData.pagination.total}</strong> invoices matching your search
              </span>
            ) : (
              <span>
                Total <strong>{invoicesData.pagination.total}</strong> invoices
              </span>
            )}
          </div>
          <div>
            Page {currentPage} of {invoicesData.pagination.pages}
          </div>
        </div>
      )}

      {/* Invoices Table */}
      <div className="card overflow-hidden">
        <table className="table">
          <thead className="table-header">
            <tr>
              <th className="table-header-cell">Invoice #</th>
              <th className="table-header-cell">Customer</th>
              <th className="table-header-cell">Issue Date</th>
              <th className="table-header-cell">Due Date</th>
              <th className="table-header-cell">Amount</th>
              <th className="table-header-cell">Status</th>
              <th className="table-header-cell">Actions</th>
            </tr>
          </thead>
          <tbody className="table-body">
            {invoicesData?.invoices.map((invoice: any) => (
              <tr key={invoice.id}>
                <td className="table-cell font-medium">
                  #{invoice.invoiceNumber}
                </td>
                <td className="table-cell">
                  <div>
                    <div className="font-medium">{invoice.customerName}</div>
                    <div className="text-sm text-gray-500">{invoice.customerCity}</div>
                  </div>
                </td>
                <td className="table-cell">
                  {new Date(invoice.issueDate).toLocaleDateString()}
                </td>
                <td className="table-cell">
                  {new Date(invoice.dueDate).toLocaleDateString()}
                </td>
                <td className="table-cell">
                  <div className="font-medium text-green-600">
                    {parseFloat(invoice.totalAmount).toFixed(2)} SAR
                  </div>
                  <div className="text-xs text-gray-500">
                    VAT: {parseFloat(invoice.vatAmount).toFixed(2)} SAR
                  </div>
                </td>
                <td className="table-cell">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(invoice.status)}
                    <span className={getStatusBadge(invoice.status)}>
                      {invoice.status}
                    </span>
                  </div>
                </td>
                <td className="table-cell">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => window.location.href = `/invoices/${invoice.id}`}
                      className="text-blue-600 hover:text-blue-900"
                      title="View Invoice"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => downloadPDF(invoice.id, invoice.invoiceNumber)}
                      className="text-green-600 hover:text-green-900"
                      title="Download PDF"
                    >
                      <DocumentArrowDownIcon className="h-4 w-4" />
                    </button>
                    {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                      <select
                        value={invoice.status}
                        onChange={(e) => handleStatusChange(invoice.id, e.target.value)}
                        className="text-xs border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="SENT">Sent</option>
                        <option value="PAID">Paid</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {invoicesData?.invoices.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            No invoices found. Click "Create Invoice" to get started.
          </div>
        )}
      </div>

      {/* Pagination */}
      {invoicesData?.pagination && invoicesData.pagination.pages > 1 && (
        <div className="card">
          <Pagination
            currentPage={currentPage}
            totalPages={invoicesData.pagination.pages}
            totalItems={invoicesData.pagination.total}
            itemsPerPage={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            pageSizeOptions={[10, 25, 50, 100]}
            showPageSizeSelector={true}
            showPageInfo={true}
          />
        </div>
      )}
    </div>
  );
}