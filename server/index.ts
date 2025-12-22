import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { authRoutes } from './routes/auth';
import { laborerRoutes } from './routes/laborers';
import { jobRoutes } from './routes/jobs';
import { errorHandler } from './middleware/errorHandler';
import { authenticateToken, requireTenant } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Nginx
app.set('trust proxy', 1);

// Security middleware - simplified
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Middleware
app.use(compression());
app.use(cors({
  origin: ['http://saacontracting.com', 'https://saacontracting.com', 'http://www.saacontracting.com', 'https://www.saacontracting.com', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/laborers', authenticateToken, requireTenant, laborerRoutes);
app.use('/api/jobs', authenticateToken, requireTenant, jobRoutes);

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