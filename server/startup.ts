// Import the TypeScript automation service
import automationService from './services/automationService';

export const initializeAutomation = async (): Promise<void> => {
  try {
    console.log('Initializing automation service...');
    
    // Start automation for all users
    await automationService.startAllAutomations();
    
    console.log('Automation service initialized successfully');
  } catch (error) {
    console.error('Failed to initialize automation service:', error);
  }
}; 