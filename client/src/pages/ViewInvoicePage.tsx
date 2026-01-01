import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { numberToWords } from '../utils/numberToWords';
import { 
  ArrowLeftIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  PrinterIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function ViewInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: invoice, isLoading } = useQuery(
    ['invoice', id],
    async () => {
      const response = await api.get(`/invoices/${id}`);
      return response.data;
    },
    { enabled: !!id }
  );

  const updateStatusMutation = useMutation(
    ({ status, paidDate, paymentMethod }: { 
      status: string; 
      paidDate?: string; 
      paymentMethod?: string; 
    }) => api.patch(`/invoices/${id}/status`, { status, paidDate, paymentMethod }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['invoice', id]);
        queryClient.invalidateQueries('invoices');
        toast.success('Invoice status updated successfully');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to update invoice status');
      }
    }
  );

  const handleStatusChange = (newStatus: string) => {
    const updateData: any = { status: newStatus };
    
    if (newStatus === 'PAID') {
      updateData.paidDate = new Date().toISOString().split('T')[0];
      updateData.paymentMethod = 'Bank Transfer';
    }
    
    updateStatusMutation.mutate(updateData);
  };

  const downloadPDF = async () => {
    try {
      const response = await api.get(`/invoices/${id}/pdf`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoice?.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to download PDF');
    }
  };

  const printInvoice = () => {
    // Open print page in new window
    const printUrl = `/print/invoice/${id}`;
    window.open(printUrl, '_blank', 'width=800,height=600');
  };

  const deleteInvoiceMutation = useMutation(
    () => api.delete(`/invoices/${id}`),
    {
      onSuccess: () => {
        toast.success('Invoice deleted successfully');
        navigate('/invoices');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to delete invoice');
      }
    }
  );

  const handleDeleteInvoice = () => {
    if (window.confirm(`Are you sure you want to delete Invoice #${invoice?.invoiceNumber}? This action cannot be undone.`)) {
      deleteInvoiceMutation.mutate();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'SENT':
        return <ClockIcon className="h-6 w-6 text-blue-500" />;
      case 'OVERDUE':
        return <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />;
      case 'CANCELLED':
        return <XCircleIcon className="h-6 w-6 text-gray-500" />;
      default:
        return <ClockIcon className="h-6 w-6 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium";
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Invoice not found</h2>
        <p className="mt-2 text-gray-600">The invoice you're looking for doesn't exist.</p>
        <button
          onClick={() => navigate('/invoices')}
          className="mt-4 btn-primary"
        >
          Back to Invoices
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/invoices')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Invoice #{invoice.invoiceNumber}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {invoice.customerName} • {new Date(invoice.issueDate).toLocaleDateString()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {getStatusIcon(invoice.status)}
            <span className={getStatusBadge(invoice.status)}>
              {invoice.status}
            </span>
          </div>
          
          {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
            <select
              value={invoice.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              disabled={updateStatusMutation.isLoading}
            >
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="PAID">Paid</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          )}
          
          <button
            onClick={printInvoice}
            className="btn-secondary"
          >
            <PrinterIcon className="h-4 w-4 mr-2" />
            Print
          </button>
          
          <button
            onClick={downloadPDF}
            className="btn-primary"
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            Download PDF
          </button>
          
          {invoice.status === 'DRAFT' && (
            <button
              onClick={handleDeleteInvoice}
              className="btn-danger"
              disabled={deleteInvoiceMutation.isLoading}
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              {deleteInvoiceMutation.isLoading ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      </div>

      {/* Invoice Display */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div className="company-info">
              <h1 className="text-xl font-bold mb-1">SALEH ABDULLAH AL-MALKI GENERAL CONTRACTING COMPANY</h1>
              <div className="text-lg mb-3">شركة صالح عبدالله المالكي للمقاولات العامة</div>
              <p className="text-sm mb-1"><strong>VAT:</strong> 312886534600003</p>
              <p className="text-sm"><strong>Email:</strong> tawaffallah@gmail.com</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold mb-1">Tax Invoice</h2>
              <div className="text-lg">فاتورة ضريبية</div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="flex justify-between mb-8">
            <div className="flex-1 max-w-md">
              <h3 className="font-bold mb-3">Bill To:</h3>
              <p className="mb-1"><strong>Name:</strong> {invoice.customerName}</p>
              <p className="mb-1"><strong>Address:</strong> {invoice.customerAddress}</p>
              <p className="mb-1"><strong>City:</strong> {invoice.customerCity}</p>
              {invoice.customerVat && <p className="mb-1"><strong>VAT:</strong> {invoice.customerVat}</p>}
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="mb-4">
                <p className="mb-1"><strong>Invoice #:</strong> {invoice.invoiceNumber}</p>
                <p className="mb-1"><strong>Invoice Date:</strong> {new Date(invoice.issueDate).toLocaleDateString()}</p>
                <p className="mb-1"><strong>Due Date:</strong> {new Date(invoice.dueDate).toLocaleDateString()}</p>
              </div>
              
              {/* QR Code */}
              {invoice.qrCode && (
                <div className="mt-4">
                  <img 
                    src={invoice.qrCode} 
                    alt="ZATCA QR Code" 
                    className="w-36 h-36 border border-gray-300"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-6">
            <table className="w-full border-collapse border border-black">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black p-2 text-center font-bold">#</th>
                  <th className="border border-black p-2 text-center font-bold">Description</th>
                  <th className="border border-black p-2 text-center font-bold">Qty</th>
                  <th className="border border-black p-2 text-center font-bold">Rate</th>
                  <th className="border border-black p-2 text-center font-bold">Taxable Amount</th>
                  <th className="border border-black p-2 text-center font-bold">Tax (SAR)</th>
                  <th className="border border-black p-2 text-center font-bold">Net Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item: any, index: number) => (
                  <tr key={index}>
                    <td className="border border-black p-2 text-center">{index + 1}</td>
                    <td className="border border-black p-2">{item.description}</td>
                    <td className="border border-black p-2 text-center">{parseFloat(item.quantity).toFixed(2)}</td>
                    <td className="border border-black p-2 text-right">{parseFloat(item.unitPrice).toFixed(2)}</td>
                    <td className="border border-black p-2 text-right">{parseFloat(item.lineTotal).toFixed(2)}</td>
                    <td className="border border-black p-2 text-right">{parseFloat(item.vatAmount).toFixed(2)}</td>
                    <td className="border border-black p-2 text-right">{parseFloat(item.totalAmount).toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-bold">
                  <td colSpan={4} className="border border-black p-2 text-right">Total</td>
                  <td className="border border-black p-2 text-right">{parseFloat(invoice.subtotal).toFixed(2)}</td>
                  <td className="border border-black p-2 text-right">{parseFloat(invoice.vatAmount).toFixed(2)}</td>
                  <td className="border border-black p-2 text-right">{parseFloat(invoice.totalAmount).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Total Summary */}
          <div className="flex justify-end mb-6">
            <div className="w-80">
              <div className="flex justify-between py-2 border-t-2 border-black font-bold text-lg">
                <span>Net Amount:</span>
                <span>SAR {parseFloat(invoice.totalAmount).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Amount in Words */}
          <div className="mb-6 text-sm">
            <p><strong>Amount in Words:</strong> {numberToWords(parseFloat(invoice.totalAmount))}</p>
          </div>

          {/* Bank Details */}
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Bank Details:</strong></p>
            <p>Account Number: 379000100006865704167</p>
            <p>IBAN Number: SA6600003790001000068657041</p>
            <p>Al rajhi Bank مصرف الراجحي للاستثمار</p>
            <p>SALEH ABDULLAH AL-MALKI GENERAL CONTRACTING COMPANY</p>
          </div>
        </div>
      </div>
    </div>
  );
}