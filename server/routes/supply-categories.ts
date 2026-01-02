import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest, requireWriteAccess } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

const supplyCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
});

// Get all supply categories for current tenant
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const categories = await prisma.supplyCategory.findMany({
      where: {
        tenantId: req.user!.tenantId!,
        isActive: true
      },
      include: {
        _count: {
          select: {
            supplies: true
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

// Get supply category by ID
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const category = await prisma.supplyCategory.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId!
      },
      include: {
        _count: {
          select: {
            supplies: true
          }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Supply category not found' });
    }

    res.json(category);
  } catch (error) {
    next(error);
  }
});

// Create supply category
router.post('/', requireWriteAccess, async (req: AuthRequest, res, next) => {
  try {
    const data = supplyCategorySchema.parse(req.body);

    const category = await prisma.supplyCategory.create({
      data: {
        ...data,
        color: data.color || '#6B7280',
        tenantId: req.user!.tenantId!
      },
      include: {
        _count: {
          select: {
            supplies: true
          }
        }
      }
    });

    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
});

// Update supply category
router.put('/:id', requireWriteAccess, async (req: AuthRequest, res, next) => {
  try {
    const data = supplyCategorySchema.parse(req.body);

    const category = await prisma.supplyCategory.updateMany({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId!
      },
      data
    });

    if (category.count === 0) {
      return res.status(404).json({ error: 'Supply category not found' });
    }

    const updatedCategory = await prisma.supplyCategory.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId!
      },
      include: {
        _count: {
          select: {
            supplies: true
          }
        }
      }
    });

    res.json(updatedCategory);
  } catch (error) {
    next(error);
  }
});

// Delete supply category
router.delete('/:id', requireWriteAccess, async (req: AuthRequest, res, next) => {
  try {
    // Check if category has supplies
    const categoryWithSupplies = await prisma.supplyCategory.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId!
      },
      include: {
        _count: {
          select: {
            supplies: true
          }
        }
      }
    });

    if (!categoryWithSupplies) {
      return res.status(404).json({ error: 'Supply category not found' });
    }

    if (categoryWithSupplies._count.supplies > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with existing supplies. Please move or delete supplies first.' 
      });
    }

    await prisma.supplyCategory.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Supply category deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export { router as supplyCategoryRoutes };