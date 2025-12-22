import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Simple hardcoded credentials
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'saacontracting2024';

// Login with tenant selection
router.post('/login', async (req, res, next) => {
  try {
    const { username, password, tenantId } = req.body;

    // Check credentials
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // If tenantId provided, verify it exists
    let tenant = null;
    if (tenantId) {
      tenant = await prisma.tenant.findUnique({
        where: { id: tenantId }
      });
      
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }
    }

    // Create session token
    const token = jwt.sign(
      { username, tenantId: tenant?.id || null },
      process.env.JWT_SECRET || 'simple-secret',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        username,
        tenant: tenant ? {
          id: tenant.id,
          name: tenant.name,
          domain: tenant.domain
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get all tenants for selection
router.get('/tenants', async (req, res, next) => {
  try {
    const tenants = await prisma.tenant.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(tenants);
  } catch (error) {
    next(error);
  }
});

// Create new tenant
router.post('/tenants', async (req, res, next) => {
  try {
    const { name, domain } = req.body;

    if (!name || !domain) {
      return res.status(400).json({ error: 'Name and domain are required' });
    }

    const tenant = await prisma.tenant.create({
      data: { name, domain }
    });

    res.status(201).json(tenant);
  } catch (error) {
    next(error);
  }
});

export { router as authRoutes };