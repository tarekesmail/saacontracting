import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest, requireWriteAccess } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

const creditSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
  notes: z.string().optional(),
  reference: z.string().optional(),
  type: z.enum(['DEPOSIT', 'WITHDRAWAL', 'ADVANCE']),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']).optional(),
  accountantName: z.string().optional(),
  accountantPhone: z.string().optional()
});

// Get all credits for current tenant
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { startDate, endDate, type, status } = req.query;
    
    const where: any = {
      tenantId: req.user!.tenantId!
    };

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    if (type) {
      where.type = type as string;
    }

    if (status) {
      where.status = status as string;
    }

    const credits = await prisma.credit.findMany({
      where,
      orderBy: { date: 'desc' }
    });

    // Convert Decimal amounts to numbers for proper JSON serialization
    const creditsWithNumbers = credits.map(credit => ({
      ...credit,
      amount: Number(credit.amount)
    }));

    res.json(creditsWithNumbers);
  } catch (error) {
    next(error);
  }
});

// Get credit by ID
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const credit = await prisma.credit.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId!
      }
    });

    if (!credit) {
      return res.status(404).json({ error: 'Credit record not found' });
    }

    // Convert Decimal amount to number
    const creditWithNumber = {
      ...credit,
      amount: Number(credit.amount)
    };

    res.json(creditWithNumber);
  } catch (error) {
    next(error);
  }
});

// Create credit
router.post('/', requireWriteAccess, async (req: AuthRequest, res, next) => {
  try {
    const data = creditSchema.parse(req.body);

    const credit = await prisma.credit.create({
      data: {
        ...data,
        date: new Date(data.date),
        status: data.status || 'CONFIRMED', // Default to CONFIRMED
        accountantName: data.accountantName || 'Company Accountant', // Default name
        tenantId: req.user!.tenantId!
      }
    });

    // Convert Decimal amount to number
    const creditWithNumber = {
      ...credit,
      amount: Number(credit.amount)
    };

    res.status(201).json(creditWithNumber);
  } catch (error) {
    next(error);
  }
});

// Update credit
router.put('/:id', requireWriteAccess, async (req: AuthRequest, res, next) => {
  try {
    const data = creditSchema.parse(req.body);

    const credit = await prisma.credit.updateMany({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId!
      },
      data: {
        ...data,
        date: new Date(data.date)
      }
    });

    if (credit.count === 0) {
      return res.status(404).json({ error: 'Credit record not found' });
    }

    const updatedCredit = await prisma.credit.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId!
      }
    });

    // Convert Decimal amount to number
    const creditWithNumber = updatedCredit ? {
      ...updatedCredit,
      amount: Number(updatedCredit.amount)
    } : null;

    res.json(creditWithNumber);
  } catch (error) {
    next(error);
  }
});

// Delete credit
router.delete('/:id', requireWriteAccess, async (req: AuthRequest, res, next) => {
  try {
    const credit = await prisma.credit.deleteMany({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId!
      }
    });

    if (credit.count === 0) {
      return res.status(404).json({ error: 'Credit record not found' });
    }

    res.json({ message: 'Credit record deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Update credit status
router.patch('/:id/status', requireWriteAccess, async (req: AuthRequest, res, next) => {
  try {
    const { status } = req.body;

    if (!['PENDING', 'CONFIRMED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const credit = await prisma.credit.updateMany({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId!
      },
      data: { status }
    });

    if (credit.count === 0) {
      return res.status(404).json({ error: 'Credit record not found' });
    }

    const updatedCredit = await prisma.credit.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId!
      }
    });

    // Convert Decimal amount to number
    const creditWithNumber = updatedCredit ? {
      ...updatedCredit,
      amount: Number(updatedCredit.amount)
    } : null;

    res.json(creditWithNumber);
  } catch (error) {
    next(error);
  }
});

// Get credit summary
router.get('/summary/stats', async (req: AuthRequest, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    const where: any = {
      tenantId: req.user!.tenantId!
    };

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    const credits = await prisma.credit.findMany({
      where
    });

    // Calculate summary by type and status
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let totalAdvances = 0;
    let pendingAmount = 0;
    let confirmedAmount = 0;

    credits.forEach(credit => {
      const amount = Number(credit.amount);
      
      // By type
      switch (credit.type) {
        case 'DEPOSIT':
          totalDeposits += amount;
          break;
        case 'WITHDRAWAL':
          totalWithdrawals += amount;
          break;
        case 'ADVANCE':
          totalAdvances += amount;
          break;
      }

      // By status
      switch (credit.status) {
        case 'PENDING':
          pendingAmount += amount;
          break;
        case 'CONFIRMED':
          confirmedAmount += amount;
          break;
      }
    });

    // Calculate net balance (deposits + advances - withdrawals)
    const netBalance = totalDeposits + totalAdvances - totalWithdrawals;

    res.json({
      totalDeposits,
      totalWithdrawals,
      totalAdvances,
      netBalance,
      pendingAmount,
      confirmedAmount,
      totalRecords: credits.length,
      dateRange: startDate && endDate ? { startDate, endDate } : null
    });
  } catch (error) {
    next(error);
  }
});

// Generate credit report
router.get('/reports/detailed', async (req: AuthRequest, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'month' } = req.query;
    
    const where: any = {
      tenantId: req.user!.tenantId!
    };

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    const credits = await prisma.credit.findMany({
      where,
      orderBy: { date: 'asc' }
    });

    // Group credits by specified period
    const groupedData: { [key: string]: {
      period: string;
      deposits: number;
      withdrawals: number;
      advances: number;
      netFlow: number;
      runningBalance: number;
      transactionCount: number;
      transactions: any[];
    }} = {};

    let runningBalance = 0;

    credits.forEach(credit => {
      const amount = Number(credit.amount);
      const date = new Date(credit.date);
      
      // Determine grouping key
      let groupKey: string;
      if (groupBy === 'day') {
        groupKey = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        groupKey = startOfWeek.toISOString().split('T')[0];
      } else if (groupBy === 'year') {
        groupKey = date.getFullYear().toString();
      } else { // month (default)
        groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!groupedData[groupKey]) {
        groupedData[groupKey] = {
          period: groupKey,
          deposits: 0,
          withdrawals: 0,
          advances: 0,
          netFlow: 0,
          runningBalance: 0,
          transactionCount: 0,
          transactions: []
        };
      }

      const group = groupedData[groupKey];
      
      // Update amounts by type
      switch (credit.type) {
        case 'DEPOSIT':
          group.deposits += amount;
          runningBalance += amount;
          break;
        case 'WITHDRAWAL':
          group.withdrawals += amount;
          runningBalance -= amount;
          break;
        case 'ADVANCE':
          group.advances += amount;
          runningBalance += amount;
          break;
      }

      group.transactionCount++;
      group.transactions.push({
        ...credit,
        amount: amount
      });
      group.runningBalance = runningBalance;
      group.netFlow = group.deposits + group.advances - group.withdrawals;
    });

    // Convert to array and sort
    const reportData = Object.values(groupedData).sort((a, b) => 
      a.period.localeCompare(b.period)
    );

    // Calculate totals
    const totals = {
      totalDeposits: credits.filter(c => c.type === 'DEPOSIT').reduce((sum, c) => sum + Number(c.amount), 0),
      totalWithdrawals: credits.filter(c => c.type === 'WITHDRAWAL').reduce((sum, c) => sum + Number(c.amount), 0),
      totalAdvances: credits.filter(c => c.type === 'ADVANCE').reduce((sum, c) => sum + Number(c.amount), 0),
      totalTransactions: credits.length,
      finalBalance: runningBalance
    };

    res.json({
      reportData,
      totals,
      filters: {
        startDate,
        endDate,
        groupBy
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export { router as creditRoutes };