import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { ArrowLeftIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const monthlyInvoiceSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2030),
  customerName: z.string().min(1, 'Customer name is required').default('ILYAS Arab Engineering Construction Ltd'),
  customerVat: z.string().optional().default('311097151900003'),
  customerAddress: z.string().min(1, 'Customer address is required').default('No.100 Gate 1, Building No.7544 King Fahad Road, Al Nakhil'),
  customerCity: z.string().min(1, 'Customer city is required').default('District,Riyadh, Kingdom of Saudi Arabia'),
});

type MonthlyInvoiceForm = z.infer<typeof monthlyInvoiceSchema>;

export default function GenerateMonthlyInvoicePage() {
  const navigate = useNavigate();
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MonthlyInvoiceForm>({
    resolver: zodResolver(monthlyInvoiceSchema),
    defaultValues: {
      month: currentMonth,
      year: currentYear,
      customerName: 'ILYAS Arab Engineering Construction Ltd',
      customerVat: '311097151900003',
      customerAddress: 'No.100 Gate 1, Building No.7544 King Fahad Road, Al Nakhil',
      customerCity: 'District,Riyadh, Kingdom of Saudi Arabia',
    }
  });

  const generateMutation = useMutation(
    (data: MonthlyInvoiceForm) => api.post('/invoices/generate-monthly', data),
    {
      onSuccess: (response) => {
        toast.success('Monthly invoice generated successfully');
        navigate(`/invoices/${response.data.id}`);
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.error || 'Failed to generate monthly invoice';
        toast.error(errorMessage);
        
        // If invoice already exists, navigate to it
        if (error.response?.data?.invoiceId) {
          setTimeout(() => {
            navigate(`/invoices/${error.response.data.invoiceId}`);
          }, 2000);
        }
      }
    }
  );

  const onSubmit = (data: MonthlyInvoiceForm) => {
    generateMutation.mutate(data);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/invoices')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Generate Monthly Invoice</h1>
            <p className="mt-1 text-sm text-gray-500">
              Create an invoice from monthly timesheet data
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Month and Year Selection */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <CalendarDaysIcon className="h-5 w-5 mr-2" />
            Invoice Period
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Month *</label>
              <select {...register('month', { valueAsNumber: true })} className="input">
                {monthNames.map((month, index) => (
                  <option key={index + 1} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
              {errors.month && (
                <p className="text-red-600 text-sm">{errors.month.message}</p>
              )}
            </div>

            <div>
              <label className="label">Year *</label>
              <select {...register('year', { valueAsNumber: true })} className="input">
                {Array.from({ length: 11 }, (_, i) => currentYear - 5 + i).map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              {errors.year && (
                <p className="text-red-600 text-sm">{errors.year.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Customer Name *</label>
              <input {...register('customerName')} className="input" />
              {errors.customerName && (
                <p className="text-red-600 text-sm">{errors.customerName.message}</p>
              )}
            </div>

            <div>
              <label className="label">VAT Number</label>
              <input {...register('customerVat')} className="input" />
              {errors.customerVat && (
                <p className="text-red-600 text-sm">{errors.customerVat.message}</p>
              )}
            </div>

            <div>
              <label className="label">Address *</label>
              <input {...register('customerAddress')} className="input" />
              {errors.customerAddress && (
                <p className="text-red-600 text-sm">{errors.customerAddress.message}</p>
              )}
            </div>

            <div>
              <label className="label">City *</label>
              <input {...register('customerCity')} className="input" />
              {errors.customerCity && (
                <p className="text-red-600 text-sm">{errors.customerCity.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Information Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <CalendarDaysIcon className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                How Monthly Invoice Generation Works
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>System will collect all timesheets for the selected month</li>
                  <li>Hours will be grouped by job type (Flagman, Labour, etc.)</li>
                  <li>Regular and overtime hours will be calculated automatically</li>
                  <li>Invoice number will be sequential within the month (1, 2, 3...)</li>
                  <li>VAT (15%) will be applied to all amounts</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/invoices')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={generateMutation.isLoading}
            className="btn-primary"
          >
            {generateMutation.isLoading ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : null}
            Generate Monthly Invoice
          </button>
        </div>
      </form>
    </div>
  );
}