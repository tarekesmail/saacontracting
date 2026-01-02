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
        scale: 4,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 0,
        removeContainer: true
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
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
      
      pdf.addImage(imgData, 'JPEG', imgX, imgY, imgWidth * ratio, imgHeight * ratio, undefined, 'FAST');
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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Naskh+Arabic:wght@400;500;600;700&display=swap');
        
        @media print {
          .no-print { display: none !important; }
          body { 
            margin: 0; 
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .invoice-page { 
            padding: 20px !important; 
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Force colors to print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .items-table th {
            background-color: #1e3a5f !important;
            color: white !important;
          }
          
          .items-table tbody tr:nth-child(even) {
            background-color: #f7fafc !important;
          }
          
          .total-row {
            background-color: #edf2f7 !important;
          }
          
          .net-amount {
            background-color: #1e3a5f !important;
            color: white !important;
          }
          
          .amount-words {
            background-color: #f7fafc !important;
            border-left: 4px solid #1e3a5f !important;
          }
          
          .bank-details {
            background-color: #f7fafc !important;
            border: 1px solid #e2e8f0 !important;
          }
          
          .header-row {
            border-bottom: 3px solid #1e3a5f !important;
          }
          
          .company-name {
            color: #1e3a5f !important;
          }
          
          .company-arabic {
            color: #2d5a87 !important;
          }
          
          .invoice-title {
            color: #1e3a5f !important;
          }
          
          .invoice-title-arabic {
            color: #2d5a87 !important;
          }
          
          .section-title {
            color: #1e3a5f !important;
          }
        }
        
        * { box-sizing: border-box; }
        
        body {
          font-family: 'Inter', sans-serif;
          margin: 0;
          padding: 0;
          background: #f0f2f5;
          color: #1a1a2e;
        }
        
        .arabic-text {
          font-family: 'Noto Naskh Arabic', serif;
        }
        
        .invoice-page {
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
          background: white;
          min-height: 100vh;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .header-row {
          display: table;
          width: 100%;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 3px solid #1e3a5f;
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
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 8px 0;
          line-height: 1.3;
          color: #1e3a5f;
          letter-spacing: -0.5px;
        }
        
        .company-arabic {
          font-family: 'Noto Naskh Arabic', serif;
          font-size: 18px;
          margin: 0 0 12px 0;
          direction: rtl;
          font-weight: 600;
          color: #2d5a87;
        }
        
        .company-details {
          font-size: 12px;
          margin: 4px 0;
          color: #4a5568;
        }
        
        .company-details strong {
          color: #1e3a5f;
          font-weight: 600;
        }
        
        .invoice-title {
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 5px 0;
          color: #1e3a5f;
          letter-spacing: -0.5px;
        }
        
        .invoice-title-arabic {
          font-family: 'Noto Naskh Arabic', serif;
          font-size: 20px;
          direction: rtl;
          font-weight: 600;
          color: #2d5a87;
        }
        
        .details-row {
          display: table;
          width: 100%;
          margin-bottom: 25px;
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
          font-weight: 700;
          margin-bottom: 10px;
          font-size: 14px;
          color: #1e3a5f;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .detail-line {
          font-size: 12px;
          margin: 5px 0;
          color: #4a5568;
        }
        
        .detail-line strong {
          color: #1e3a5f;
          font-weight: 600;
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
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          padding: 5px;
          background: white;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 25px 0;
          font-size: 11px;
        }
        
        .items-table th {
          background: #1e3a5f;
          color: white;
          border: 1px solid #1e3a5f;
          padding: 8px 6px;
          text-align: center;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          font-size: 9px;
          vertical-align: middle;
          line-height: 1.4;
        }
        
        .items-table th .arabic-text {
          display: block;
          font-size: 10px;
          font-weight: 500;
          text-transform: none;
          margin-top: 2px;
          opacity: 0.9;
        }
        
        .items-table td {
          border: 1px solid #e2e8f0;
          padding: 8px;
          color: #2d3748;
          vertical-align: middle;
        }
        
        .items-table tbody tr:nth-child(even) {
          background: #f7fafc;
        }
        
        .items-table .col-num { width: 30px; text-align: center; }
        .items-table .col-desc { text-align: left; }
        .items-table .col-qty { width: 50px; text-align: center; }
        .items-table .col-rate { width: 70px; text-align: right; }
        .items-table .col-amount { width: 90px; text-align: right; }
        .items-table .col-tax { width: 80px; text-align: right; }
        .items-table .col-total { width: 90px; text-align: right; }
        
        .total-row {
          background: #edf2f7 !important;
          font-weight: 700;
          color: #1e3a5f;
        }
        
        .total-row td {
          border-top: 2px solid #1e3a5f;
        }
        
        .summary-section {
          display: flex;
          justify-content: flex-end;
          margin: 25px 0;
        }
        
        .net-amount {
          background: #1e3a5f;
          color: white;
          padding: 12px 25px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .net-amount-label {
          font-weight: 600;
          font-size: 14px;
          opacity: 0.9;
        }
        
        .net-amount-value {
          font-weight: 700;
          font-size: 18px;
          margin-left: 15px;
        }
        
        .amount-words {
          margin: 25px 0;
          font-size: 12px;
          color: #4a5568;
          padding: 10px 15px;
          background: #f7fafc;
          border-left: 4px solid #1e3a5f;
          border-radius: 0 8px 8px 0;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        
        .amount-words strong {
          color: #1e3a5f;
        }
        
        .bank-details {
          margin-top: 35px;
          font-size: 11px;
          color: #4a5568;
          padding: 12px 15px;
          background: #f7fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        
        .bank-details p {
          margin: 3px 0;
        }
        
        .bank-details p:first-child {
          font-weight: 700;
          color: #1e3a5f;
          font-size: 12px;
          margin-bottom: 6px;
        }
        
        .bank-details .arabic-text {
          font-family: 'Noto Naskh Arabic', serif;
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
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          transition: all 0.2s ease;
        }
        
        .btn-print {
          background: #1e3a5f;
          color: white;
        }
        
        .btn-print:hover {
          background: #152a45;
          transform: translateY(-1px);
        }
        
        .btn-pdf {
          background: #059669;
          color: white;
        }
        
        .btn-pdf:hover {
          background: #047857;
          transform: translateY(-1px);
        }
        
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
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
              <th className="col-desc">Description<br/><span className="arabic-text">الوصف</span></th>
              <th className="col-qty">Qty<br/><span className="arabic-text">الكمية</span></th>
              <th className="col-rate">Rate<br/><span className="arabic-text">السعر</span></th>
              <th className="col-amount">Taxable Amount<br/><span className="arabic-text">المبلغ الخاضع للضريبة</span></th>
              <th className="col-tax">Tax (SAR)<br/><span className="arabic-text">الضريبة</span></th>
              <th className="col-total">Net Amount<br/><span className="arabic-text">المبلغ الصافي</span></th>
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
          <p>Al rajhi Bank <span className="arabic-text">مصرف الراجحي للاستثمار</span></p>
          <p>SALEH ABDULLAH AL-MALKI GENERAL CONTRACTING COMPANY</p>
        </div>
      </div>
    </>
  );
}