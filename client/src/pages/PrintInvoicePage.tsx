import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';

export default function PrintInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const response = await api.get(`/invoices/${id}`);
        setInvoice(response.data);
        setLoading(false);
        
        // Auto-print when page loads
        setTimeout(() => {
          window.print();
        }, 1000);
      } catch (error) {
        console.error('Failed to fetch invoice:', error);
        setLoading(false);
      }
    };

    if (id) {
      fetchInvoice();
    }
  }, [id]);

  // Add print styles to document head
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: Arial, sans-serif !important;
        font-size: 11pt !important;
        line-height: 1.4 !important;
        color: black !important;
        background: white !important;
        padding: 20px !important;
      }
      
      .invoice-container {
        max-width: 800px;
        margin: 0 auto;
        background: white;
      }
      
      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 30px;
      }
      
      .company-info h1 {
        font-size: 18pt;
        font-weight: bold;
        margin-bottom: 5px;
      }
      
      .company-info .arabic {
        font-size: 16pt;
        margin-bottom: 10px;
      }
      
      .company-info p {
        font-size: 10pt;
        margin: 2px 0;
      }
      
      .invoice-title {
        text-align: right;
      }
      
      .invoice-title h2 {
        font-size: 18pt;
        font-weight: bold;
        margin-bottom: 5px;
      }
      
      .invoice-title .arabic {
        font-size: 16pt;
      }
      
      .invoice-details {
        display: flex;
        justify-content: space-between;
        margin-bottom: 30px;
      }
      
      .bill-to h3 {
        font-weight: bold;
        margin-bottom: 10px;
      }
      
      .bill-to p {
        margin: 3px 0;
      }
      
      .invoice-meta {
        text-align: right;
      }
      
      .invoice-meta p {
        margin: 3px 0;
      }
      
      .qr-code {
        margin-top: 15px;
      }
      
      .qr-code img {
        width: 80px;
        height: 80px;
        border: 1px solid #ccc;
      }
      
      .items-table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
      }
      
      .items-table th,
      .items-table td {
        border: 1px solid #000;
        padding: 8px;
        text-align: left;
        font-size: 10pt;
      }
      
      .items-table th {
        background-color: #f0f0f0;
        font-weight: bold;
        text-align: center;
      }
      
      .items-table .text-center {
        text-align: center;
      }
      
      .items-table .text-right {
        text-align: right;
      }
      
      .total-row {
        background-color: #f8f8f8;
        font-weight: bold;
      }
      
      .summary {
        display: flex;
        justify-content: flex-end;
        margin: 20px 0;
      }
      
      .summary-box {
        width: 300px;
      }
      
      .summary-row {
        display: flex;
        justify-content: space-between;
        padding: 5px 0;
        border-bottom: 1px solid #eee;
      }
      
      .summary-row.total {
        border-top: 2px solid #000;
        font-weight: bold;
        font-size: 12pt;
      }
      
      .bank-details {
        margin-top: 30px;
        font-size: 10pt;
        color: #666;
      }
      
      .bank-details p {
        margin: 2px 0;
      }
      
      @media print {
        body {
          padding: 0 !important;
        }
        
        @page {
          margin: 0.5in;
          size: A4;
        }
        
        .print-button {
          display: none !important;
        }
      }
      
      @media screen {
        .print-button {
          position: fixed;
          top: 20px;
          right: 20px;
          background: #007bff;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          z-index: 1000;
        }
        
        .print-button:hover {
          background: #0056b3;
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'Arial, sans-serif'
      }}>
        Loading invoice...
      </div>
    );
  }

  if (!invoice) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'Arial, sans-serif'
      }}>
        Invoice not found
      </div>
    );
  }

  return (
    <>
      <button className="print-button" onClick={() => window.print()}>
        Print Invoice
      </button>
      
      <div className="invoice-container">
        {/* Header */}
        <div className="header">
          <div className="company-info">
            <h1>SALEH ABDULLAH AL-MALKI GENERAL CONTRACTING COMPANY</h1>
            <div className="arabic">شركة صالح عبدالله المالكي للمقاولات العامة</div>
            <p><strong>VAT:</strong> 312886534600003</p>
            <p><strong>Email:</strong> tawaffallah@gmail.com</p>
          </div>
          <div className="invoice-title">
            <h2>Tax Invoice</h2>
            <div className="arabic">فاتورة ضريبية</div>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="invoice-details">
          <div className="bill-to">
            <h3>Bill To:</h3>
            <p><strong>Name:</strong> {invoice.customerName}</p>
            <p><strong>Address:</strong> {invoice.customerAddress}</p>
            <p><strong>City:</strong> {invoice.customerCity}</p>
            {invoice.customerVat && <p><strong>VAT:</strong> {invoice.customerVat}</p>}
          </div>
          <div className="invoice-meta">
            <p><strong>Invoice #:</strong> {invoice.invoiceNumber}</p>
            <p><strong>Invoice Date:</strong> {new Date(invoice.issueDate).toLocaleDateString()}</p>
            <p><strong>Due Date:</strong> {new Date(invoice.dueDate).toLocaleDateString()}</p>
            
            {/* QR Code */}
            {invoice.qrCode && (
              <div className="qr-code">
                <img src={invoice.qrCode} alt="ZATCA QR Code" />
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <table className="items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Taxable Amount</th>
              <th>Tax (SAR)</th>
              <th>Net Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item: any, index: number) => (
              <tr key={index}>
                <td>{item.description}</td>
                <td className="text-center">{parseFloat(item.quantity).toFixed(2)}</td>
                <td className="text-right">{parseFloat(item.unitPrice).toFixed(2)}</td>
                <td className="text-right">{parseFloat(item.lineTotal).toFixed(2)}</td>
                <td className="text-right">{parseFloat(item.vatAmount).toFixed(2)}</td>
                <td className="text-right">{parseFloat(item.totalAmount).toFixed(2)}</td>
              </tr>
            ))}
            <tr className="total-row">
              <td colSpan={3} className="text-right">Total</td>
              <td className="text-right">{parseFloat(invoice.subtotal).toFixed(2)}</td>
              <td className="text-right">{parseFloat(invoice.vatAmount).toFixed(2)}</td>
              <td className="text-right">{parseFloat(invoice.totalAmount).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        {/* Total Summary */}
        <div className="summary">
          <div className="summary-box">
            <div className="summary-row total">
              <span>Net Amount:</span>
              <span>SAR {parseFloat(invoice.totalAmount).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Amount in Words */}
        <div style={{ margin: '20px 0', fontSize: '10pt' }}>
          <p><strong>Amount in Words:</strong> {/* Add number-to-words converter if needed */}</p>
        </div>

        {/* Bank Details */}
        <div className="bank-details">
          <p><strong>Bank Details:</strong></p>
          <p>Account Number: 379000100006865704167</p>
          <p>IBAN Number: SA6600003790001000068657041</p>
          <p>Al rajhi Bank مصرف الراجحي للاستثمار</p>
          <p>SALEH ABDULLAH AL-MALKI GENERAL CONTRACTING COMPANY</p>
        </div>
      </div>
    </>
  );
}