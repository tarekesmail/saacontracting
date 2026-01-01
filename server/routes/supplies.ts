import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

const supplySchema = z.object({
  name: z.string().min(1, 'Supply name is required'),
  date: z.string().min(1, 'Date is required'),
  price: z.number().positive('Price must be positive'),
  quantity: z.number().int().positive('Quantity must be a positive integer').optional(),
  notes: z.string().optional(),
  categoryId: z.string().min(1, 'Category is required')
});

// Get all supplies for current tenant
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { startDate, endDate, categoryId } = req.query;
    
    const where: any = {
      tenantId: req.user!.tenantId!
    };

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    if (categoryId) {
      where.categoryId = categoryId as string;
    }

    const supplies = await prisma.supply.findMany({
      where,
      include: {
        category: true
      },
      orderBy: { date: 'desc' }
    });

    // Convert Decimal prices to numbers for proper JSON serialization
    const suppliesWithNumbers = supplies.map(supply => ({
      ...supply,
      price: Number(supply.price)
    }));

    res.json(suppliesWithNumbers);
  } catch (error) {
    next(error);
  }
});

// Get supply by ID
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const supply = await prisma.supply.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId!
      },
      include: {
        category: true
      }
    });

    if (!supply) {
      return res.status(404).json({ error: 'Supply not found' });
    }

    // Convert Decimal price to number
    const supplyWithNumber = {
      ...supply,
      price: Number(supply.price)
    };

    res.json(supplyWithNumber);
  } catch (error) {
    next(error);
  }
});

// Create supply
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = supplySchema.parse(req.body);

    // Verify category belongs to tenant
    const category = await prisma.supplyCategory.findFirst({
      where: {
        id: data.categoryId,
        tenantId: req.user!.tenantId!,
        isActive: true
      }
    });

    if (!category) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const supply = await prisma.supply.create({
      data: {
        ...data,
        date: new Date(data.date),
        quantity: data.quantity || 1,
        tenantId: req.user!.tenantId!
      },
      include: {
        category: true
      }
    });

    // Convert Decimal price to number
    const supplyWithNumber = {
      ...supply,
      price: Number(supply.price)
    };

    res.status(201).json(supplyWithNumber);
  } catch (error) {
    next(error);
  }
});

// Update supply
router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const data = supplySchema.parse(req.body);

    // Verify category belongs to tenant
    const category = await prisma.supplyCategory.findFirst({
      where: {
        id: data.categoryId,
        tenantId: req.user!.tenantId!,
        isActive: true
      }
    });

    if (!category) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const supply = await prisma.supply.updateMany({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId!
      },
      data: {
        ...data,
        date: new Date(data.date),
        quantity: data.quantity || 1
      }
    });

    if (supply.count === 0) {
      return res.status(404).json({ error: 'Supply not found' });
    }

    const updatedSupply = await prisma.supply.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId!
      },
      include: {
        category: true
      }
    });

    // Convert Decimal price to number
    const supplyWithNumber = updatedSupply ? {
      ...updatedSupply,
      price: Number(updatedSupply.price)
    } : null;

    res.json(supplyWithNumber);
  } catch (error) {
    next(error);
  }
});

// Delete supply
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const supply = await prisma.supply.deleteMany({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId!
      }
    });

    if (supply.count === 0) {
      return res.status(404).json({ error: 'Supply not found' });
    }

    res.json({ message: 'Supply deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get supply summary
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

    const supplies = await prisma.supply.findMany({
      where,
      include: {
        category: true
      }
    });

    // Calculate summary by category
    const categoryMap = new Map();
    let totalValue = 0;
    let totalQuantity = 0;

    supplies.forEach(supply => {
      const price = Number(supply.price);
      const itemTotal = price * supply.quantity;
      totalValue += itemTotal;
      totalQuantity += supply.quantity;

      const categoryId = supply.category.id;
      if (categoryMap.has(categoryId)) {
        const existing = categoryMap.get(categoryId);
        existing.value += itemTotal;
        existing.quantity += supply.quantity;
        existing.count += 1;
      } else {
        categoryMap.set(categoryId, {
          categoryName: supply.category.name,
          categoryColor: supply.category.color,
          value: itemTotal,
          quantity: supply.quantity,
          count: 1
        });
      }
    });

    const categoryBreakdown = Array.from(categoryMap.values());

    res.json({
      totalValue,
      totalQuantity,
      totalSupplies: supplies.length,
      categoryBreakdown,
      dateRange: startDate && endDate ? { startDate, endDate } : null
    });
  } catch (error) {
    next(error);
  }
});

export { router as supplyRoutes };