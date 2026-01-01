import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { numberToWords } from '../utils/numberToWords';
import '../styles/print.css';

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
        
        // Set proper charset for Arabic text
        const metaCharset = document.createElement('meta');
        metaCharset.setAttribute('charset', 'UTF-8');
        document.head.appendChild(metaCharset);
        
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

  // Add simple print styles to document head
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        body {
          font-family: Arial, sans-serif !important;
          font-size: 11pt !important;
          line-height: 1.4 !important;
          color: black !important;
          background: white !important;
          padding: 20px !important;
          margin: 0 !important;
        }
        
        .invoice-container {
          max-width: 100% !important;
          margin: 0 auto !important;
          background: white !important;
          padding: 0 !important;
        }
        
        .header {
          display: table !important;
          width: 100% !important;
          margin-bottom: 30px !important;
        }
        
        .company-info {
          display: table-cell !important;
          width: 60% !important;
          vertical-align: top !important;
        }
        
        .company-info h1 {
          font-size: 16pt !important;
          font-weight: bold !important;
          margin: 0 0 5px 0 !important;
          font-family: Arial, sans-serif !important;
          line-height: 1.2 !important;
        }
        
        .company-info .arabic {
          font-size: 14pt !important;
          margin: 0 0 10px 0 !important;
          font-family: Arial, sans-serif !important;
          direction: rtl !important;
          text-align: right !important;
          line-height: 1.2 !important;
        }
        
        .company-info p {
          font-size: 10pt !important;
          margin: 2px 0 !important;
          font-family: Arial, sans-serif !important;
        }
        
        .invoice-title {
          display: table-cell !important;
          width: 40% !important;
          text-align: right !important;
          vertical-align: top !important;
        }
        
        .invoice-title h2 {
          font-size: 16pt !important;
          font-weight: bold !important;
          margin: 0 0 5px 0 !important;
          font-family: Arial, sans-serif !important;
        }
        
        .invoice-title .arabic {
          font-size: 14pt !important;
          font-family: Arial, sans-serif !important;
          direction: rtl !important;
          text-align: right !important;
        }
        
        .invoice-details {
          display: table !important;
          width: 100% !important;
          margin-bottom: 30px !important;
        }
        
        .bill-to {
          display: table-cell !important;
          width: 50% !important;
          vertical-align: top !important;
          padding-right: 20px !important;
        }
        
        .bill-to h3 {
          font-weight: bold !important;
          margin-bottom: 10px !important;
          font-family: Arial, sans-serif !important;
          font-size: 11pt !important;
        }
        
        .bill-to p {
          margin: 3px 0 !important;
          font-family: Arial, sans-serif !important;
          font-size: 10pt !important;
        }
        
        .invoice-meta {
          display: table-cell !important;
          width: 50% !important;
          text-align: right !important;
          vertical-align: top !important;
        }
        
        .invoice-meta p {
          margin: 3px 0 !important;
          font-family: Arial, sans-serif !important;
          font-size: 10pt !important;
        }
        
        .qr-code {
          margin-top: 15px !important;
          text-align: right !important;
        }
        
        .qr-code img {
          width: 120px !important;
          height: 120px !important;
          border: 1px solid #ccc !important;
        }
        
        .items-table {
          width: 100% !important;
          border-collapse: collapse !important;
          margin: 20px 0 !important;
        }
        
        .items-table th,
        .items-table td {
          border: 1px solid #000 !important;
          padding: 6px !important;
          text-align: left !important;
          font-size: 9pt !important;
          font-family: Arial, sans-serif !important;
        }
        
        .items-table th {
          background-color: #f0f0f0 !important;
          font-weight: bold !important;
          text-align: center !important;
        }
        
        .items-table .text-center {
          text-align: center !important;
        }
        
        .items-table .text-right {
          text-align: right !important;
        }
        
        .total-row {
          background-color: #f8f8f8 !important;
          font-weight: bold !important;
        }
        
        .summary {
          width: 100% !important;
          text-align: right !important;
          margin: 20px 0 !important;
        }
        
        .summary-box {
          display: inline-block !important;
          width: 300px !important;
        }
        
        .summary-row {
          display: table !important;
          width: 100% !important;
          padding: 5px 0 !important;
          border-bottom: 1px solid #eee !important;
        }
        
        .summary-row.total {
          border-top: 2px solid #000 !important;
          font-weight: bold !important;
          font-size: 12pt !important;
        }
        
        .summary-row span:first-child {
          display: table-cell !important;
          text-align: left !important;
        }
        
        .summary-row span:last-child {
          display: table-cell !important;
          text-align: right !important;
        }
        
        .amount-words {
          margin: 20px 0 !important;
          font-size: 10pt !important;
          font-family: Arial, sans-serif !important;
        }
        
        .bank-details {
          margin-top: 30px !important;
          font-size: 9pt !important;
          color: #666 !important;
        }
        
        .bank-details p {
          margin: 2px 0 !important;
          font-family: Arial, sans-serif !important;
        }
        
        .print-button {
          display: none !important;
        }
        
        @page {
          margin: 0.5in !important;
          size: A4 !important;
        }
      }
      
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
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const handlePrint = () => {
    // Simple approach - just use window.print() on the current page
    window.print();
  };

  const handleDownloadPDF = () => {
    // Use browser's print to PDF functionality
    window.print();
  };

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
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000, display: 'flex', gap: '10px' }}>
        <button className="print-button" onClick={handlePrint}>
          Print Invoice
        </button>
        <button className="print-button" onClick={handleDownloadPDF} style={{ background: '#28a745' }}>
          Download PDF
        </button>
      </div>
      
      <div className="invoice-print-area invoice-container">
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
            <div>
              <p><strong>Invoice #:</strong> {invoice.invoiceNumber}</p>
              <p><strong>Invoice Date:</strong> {new Date(invoice.issueDate).toLocaleDateString()}</p>
              <p><strong>Due Date:</strong> {new Date(invoice.dueDate).toLocaleDateString()}</p>
            </div>
            
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
              <th>#</th>
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
                <td className="text-center">{index + 1}</td>
                <td>{item.description}</td>
                <td className="text-center">{parseFloat(item.quantity).toFixed(2)}</td>
                <td className="text-right">{parseFloat(item.unitPrice).toFixed(2)}</td>
                <td className="text-right">{parseFloat(item.lineTotal).toFixed(2)}</td>
                <td className="text-right">{parseFloat(item.vatAmount).toFixed(2)}</td>
                <td className="text-right">{parseFloat(item.totalAmount).toFixed(2)}</td>
              </tr>
            ))}
            <tr className="total-row">
              <td colSpan={4} className="text-right">Total</td>
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
        <div className="amount-words">
          <p><strong>Amount in Words:</strong> {numberToWords(parseFloat(invoice.totalAmount))}</p>
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