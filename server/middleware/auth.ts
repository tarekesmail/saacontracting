import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    name: string;
    email: string;
    role: string;
    tenantId: string | null;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'simple-secret') as any;
    req.user = {
      id: decoded.id,
      username: decoded.username,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
      tenantId: decoded.tenantId
    };
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

export const requireTenant = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user?.tenantId) {
    return res.status(400).json({ error: 'Tenant selection required' });
  }
  next();
};

// Middleware to require admin role for write operations
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required for this operation' });
  }
  next();
};

// Middleware to require write access (blocks READ_ONLY users)
export const requireWriteAccess = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role === 'READ_ONLY') {
    return res.status(403).json({ error: 'You do not have permission to perform this action' });
  }
  next();
};

// Convenience export
export const auth = authenticateToken;