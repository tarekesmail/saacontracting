import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest, requireWriteAccess } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

const expenseSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
  notes: z.string().optional(),
  receipt: z.string().optional(),
  categoryId: z.string().min(1, 'Category is required')
});

// Get all expenses for current tenant
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { startDate, endDate, categoryId } = req.query;
    
    const where: any = {
      tenantId: req.user!.tenantId!
    };

    if (startDate && endDate) {
      // Use date strings directly for comparison to avoid timezone issues
      // Dates are stored at noon UTC to avoid day boundary issues
      const start = new Date(startDate as string + 'T00:00:00.000Z');
      const end = new Date(endDate as string + 'T23:59:59.999Z');
      
      where.date = {
        gte: start,
        lte: end
      };
    }

    if (categoryId) {
      where.categoryId = categoryId as string;
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        category: true
      },
      orderBy: { date: 'desc' }
    });

    // Convert Decimal amounts to numbers for proper JSON serialization
    const expensesWithNumbers = expenses.map(expense => ({
      ...expense,
      amount: Number(expense.amount)
    }));

    res.json(expensesWithNumbers);
  } catch (error) {
    next(error);
  }
});

// Get expense by ID
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const expense = await prisma.expense.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId!
      },
      include: {
        category: true
      }
    });

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Convert Decimal amount to number
    const expenseWithNumber = {
      ...expense,
      amount: Number(expense.amount)
    };

    res.json(expenseWithNumber);
  } catch (error) {
    next(error);
  }
});

// Create expense
router.post('/', requireWriteAccess, async (req: AuthRequest, res, next) => {
  try {
    const data = expenseSchema.parse(req.body);

    // Verify category belongs to tenant
    const category = await prisma.expenseCategory.findFirst({
      where: {
        id: data.categoryId,
        tenantId: req.user!.tenantId!,
        isActive: true
      }
    });

    if (!category) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    // Store date at noon UTC to avoid timezone day boundary issues
    const expense = await prisma.expense.create({
      data: {
        ...data,
        date: new Date(data.date + 'T12:00:00.000Z'),
        tenantId: req.user!.tenantId!
      },
      include: {
        category: true
      }
    });

    // Convert Decimal amount to number
    const expenseWithNumber = {
      ...expense,
      amount: Number(expense.amount)
    };

    res.status(201).json(expenseWithNumber);
  } catch (error) {
    next(error);
  }
});

// Update expense
router.put('/:id', requireWriteAccess, async (req: AuthRequest, res, next) => {
  try {
    const data = expenseSchema.parse(req.body);

    // Verify category belongs to tenant
    const category = await prisma.expenseCategory.findFirst({
      where: {
        id: data.categoryId,
        tenantId: req.user!.tenantId!,
        isActive: true
      }
    });

    if (!category) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    // Store date at noon UTC to avoid timezone day boundary issues
    const expense = await prisma.expense.updateMany({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId!
      },
      data: {
        ...data,
        date: new Date(data.date + 'T12:00:00.000Z')
      }
    });

    if (expense.count === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const updatedExpense = await prisma.expense.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId!
      },
      include: {
        category: true
      }
    });

    // Convert Decimal amount to number
    const expenseWithNumber = updatedExpense ? {
      ...updatedExpense,
      amount: Number(updatedExpense.amount)
    } : null;

    res.json(expenseWithNumber);
  } catch (error) {
    next(error);
  }
});

// Delete expense
router.delete('/:id', requireWriteAccess, async (req: AuthRequest, res, next) => {
  try {
    const expense = await prisma.expense.deleteMany({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId!
      }
    });

    if (expense.count === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get expense summary
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

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        category: true
      }
    });

    // Calculate summary by category
    const categoryMap = new Map();
    let totalAmount = 0;

    expenses.forEach(expense => {
      const amount = Number(expense.amount);
      totalAmount += amount;

      const categoryId = expense.category.id;
      if (categoryMap.has(categoryId)) {
        const existing = categoryMap.get(categoryId);
        existing.amount += amount;
        existing.count += 1;
      } else {
        categoryMap.set(categoryId, {
          categoryName: expense.category.name,
          categoryColor: expense.category.color,
          amount: amount,
          count: 1
        });
      }
    });

    const categoryBreakdown = Array.from(categoryMap.values());

    res.json({
      totalAmount,
      totalExpenses: expenses.length,
      categoryBreakdown,
      dateRange: startDate && endDate ? { startDate, endDate } : null
    });
  } catch (error) {
    next(error);
  }
});

export { router as expenseRoutes };