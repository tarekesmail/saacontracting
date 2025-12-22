import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

const laborerSchema = z.object({
  name: z.string().min(1),
  idNumber: z.string().min(1),
  phoneNumber: z.string().min(1),
  startDate: z.string().transform((str) => new Date(str)),
  salaryRate: z.number().positive('Salary rate must be positive'),
  orgRate: z.number().positive('Organization rate must be positive'),
  jobId: z.string().min(1) // Made required
});

// Get all laborers for current tenant
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      tenantId: req.user!.tenantId!,
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search as string, mode: 'insensitive' as const } },
          { idNumber: { contains: search as string, mode: 'insensitive' as const } }
        ]
      })
    };

    const [laborers, total] = await Promise.all([
      prisma.laborer.findMany({
        where,
        include: {
          job: true
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.laborer.count({ where })
    ]);

    res.json({
      laborers,
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

// Create laborer
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = laborerSchema.parse(req.body);

    // Verify job belongs to tenant
    const job = await prisma.job.findFirst({
      where: {
        id: data.jobId,
        tenantId: req.user!.tenantId!
      }
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const laborer = await prisma.laborer.create({
      data: {
        ...data,
        tenantId: req.user!.tenantId!
      },
      include: {
        job: true
      }
    });

    res.status(201).json(laborer);
  } catch (error) {
    next(error);
  }
});

// Update laborer
router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const data = laborerSchema.parse(req.body);

    const laborer = await prisma.laborer.updateMany({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId!
      },
      data
    });

    if (laborer.count === 0) {
      return res.status(404).json({ error: 'Laborer not found' });
    }

    const updatedLaborer = await prisma.laborer.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId!
      },
      include: {
        job: true
      }
    });

    res.json(updatedLaborer);
  } catch (error) {
    next(error);
  }
});

// Delete laborer
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const laborer = await prisma.laborer.updateMany({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId!
      },
      data: { isActive: false }
    });

    if (laborer.count === 0) {
      return res.status(404).json({ error: 'Laborer not found' });
    }

    res.json({ message: 'Laborer deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export { router as laborerRoutes };