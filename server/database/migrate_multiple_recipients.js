require('dotenv').config();
const pool = require('./config');

const migrateToMultipleRecipients = async () => {
  const client = await pool.connect();
  
  try {
    console.log('Starting migration to support multiple WhatsApp recipients...');
    
    // Step 1: Add the new column
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS whatsapp_recipients JSONB DEFAULT '["+17812967597"]'
    `);
    
    // Step 2: Migrate existing data from whatsapp_recipient to whatsapp_recipients
    await client.query(`
      UPDATE users 
      SET whatsapp_recipients = CASE 
        WHEN whatsapp_recipient IS NOT NULL AND whatsapp_recipient != '' 
        THEN json_build_array(whatsapp_recipient)
        ELSE '["+17812967597"]'
      END
      WHERE whatsapp_recipients IS NULL OR whatsapp_recipients = '["+17812967597"]'
    `);
    
    // Step 3: Drop the old column (optional - we can keep it for backward compatibility)
    // await client.query(`ALTER TABLE users DROP COLUMN IF EXISTS whatsapp_recipient`);
    
    console.log('Migration to multiple recipients completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

const runMigration = async () => {
  try {
    await migrateToMultipleRecipients();
    console.log('Multiple recipients migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = { migrateToMultipleRecipients }; 