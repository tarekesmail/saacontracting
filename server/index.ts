import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { authRoutes } from './routes/auth';
import { laborerRoutes } from './routes/laborers';
import { groupRoutes } from './routes/groups';
import { jobRoutes } from './routes/jobs';
import { userRoutes } from './routes/users';
import { errorHandler } from './middleware/errorHandler';
import { authenticateToken } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for Vite
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting - more permissive for production
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // increased from 100 to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Middleware
app.use(compression());
app.use(cors({
  origin: ['http://saacontracting.com', 'https://saacontracting.com', 'http://www.saacontracting.com', 'https://www.saacontracting.com'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/laborers', authenticateToken, laborerRoutes);
app.use('/api/groups', authenticateToken, groupRoutes);
app.use('/api/jobs', authenticateToken, jobRoutes);
app.use('/api/users', authenticateToken, userRoutes);

// Favicon route
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../../dist/client')));

// Catch all handler for React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dist/client/index.html'));
});

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});