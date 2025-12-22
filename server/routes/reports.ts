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
  jobId: z.string().optional()
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
        { date: 'asc' },
        { laborer: { name: 'asc' } }
      ]
    });

    const reportData = timesheets.map(ts => {
      const regularPay = Number(ts.hoursWorked) * Number(ts.laborer.salaryRate);
      const overtimePay = Number(ts.overtime) * Number(ts.laborer.salaryRate) * Number(ts.overtimeMultiplier);
      const totalPay = regularPay + overtimePay;
      const totalHours = Number(ts.hoursWorked) + Number(ts.overtime);

      return {
        date: ts.date,
        laborerName: ts.laborer.name,
        laborerId: ts.laborer.idNumber,
        jobName: ts.job.name,
        regularHours: Number(ts.hoursWorked),
        overtimeHours: Number(ts.overtime),
        overtimeMultiplier: Number(ts.overtimeMultiplier),
        totalHours,
        salaryRate: Number(ts.laborer.salaryRate),
        regularPay,
        overtimePay,
        totalPay,
        notes: ts.notes || ''
      };
    });

    // Calculate summary
    const summary = {
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
        { date: 'asc' },
        { laborer: { name: 'asc' } }
      ]
    });

    const reportData = timesheets.map(ts => {
      const regularCharge = Number(ts.hoursWorked) * Number(ts.laborer.orgRate);
      const overtimeCharge = Number(ts.overtime) * Number(ts.laborer.orgRate) * Number(ts.overtimeMultiplier);
      const totalCharge = regularCharge + overtimeCharge;
      const totalHours = Number(ts.hoursWorked) + Number(ts.overtime);

      // Calculate labor cost for profit calculation
      const regularCost = Number(ts.hoursWorked) * Number(ts.laborer.salaryRate);
      const overtimeCost = Number(ts.overtime) * Number(ts.laborer.salaryRate) * Number(ts.overtimeMultiplier);
      const totalCost = regularCost + overtimeCost;
      const profit = totalCharge - totalCost;

      return {
        date: ts.date,
        laborerName: ts.laborer.name,
        laborerId: ts.laborer.idNumber,
        jobName: ts.job.name,
        regularHours: Number(ts.hoursWorked),
        overtimeHours: Number(ts.overtime),
        overtimeMultiplier: Number(ts.overtimeMultiplier),
        totalHours,
        orgRate: Number(ts.laborer.orgRate),
        regularCharge,
        overtimeCharge,
        totalCharge,
        totalCost,
        profit,
        notes: ts.notes || ''
      };
    });

    // Calculate summary
    const summary = {
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
        { date: 'asc' },
        { laborer: { name: 'asc' } }
      ]
    });

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Labor Report');

    // Add title
    worksheet.mergeCells('A1:L1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'SAA Contracting - Labor Report';
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
      'Date', 'Laborer Name', 'ID Number', 'Job', 'Regular Hours', 'Overtime Hours', 
      'OT Rate', 'Total Hours', 'Salary Rate (SAR)', 'Regular Pay (SAR)', 
      'Overtime Pay (SAR)', 'Total Pay (SAR)', 'Notes'
    ];
    
    worksheet.addRow([]); // Empty row
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data
    let totalRegularHours = 0;
    let totalOvertimeHours = 0;
    let totalPay = 0;

    timesheets.forEach(ts => {
      const regularPay = Number(ts.hoursWorked) * Number(ts.laborer.salaryRate);
      const overtimePay = Number(ts.overtime) * Number(ts.laborer.salaryRate) * Number(ts.overtimeMultiplier);
      const totalPayAmount = regularPay + overtimePay;
      const totalHours = Number(ts.hoursWorked) + Number(ts.overtime);

      totalRegularHours += Number(ts.hoursWorked);
      totalOvertimeHours += Number(ts.overtime);
      totalPay += totalPayAmount;

      worksheet.addRow([
        ts.date.toLocaleDateString(),
        ts.laborer.name,
        ts.laborer.idNumber,
        ts.job.name,
        Number(ts.hoursWorked),
        Number(ts.overtime),
        `${Number(ts.overtimeMultiplier)}x`,
        totalHours,
        Number(ts.laborer.salaryRate),
        regularPay,
        overtimePay,
        totalPayAmount,
        ts.notes || ''
      ]);
    });

    // Add summary
    worksheet.addRow([]); // Empty row
    const summaryRow = worksheet.addRow([
      'TOTAL', '', '', '', totalRegularHours, totalOvertimeHours, '', 
      totalRegularHours + totalOvertimeHours, '', '', '', totalPay, ''
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
    res.setHeader('Content-Disposition', `attachment; filename=labor-report-${startDate}-${endDate}.xlsx`);

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
        { date: 'asc' },
        { laborer: { name: 'asc' } }
      ]
    });

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Client Report');

    // Add title
    worksheet.mergeCells('A1:M1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'SAA Contracting - Client Billing Report';
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
      'Date', 'Laborer Name', 'ID Number', 'Job', 'Regular Hours', 'Overtime Hours', 
      'OT Rate', 'Total Hours', 'Org Rate (SAR)', 'Regular Charge (SAR)', 
      'Overtime Charge (SAR)', 'Total Charge (SAR)', 'Profit (SAR)', 'Notes'
    ];
    
    worksheet.addRow([]); // Empty row
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data
    let totalRegularHours = 0;
    let totalOvertimeHours = 0;
    let totalCharge = 0;
    let totalProfit = 0;

    timesheets.forEach(ts => {
      const regularCharge = Number(ts.hoursWorked) * Number(ts.laborer.orgRate);
      const overtimeCharge = Number(ts.overtime) * Number(ts.laborer.orgRate) * Number(ts.overtimeMultiplier);
      const totalChargeAmount = regularCharge + overtimeCharge;
      const totalHours = Number(ts.hoursWorked) + Number(ts.overtime);

      // Calculate cost for profit
      const regularCost = Number(ts.hoursWorked) * Number(ts.laborer.salaryRate);
      const overtimeCost = Number(ts.overtime) * Number(ts.laborer.salaryRate) * Number(ts.overtimeMultiplier);
      const totalCost = regularCost + overtimeCost;
      const profit = totalChargeAmount - totalCost;

      totalRegularHours += Number(ts.hoursWorked);
      totalOvertimeHours += Number(ts.overtime);
      totalCharge += totalChargeAmount;
      totalProfit += profit;

      worksheet.addRow([
        ts.date.toLocaleDateString(),
        ts.laborer.name,
        ts.laborer.idNumber,
        ts.job.name,
        Number(ts.hoursWorked),
        Number(ts.overtime),
        `${Number(ts.overtimeMultiplier)}x`,
        totalHours,
        Number(ts.laborer.orgRate),
        regularCharge,
        overtimeCharge,
        totalChargeAmount,
        profit,
        ts.notes || ''
      ]);
    });

    // Add summary
    worksheet.addRow([]); // Empty row
    const summaryRow = worksheet.addRow([
      'TOTAL', '', '', '', totalRegularHours, totalOvertimeHours, '', 
      totalRegularHours + totalOvertimeHours, '', '', '', totalCharge, totalProfit, ''
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
    res.setHeader('Content-Disposition', `attachment; filename=client-report-${startDate}-${endDate}.xlsx`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
});

export { router as reportRoutes };