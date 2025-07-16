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
    ? process.env['FRONTEND_URL'] || 'https://your-app.vercel.app'
    : 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
const PostgresStore = pgSession(session);
app.use(session({
  secret: process.env['JWT_SECRET'] || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  store: new PostgresStore({
    pool: pool,
    tableName: 'sessions'
  }),
  cookie: {
    secure: process.env['NODE_ENV'] === Environment.PRODUCTION,
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// Routes
app.use('/auth', authRoutes);
app.use('/calendar', calendarRoutes);
app.use('/whatsapp', whatsappRoutes);
app.use('/automation', automationRoutes);

// Serve static files from React app in production
if (process.env['NODE_ENV'] === Environment.PRODUCTION) {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
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
    environment: process.env['NODE_ENV'] || Environment.DEVELOPMENT
  });
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Initialize automation service after server starts
  await initializeAutomation();
});

export default app; 