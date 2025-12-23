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

// Check if ID number is available
router.get('/check-id/:idNumber', async (req: AuthRequest, res, next) => {
  try {
    const { idNumber } = req.params;
    const { excludeId } = req.query; // Optional: exclude a specific laborer ID when updating

    const where: any = {
      idNumber,
      isActive: true
    };

    if (excludeId) {
      where.NOT = { id: excludeId as string };
    }

    const existingLaborer = await prisma.laborer.findFirst({ where });

    res.json({
      available: !existingLaborer,
      exists: !!existingLaborer,
      laborer: existingLaborer ? {
        id: existingLaborer.id,
        name: existingLaborer.name,
        tenantId: existingLaborer.tenantId
      } : null
    });
  } catch (error) {
    next(error);
  }
});

// Get all laborers for current tenant
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '',
      jobId = '',
      salaryRateMin = '',
      salaryRateMax = '',
      orgRateMin = '',
      orgRateMax = '',
      startDateFrom = '',
      startDateTo = '',
      phoneNumber = '',
      idNumber = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const skip = (Number(page) - 1) * Number(limit);

    // Build dynamic where clause
    const where: any = {
      tenantId: req.user!.tenantId!,
      isActive: true,
    };

    // General search across multiple fields
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { idNumber: { contains: search as string, mode: 'insensitive' } },
        { phoneNumber: { contains: search as string, mode: 'insensitive' } },
        { job: { name: { contains: search as string, mode: 'insensitive' } } }
      ];
    }

    // Specific field filters
    if (jobId) {
      where.jobId = jobId as string;
    }

    if (phoneNumber) {
      where.phoneNumber = { contains: phoneNumber as string, mode: 'insensitive' };
    }

    if (idNumber) {
      where.idNumber = { contains: idNumber as string, mode: 'insensitive' };
    }

    // Salary rate range
    if (salaryRateMin || salaryRateMax) {
      where.salaryRate = {};
      if (salaryRateMin) where.salaryRate.gte = Number(salaryRateMin);
      if (salaryRateMax) where.salaryRate.lte = Number(salaryRateMax);
    }

    // Organization rate range
    if (orgRateMin || orgRateMax) {
      where.orgRate = {};
      if (orgRateMin) where.orgRate.gte = Number(orgRateMin);
      if (orgRateMax) where.orgRate.lte = Number(orgRateMax);
    }

    // Start date range
    if (startDateFrom || startDateTo) {
      where.startDate = {};
      if (startDateFrom) where.startDate.gte = new Date(startDateFrom as string);
      if (startDateTo) where.startDate.lte = new Date(startDateTo as string);
    }

    // Build orderBy clause
    let orderBy: any = {};
    const validSortFields = ['name', 'idNumber', 'phoneNumber', 'salaryRate', 'orgRate', 'startDate', 'createdAt'];
    
    if (validSortFields.includes(sortBy as string)) {
      orderBy[sortBy as string] = sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.createdAt = 'desc'; // Default sort
    }

    const [laborers, total] = await Promise.all([
      prisma.laborer.findMany({
        where,
        include: {
          job: true
        },
        skip,
        take: Number(limit),
        orderBy
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

    // Check if ID number already exists globally
    const existingLaborer = await prisma.laborer.findFirst({
      where: {
        idNumber: data.idNumber,
        isActive: true
      }
    });

    if (existingLaborer) {
      return res.status(400).json({ 
        error: 'ID Number already exists',
        field: 'idNumber',
        message: `A laborer with ID number "${data.idNumber}" already exists in the system.`
      });
    }

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
    // Handle Prisma unique constraint violation
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return res.status(400).json({ 
        error: 'ID Number already exists',
        field: 'idNumber',
        message: 'This ID number is already registered in the system.'
      });
    }
    next(error);
  }
});

// Update laborer
router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const data = laborerSchema.parse(req.body);

    // Check if ID number already exists for a different laborer
    const existingLaborer = await prisma.laborer.findFirst({
      where: {
        idNumber: data.idNumber,
        isActive: true,
        NOT: {
          id: req.params.id // Exclude the current laborer being updated
        }
      }
    });

    if (existingLaborer) {
      return res.status(400).json({ 
        error: 'ID Number already exists',
        field: 'idNumber',
        message: `A laborer with ID number "${data.idNumber}" already exists in the system.`
      });
    }

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
    // Handle Prisma unique constraint violation
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return res.status(400).json({ 
        error: 'ID Number already exists',
        field: 'idNumber',
        message: 'This ID number is already registered in the system.'
      });
    }
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