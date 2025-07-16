import { Pool, PoolConfig } from 'pg';
import { DatabaseConfig } from '../types/interfaces';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Parse database URL to extract configuration
const parseDatabaseUrl = (url: string): DatabaseConfig => {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port) || 5432,
      database: parsed.pathname.slice(1),
      user: parsed.username,
      password: parsed.password,
      ssl: parsed.protocol === 'https:' || parsed.protocol === 'postgresql:'
    };
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL: ${error}`);
  }
};

// Create pool configuration
const createPoolConfig = (): PoolConfig => {
  let databaseUrl = process.env['DATABASE_URL'];
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  // Always use SSL for Neon, both in dev and prod
  return {
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  };
};

// Create a connection pool
const pool = new Pool(createPoolConfig());

// Test the connection
pool.on('connect', () => {
  console.log('Connected to Neon PostgreSQL database');
});

pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Closing database pool...');
  pool.end();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Closing database pool...');
  pool.end();
  process.exit(0);
});

export default pool; 