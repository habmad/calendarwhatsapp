import pool from './config';

async function dropAllTables() {
  const client = await pool.connect();
  try {
    console.log('Dropping all tables: sessions, calendar_events, users...');
    await client.query('DROP TABLE IF EXISTS sessions CASCADE;');
    await client.query('DROP TABLE IF EXISTS calendar_events CASCADE;');
    await client.query('DROP TABLE IF EXISTS users CASCADE;');
    console.log('All tables dropped successfully.');
  } catch (err) {
    console.error('Error dropping tables:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

dropAllTables(); 