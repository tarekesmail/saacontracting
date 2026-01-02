import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { numberToWords } from '../utils/numberToWords';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function PrintInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const response = await api.get(`/invoices/${id}`);
        setInvoice(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch invoice:', error);
        setLoading(false);
      }
    };

    if (id) {
      fetchInvoice();
    }
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;
    
    setGenerating(true);
    
    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;
      
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`invoice-${invoice?.invoiceNumber}.pdf`);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF. Please try printing instead.');
    } finally {
      setGenerating(false);
    }
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
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
          .invoice-page { padding: 0 !important; }
        }
        
        * { box-sizing: border-box; }
        
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          background: #f5f5f5;
        }
        
        .invoice-page {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background: white;
          min-height: 100vh;
        }
        
        .header-row {
          display: table;
          width: 100%;
          margin-bottom: 25px;
        }
        
        .company-section {
          display: table-cell;
          width: 65%;
          vertical-align: top;
        }
        
        .invoice-title-section {
          display: table-cell;
          width: 35%;
          vertical-align: top;
          text-align: right;
        }
        
        .company-name {
          font-size: 18px;
          font-weight: bold;
          margin: 0 0 5px 0;
          line-height: 1.3;
        }
        
        .company-arabic {
          font-size: 16px;
          margin: 0 0 10px 0;
          direction: rtl;
        }
        
        .company-details {
          font-size: 11px;
          margin: 3px 0;
        }
        
        .invoice-title {
          font-size: 20px;
          font-weight: bold;
          margin: 0 0 5px 0;
        }
        
        .invoice-title-arabic {
          font-size: 16px;
          direction: rtl;
        }
        
        .details-row {
          display: table;
          width: 100%;
          margin-bottom: 20px;
        }
        
        .bill-to-section {
          display: table-cell;
          width: 50%;
          vertical-align: top;
          padding-right: 20px;
        }
        
        .invoice-info-section {
          display: table-cell;
          width: 50%;
          vertical-align: top;
          text-align: right;
        }
        
        .section-title {
          font-weight: bold;
          margin-bottom: 8px;
          font-size: 12px;
        }
        
        .detail-line {
          font-size: 11px;
          margin: 4px 0;
        }
        
        .qr-code {
          margin-top: 15px;
          text-align: right;
          display: flex;
          justify-content: flex-end;
        }
        
        .qr-code img {
          width: 120px;
          height: 120px;
          border: 1px solid #ddd;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          font-size: 10px;
        }
        
        .items-table th {
          background: #f0f0f0;
          border: 1px solid #000;
          padding: 8px 6px;
          text-align: center;
          font-weight: bold;
        }
        
        .items-table td {
          border: 1px solid #000;
          padding: 8px 6px;
        }
        
        .items-table .col-num { width: 30px; text-align: center; }
        .items-table .col-desc { text-align: left; }
        .items-table .col-qty { width: 50px; text-align: center; }
        .items-table .col-rate { width: 60px; text-align: right; }
        .items-table .col-amount { width: 80px; text-align: right; }
        .items-table .col-tax { width: 70px; text-align: right; }
        .items-table .col-total { width: 80px; text-align: right; }
        
        .total-row {
          background: #f8f8f8;
          font-weight: bold;
        }
        
        .summary-section {
          text-align: right;
          margin: 20px 0;
        }
        
        .net-amount {
          display: inline-block;
          border-top: 2px solid #000;
          padding-top: 10px;
          min-width: 250px;
        }
        
        .net-amount-label {
          font-weight: bold;
          font-size: 12px;
        }
        
        .net-amount-value {
          font-weight: bold;
          font-size: 14px;
          margin-left: 20px;
        }
        
        .amount-words {
          margin: 20px 0;
          font-size: 11px;
        }
        
        .bank-details {
          margin-top: 30px;
          font-size: 10px;
          color: #555;
        }
        
        .bank-details p {
          margin: 3px 0;
        }
        
        .action-buttons {
          position: fixed;
          top: 20px;
          right: 20px;
          display: flex;
          gap: 10px;
          z-index: 1000;
        }
        
        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
        }
        
        .btn-print {
          background: #007bff;
          color: white;
        }
        
        .btn-print:hover {
          background: #0056b3;
        }
        
        .btn-pdf {
          background: #28a745;
          color: white;
        }
        
        .btn-pdf:hover {
          background: #1e7e34;
        }
      `}</style>

      <div className="action-buttons no-print">
        <button className="btn btn-print" onClick={handlePrint}>
          Print Invoice
        </button>
        <button className="btn btn-pdf" onClick={handleDownloadPDF} disabled={generating}>
          {generating ? 'Generating...' : 'Download PDF'}
        </button>
      </div>
      
      <div className="invoice-page" ref={invoiceRef}>
        {/* Header */}
        <div className="header-row">
          <div className="company-section">
            <div className="company-name">SALEH ABDULLAH AL-MALKI GENERAL CONTRACTING COMPANY</div>
            <div className="company-arabic">شركة صالح عبدالله المالكي للمقاولات العامة</div>
            <div className="company-details"><strong>VAT:</strong> 312886534600003</div>
            <div className="company-details"><strong>Email:</strong> tawaffallah@gmail.com</div>
          </div>
          <div className="invoice-title-section">
            <div className="invoice-title">Tax Invoice</div>
            <div className="invoice-title-arabic">فاتورة ضريبية</div>
          </div>
        </div>

        {/* Details Row */}
        <div className="details-row">
          <div className="bill-to-section">
            <div className="section-title">Bill To:</div>
            <div className="detail-line"><strong>Name:</strong> {invoice.customerName}</div>
            <div className="detail-line"><strong>Address:</strong> {invoice.customerAddress}</div>
            <div className="detail-line"><strong>City:</strong> {invoice.customerCity}</div>
            {invoice.customerVat && (
              <div className="detail-line"><strong>VAT:</strong> {invoice.customerVat}</div>
            )}
          </div>
          <div className="invoice-info-section">
            <div className="detail-line"><strong>Invoice #:</strong> {invoice.invoiceNumber}</div>
            <div className="detail-line"><strong>Invoice Date:</strong> {new Date(invoice.issueDate).toLocaleDateString()}</div>
            <div className="detail-line"><strong>Due Date:</strong> {new Date(invoice.dueDate).toLocaleDateString()}</div>
            
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
              <th className="col-num">#</th>
              <th className="col-desc">Description</th>
              <th className="col-qty">Qty</th>
              <th className="col-rate">Rate</th>
              <th className="col-amount">Taxable Amount</th>
              <th className="col-tax">Tax (SAR)</th>
              <th className="col-total">Net Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item: any, index: number) => (
              <tr key={index}>
                <td className="col-num">{index + 1}</td>
                <td className="col-desc">{item.description}</td>
                <td className="col-qty">{parseFloat(item.quantity).toFixed(2)}</td>
                <td className="col-rate">{parseFloat(item.unitPrice).toFixed(2)}</td>
                <td className="col-amount">{parseFloat(item.lineTotal).toFixed(2)}</td>
                <td className="col-tax">{parseFloat(item.vatAmount).toFixed(2)}</td>
                <td className="col-total">{parseFloat(item.totalAmount).toFixed(2)}</td>
              </tr>
            ))}
            <tr className="total-row">
              <td colSpan={4} style={{ textAlign: 'right' }}>Total</td>
              <td className="col-amount">{parseFloat(invoice.subtotal).toFixed(2)}</td>
              <td className="col-tax">{parseFloat(invoice.vatAmount).toFixed(2)}</td>
              <td className="col-total">{parseFloat(invoice.totalAmount).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        {/* Summary */}
        <div className="summary-section">
          <div className="net-amount">
            <span className="net-amount-label">Net Amount:</span>
            <span className="net-amount-value">SAR {parseFloat(invoice.totalAmount).toFixed(2)}</span>
          </div>
        </div>

        {/* Amount in Words */}
        <div className="amount-words">
          <strong>Amount in Words:</strong> {numberToWords(parseFloat(invoice.totalAmount))}
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