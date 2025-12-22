import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = express.Router();
const prisma = new PrismaClient();

const laborerTimesheetQuerySchema = z.object({
  idNumber: z.string().min(1, 'ID Number is required'),
  year: z.string().regex(/^\d{4}$/, 'Invalid year'),
  month: z.string().regex(/^(0?[1-9]|1[0-2])$/, 'Invalid month')
});

// Get laborer timesheet by ID number (public endpoint)
router.get('/laborer-timesheet', async (req, res, next) => {
  try {
    const { idNumber, year, month } = laborerTimesheetQuerySchema.parse(req.query);
    
    // Find laborer by ID number
    const laborer = await prisma.laborer.findFirst({
      where: {
        idNumber: idNumber,
        isActive: true
      },
      include: {
        job: true,
        tenant: true
      }
    });

    if (!laborer) {
      return res.status(404).json({ error: 'Laborer not found' });
    }

    // Calculate date range for the month
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);

    // Get timesheets for the month
    const timesheets = await prisma.timesheet.findMany({
      where: {
        laborerId: laborer.id,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        job: true
      },
      orderBy: {
        date: 'asc'
      }
    });

    // Calculate daily data
    const dailyData = timesheets.map(ts => {
      const regularPay = Number(ts.hoursWorked) * Number(laborer.salaryRate);
      const overtimePay = Number(ts.overtime) * Number(laborer.salaryRate) * Number(ts.overtimeMultiplier);
      const totalPay = regularPay + overtimePay;
      const totalHours = Number(ts.hoursWorked) + Number(ts.overtime);

      return {
        date: ts.date,
        day: ts.date.getDate(),
        regularHours: Number(ts.hoursWorked),
        overtimeHours: Number(ts.overtime),
        overtimeMultiplier: Number(ts.overtimeMultiplier),
        totalHours,
        jobName: ts.job.name,
        regularPay,
        overtimePay,
        totalPay,
        notes: ts.notes || ''
      };
    });

    // Calculate monthly summary
    const summary = {
      totalDaysWorked: dailyData.length,
      totalRegularHours: dailyData.reduce((sum, day) => sum + day.regularHours, 0),
      totalOvertimeHours: dailyData.reduce((sum, day) => sum + day.overtimeHours, 0),
      totalHours: dailyData.reduce((sum, day) => sum + day.totalHours, 0),
      totalRegularPay: dailyData.reduce((sum, day) => sum + day.regularPay, 0),
      totalOvertimePay: dailyData.reduce((sum, day) => sum + day.overtimePay, 0),
      totalPay: dailyData.reduce((sum, day) => sum + day.totalPay, 0)
    };

    // Get number of days in month for calendar
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    const firstDayOfWeek = new Date(yearNum, monthNum - 1, 1).getDay();

    res.json({
      laborer: {
        name: laborer.name,
        idNumber: laborer.idNumber,
        jobName: laborer.job.name,
        salaryRate: Number(laborer.salaryRate),
        tenantName: laborer.tenant.name
      },
      period: {
        year: yearNum,
        month: monthNum,
        monthName: new Date(yearNum, monthNum - 1).toLocaleString('default', { month: 'long' }),
        daysInMonth,
        firstDayOfWeek
      },
      dailyData,
      summary
    });
  } catch (error) {
    next(error);
  }
});

export { router as publicRoutes };