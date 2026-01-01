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
      body {
        font-family: Arial, sans-serif;
        font-size: 11pt;
        line-height: 1.4;
        color: black;
        background: white;
        padding: 20px;
        margin: 0;
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
      
      .bill-to {
        flex: 1;
        max-width: 50%;
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
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }
      
      .invoice-meta p {
        margin: 3px 0;
      }
      
      .qr-code {
        margin-top: 15px;
        text-align: right;
      }
      
      .qr-code img {
        width: 150px;
        height: 150px;
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
        <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
          <div className="company-info" style={{ flex: 1 }}>
            <h1 style={{ fontSize: '18pt', fontWeight: 'bold', margin: '0 0 5px 0', fontFamily: 'Arial, sans-serif' }}>
              SALEH ABDULLAH AL-MALKI GENERAL CONTRACTING COMPANY
            </h1>
            <div className="arabic" style={{ fontSize: '16pt', margin: '0 0 10px 0', fontFamily: 'Arial, sans-serif', direction: 'rtl', textAlign: 'right' }}>
              شركة صالح عبدالله المالكي للمقاولات العامة
            </div>
            <p style={{ fontSize: '10pt', margin: '2px 0', fontFamily: 'Arial, sans-serif' }}>
              <strong>VAT:</strong> 312886534600003
            </p>
            <p style={{ fontSize: '10pt', margin: '2px 0', fontFamily: 'Arial, sans-serif' }}>
              <strong>Email:</strong> tawaffallah@gmail.com
            </p>
          </div>
          <div className="invoice-title" style={{ textAlign: 'right', flex: 1 }}>
            <h2 style={{ fontSize: '18pt', fontWeight: 'bold', margin: '0 0 5px 0', fontFamily: 'Arial, sans-serif' }}>
              Tax Invoice
            </h2>
            <div className="arabic" style={{ fontSize: '16pt', fontFamily: 'Arial, sans-serif', direction: 'rtl', textAlign: 'right' }}>
              فاتورة ضريبية
            </div>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="invoice-details" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
          <div className="bill-to" style={{ flex: 1, maxWidth: '50%' }}>
            <h3 style={{ fontWeight: 'bold', marginBottom: '10px', fontFamily: 'Arial, sans-serif' }}>Bill To:</h3>
            <p style={{ margin: '3px 0', fontFamily: 'Arial, sans-serif' }}>
              <strong>Name:</strong> {invoice.customerName}
            </p>
            <p style={{ margin: '3px 0', fontFamily: 'Arial, sans-serif' }}>
              <strong>Address:</strong> {invoice.customerAddress}
            </p>
            <p style={{ margin: '3px 0', fontFamily: 'Arial, sans-serif' }}>
              <strong>City:</strong> {invoice.customerCity}
            </p>
            {invoice.customerVat && (
              <p style={{ margin: '3px 0', fontFamily: 'Arial, sans-serif' }}>
                <strong>VAT:</strong> {invoice.customerVat}
              </p>
            )}
          </div>
          <div className="invoice-meta" style={{ textAlign: 'right', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ marginBottom: '15px' }}>
              <p style={{ margin: '3px 0', fontFamily: 'Arial, sans-serif' }}>
                <strong>Invoice #:</strong> {invoice.invoiceNumber}
              </p>
              <p style={{ margin: '3px 0', fontFamily: 'Arial, sans-serif' }}>
                <strong>Invoice Date:</strong> {new Date(invoice.issueDate).toLocaleDateString()}
              </p>
              <p style={{ margin: '3px 0', fontFamily: 'Arial, sans-serif' }}>
                <strong>Due Date:</strong> {new Date(invoice.dueDate).toLocaleDateString()}
              </p>
            </div>
            
            {/* QR Code - positioned under due date */}
            {invoice.qrCode && (
              <div className="qr-code" style={{ marginTop: '15px', textAlign: 'right' }}>
                <img 
                  src={invoice.qrCode} 
                  alt="ZATCA QR Code" 
                  style={{ width: '150px', height: '150px', border: '1px solid #ccc' }}
                />
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
        <div style={{ margin: '20px 0', fontSize: '10pt' }}>
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