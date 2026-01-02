import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest, requireWriteAccess } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

const jobSchema = z.object({
  name: z.string().min(1)
});

// Get all jobs for current tenant
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const jobs = await prisma.job.findMany({
      where: {
        isActive: true,
        tenantId: req.user!.tenantId!
      },
      include: {
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
router.post('/', requireWriteAccess, async (req: AuthRequest, res, next) => {
  try {
    const data = jobSchema.parse(req.body);

    const job = await prisma.job.create({
      data: {
        ...data,
        tenantId: req.user!.tenantId!
      },
      include: {
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
router.put('/:id', requireWriteAccess, async (req: AuthRequest, res, next) => {
  try {
    const data = jobSchema.parse(req.body);

    // Verify job belongs to tenant
    const existingJob = await prisma.job.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId!
      }
    });

    if (!existingJob) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = await prisma.job.update({
      where: { id: req.params.id },
      data,
      include: {
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
router.delete('/:id', requireWriteAccess, async (req: AuthRequest, res, next) => {
  try {
    const job = await prisma.job.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId!
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