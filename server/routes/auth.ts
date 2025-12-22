import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = express.Router();
const prisma = new PrismaClient();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  tenantDomain: z.string().min(1)
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  tenantName: z.string().min(1),
  tenantDomain: z.string().min(1)
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password, tenantDomain } = loginSchema.parse(req.body);

    const tenant = await prisma.tenant.findUnique({
      where: { domain: tenantDomain }
    });

    if (!tenant) {
      return res.status(401).json({ error: 'Invalid tenant domain' });
    }

    const user = await prisma.user.findFirst({
      where: {
        email,
        tenantId: tenant.id,
        isActive: true
      },
      include: { tenant: true }
    });

    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, tenantId: user.tenantId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
          domain: user.tenant.domain
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Register (creates tenant and admin user)
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name, tenantName, tenantDomain } = registerSchema.parse(req.body);

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: tenantName,
          domain: tenantDomain
        }
      });

      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: 'ADMIN',
          tenantId: tenant.id
        }
      });

      return { tenant, user };
    });

    const token = jwt.sign(
      { userId: result.user.id, tenantId: result.tenant.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        tenant: {
          id: result.tenant.id,
          name: result.tenant.name,
          domain: result.tenant.domain
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

export { router as authRoutes };