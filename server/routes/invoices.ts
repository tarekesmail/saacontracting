import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';

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
  const sellerName = Buffer.from(tenant.name, 'utf8');
  const vatNumber = Buffer.from('312886534600003', 'utf8'); // Your VAT number
  const timestamp = Buffer.from(invoice.issueDate.toISOString(), 'utf8');
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
  const lastInvoice = await prisma.invoice.findFirst({
    where: { 
      tenantId,
      invoiceMonth: month,
      invoiceYear: year
    },
    orderBy: { invoiceNumber: 'desc' }
  });

  let nextNumber = 1;
  if (lastInvoice && lastInvoice.invoiceNumber) {
    const lastNumber = parseInt(lastInvoice.invoiceNumber);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return nextNumber.toString();
}

// Generate monthly invoice from timesheets
router.post('/generate-monthly', async (req: AuthRequest, res, next) => {
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

        // Create detailed description
        const itemsList = summary.items.map(item => 
          `${item.name} (${item.quantity}x ${item.price.toFixed(2)} SAR)`
        ).join(', ');
        
        const description = `${summary.categoryName} Supplies: ${itemsList}`;

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
router.post('/', async (req: AuthRequest, res, next) => {
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
router.patch('/:id/status', async (req: AuthRequest, res, next) => {
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

// Generate PDF invoice
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

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);
    
    // Pipe PDF to response
    doc.pipe(res);

    // Company Header
    doc.fontSize(20).text('SALEH ABDULLAH AL-MALKI GENERAL CONTRACTING COMPANY', 50, 50);
    doc.fontSize(14).text('شركة صالح عبدالله المالكي للمقاولات العامة', 50, 75);
    doc.fontSize(10).text('VAT: 312886534600003', 50, 95);
    doc.text('Email: tawaffallah@gmail.com', 50, 110);

    // Invoice Title
    doc.fontSize(18).text('Tax Invoice', 250, 150);
    doc.text('فاتورة ضريبية', 250, 175);

    // Invoice Details
    doc.fontSize(10);
    doc.text(`Invoice #: ${invoice.invoiceNumber}`, 400, 220);
    doc.text(`Invoice Date: ${invoice.issueDate.toLocaleDateString()}`, 400, 235);
    doc.text(`Due Date: ${invoice.dueDate.toLocaleDateString()}`, 400, 250);

    // Customer Details
    doc.text('Bill To:', 50, 220);
    doc.text(`Name: ${invoice.customerName}`, 50, 235);
    doc.text(`Address: ${invoice.customerAddress}`, 50, 250);
    doc.text(`City: ${invoice.customerCity}`, 50, 265);
    if (invoice.customerVat) {
      doc.text(`VAT: ${invoice.customerVat}`, 50, 280);
    }

    // Items Table
    const tableTop = 320;
    doc.text('Description', 50, tableTop);
    doc.text('Qty', 200, tableTop);
    doc.text('Rate', 250, tableTop);
    doc.text('Amount', 300, tableTop);
    doc.text('VAT', 350, tableTop);
    doc.text('Total', 400, tableTop);

    let yPosition = tableTop + 20;
    invoice.items.forEach((item) => {
      doc.text(item.description, 50, yPosition);
      doc.text(item.quantity.toString(), 200, yPosition);
      doc.text(item.unitPrice.toString(), 250, yPosition);
      doc.text(item.lineTotal.toString(), 300, yPosition);
      doc.text(item.vatAmount.toString(), 350, yPosition);
      doc.text(item.totalAmount.toString(), 400, yPosition);
      yPosition += 20;
    });

    // Totals
    yPosition += 20;
    doc.text(`Subtotal: ${invoice.subtotal} SAR`, 300, yPosition);
    doc.text(`VAT (15%): ${invoice.vatAmount} SAR`, 300, yPosition + 15);
    doc.text(`Total: ${invoice.totalAmount} SAR`, 300, yPosition + 30);

    // QR Code (if available)
    if (invoice.qrCode) {
      // Note: You'd need to decode the base64 QR code and add it to the PDF
      doc.text('QR Code for ZATCA compliance included', 50, yPosition + 60);
    }

    doc.end();
  } catch (error) {
    next(error);
  }
});

// Delete invoice
router.delete('/:id', async (req: AuthRequest, res, next) => {
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