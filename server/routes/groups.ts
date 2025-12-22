import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest, requireRole } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

const groupSchema = z.object({
  name: z.string().min(1)
});

// Get all groups
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const groups = await prisma.laborGroup.findMany({
      where: {
        tenantId: req.user!.tenantId,
        isActive: true
      },
      include: {
        jobs: {
          where: { isActive: true }
        },
        _count: {
          select: { laborers: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json(groups);
  } catch (error) {
    next(error);
  }
});

// Get group by ID
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const group = await prisma.laborGroup.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId,
        isActive: true
      },
      include: {
        jobs: {
          where: { isActive: true }
        },
        laborers: {
          where: { isActive: true }
        }
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.json(group);
  } catch (error) {
    next(error);
  }
});

// Create group
router.post('/', requireRole(['ADMIN', 'EDITOR']), async (req: AuthRequest, res, next) => {
  try {
    const { name } = groupSchema.parse(req.body);

    const group = await prisma.laborGroup.create({
      data: {
        name,
        tenantId: req.user!.tenantId
      },
      include: {
        jobs: true,
        _count: {
          select: { laborers: true }
        }
      }
    });

    res.status(201).json(group);
  } catch (error) {
    next(error);
  }
});

// Update group
router.put('/:id', requireRole(['ADMIN', 'EDITOR']), async (req: AuthRequest, res, next) => {
  try {
    const { name } = groupSchema.parse(req.body);

    const group = await prisma.laborGroup.updateMany({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId
      },
      data: { name }
    });

    if (group.count === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const updatedGroup = await prisma.laborGroup.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId
      },
      include: {
        jobs: {
          where: { isActive: true }
        },
        _count: {
          select: { laborers: true }
        }
      }
    });

    res.json(updatedGroup);
  } catch (error) {
    next(error);
  }
});

// Delete group
router.delete('/:id', requireRole(['ADMIN']), async (req: AuthRequest, res, next) => {
  try {
    const group = await prisma.laborGroup.updateMany({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId
      },
      data: { isActive: false }
    });

    if (group.count === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export { router as groupRoutes };