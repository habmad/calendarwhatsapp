require('dotenv').config();
const pool = require('./config');

const createTables = async () => {
  const client = await pool.connect();
  
  try {
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        google_id VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        picture TEXT,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        token_expiry TIMESTAMP NOT NULL,
        whatsapp_recipient VARCHAR(20) DEFAULT '+17812967597',
        automation_enabled BOOLEAN DEFAULT true,
        daily_summary_time VARCHAR(5) DEFAULT '08:00',
        timezone VARCHAR(50) DEFAULT 'America/New_York',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create calendar_events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        event_id VARCHAR(255) NOT NULL,
        summary VARCHAR(500) NOT NULL,
        description TEXT,
        location TEXT,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        all_day BOOLEAN DEFAULT false,
        event_type VARCHAR(20) DEFAULT 'WORK' CHECK (event_type IN ('WORK', 'PERSONAL', 'FREE')),
        status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'tentative', 'cancelled')),
        attendees JSONB,
        last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, event_id)
      )
    `);

    // Create sessions table for express-session
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR NOT NULL COLLATE "default" UNIQUE,
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL
      )
      WITH (OIDS=FALSE);
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
      CREATE INDEX IF NOT EXISTS idx_calendar_events_user_start ON calendar_events(user_id, start_time);
      CREATE INDEX IF NOT EXISTS idx_sessions_sid ON sessions(sid);
      CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire);
    `);

    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  } finally {
    client.release();
  }
};

const runMigrations = async () => {
  try {
    await createTables();
    console.log('All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = { createTables }; 