const express = require('express');
const cors = require('cors');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const calendarRoutes = require('./routes/calendar');
const whatsappRoutes = require('./routes/whatsapp');
const automationRoutes = require('./routes/automation');
const { initializeAutomation } = require('./startup');
const pool = require('./database/config');

const app = express();
const PORT = process.env.PORT || 3001;

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to Neon PostgreSQL database');
  }
});

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || 'https://your-app.vercel.app'
    : 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  store: new pgSession({
    pool: pool,
    tableName: 'sessions'
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// Routes
app.use('/auth', authRoutes);
app.use('/calendar', calendarRoutes);
app.use('/whatsapp', whatsappRoutes);
app.use('/automation', automationRoutes);

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Initialize automation service after server starts
  await initializeAutomation();
});

module.exports = app; 