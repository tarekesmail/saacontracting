import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to require admin role
const requireAdmin = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Login with user authentication
router.post('/login', async (req, res, next) => {
  try {
    const { username, password, tenantId } = req.body;

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Determine which tenant to use
    let selectedTenantId = tenantId;
    
    // If user has a tenant restriction, force that tenant
    if (user.tenantId) {
      selectedTenantId = user.tenantId;
    }

    // If tenantId provided, verify it exists and user has access
    let tenant = null;
    if (selectedTenantId) {
      tenant = await prisma.tenant.findUnique({
        where: { id: selectedTenantId }
      });
      
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      
      // Check if user has access to this tenant
      if (user.tenantId && user.tenantId !== selectedTenantId) {
        return res.status(403).json({ error: 'You do not have access to this tenant' });
      }
    }

    // Create session token
    const token = jwt.sign(
      { 
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: tenant?.id || null,
        tenantName: tenant?.name || null
      },
      process.env.JWT_SECRET || 'simple-secret',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantRestriction: user.tenantId, // Let frontend know if user has restriction
        tenant: tenant ? {
          id: tenant.id,
          name: tenant.name
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get all tenants for selection (requires authentication)
router.get('/tenants', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    
    // Get user's tenant restriction from database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { tenantId: true, role: true }
    });
    
    // If user has a tenant restriction, only return that tenant
    if (dbUser?.tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: dbUser.tenantId },
        include: {
          _count: {
            select: {
              jobs: true,
              laborers: true
            }
          }
        }
      });
      
      if (tenant) {
        return res.json([tenant]);
      }
      return res.json([]);
    }
    
    // User has access to all tenants
    const tenants = await prisma.tenant.findMany({
      include: {
        _count: {
          select: {
            jobs: true,
            laborers: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json(tenants);
  } catch (error) {
    next(error);
  }
});

// Create new tenant (admin only)
router.post('/tenants', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const tenant = await prisma.tenant.create({
      data: { name }
    });

    res.status(201).json(tenant);
  } catch (error) {
    next(error);
  }
});

// Update tenant (admin only)
router.put('/tenants/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Check if tenant exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { id }
    });

    if (!existingTenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Update the tenant
    const tenant = await prisma.tenant.update({
      where: { id },
      data: { name }
    });

    res.json(tenant);
  } catch (error) {
    next(error);
  }
});

// Delete tenant (admin only)
router.delete('/tenants/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    // Check if tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            laborers: true,
            jobs: true
          }
        }
      }
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Check if tenant has associated data
    if (tenant._count.jobs > 0 || tenant._count.laborers > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete tenant with existing data. Please remove all laborers and jobs first.' 
      });
    }

    // Delete the tenant
    await prisma.tenant.delete({
      where: { id }
    });

    res.json({ message: 'Tenant deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Switch tenant for current user
router.post('/switch-tenant', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    
    // Find the user with tenant restriction
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id }
    });

    if (!dbUser || !dbUser.isActive) {
      return res.status(401).json({ error: 'Invalid user' });
    }

    const { tenantId } = req.body;

    // If user has a tenant restriction, they can only access that tenant
    if (dbUser.tenantId && tenantId !== dbUser.tenantId) {
      return res.status(403).json({ error: 'You do not have access to this tenant' });
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

    // Create new session token with updated tenant
    const newToken = jwt.sign(
      { 
        id: dbUser.id,
        username: dbUser.username,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        tenantId: tenant?.id || null,
        tenantName: tenant?.name || null
      },
      process.env.JWT_SECRET || 'simple-secret',
      { expiresIn: '24h' }
    );

    res.json({
      token: newToken,
      user: {
        id: dbUser.id,
        username: dbUser.username,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        tenant: tenant ? {
          id: tenant.id,
          name: tenant.name
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
});

export { router as authRoutes };