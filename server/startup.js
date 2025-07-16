const automationService = require('./services/automationService');

// Initialize automation service on server startup
async function initializeAutomation() {
  try {
    console.log('Initializing automation service...');
    
    // Start automation for all users
    await automationService.startAllAutomations();
    
    console.log('Automation service initialized successfully');
  } catch (error) {
    console.error('Failed to initialize automation service:', error);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down automation service...');
  automationService.stopAllAutomations();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down automation service...');
  automationService.stopAllAutomations();
  process.exit(0);
});

module.exports = { initializeAutomation }; 