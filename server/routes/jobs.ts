import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

const jobSchema = z.object({
  name: z.string().min(1),
  pricePerHour: z.number().positive(),
  groupId: z.string().min(1)
});

// Get all jobs for current tenant
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { groupId } = req.query;

    const jobs = await prisma.job.findMany({
      where: {
        isActive: true,
        ...(groupId && { groupId: groupId as string }),
        group: {
          tenantId: req.user!.tenantId!
        }
      },
      include: {
        group: true,
        _count: {
          select: { laborers: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json(jobs);
  } catch (error) {
    next(error);
  }
});

// Create job
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = jobSchema.parse(req.body);

    // Verify group belongs to tenant
    const group = await prisma.laborGroup.findFirst({
      where: {
        id: data.groupId,
        tenantId: req.user!.tenantId!
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const job = await prisma.job.create({
      data,
      include: {
        group: true,
        _count: {
          select: { laborers: true }
        }
      }
    });

    res.status(201).json(job);
  } catch (error) {
    next(error);
  }
});

// Update job
router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const data = jobSchema.parse(req.body);

    // Verify job belongs to tenant
    const existingJob = await prisma.job.findFirst({
      where: {
        id: req.params.id,
        group: {
          tenantId: req.user!.tenantId!
        }
      }
    });

    if (!existingJob) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = await prisma.job.update({
      where: { id: req.params.id },
      data,
      include: {
        group: true,
        _count: {
          select: { laborers: true }
        }
      }
    });

    res.json(job);
  } catch (error) {
    next(error);
  }
});

// Delete job
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const job = await prisma.job.findFirst({
      where: {
        id: req.params.id,
        group: {
          tenantId: req.user!.tenantId!
        }
      }
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    await prisma.job.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export { router as jobRoutes };