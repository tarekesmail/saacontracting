import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').default('#6B7280')
});

// Get all expense categories for current tenant
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const categories = await prisma.expenseCategory.findMany({
      where: {
        tenantId: req.user!.tenantId!,
        isActive: true
      },
      include: {
        _count: {
          select: {
            expenses: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json(categories);
  } catch (error) {
    next(error);
  }
});

// Create expense category
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = categorySchema.parse(req.body);

    const category = await prisma.expenseCategory.create({
      data: {
        ...data,
        tenantId: req.user!.tenantId!
      },
      include: {
        _count: {
          select: {
            expenses: true
          }
        }
      }
    });

    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
});

// Update expense category
router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const data = categorySchema.parse(req.body);

    const category = await prisma.expenseCategory.updateMany({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId!
      },
      data
    });

    if (category.count === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const updatedCategory = await prisma.expenseCategory.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId!
      },
      include: {
        _count: {
          select: {
            expenses: true
          }
        }
      }
    });

    res.json(updatedCategory);
  } catch (error) {
    next(error);
  }
});

// Delete expense category
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    // Check if category has expenses
    const category = await prisma.expenseCategory.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId!
      },
      include: {
        _count: {
          select: {
            expenses: true
          }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    if (category._count.expenses > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with existing expenses. Please move or delete expenses first.' 
      });
    }

    await prisma.expenseCategory.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export { router as expenseCategoryRoutes };