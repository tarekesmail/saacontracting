import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest, requireWriteAccess } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

const timesheetSchema = z.object({
  date: z.string().transform((str) => new Date(str + 'T12:00:00.000Z')), // Store at noon UTC
  hoursWorked: z.number().min(0).max(24),
  overtime: z.number().min(0).max(24).default(0),
  overtimeMultiplier: z.number().min(1).max(5).nullable().optional(), // Nullable when no overtime
  notes: z.string().optional(),
  laborerId: z.string().min(1),
  jobId: z.string().min(1)
});

const bulkTimesheetSchema = z.object({
  date: z.string().transform((str) => new Date(str + 'T12:00:00.000Z')), // Store at noon UTC
  defaultOvertimeMultiplier: z.number().min(1).max(5).default(1.5), // Default multiplier for all
  timesheets: z.array(z.object({
    laborerId: z.string().min(1),
    jobId: z.string().min(1),
    hoursWorked: z.number().min(0).max(24),
    overtime: z.number().min(0).max(24).default(0),
    overtimeMultiplier: z.number().min(1).max(5).nullable().optional(), // Individual multiplier (overrides default)
    notes: z.string().optional()
  }))
});

// Get timesheets for current tenant
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { page = 1, limit = 50, date, startDate, endDate, laborerId, jobId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      tenantId: req.user!.tenantId!,
    };

    // Support single date or date range - use UTC boundaries to avoid timezone issues
    if (date) {
      const start = new Date(date as string + 'T00:00:00.000Z');
      const end = new Date(date as string + 'T23:59:59.999Z');
      where.date = {
        gte: start,
        lte: end
      };
    } else if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string + 'T00:00:00.000Z'),
        lte: new Date(endDate as string + 'T23:59:59.999Z')
      };
    }
    
    if (laborerId) {
      where.laborerId = laborerId;
    }
    if (jobId) {
      where.jobId = jobId;
    }

    const [timesheets, total] = await Promise.all([
      prisma.timesheet.findMany({
        where,
        include: {
          laborer: true,
          job: true
        },
        skip,
        take: Number(limit),
        orderBy: [
          { date: 'desc' },
          { laborer: { name: 'asc' } }
        ]
      }),
      prisma.timesheet.count({ where })
    ]);

    res.json({
      timesheets,
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

// Get timesheet summary for a date range
router.get('/summary', async (req: AuthRequest, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const summary = await prisma.timesheet.groupBy({
      by: ['laborerId'],
      where: {
        tenantId: req.user!.tenantId!,
        date: {
          gte: new Date(startDate as string + 'T00:00:00.000Z'),
          lte: new Date(endDate as string + 'T23:59:59.999Z')
        }
      },
      _sum: {
        hoursWorked: true,
        overtime: true
      },
      _count: {
        id: true
      }
    });

    // Get laborer details with average overtime multiplier
    const laborerIds = summary.map(s => s.laborerId);
    const laborers = await prisma.laborer.findMany({
      where: {
        id: { in: laborerIds },
        tenantId: req.user!.tenantId!
      },
      include: {
        job: true
      }
    });

    // Get overtime multipliers for each laborer in the date range
    const overtimeMultipliers = await prisma.timesheet.groupBy({
      by: ['laborerId'],
      where: {
        tenantId: req.user!.tenantId!,
        date: {
          gte: new Date(startDate as string + 'T00:00:00.000Z'),
          lte: new Date(endDate as string + 'T23:59:59.999Z')
        },
        overtime: { gt: 0 }
      },
      _avg: {
        overtimeMultiplier: true
      }
    });

    const summaryWithDetails = summary.map(s => {
      const laborer = laborers.find(l => l.id === s.laborerId);
      const overtimeMultiplier = overtimeMultipliers.find(om => om.laborerId === s.laborerId)?._avg.overtimeMultiplier || 1.5;
      const regularHours = Number(s._sum.hoursWorked || 0);
      const overtimeHours = Number(s._sum.overtime || 0);
      const totalHours = regularHours + overtimeHours;
      
      const regularPay = regularHours * Number(laborer?.salaryRate || 0);
      const overtimePay = overtimeHours * Number(laborer?.salaryRate || 0) * Number(overtimeMultiplier);
      const totalPay = regularPay + overtimePay;
      
      const regularCharge = regularHours * Number(laborer?.orgRate || 0);
      const overtimeCharge = overtimeHours * Number(laborer?.orgRate || 0) * Number(overtimeMultiplier);
      const totalCharge = regularCharge + overtimeCharge;

      return {
        laborer,
        stats: {
          daysWorked: s._count.id,
          regularHours,
          overtimeHours,
          totalHours,
          overtimeMultiplier: Number(overtimeMultiplier),
          regularPay,
          overtimePay,
          totalPay,
          regularCharge,
          overtimeCharge,
          totalCharge,
          profit: totalCharge - totalPay
        }
      };
    });

    res.json(summaryWithDetails);
  } catch (error) {
    next(error);
  }
});

// Create single timesheet
router.post('/', requireWriteAccess, async (req: AuthRequest, res, next) => {
  try {
    const data = timesheetSchema.parse(req.body);

    // Verify laborer and job belong to tenant
    const [laborer, job] = await Promise.all([
      prisma.laborer.findFirst({
        where: { id: data.laborerId, tenantId: req.user!.tenantId! }
      }),
      prisma.job.findFirst({
        where: { id: data.jobId, tenantId: req.user!.tenantId! }
      })
    ]);

    if (!laborer) {
      return res.status(404).json({ error: 'Laborer not found' });
    }
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const timesheet = await prisma.timesheet.create({
      data: {
        ...data,
        tenantId: req.user!.tenantId!
      },
      include: {
        laborer: true,
        job: true
      }
    });

    res.status(201).json(timesheet);
  } catch (error) {
    next(error);
  }
});

// Bulk create/update timesheets
router.post('/bulk', requireWriteAccess, async (req: AuthRequest, res, next) => {
  try {
    const data = bulkTimesheetSchema.parse(req.body);
    const tenantId = req.user!.tenantId!;

    // Verify all laborers and jobs belong to tenant
    const laborerIds = data.timesheets.map(t => t.laborerId);
    const jobIds = data.timesheets.map(t => t.jobId);

    const [laborers, jobs] = await Promise.all([
      prisma.laborer.findMany({
        where: { id: { in: laborerIds }, tenantId }
      }),
      prisma.job.findMany({
        where: { id: { in: jobIds }, tenantId }
      })
    ]);

    // Validate all laborers and jobs exist
    for (const timesheet of data.timesheets) {
      if (!laborers.find(l => l.id === timesheet.laborerId)) {
        return res.status(404).json({ error: `Laborer ${timesheet.laborerId} not found` });
      }
      if (!jobs.find(j => j.id === timesheet.jobId)) {
        return res.status(404).json({ error: `Job ${timesheet.jobId} not found` });
      }
    }

    // Use transaction to create/update all timesheets
    const results = await prisma.$transaction(async (tx) => {
      const timesheets = [];
      
      for (const timesheetData of data.timesheets) {
        // Only set overtime multiplier if there are overtime hours
        const overtimeMultiplier = timesheetData.overtime > 0 
          ? (timesheetData.overtimeMultiplier || data.defaultOvertimeMultiplier)
          : null;
        
        const timesheet = await tx.timesheet.upsert({
          where: {
            laborerId_date: {
              laborerId: timesheetData.laborerId,
              date: data.date
            }
          },
          update: {
            hoursWorked: timesheetData.hoursWorked,
            overtime: timesheetData.overtime,
            overtimeMultiplier: overtimeMultiplier,
            notes: timesheetData.notes,
            jobId: timesheetData.jobId
          },
          create: {
            date: data.date,
            hoursWorked: timesheetData.hoursWorked,
            overtime: timesheetData.overtime,
            overtimeMultiplier: overtimeMultiplier,
            notes: timesheetData.notes,
            laborerId: timesheetData.laborerId,
            jobId: timesheetData.jobId,
            tenantId
          },
          include: {
            laborer: true,
            job: true
          }
        });
        timesheets.push(timesheet);
      }
      
      return timesheets;
    });

    res.status(201).json({
      message: `Successfully processed ${results.length} timesheets`,
      timesheets: results
    });
  } catch (error) {
    next(error);
  }
});

// Update timesheet
router.put('/:id', requireWriteAccess, async (req: AuthRequest, res, next) => {
  try {
    const data = timesheetSchema.parse(req.body);

    const timesheet = await prisma.timesheet.updateMany({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId!
      },
      data
    });

    if (timesheet.count === 0) {
      return res.status(404).json({ error: 'Timesheet not found' });
    }

    const updatedTimesheet = await prisma.timesheet.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId!
      },
      include: {
        laborer: true,
        job: true
      }
    });

    res.json(updatedTimesheet);
  } catch (error) {
    next(error);
  }
});

// Delete timesheet
router.delete('/:id', requireWriteAccess, async (req: AuthRequest, res, next) => {
  try {
    const timesheet = await prisma.timesheet.deleteMany({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId!
      }
    });

    if (timesheet.count === 0) {
      return res.status(404).json({ error: 'Timesheet not found' });
    }

    res.json({ message: 'Timesheet deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Delete all timesheets for a date range (reset month)
router.delete('/bulk/range', requireWriteAccess, async (req: AuthRequest, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const result = await prisma.timesheet.deleteMany({
      where: {
        tenantId: req.user!.tenantId!,
        date: {
          gte: new Date(startDate as string + 'T00:00:00.000Z'),
          lte: new Date(endDate as string + 'T23:59:59.999Z')
        }
      }
    });

    res.json({ 
      message: `Deleted ${result.count} timesheet records`,
      count: result.count 
    });
  } catch (error) {
    next(error);
  }
});

export { router as timesheetRoutes };