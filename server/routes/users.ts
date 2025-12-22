import express from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest, requireRole } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['ADMIN', 'EDITOR', 'READ_ONLY']),
  password: z.string().min(6).optional()
});

// Get all users in tenant
router.get('/', requireRole(['ADMIN']), async (req: AuthRequest, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        tenantId: req.user!.tenantId,
        isActive: true
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(users);
  } catch (error) {
    next(error);
  }
});

// Get current user profile
router.get('/profile', async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenant: {
          select: {
            id: true,
            name: true,
            domain: true
          }
        }
      }
    });

    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Create user
router.post('/', requireRole(['ADMIN']), async (req: AuthRequest, res, next) => {
  try {
    const { email, name, role, password } = userSchema.parse(req.body);

    if (!password) {
      return res.status(400).json({ error: 'Password is required for new users' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        role,
        password: hashedPassword,
        tenantId: req.user!.tenantId
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

// Update user
router.put('/:id', requireRole(['ADMIN']), async (req: AuthRequest, res, next) => {
  try {
    const { email, name, role, password } = userSchema.parse(req.body);

    const updateData: any = { email, name, role };

    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    const user = await prisma.user.updateMany({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId
      },
      data: updateData
    });

    if (user.count === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = await prisma.user.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        updatedAt: true
      }
    });

    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
});

// Delete user
router.delete('/:id', requireRole(['ADMIN']), async (req: AuthRequest, res, next) => {
  try {
    if (req.params.id === req.user!.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await prisma.user.updateMany({
      where: {
        id: req.params.id,
        tenantId: req.user!.tenantId
      },
      data: { isActive: false }
    });

    if (user.count === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export { router as userRoutes };