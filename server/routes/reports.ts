import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import ExcelJS from 'exceljs';

const router = express.Router();
const prisma = new PrismaClient();

const reportQuerySchema = z.object({
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  laborerId: z.string().optional(),
  jobId: z.string().optional(),
  categoryId: z.string().optional()
});

// Get labor report data (using salary rates)
router.get('/labor', async (req: AuthRequest, res, next) => {
  try {
    const { startDate, endDate, laborerId, jobId } = reportQuerySchema.parse(req.query);
    
    const where: any = {
      tenantId: req.user!.tenantId!,
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    };

    if (laborerId) where.laborerId = laborerId;
    if (jobId) where.jobId = jobId;

    const timesheets = await prisma.timesheet.findMany({
      where,
      include: {
        laborer: true,
        job: true
      },
      orderBy: [
        { laborer: { name: 'asc' } }
      ]
    });

    // Group by laborer and aggregate data
    const laborerMap = new Map();
    
    timesheets.forEach(ts => {
      const laborerId = ts.laborer.id;
      const regularHours = Number(ts.hoursWorked);
      const overtimeHours = Number(ts.overtime);
      const overtimeMultiplier = Number(ts.overtimeMultiplier);
      const salaryRate = Number(ts.laborer.salaryRate);
      
      const regularPay = regularHours * salaryRate;
      const overtimePay = overtimeHours * salaryRate * overtimeMultiplier;
      const totalPay = regularPay + overtimePay;
      const totalHours = regularHours + overtimeHours;

      if (laborerMap.has(laborerId)) {
        const existing = laborerMap.get(laborerId);
        existing.daysWorked += 1;
        existing.regularHours += regularHours;
        existing.overtimeHours += overtimeHours;
        existing.totalHours += totalHours;
        existing.regularPay += regularPay;
        existing.overtimePay += overtimePay;
        existing.totalPay += totalPay;
        
        // Track different overtime multipliers used
        if (!existing.overtimeMultipliers.includes(overtimeMultiplier)) {
          existing.overtimeMultipliers.push(overtimeMultiplier);
        }
      } else {
        laborerMap.set(laborerId, {
          laborerName: ts.laborer.name,
          laborerId: ts.laborer.idNumber,
          jobName: ts.job.name,
          salaryRate: salaryRate,
          daysWorked: 1,
          regularHours: regularHours,
          overtimeHours: overtimeHours,
          totalHours: totalHours,
          regularPay: regularPay,
          overtimePay: overtimePay,
          totalPay: totalPay,
          overtimeMultipliers: [overtimeMultiplier]
        });
      }
    });

    // Convert map to array
    const reportData = Array.from(laborerMap.values()).map(item => ({
      ...item,
      overtimeMultiplier: item.overtimeMultipliers.length === 1 
        ? item.overtimeMultipliers[0] 
        : `${Math.min(...item.overtimeMultipliers)}-${Math.max(...item.overtimeMultipliers)}x`
    }));

    // Calculate summary
    const summary = {
      totalDaysWorked: reportData.reduce((sum, item) => sum + item.daysWorked, 0),
      totalRegularHours: reportData.reduce((sum, item) => sum + item.regularHours, 0),
      totalOvertimeHours: reportData.reduce((sum, item) => sum + item.overtimeHours, 0),
      totalHours: reportData.reduce((sum, item) => sum + item.totalHours, 0),
      totalRegularPay: reportData.reduce((sum, item) => sum + item.regularPay, 0),
      totalOvertimePay: reportData.reduce((sum, item) => sum + item.overtimePay, 0),
      totalPay: reportData.reduce((sum, item) => sum + item.totalPay, 0),
      recordCount: reportData.length
    };

    res.json({
      data: reportData,
      summary,
      reportType: 'labor',
      dateRange: { startDate, endDate }
    });
  } catch (error) {
    next(error);
  }
});

// Get client report data (using organization rates)
router.get('/client', async (req: AuthRequest, res, next) => {
  try {
    const { startDate, endDate, laborerId, jobId } = reportQuerySchema.parse(req.query);
    
    const where: any = {
      tenantId: req.user!.tenantId!,
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    };

    if (laborerId) where.laborerId = laborerId;
    if (jobId) where.jobId = jobId;

    const timesheets = await prisma.timesheet.findMany({
      where,
      include: {
        laborer: true,
        job: true
      },
      orderBy: [
        { laborer: { name: 'asc' } }
      ]
    });

    // Group by laborer and aggregate data
    const laborerMap = new Map();
    
    timesheets.forEach(ts => {
      const laborerId = ts.laborer.id;
      const regularHours = Number(ts.hoursWorked);
      const overtimeHours = Number(ts.overtime);
      const overtimeMultiplier = Number(ts.overtimeMultiplier);
      const salaryRate = Number(ts.laborer.salaryRate);
      const orgRate = Number(ts.laborer.orgRate);
      
      const regularCharge = regularHours * orgRate;
      const overtimeCharge = overtimeHours * orgRate * overtimeMultiplier;
      const totalCharge = regularCharge + overtimeCharge;
      
      const regularCost = regularHours * salaryRate;
      const overtimeCost = overtimeHours * salaryRate * overtimeMultiplier;
      const totalCost = regularCost + overtimeCost;
      const profit = totalCharge - totalCost;
      const totalHours = regularHours + overtimeHours;

      if (laborerMap.has(laborerId)) {
        const existing = laborerMap.get(laborerId);
        existing.daysWorked += 1;
        existing.regularHours += regularHours;
        existing.overtimeHours += overtimeHours;
        existing.totalHours += totalHours;
        existing.regularCharge += regularCharge;
        existing.overtimeCharge += overtimeCharge;
        existing.totalCharge += totalCharge;
        existing.totalCost += totalCost;
        existing.profit += profit;
        
        // Track different overtime multipliers used
        if (!existing.overtimeMultipliers.includes(overtimeMultiplier)) {
          existing.overtimeMultipliers.push(overtimeMultiplier);
        }
      } else {
        laborerMap.set(laborerId, {
          laborerName: ts.laborer.name,
          laborerId: ts.laborer.idNumber,
          jobName: ts.job.name,
          orgRate: orgRate,
          daysWorked: 1,
          regularHours: regularHours,
          overtimeHours: overtimeHours,
          totalHours: totalHours,
          regularCharge: regularCharge,
          overtimeCharge: overtimeCharge,
          totalCharge: totalCharge,
          totalCost: totalCost,
          profit: profit,
          overtimeMultipliers: [overtimeMultiplier]
        });
      }
    });

    // Convert map to array
    const reportData = Array.from(laborerMap.values()).map(item => ({
      ...item,
      overtimeMultiplier: item.overtimeMultipliers.length === 1 
        ? item.overtimeMultipliers[0] 
        : `${Math.min(...item.overtimeMultipliers)}-${Math.max(...item.overtimeMultipliers)}x`
    }));

    // Calculate summary
    const summary = {
      totalDaysWorked: reportData.reduce((sum, item) => sum + item.daysWorked, 0),
      totalRegularHours: reportData.reduce((sum, item) => sum + item.regularHours, 0),
      totalOvertimeHours: reportData.reduce((sum, item) => sum + item.overtimeHours, 0),
      totalHours: reportData.reduce((sum, item) => sum + item.totalHours, 0),
      totalRegularCharge: reportData.reduce((sum, item) => sum + item.regularCharge, 0),
      totalOvertimeCharge: reportData.reduce((sum, item) => sum + item.overtimeCharge, 0),
      totalCharge: reportData.reduce((sum, item) => sum + item.totalCharge, 0),
      totalCost: reportData.reduce((sum, item) => sum + item.totalCost, 0),
      totalProfit: reportData.reduce((sum, item) => sum + item.profit, 0),
      recordCount: reportData.length
    };

    res.json({
      data: reportData,
      summary,
      reportType: 'client',
      dateRange: { startDate, endDate }
    });
  } catch (error) {
    next(error);
  }
});

// Export labor report to Excel
router.get('/labor/excel', async (req: AuthRequest, res, next) => {
  try {
    const { startDate, endDate, laborerId, jobId } = reportQuerySchema.parse(req.query);
    
    const where: any = {
      tenantId: req.user!.tenantId!,
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    };

    if (laborerId) where.laborerId = laborerId;
    if (jobId) where.jobId = jobId;

    const timesheets = await prisma.timesheet.findMany({
      where,
      include: {
        laborer: true,
        job: true
      },
      orderBy: [
        { laborer: { name: 'asc' } }
      ]
    });

    // Group by laborer and aggregate data (same logic as API endpoint)
    const laborerMap = new Map();
    
    timesheets.forEach(ts => {
      const laborerId = ts.laborer.id;
      const regularHours = Number(ts.hoursWorked);
      const overtimeHours = Number(ts.overtime);
      const overtimeMultiplier = Number(ts.overtimeMultiplier);
      const salaryRate = Number(ts.laborer.salaryRate);
      
      const regularPay = regularHours * salaryRate;
      const overtimePay = overtimeHours * salaryRate * overtimeMultiplier;
      const totalPay = regularPay + overtimePay;
      const totalHours = regularHours + overtimeHours;

      if (laborerMap.has(laborerId)) {
        const existing = laborerMap.get(laborerId);
        existing.daysWorked += 1;
        existing.regularHours += regularHours;
        existing.overtimeHours += overtimeHours;
        existing.totalHours += totalHours;
        existing.regularPay += regularPay;
        existing.overtimePay += overtimePay;
        existing.totalPay += totalPay;
        
        // Track different overtime multipliers used
        if (!existing.overtimeMultipliers.includes(overtimeMultiplier)) {
          existing.overtimeMultipliers.push(overtimeMultiplier);
        }
      } else {
        laborerMap.set(laborerId, {
          laborerName: ts.laborer.name,
          laborerId: ts.laborer.idNumber,
          jobName: ts.job.name,
          salaryRate: salaryRate,
          daysWorked: 1,
          regularHours: regularHours,
          overtimeHours: overtimeHours,
          totalHours: totalHours,
          regularPay: regularPay,
          overtimePay: overtimePay,
          totalPay: totalPay,
          overtimeMultipliers: [overtimeMultiplier]
        });
      }
    });

    // Convert map to array
    const aggregatedData = Array.from(laborerMap.values()).map(item => ({
      ...item,
      overtimeMultiplier: item.overtimeMultipliers.length === 1 
        ? item.overtimeMultipliers[0] 
        : `${Math.min(...item.overtimeMultipliers)}-${Math.max(...item.overtimeMultipliers)}`
    }));

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Labor Report');

    // Add title
    worksheet.mergeCells('A1:L1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'SAA Contracting - Labor Report (Summary)';
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    // Add date range
    worksheet.mergeCells('A2:L2');
    const dateCell = worksheet.getCell('A2');
    dateCell.value = `Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
    dateCell.font = { size: 12 };
    dateCell.alignment = { horizontal: 'center' };

    // Add headers
    const headers = [
      'Laborer Name', 'ID Number', 'Job', 'Days Worked', 'Regular Hours', 'Overtime Hours', 
      'OT Rate', 'Total Hours', 'Salary Rate (SAR)', 'Regular Pay (SAR)', 
      'Overtime Pay (SAR)', 'Total Pay (SAR)'
    ];
    
    worksheet.addRow([]); // Empty row
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add aggregated data
    let totalDaysWorked = 0;
    let totalRegularHours = 0;
    let totalOvertimeHours = 0;
    let totalPay = 0;

    aggregatedData.forEach(item => {
      totalDaysWorked += item.daysWorked;
      totalRegularHours += item.regularHours;
      totalOvertimeHours += item.overtimeHours;
      totalPay += item.totalPay;

      worksheet.addRow([
        item.laborerName,
        item.laborerId,
        item.jobName,
        item.daysWorked,
        Number(item.regularHours.toFixed(1)),
        Number(item.overtimeHours.toFixed(1)),
        `${item.overtimeMultiplier}x`,
        Number(item.totalHours.toFixed(1)),
        item.salaryRate,
        Number(item.regularPay.toFixed(2)),
        Number(item.overtimePay.toFixed(2)),
        Number(item.totalPay.toFixed(2))
      ]);
    });

    // Add summary
    worksheet.addRow([]); // Empty row
    const summaryRow = worksheet.addRow([
      'TOTAL', '', '', totalDaysWorked, totalRegularHours.toFixed(1), totalOvertimeHours.toFixed(1), '', 
      (totalRegularHours + totalOvertimeHours).toFixed(1), '', '', '', totalPay.toFixed(2)
    ]);
    summaryRow.font = { bold: true };
    summaryRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFD700' }
    };

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15;
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=labor-report-summary-${startDate}-${endDate}.xlsx`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
});

// Export client report to Excel
router.get('/client/excel', async (req: AuthRequest, res, next) => {
  try {
    const { startDate, endDate, laborerId, jobId } = reportQuerySchema.parse(req.query);
    
    const where: any = {
      tenantId: req.user!.tenantId!,
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    };

    if (laborerId) where.laborerId = laborerId;
    if (jobId) where.jobId = jobId;

    const timesheets = await prisma.timesheet.findMany({
      where,
      include: {
        laborer: true,
        job: true
      },
      orderBy: [
        { laborer: { name: 'asc' } }
      ]
    });

    // Group by laborer and aggregate data (same logic as API endpoint)
    const laborerMap = new Map();
    
    timesheets.forEach(ts => {
      const laborerId = ts.laborer.id;
      const regularHours = Number(ts.hoursWorked);
      const overtimeHours = Number(ts.overtime);
      const overtimeMultiplier = Number(ts.overtimeMultiplier);
      const salaryRate = Number(ts.laborer.salaryRate);
      const orgRate = Number(ts.laborer.orgRate);
      
      const regularCharge = regularHours * orgRate;
      const overtimeCharge = overtimeHours * orgRate * overtimeMultiplier;
      const totalCharge = regularCharge + overtimeCharge;
      
      const regularCost = regularHours * salaryRate;
      const overtimeCost = overtimeHours * salaryRate * overtimeMultiplier;
      const totalCost = regularCost + overtimeCost;
      const profit = totalCharge - totalCost;
      const totalHours = regularHours + overtimeHours;

      if (laborerMap.has(laborerId)) {
        const existing = laborerMap.get(laborerId);
        existing.daysWorked += 1;
        existing.regularHours += regularHours;
        existing.overtimeHours += overtimeHours;
        existing.totalHours += totalHours;
        existing.regularCharge += regularCharge;
        existing.overtimeCharge += overtimeCharge;
        existing.totalCharge += totalCharge;
        existing.totalCost += totalCost;
        existing.profit += profit;
        
        // Track different overtime multipliers used
        if (!existing.overtimeMultipliers.includes(overtimeMultiplier)) {
          existing.overtimeMultipliers.push(overtimeMultiplier);
        }
      } else {
        laborerMap.set(laborerId, {
          laborerName: ts.laborer.name,
          laborerId: ts.laborer.idNumber,
          jobName: ts.job.name,
          orgRate: orgRate,
          daysWorked: 1,
          regularHours: regularHours,
          overtimeHours: overtimeHours,
          totalHours: totalHours,
          regularCharge: regularCharge,
          overtimeCharge: overtimeCharge,
          totalCharge: totalCharge,
          totalCost: totalCost,
          profit: profit,
          overtimeMultipliers: [overtimeMultiplier]
        });
      }
    });

    // Convert map to array
    const aggregatedData = Array.from(laborerMap.values()).map(item => ({
      ...item,
      overtimeMultiplier: item.overtimeMultipliers.length === 1 
        ? item.overtimeMultipliers[0] 
        : `${Math.min(...item.overtimeMultipliers)}-${Math.max(...item.overtimeMultipliers)}`
    }));

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Client Report');

    // Add title
    worksheet.mergeCells('A1:M1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'SAA Contracting - Client Billing Report (Summary)';
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    // Add date range
    worksheet.mergeCells('A2:M2');
    const dateCell = worksheet.getCell('A2');
    dateCell.value = `Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
    dateCell.font = { size: 12 };
    dateCell.alignment = { horizontal: 'center' };

    // Add headers
    const headers = [
      'Laborer Name', 'ID Number', 'Job', 'Days Worked', 'Regular Hours', 'Overtime Hours', 
      'OT Rate', 'Total Hours', 'Org Rate (SAR)', 'Regular Charge (SAR)', 
      'Overtime Charge (SAR)', 'Total Charge (SAR)', 'Profit (SAR)'
    ];
    
    worksheet.addRow([]); // Empty row
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add aggregated data
    let totalDaysWorked = 0;
    let totalRegularHours = 0;
    let totalOvertimeHours = 0;
    let totalCharge = 0;
    let totalProfit = 0;

    aggregatedData.forEach(item => {
      totalDaysWorked += item.daysWorked;
      totalRegularHours += item.regularHours;
      totalOvertimeHours += item.overtimeHours;
      totalCharge += item.totalCharge;
      totalProfit += item.profit;

      worksheet.addRow([
        item.laborerName,
        item.laborerId,
        item.jobName,
        item.daysWorked,
        Number(item.regularHours.toFixed(1)),
        Number(item.overtimeHours.toFixed(1)),
        `${item.overtimeMultiplier}x`,
        Number(item.totalHours.toFixed(1)),
        item.orgRate,
        Number(item.regularCharge.toFixed(2)),
        Number(item.overtimeCharge.toFixed(2)),
        Number(item.totalCharge.toFixed(2)),
        Number(item.profit.toFixed(2))
      ]);
    });

    // Add summary
    worksheet.addRow([]); // Empty row
    const summaryRow = worksheet.addRow([
      'TOTAL', '', '', totalDaysWorked, totalRegularHours.toFixed(1), totalOvertimeHours.toFixed(1), '', 
      (totalRegularHours + totalOvertimeHours).toFixed(1), '', '', '', totalCharge.toFixed(2), totalProfit.toFixed(2)
    ]);
    summaryRow.font = { bold: true };
    summaryRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFD700' }
    };

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15;
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=client-report-summary-${startDate}-${endDate}.xlsx`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
});

// Get expense report data
router.get('/expenses', async (req: AuthRequest, res, next) => {
  try {
    const { startDate, endDate, categoryId } = reportQuerySchema.parse(req.query);
    
    const where: any = {
      tenantId: req.user!.tenantId!,
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    };

    if (categoryId) where.categoryId = categoryId;

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        category: true
      },
      orderBy: [
        { category: { name: 'asc' } },
        { date: 'desc' }
      ]
    });

    // Group by category and aggregate data
    const categoryMap = new Map();
    
    expenses.forEach(expense => {
      const categoryId = expense.category.id;
      const amount = Number(expense.amount);

      if (categoryMap.has(categoryId)) {
        const existing = categoryMap.get(categoryId);
        existing.totalAmount += amount;
        existing.expenseCount += 1;
        existing.expenses.push({
          date: expense.date,
          description: expense.description,
          amount: amount,
          receipt: expense.receipt,
          notes: expense.notes
        });
      } else {
        categoryMap.set(categoryId, {
          categoryName: expense.category.name,
          categoryColor: expense.category.color,
          totalAmount: amount,
          expenseCount: 1,
          expenses: [{
            date: expense.date,
            description: expense.description,
            amount: amount,
            receipt: expense.receipt,
            notes: expense.notes
          }]
        });
      }
    });

    // Convert map to array
    const reportData = Array.from(categoryMap.values());

    // Calculate summary
    const summary = {
      totalAmount: reportData.reduce((sum, item) => sum + item.totalAmount, 0),
      totalExpenses: reportData.reduce((sum, item) => sum + item.expenseCount, 0),
      categoryCount: reportData.length
    };

    res.json({
      data: reportData,
      summary,
      reportType: 'expenses',
      dateRange: { startDate, endDate }
    });
  } catch (error) {
    next(error);
  }
});

// Export expense report to Excel
router.get('/expenses/excel', async (req: AuthRequest, res, next) => {
  try {
    const { startDate, endDate, categoryId } = reportQuerySchema.parse(req.query);
    
    const where: any = {
      tenantId: req.user!.tenantId!,
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    };

    if (categoryId) where.categoryId = categoryId;

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        category: true
      },
      orderBy: [
        { date: 'desc' }
      ]
    });

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Expense Report');

    // Add title
    worksheet.mergeCells('A1:G1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'SAA Contracting - Expense Report';
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    // Add date range
    worksheet.mergeCells('A2:G2');
    const dateCell = worksheet.getCell('A2');
    dateCell.value = `Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
    dateCell.font = { size: 12 };
    dateCell.alignment = { horizontal: 'center' };

    // Add headers
    const headers = [
      'Date', 'Category', 'Description', 'Amount (SAR)', 'Receipt', 'Notes'
    ];
    
    worksheet.addRow([]); // Empty row
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add expense data
    let totalAmount = 0;

    expenses.forEach(expense => {
      totalAmount += Number(expense.amount);

      worksheet.addRow([
        new Date(expense.date).toLocaleDateString(),
        expense.category.name,
        expense.description,
        Number(expense.amount),
        expense.receipt || '',
        expense.notes || ''
      ]);
    });

    // Add summary
    worksheet.addRow([]); // Empty row
    const summaryRow = worksheet.addRow([
      'TOTAL', '', '', totalAmount.toFixed(2), '', ''
    ]);
    summaryRow.font = { bold: true };
    summaryRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFD700' }
    };

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15;
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=expense-report-${startDate}-${endDate}.xlsx`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
});

// Get profit and loss report
router.get('/profit-loss', async (req: AuthRequest, res, next) => {
  try {
    const { startDate, endDate, jobId } = reportQuerySchema.parse(req.query);
    
    const where: any = {
      tenantId: req.user!.tenantId!,
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    };

    if (jobId) where.jobId = jobId;

    // Get timesheet data for revenue and labor costs
    const timesheets = await prisma.timesheet.findMany({
      where,
      include: {
        laborer: true,
        job: true
      }
    });

    // Get expense data
    const expenses = await prisma.expense.findMany({
      where: {
        tenantId: req.user!.tenantId!,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      include: {
        category: true
      }
    });

    // Calculate revenue and labor costs from timesheets
    let totalRevenue = 0;
    let totalLaborCosts = 0;
    let totalHours = 0;
    const jobBreakdown = new Map();

    timesheets.forEach(ts => {
      const regularHours = Number(ts.hoursWorked);
      const overtimeHours = Number(ts.overtime);
      const overtimeMultiplier = Number(ts.overtimeMultiplier);
      const salaryRate = Number(ts.laborer.salaryRate);
      const orgRate = Number(ts.laborer.orgRate);
      
      // Revenue calculations (what we charge clients)
      const regularRevenue = regularHours * orgRate;
      const overtimeRevenue = overtimeHours * orgRate * overtimeMultiplier;
      const totalTimesheetRevenue = regularRevenue + overtimeRevenue;
      
      // Labor cost calculations (what we pay laborers)
      const regularCost = regularHours * salaryRate;
      const overtimeCost = overtimeHours * salaryRate * overtimeMultiplier;
      const totalTimesheetCost = regularCost + overtimeCost;
      
      const totalTimesheetHours = regularHours + overtimeHours;
      
      totalRevenue += totalTimesheetRevenue;
      totalLaborCosts += totalTimesheetCost;
      totalHours += totalTimesheetHours;

      // Job breakdown
      const jobId = ts.job.id;
      if (jobBreakdown.has(jobId)) {
        const existing = jobBreakdown.get(jobId);
        existing.revenue += totalTimesheetRevenue;
        existing.laborCosts += totalTimesheetCost;
        existing.hours += totalTimesheetHours;
        existing.laborerCount.add(ts.laborer.id);
      } else {
        jobBreakdown.set(jobId, {
          jobName: ts.job.name,
          revenue: totalTimesheetRevenue,
          laborCosts: totalTimesheetCost,
          hours: totalTimesheetHours,
          laborerCount: new Set([ts.laborer.id])
        });
      }
    });

    // Calculate total expenses by category
    let totalExpenses = 0;
    const expensesByCategory = new Map();

    expenses.forEach(expense => {
      const amount = Number(expense.amount);
      totalExpenses += amount;

      const categoryId = expense.category.id;
      if (expensesByCategory.has(categoryId)) {
        const existing = expensesByCategory.get(categoryId);
        existing.amount += amount;
        existing.count += 1;
      } else {
        expensesByCategory.set(categoryId, {
          categoryName: expense.category.name,
          categoryColor: expense.category.color,
          amount: amount,
          count: 1
        });
      }
    });

    // Calculate profit metrics
    const grossProfit = totalRevenue - totalLaborCosts; // Revenue minus direct labor costs
    const netProfit = grossProfit - totalExpenses; // Gross profit minus all expenses
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Convert job breakdown map to array
    const jobBreakdownArray = Array.from(jobBreakdown.values()).map(job => ({
      ...job,
      laborerCount: job.laborerCount.size,
      grossProfit: job.revenue - job.laborCosts,
      margin: job.revenue > 0 ? ((job.revenue - job.laborCosts) / job.revenue) * 100 : 0
    }));

    // Convert expenses breakdown map to array
    const expensesBreakdownArray = Array.from(expensesByCategory.values());

    const summary = {
      // Revenue
      totalRevenue,
      
      // Costs
      totalLaborCosts,
      totalExpenses,
      totalCosts: totalLaborCosts + totalExpenses,
      
      // Profit
      grossProfit,
      netProfit,
      grossMargin,
      netMargin,
      
      // Operational metrics
      totalHours,
      averageHourlyRevenue: totalHours > 0 ? totalRevenue / totalHours : 0,
      averageHourlyLaborCost: totalHours > 0 ? totalLaborCosts / totalHours : 0,
      
      // Counts
      totalJobs: jobBreakdownArray.length,
      totalExpenseCategories: expensesBreakdownArray.length,
      totalTimesheetRecords: timesheets.length,
      totalExpenseRecords: expenses.length
    };

    res.json({
      summary,
      jobBreakdown: jobBreakdownArray,
      expensesBreakdown: expensesBreakdownArray,
      reportType: 'profit-loss',
      dateRange: { startDate, endDate }
    });
  } catch (error) {
    next(error);
  }
});

// Export profit and loss report to Excel
router.get('/profit-loss/excel', async (req: AuthRequest, res, next) => {
  try {
    const { startDate, endDate, jobId } = reportQuerySchema.parse(req.query);
    
    // Get the same data as the regular P&L report
    const where: any = {
      tenantId: req.user!.tenantId!,
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    };

    if (jobId) where.jobId = jobId;

    const timesheets = await prisma.timesheet.findMany({
      where,
      include: {
        laborer: true,
        job: true
      }
    });

    const expenses = await prisma.expense.findMany({
      where: {
        tenantId: req.user!.tenantId!,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      include: {
        category: true
      }
    });

    // Calculate the same metrics as the API endpoint
    let totalRevenue = 0;
    let totalLaborCosts = 0;
    let totalHours = 0;
    const jobBreakdown = new Map();

    timesheets.forEach(ts => {
      const regularHours = Number(ts.hoursWorked);
      const overtimeHours = Number(ts.overtime);
      const overtimeMultiplier = Number(ts.overtimeMultiplier);
      const salaryRate = Number(ts.laborer.salaryRate);
      const orgRate = Number(ts.laborer.orgRate);
      
      const regularRevenue = regularHours * orgRate;
      const overtimeRevenue = overtimeHours * orgRate * overtimeMultiplier;
      const totalTimesheetRevenue = regularRevenue + overtimeRevenue;
      
      const regularCost = regularHours * salaryRate;
      const overtimeCost = overtimeHours * salaryRate * overtimeMultiplier;
      const totalTimesheetCost = regularCost + overtimeCost;
      
      const totalTimesheetHours = regularHours + overtimeHours;
      
      totalRevenue += totalTimesheetRevenue;
      totalLaborCosts += totalTimesheetCost;
      totalHours += totalTimesheetHours;

      const jobId = ts.job.id;
      if (jobBreakdown.has(jobId)) {
        const existing = jobBreakdown.get(jobId);
        existing.revenue += totalTimesheetRevenue;
        existing.laborCosts += totalTimesheetCost;
        existing.hours += totalTimesheetHours;
      } else {
        jobBreakdown.set(jobId, {
          jobName: ts.job.name,
          revenue: totalTimesheetRevenue,
          laborCosts: totalTimesheetCost,
          hours: totalTimesheetHours
        });
      }
    });

    let totalExpenses = 0;
    const expensesByCategory = new Map();

    expenses.forEach(expense => {
      const amount = Number(expense.amount);
      totalExpenses += amount;

      const categoryId = expense.category.id;
      if (expensesByCategory.has(categoryId)) {
        const existing = expensesByCategory.get(categoryId);
        existing.amount += amount;
      } else {
        expensesByCategory.set(categoryId, {
          categoryName: expense.category.name,
          amount: amount
        });
      }
    });

    const grossProfit = totalRevenue - totalLaborCosts;
    const netProfit = grossProfit - totalExpenses;

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    
    // Summary Sheet
    const summarySheet = workbook.addWorksheet('P&L Summary');
    
    // Title
    summarySheet.mergeCells('A1:D1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = 'SAA Contracting - Profit & Loss Report';
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    // Date range
    summarySheet.mergeCells('A2:D2');
    const dateCell = summarySheet.getCell('A2');
    dateCell.value = `Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
    dateCell.font = { size: 12 };
    dateCell.alignment = { horizontal: 'center' };

    // P&L Statement
    summarySheet.addRow([]);
    summarySheet.addRow(['PROFIT & LOSS STATEMENT', '', '', '']);
    summarySheet.addRow([]);
    
    // Revenue section
    summarySheet.addRow(['REVENUE', '', '', '']);
    summarySheet.addRow(['Total Revenue', '', '', totalRevenue.toFixed(2)]);
    summarySheet.addRow([]);
    
    // Cost of Goods Sold section
    summarySheet.addRow(['COST OF GOODS SOLD', '', '', '']);
    summarySheet.addRow(['Labor Costs', '', '', totalLaborCosts.toFixed(2)]);
    summarySheet.addRow(['Gross Profit', '', '', grossProfit.toFixed(2)]);
    summarySheet.addRow([]);
    
    // Operating Expenses section
    summarySheet.addRow(['OPERATING EXPENSES', '', '', '']);
    Array.from(expensesByCategory.values()).forEach(expense => {
      summarySheet.addRow([expense.categoryName, '', '', expense.amount.toFixed(2)]);
    });
    summarySheet.addRow(['Total Expenses', '', '', totalExpenses.toFixed(2)]);
    summarySheet.addRow([]);
    
    // Net Profit section
    summarySheet.addRow(['NET PROFIT', '', '', netProfit.toFixed(2)]);
    
    // Job Breakdown Sheet
    const jobSheet = workbook.addWorksheet('Job Breakdown');
    jobSheet.addRow(['Job Name', 'Hours', 'Revenue (SAR)', 'Labor Costs (SAR)', 'Gross Profit (SAR)', 'Margin (%)']);
    
    Array.from(jobBreakdown.values()).forEach(job => {
      const grossProfit = job.revenue - job.laborCosts;
      const margin = job.revenue > 0 ? (grossProfit / job.revenue) * 100 : 0;
      
      jobSheet.addRow([
        job.jobName,
        job.hours.toFixed(1),
        job.revenue.toFixed(2),
        job.laborCosts.toFixed(2),
        grossProfit.toFixed(2),
        margin.toFixed(1)
      ]);
    });

    // Auto-fit columns
    [summarySheet, jobSheet].forEach(sheet => {
      sheet.columns.forEach(column => {
        column.width = 20;
      });
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=profit-loss-report-${startDate}-${endDate}.xlsx`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
});

export { router as reportRoutes };