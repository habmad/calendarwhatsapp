import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import path from 'path';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import calendarRoutes from './routes/calendar';
import whatsappRoutes from './routes/whatsapp';
import automationRoutes from './routes/automation';
import { initializeAutomation } from './startup';
import pool from './database/config';
import { Environment } from './types/enums';

dotenv.config();

const app = express();
const PORT = process.env['PORT'] || 3001;

// Test database connection
pool.query('SELECT NOW()', (err, _res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to Neon PostgreSQL database');
  }
});

// Middleware
app.use(cors({
  origin: process.env['NODE_ENV'] === Environment.PRODUCTION
    ? [
        'https://calendarwhatsapp.vercel.app',
        'https://calendarwhatsapp-production.up.railway.app'
      ]
    : 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
const PostgresStore = pgSession(session);
const sessionConfig = {
  secret: process.env['JWT_SECRET'] || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  store: new PostgresStore({
    pool: pool,
    tableName: 'sessions'
  }),
  cookie: {
    secure: process.env['NODE_ENV'] === Environment.PRODUCTION,
    httpOnly: true,
    sameSite: (process.env['NODE_ENV'] === Environment.PRODUCTION ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    // Remove domain restriction for cross-domain requests
    domain: undefined
  }
};

console.log('[Session] Configuration:', {
  environment: process.env['NODE_ENV'],
  secure: sessionConfig.cookie.secure,
  sameSite: sessionConfig.cookie.sameSite,
  store: 'PostgresStore'
});

app.use(session(sessionConfig));

// Routes
app.use('/auth', authRoutes);
app.use('/calendar', calendarRoutes);
app.use('/whatsapp', whatsappRoutes);
app.use('/automation', automationRoutes);

// Serve static files from React app in production
if (process.env['NODE_ENV'] === Environment.PRODUCTION) {
  const buildPath = path.join(__dirname, '../client/build');
  console.log('Serving static files from:', buildPath);
  
  app.use(express.static(buildPath));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ error: 'Something went wrong!' });
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env['NODE_ENV'] || Environment.DEVELOPMENT,
    version: process.env['npm_package_version'] || '1.0.0'
  });
});

// Simple ping endpoint
app.get('/ping', (_req: Request, res: Response) => {
  res.json({ pong: new Date().toISOString() });
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env['NODE_ENV'] || Environment.DEVELOPMENT}`);
  console.log(`Database URL: ${process.env['DATABASE_URL'] ? 'Configured' : 'Missing'}`);
  console.log(`Google Client ID: ${process.env['GOOGLE_CLIENT_ID'] ? 'Configured' : 'Missing'}`);
  console.log(`Twilio Account SID: ${process.env['TWILIO_ACCOUNT_SID'] ? 'Configured' : 'Missing'}`);
  
  try {
    // Initialize automation service after server starts
    await initializeAutomation();
  } catch (error) {
    console.error('Failed to initialize server:', error);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

export default app; 