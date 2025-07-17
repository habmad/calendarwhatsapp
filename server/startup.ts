// Import the TypeScript automation service
import automationService from './services/automationService';
import { migrateToMultipleRecipients } from './database/migrate_multiple_recipients';

export const initializeAutomation = async (): Promise<void> => {
  try {
    console.log('Initializing automation service...');
    
    // Run database migrations if needed
    try {
      await migrateToMultipleRecipients();
      console.log('Database migrations completed');
    } catch (migrationError) {
      console.error('Migration error (may be already applied):', migrationError);
    }
    
    // Start automation for all users
    await automationService.startAllAutomations();
    
    console.log('Automation service initialized successfully');
  } catch (error) {
    console.error('Failed to initialize automation service:', error);
  }
}; 