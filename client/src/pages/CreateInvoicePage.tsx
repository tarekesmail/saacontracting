import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { PlusIcon, TrashIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const invoiceItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().positive('Unit price must be positive'),
  vatRate: z.number().min(0).max(100).default(15)
});

const invoiceSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  customerVat: z.string().optional(),
  customerAddress: z.string().min(1, 'Customer address is required'),
  customerCity: z.string().min(1, 'Customer city is required'),
  issueDate: z.string().min(1, 'Issue date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required')
});

type InvoiceForm = z.infer<typeof invoiceSchema>;

export default function CreateInvoicePage() {
  const navigate = useNavigate();
  const [previewMode, setPreviewMode] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<InvoiceForm>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      items: [{ description: '', quantity: 1, unitPrice: 0, vatRate: 15 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  const watchedItems = watch('items');

  const createMutation = useMutation(
    (data: InvoiceForm) => api.post('/invoices', data),
    {
      onSuccess: (response) => {
        toast.success('Invoice created successfully');
        navigate(`/invoices/${response.data.id}`);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || 'Failed to create invoice');
      }
    }
  );

  const onSubmit = (data: InvoiceForm) => {
    createMutation.mutate(data);
  };

  const addItem = () => {
    append({ description: '', quantity: 1, unitPrice: 0, vatRate: 15 });
  };

  const removeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  // Calculate totals
  const calculateTotals = () => {
    let subtotal = 0;
    let totalVat = 0;

    watchedItems?.forEach((item) => {
      if (item.quantity && item.unitPrice) {
        const lineTotal = item.quantity * item.unitPrice;
        const vatAmount = lineTotal * ((item.vatRate || 15) / 100);
        subtotal += lineTotal;
        totalVat += vatAmount;
      }
    });

    return {
      subtotal,
      vatAmount: totalVat,
      total: subtotal + totalVat
    };
  };

  const totals = calculateTotals();

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
            <h1 className="text-2xl font-bold text-gray-900">Create Invoice</h1>
            <p className="mt-1 text-sm text-gray-500">
              Generate a KSA tax-compliant invoice
            </p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            className="btn-secondary"
          >
            {previewMode ? 'Edit' : 'Preview'}
          </button>
        </div>
      </div>

      {!previewMode ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                <input {...register('customerVat')} className="input" placeholder="Optional" />
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

          {/* Invoice Details */}
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Issue Date *</label>
                <input {...register('issueDate')} type="date" className="input" />
                {errors.issueDate && (
                  <p className="text-red-600 text-sm">{errors.issueDate.message}</p>
                )}
              </div>

              <div>
                <label className="label">Due Date *</label>
                <input {...register('dueDate')} type="date" className="input" />
                {errors.dueDate && (
                  <p className="text-red-600 text-sm">{errors.dueDate.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Invoice Items */}
          <div className="card p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Invoice Items</h3>
              <button
                type="button"
                onClick={addItem}
                className="btn-secondary text-sm"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Item
              </button>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-4 items-end">
                  <div className="col-span-4">
                    <label className="label">Description</label>
                    <input
                      {...register(`items.${index}.description`)}
                      className="input"
                      placeholder="Item description"
                    />
                    {errors.items?.[index]?.description && (
                      <p className="text-red-600 text-sm">
                        {errors.items[index]?.description?.message}
                      </p>
                    )}
                  </div>

                  <div className="col-span-2">
                    <label className="label">Quantity</label>
                    <input
                      {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      min="0"
                      className="input"
                    />
                    {errors.items?.[index]?.quantity && (
                      <p className="text-red-600 text-sm">
                        {errors.items[index]?.quantity?.message}
                      </p>
                    )}
                  </div>

                  <div className="col-span-2">
                    <label className="label">Unit Price (SAR)</label>
                    <input
                      {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      min="0"
                      className="input"
                    />
                    {errors.items?.[index]?.unitPrice && (
                      <p className="text-red-600 text-sm">
                        {errors.items[index]?.unitPrice?.message}
                      </p>
                    )}
                  </div>

                  <div className="col-span-2">
                    <label className="label">VAT Rate (%)</label>
                    <input
                      {...register(`items.${index}.vatRate`, { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      className="input"
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="label">Total</label>
                    <div className="text-sm font-medium text-gray-900 py-2">
                      {watchedItems?.[index]?.quantity && watchedItems?.[index]?.unitPrice
                        ? (
                            watchedItems[index].quantity * watchedItems[index].unitPrice +
                            (watchedItems[index].quantity * watchedItems[index].unitPrice * 
                             ((watchedItems[index].vatRate || 15) / 100))
                          ).toFixed(2)
                        : '0.00'
                      } SAR
                    </div>
                  </div>

                  <div className="col-span-1">
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-900 p-2"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {errors.items && (
              <p className="text-red-600 text-sm mt-2">{errors.items.message}</p>
            )}
          </div>

          {/* Totals */}
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Summary</h3>
            <div className="space-y-2 max-w-sm ml-auto">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{totals.subtotal.toFixed(2)} SAR</span>
              </div>
              <div className="flex justify-between">
                <span>VAT (15%):</span>
                <span>{totals.vatAmount.toFixed(2)} SAR</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>{totals.total.toFixed(2)} SAR</span>
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
              disabled={createMutation.isLoading}
              className="btn-primary"
            >
              {createMutation.isLoading ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : null}
              Create Invoice
            </button>
          </div>
        </form>
      ) : (
        /* Preview Mode */
        <div className="card p-8">
          <div className="max-w-4xl mx-auto">
            {/* Invoice Preview - KSA Format */}
            <div className="border-2 border-gray-300 p-8 bg-white">
              {/* Header */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h1 className="text-xl font-bold">SALEH ABDULLAH AL-MALKI GENERAL CONTRACTING COMPANY</h1>
                  <p className="text-lg">شركة صالح عبدالله المالكي للمقاولات العامة</p>
                  <p className="text-sm mt-2">VAT: 312886534600003</p>
                  <p className="text-sm">Email: tawaffallah@gmail.com</p>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-bold">Tax Invoice</h2>
                  <p className="text-lg">فاتورة ضريبية</p>
                </div>
              </div>

              {/* Invoice Details */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="font-bold mb-2">Bill To:</h3>
                  <p><strong>Name:</strong> {watch('customerName')}</p>
                  <p><strong>Address:</strong> {watch('customerAddress')}</p>
                  <p><strong>City:</strong> {watch('customerCity')}</p>
                  {watch('customerVat') && <p><strong>VAT:</strong> {watch('customerVat')}</p>}
                </div>
                <div className="text-right">
                  <p><strong>Invoice Date:</strong> {watch('issueDate')}</p>
                  <p><strong>Due Date:</strong> {watch('dueDate')}</p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full border-collapse border border-gray-300 mb-6">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-left">Description</th>
                    <th className="border border-gray-300 p-2 text-center">Qty</th>
                    <th className="border border-gray-300 p-2 text-right">Rate</th>
                    <th className="border border-gray-300 p-2 text-right">Amount</th>
                    <th className="border border-gray-300 p-2 text-right">VAT</th>
                    <th className="border border-gray-300 p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {watchedItems?.map((item, index) => {
                    const lineTotal = (item.quantity || 0) * (item.unitPrice || 0);
                    const vatAmount = lineTotal * ((item.vatRate || 15) / 100);
                    const total = lineTotal + vatAmount;
                    
                    return (
                      <tr key={index}>
                        <td className="border border-gray-300 p-2">{item.description}</td>
                        <td className="border border-gray-300 p-2 text-center">{item.quantity}</td>
                        <td className="border border-gray-300 p-2 text-right">{(item.unitPrice || 0).toFixed(2)}</td>
                        <td className="border border-gray-300 p-2 text-right">{lineTotal.toFixed(2)}</td>
                        <td className="border border-gray-300 p-2 text-right">{vatAmount.toFixed(2)}</td>
                        <td className="border border-gray-300 p-2 text-right">{total.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64">
                  <div className="flex justify-between py-1">
                    <span>Subtotal:</span>
                    <span>{totals.subtotal.toFixed(2)} SAR</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>VAT (15%):</span>
                    <span>{totals.vatAmount.toFixed(2)} SAR</span>
                  </div>
                  <div className="flex justify-between py-2 border-t font-bold">
                    <span>Total:</span>
                    <span>{totals.total.toFixed(2)} SAR</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 text-sm text-gray-600">
                <p>Bank Details:</p>
                <p>Account Number: 379000100006865704167</p>
                <p>IBAN Number: SA6600003790001000068657041</p>
                <p>Al rajhi Bank مصرف الراجحي للاستثمار</p>
                <p>SALEH ABDULLAH AL-MALKI GENERAL CONTRACTING COMPANY</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}