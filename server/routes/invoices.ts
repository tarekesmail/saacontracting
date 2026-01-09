import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest, requireWriteAccess } from '../middleware/auth';
import QRCode from 'qrcode';
import puppeteer from 'puppeteer';

const router = express.Router();
const prisma = new PrismaClient();

const invoiceItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  vatRate: z.number().min(0).max(100).default(15)
});

const invoiceSchema = z.object({
  customerName: z.string().min(1),
  customerVat: z.string().optional(),
  customerAddress: z.string().min(1),
  customerCity: z.string().min(1),
  issueDate: z.string().transform((str) => new Date(str)),
  dueDate: z.string().transform((str) => new Date(str)),
  items: z.array(invoiceItemSchema).min(1)
});

// Generate ZATCA-compliant QR code
async function generateZATCAQRCode(invoice: any, tenant: any): Promise<string> {
  // ZATCA QR Code format (TLV - Tag Length Value)
  // Use the actual company name, not tenant name
  const companyName = 'SALEH ABDULLAH AL-MALKI GENERAL CONTRACTING COMPANY';
  const sellerName = Buffer.from(companyName, 'utf8');
  const vatNumber = Buffer.from('312886354600003', 'utf8'); // Your VAT number
  
  // Use Riyadh timezone (Asia/Riyadh = UTC+3)
  const now = new Date();
  const riyadhOffset = 3 * 60 * 60 * 1000; // UTC+3 in milliseconds
  const riyadhTime = new Date(now.getTime() + riyadhOffset + (now.getTimezoneOffset() * 60 * 1000));
  const invoiceDate = new Date(invoice.issueDate);
  invoiceDate.setUTCHours(riyadhTime.getUTCHours(), riyadhTime.getUTCMinutes(), riyadhTime.getUTCSeconds());
  const timestamp = Buffer.from(invoiceDate.toISOString(), 'utf8');
  
  const totalAmount = Buffer.from(invoice.totalAmount.toString(), 'utf8');
  const vatAmount = Buffer.from(invoice.vatAmount.toString(), 'utf8');

  // Create TLV structure
  const tlvData = Buffer.concat([
    Buffer.from([0x01]), Buffer.from([sellerName.length]), sellerName,
    Buffer.from([0x02]), Buffer.from([vatNumber.length]), vatNumber,
    Buffer.from([0x03]), Buffer.from([timestamp.length]), timestamp,
    Buffer.from([0x04]), Buffer.from([totalAmount.length]), totalAmount,
    Buffer.from([0x05]), Buffer.from([vatAmount.length]), vatAmount
  ]);

  // Generate QR code
  const qrCodeDataURL = await QRCode.toDataURL(tlvData.toString('base64'));
  return qrCodeDataURL;
}

// Generate sequential invoice number for the month
async function generateMonthlyInvoiceNumber(tenantId: string, month: number, year: number): Promise<string> {
  // Get all invoices for this month to find the highest number
  const invoices = await prisma.invoice.findMany({
    where: { 
      tenantId,
      invoiceMonth: month,
      invoiceYear: year
    },
    select: { invoiceNumber: true }
  });

  let maxNumber = 0;
  invoices.forEach(inv => {
    const num = parseInt(inv.invoiceNumber);
    if (!isNaN(num) && num > maxNumber) {
      maxNumber = num;
    }
  });

  return (maxNumber + 1).toString();
}

// Generate monthly invoice from timesheets
router.post('/generate-monthly', requireWriteAccess, async (req: AuthRequest, res, next) => {
  try {
    const { month, year, issueDate, dueDate, customerName, customerVat, customerAddress, customerCity } = req.body;
    const tenantId = req.user!.tenantId!;

    // Validate month and year
    if (!month || !year || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Valid month (1-12) and year are required' });
    }

    // Check if invoice already exists for this month
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        tenantId,
        invoiceMonth: month,
        invoiceYear: year,
        customerName
      }
    });

    if (existingInvoice) {
      return res.status(400).json({ 
        error: `Invoice already exists for ${customerName} in ${month}/${year}`,
        invoiceId: existingInvoice.id
      });
    }

    // Get tenant info
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Get timesheets for the month
    const startDate = new Date(year, month - 1, 1); // First day of month
    const endDate = new Date(year, month, 0); // Last day of month

    const timesheets = await prisma.timesheet.findMany({
      where: {
        tenantId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        laborer: {
          include: {
            job: true
          }
        }
      }
    });

    // Get supplies for the month
    const supplies = await prisma.supply.findMany({
      where: {
        tenantId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        category: true
      }
    });

    if (timesheets.length === 0 && supplies.length === 0) {
      return res.status(400).json({ error: `No timesheets or supplies found for ${month}/${year}` });
    }

    // Group timesheets by job and calculate totals
    const jobSummary: { [jobId: string]: { 
      jobName: string, 
      totalHours: number, 
      totalOvertimeHours: number,
      orgRate: number,
      laborers: string[]
    }} = {};

    timesheets.forEach(timesheet => {
      const jobId = timesheet.laborer.jobId;
      const jobName = timesheet.laborer.job?.name || 'Unknown Job';
      const orgRate = parseFloat(timesheet.laborer.orgRate.toString());
      const regularHours = parseFloat(timesheet.hoursWorked.toString());
      const overtimeHours = parseFloat(timesheet.overtime.toString());

      if (!jobSummary[jobId]) {
        jobSummary[jobId] = {
          jobName,
          totalHours: 0,
          totalOvertimeHours: 0,
          orgRate,
          laborers: []
        };
      }

      jobSummary[jobId].totalHours += regularHours;
      jobSummary[jobId].totalOvertimeHours += overtimeHours;
      
      if (!jobSummary[jobId].laborers.includes(timesheet.laborer.name)) {
        jobSummary[jobId].laborers.push(timesheet.laborer.name);
      }
    });

    // Generate invoice number
    const invoiceNumber = await generateMonthlyInvoiceNumber(tenantId, month, year);

    // Calculate totals and create invoice items
    let subtotal = 0;
    let totalVat = 0;

    const invoiceItems = [];

    // Add timesheet items
    if (timesheets.length > 0) {
      const timesheetItems = Object.entries(jobSummary).map(([jobId, summary]) => {
        const regularAmount = summary.totalHours * summary.orgRate;
        const overtimeAmount = summary.totalOvertimeHours * summary.orgRate * 1.5; // 1.5x for overtime
        const lineTotal = regularAmount + overtimeAmount;
        const vatAmount = lineTotal * 0.15; // 15% VAT
        const totalAmount = lineTotal + vatAmount;

        subtotal += lineTotal;
        totalVat += vatAmount;

        const description = `${summary.jobName} - ${summary.totalHours}h regular${summary.totalOvertimeHours > 0 ? ` + ${summary.totalOvertimeHours}h overtime` : ''} (${summary.laborers.length} laborers)`;

        return {
          description,
          quantity: summary.totalHours + summary.totalOvertimeHours,
          unitPrice: summary.orgRate,
          vatRate: 15,
          lineTotal,
          vatAmount,
          totalAmount
        };
      });

      invoiceItems.push(...timesheetItems);
    }

    // Add supply items
    if (supplies.length > 0) {
      // Group supplies by category
      const supplySummary: { [categoryId: string]: { 
        categoryName: string, 
        items: Array<{ name: string, quantity: number, price: number, total: number }>,
        totalValue: number
      }} = {};

      supplies.forEach(supply => {
        const categoryId = supply.categoryId;
        const categoryName = supply.category.name;
        const price = Number(supply.price);
        const total = price * supply.quantity;

        if (!supplySummary[categoryId]) {
          supplySummary[categoryId] = {
            categoryName,
            items: [],
            totalValue: 0
          };
        }

        supplySummary[categoryId].items.push({
          name: supply.name,
          quantity: supply.quantity,
          price: price,
          total: total
        });
        supplySummary[categoryId].totalValue += total;
      });

      // Create invoice items for supplies
      const supplyItems = Object.entries(supplySummary).map(([, summary]) => {
        const lineTotal = summary.totalValue;
        const vatAmount = lineTotal * 0.15; // 15% VAT
        const totalAmount = lineTotal + vatAmount;

        subtotal += lineTotal;
        totalVat += vatAmount;

        // Create detailed description with line breaks
        const itemsList = summary.items.map(item => 
          `${item.name}\n(${item.quantity}× ${item.price.toFixed(2)} SAR)`
        ).join('\n');
        
        const description = `${summary.categoryName} Supplies:\n${itemsList}`;

        return {
          description,
          quantity: summary.items.reduce((sum, item) => sum + item.quantity, 0),
          unitPrice: summary.totalValue / summary.items.reduce((sum, item) => sum + item.quantity, 0), // Average price
          vatRate: 15,
          lineTotal,
          vatAmount,
          totalAmount
        };
      });

      invoiceItems.push(...supplyItems);
    }

    const totalAmount = subtotal + totalVat;

    // Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        invoiceMonth: month,
        invoiceYear: year,
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        customerName: customerName || 'ILYAS Arab Engineering Construction Ltd',
        customerVat: customerVat || '311097151900003',
        customerAddress: customerAddress || 'No.100 Gate 1, Building No.7544 King Fahad Road, Al Nakhil',
        customerCity: customerCity || 'District,Riyadh, Kingdom of Saudi Arabia',
        subtotal,
        vatAmount: totalVat,
        totalAmount,
        tenantId,
        items: {
          create: invoiceItems
        }
      },
      include: {
        items: true,
        tenant: true
      }
    });

    // Generate QR code
    const qrCode = await generateZATCAQRCode(invoice, tenant);

    // Update invoice with QR code
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: { qrCode },
      include: {
        items: true,
        tenant: true
      }
    });

    res.status(201).json(updatedInvoice);
  } catch (error) {
    next(error);
  }
});

// Get all invoices for current tenant
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { page = 1, limit = 50, status, search = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      tenantId: req.user!.tenantId!,
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search as string, mode: 'insensitive' } },
        { customerName: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          items: true
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.invoice.count({ where })
    ]);

    res.json({
      invoices,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get single invoice
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId!
      },
      include: {
        items: true,
        tenant: true
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (error) {
    next(error);
  }
});

// Create invoice
router.post('/', requireWriteAccess, async (req: AuthRequest, res, next) => {
  try {
    const data = invoiceSchema.parse(req.body);
    const tenantId = req.user!.tenantId!;

    // Get tenant info
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Generate invoice number for current month
    const currentDate = new Date(data.issueDate);
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();
    const invoiceNumber = await generateMonthlyInvoiceNumber(tenantId, month, year);

    // Calculate totals
    let subtotal = 0;
    let totalVat = 0;

    const processedItems = data.items.map(item => {
      const lineTotal = item.quantity * item.unitPrice;
      const vatAmount = lineTotal * (item.vatRate / 100);
      const totalAmount = lineTotal + vatAmount;

      subtotal += lineTotal;
      totalVat += vatAmount;

      return {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        vatRate: item.vatRate,
        lineTotal,
        vatAmount,
        totalAmount
      };
    });

    const totalAmount = subtotal + totalVat;

    // Create invoice with items
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        invoiceMonth: month,
        invoiceYear: year,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        customerName: data.customerName,
        customerVat: data.customerVat,
        customerAddress: data.customerAddress,
        customerCity: data.customerCity,
        subtotal,
        vatAmount: totalVat,
        totalAmount,
        tenantId,
        items: {
          create: processedItems
        }
      },
      include: {
        items: true,
        tenant: true
      }
    });

    // Generate QR code
    const qrCode = await generateZATCAQRCode(invoice, tenant);

    // Update invoice with QR code
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: { qrCode },
      include: {
        items: true,
        tenant: true
      }
    });

    res.status(201).json(updatedInvoice);
  } catch (error) {
    next(error);
  }
});

// Update invoice status
router.patch('/:id/status', requireWriteAccess, async (req: AuthRequest, res, next) => {
  try {
    const { status, paidDate, paymentMethod } = req.body;

    const invoice = await prisma.invoice.updateMany({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId!
      },
      data: {
        status,
        paidDate: paidDate ? new Date(paidDate) : null,
        paymentMethod
      }
    });

    if (invoice.count === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const updatedInvoice = await prisma.invoice.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId!
      },
      include: {
        items: true
      }
    });

    res.json(updatedInvoice);
  } catch (error) {
    next(error);
  }
});

// Generate PDF invoice using Puppeteer for perfect HTML/CSS rendering
router.get('/:id/pdf', async (req: AuthRequest, res, next) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId!
      },
      include: {
        items: true,
        tenant: true
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Generate HTML content that matches the print version exactly
    const htmlContent = generateInvoiceHTML(invoice);

    // Launch Puppeteer with system Chromium
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-first-run',
        '--safebrowsing-disable-auto-update',
        '--single-process',
        '--disable-crash-reporter',
        '--disable-breakpad'
      ]
    });

    const page = await browser.newPage();
    
    // Set content with proper encoding for Arabic text
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Generate PDF with proper settings
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      },
      printBackground: true,
      preferCSSPageSize: true
    });

    await browser.close();

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);
    
    // Send PDF buffer
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF generation error:', error);
    next(error);
  }
});

// Helper function to generate HTML content for PDF
function generateInvoiceHTML(invoice: any): string {
  const numberToWords = (num: number): string => {
    // Simple number to words conversion for SAR
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const thousands = ['', 'Thousand', 'Million', 'Billion'];

    if (num === 0) return 'Zero Saudi Riyals Only';

    const convert = (n: number): string => {
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
      if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convert(n % 100) : '');
      
      for (let i = 0; i < thousands.length; i++) {
        const unit = Math.pow(1000, i + 1);
        if (n < unit) {
          const quotient = Math.floor(n / Math.pow(1000, i));
          const remainder = n % Math.pow(1000, i);
          return convert(quotient) + ' ' + thousands[i] + (remainder !== 0 ? ' ' + convert(remainder) : '');
        }
      }
      return '';
    };

    const integerPart = Math.floor(num);
    const decimalPart = Math.round((num - integerPart) * 100);
    
    let result = convert(integerPart) + ' Saudi Riyal' + (integerPart !== 1 ? 's' : '');
    if (decimalPart > 0) {
      result += ' and ' + convert(decimalPart) + ' Halala' + (decimalPart !== 1 ? 's' : '');
    }
    return result + ' Only';
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${invoice.invoiceNumber}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Arial:wght@400;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.4;
            color: black;
            background: white;
            padding: 20px;
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
        
        .company-info {
            flex: 1;
        }
        
        .company-info h1 {
            font-size: 18pt;
            font-weight: bold;
            margin-bottom: 5px;
            font-family: Arial, sans-serif;
        }
        
        .company-info .arabic {
            font-size: 16pt;
            margin-bottom: 10px;
            font-family: Arial, sans-serif;
            direction: rtl;
            text-align: right;
        }
        
        .company-info p {
            font-size: 10pt;
            margin: 2px 0;
            font-family: Arial, sans-serif;
        }
        
        .invoice-title {
            text-align: right;
            flex: 1;
        }
        
        .invoice-title h2 {
            font-size: 18pt;
            font-weight: bold;
            margin-bottom: 5px;
            font-family: Arial, sans-serif;
        }
        
        .invoice-title .arabic {
            font-size: 16pt;
            font-family: Arial, sans-serif;
            direction: rtl;
            text-align: right;
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
            font-family: Arial, sans-serif;
        }
        
        .bill-to p {
            margin: 3px 0;
            font-family: Arial, sans-serif;
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
            font-family: Arial, sans-serif;
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
            font-family: Arial, sans-serif;
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
            font-family: Arial, sans-serif;
        }
        
        .amount-words {
            margin: 20px 0;
            font-size: 10pt;
            font-family: Arial, sans-serif;
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <!-- Header -->
        <div class="header">
            <div class="company-info">
                <h1>SALEH ABDULLAH AL-MALKI GENERAL CONTRACTING COMPANY</h1>
                <div class="arabic">شركة صالح عبدالله المالكي للمقاولات العامة</div>
                <p><strong>VAT:</strong> 312886354600003</p>
                <p><strong>Email:</strong> tawaffallah@gmail.com</p>
            </div>
            <div class="invoice-title">
                <h2>Tax Invoice</h2>
                <div class="arabic">فاتورة ضريبية</div>
            </div>
        </div>

        <!-- Invoice Details -->
        <div class="invoice-details">
            <div class="bill-to">
                <h3>Bill To:</h3>
                <p><strong>Name:</strong> ${invoice.customerName}</p>
                <p><strong>Address:</strong> ${invoice.customerAddress}</p>
                <p><strong>City:</strong> ${invoice.customerCity}</p>
                ${invoice.customerVat ? `<p><strong>VAT:</strong> ${invoice.customerVat}</p>` : ''}
            </div>
            <div class="invoice-meta">
                <div>
                    <p><strong>Invoice #:</strong> ${invoice.invoiceNumber}</p>
                    <p><strong>Invoice Date:</strong> ${new Date(invoice.issueDate).toLocaleDateString()}</p>
                    <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
                </div>
                
                ${invoice.qrCode ? `
                <div class="qr-code">
                    <img src="${invoice.qrCode}" alt="ZATCA QR Code" />
                </div>
                ` : ''}
            </div>
        </div>

        <!-- Items Table -->
        <table class="items-table">
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
                ${invoice.items.map((item: any, index: number) => `
                <tr>
                    <td class="text-center">${index + 1}</td>
                    <td>${item.description}</td>
                    <td class="text-center">${parseFloat(item.quantity).toFixed(2)}</td>
                    <td class="text-right">${parseFloat(item.unitPrice).toFixed(2)}</td>
                    <td class="text-right">${parseFloat(item.lineTotal).toFixed(2)}</td>
                    <td class="text-right">${parseFloat(item.vatAmount).toFixed(2)}</td>
                    <td class="text-right">${parseFloat(item.totalAmount).toFixed(2)}</td>
                </tr>
                `).join('')}
                <tr class="total-row">
                    <td colspan="4" class="text-right">Total</td>
                    <td class="text-right">${parseFloat(invoice.subtotal).toFixed(2)}</td>
                    <td class="text-right">${parseFloat(invoice.vatAmount).toFixed(2)}</td>
                    <td class="text-right">${parseFloat(invoice.totalAmount).toFixed(2)}</td>
                </tr>
            </tbody>
        </table>

        <!-- Total Summary -->
        <div class="summary">
            <div class="summary-box">
                <div class="summary-row total">
                    <span>Net Amount:</span>
                    <span>SAR ${parseFloat(invoice.totalAmount).toFixed(2)}</span>
                </div>
            </div>
        </div>

        <!-- Amount in Words -->
        <div class="amount-words">
            <p><strong>Amount in Words:</strong> ${numberToWords(parseFloat(invoice.totalAmount))}</p>
        </div>

        <!-- Bank Details -->
        <div class="bank-details">
            <p><strong>Bank Details:</strong></p>
            <p>Account Number: 379000100006865704167</p>
            <p>IBAN Number: SA6600003790001000068657041</p>
            <p>Al rajhi Bank مصرف الراجحي للاستثمار</p>
            <p>SALEH ABDULLAH AL-MALKI GENERAL CONTRACTING COMPANY</p>
        </div>
    </div>
</body>
</html>
  `;
}

// Delete invoice
router.delete('/:id', requireWriteAccess, async (req: AuthRequest, res, next) => {
  try {
    const invoice = await prisma.invoice.deleteMany({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId!
      }
    });

    if (invoice.count === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export { router as invoiceRoutes };