const express = require('express');
const automationService = require('../services/automationService');
const router = express.Router();

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Start automation for current user
router.post('/start', requireAuth, async (req, res) => {
  try {
    await automationService.startUserAutomation(req.session.user.id);
    res.json({ 
      success: true, 
      message: 'Automation started successfully' 
    });
  } catch (error) {
    console.error('Failed to start automation:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to start automation',
      details: error.message
    });
  }
});

// Stop automation for current user
router.post('/stop', requireAuth, async (req, res) => {
  try {
    automationService.stopUserAutomation(req.session.user.id);
    res.json({ 
      success: true, 
      message: 'Automation stopped successfully' 
    });
  } catch (error) {
    console.error('Failed to stop automation:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to stop automation',
      details: error.message
    });
  }
});

// Get automation status for current user
router.get('/status', requireAuth, async (req, res) => {
  try {
    const status = await automationService.getAutomationStatus(req.session.user.id);
    res.json(status);
  } catch (error) {
    console.error('Failed to get automation status:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get automation status',
      details: error.message
    });
  }
});

// Manually trigger daily summary
router.post('/trigger-summary', requireAuth, async (req, res) => {
  try {
    const result = await automationService.triggerDailySummary(req.session.user.id);
    res.json(result);
  } catch (error) {
    console.error('Failed to trigger daily summary:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to trigger daily summary',
      details: error.message
    });
  }
});

// Manually trigger change check
router.post('/trigger-changes', requireAuth, async (req, res) => {
  try {
    const result = await automationService.triggerChangeCheck(req.session.user.id);
    res.json(result);
  } catch (error) {
    console.error('Failed to trigger change check:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to trigger change check',
      details: error.message
    });
  }
});

// Debug endpoint to enable automation
router.post('/debug/enable', requireAuth, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.session.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update automation_enabled to true
    const updatedUser = await User.updateSettings(req.session.user.id, {
      automationEnabled: true
    });
    
    res.json({ 
      success: true, 
      message: 'Automation enabled successfully',
      user: {
        id: updatedUser.id,
        automation_enabled: updatedUser.automation_enabled
      }
    });
  } catch (error) {
    console.error('Failed to enable automation:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to enable automation',
      details: error.message
    });
  }
});

// Test automation setup
router.post('/test', requireAuth, async (req, res) => {
  try {
    // Test calendar connection
    const calendarService = require('../services/calendarService');
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const events = await calendarService.fetchEvents(req.session.user.id, today, tomorrow);
    
    // Test WhatsApp connection
    const whatsappService = require('../services/whatsappService');
    const isWhatsAppConnected = await whatsappService.testConnection();
    
    // Get user info
    const User = require('../models/User');
    const user = await User.findById(req.session.user.id);
    
    res.json({
      success: true,
      calendar: {
        connected: events !== null,
        eventsFound: events ? events.length : 0
      },
      whatsapp: {
        connected: isWhatsAppConnected,
        recipient: user.whatsapp_recipient
      },
      automation: {
        enabled: user.automation_enabled,
        dailySummaryTime: user.daily_summary_time,
        timezone: user.timezone
      }
    });
  } catch (error) {
    console.error('Automation test failed:', error);
    res.status(500).json({ 
      success: false,
      error: 'Automation test failed',
      details: error.message
    });
  }
});

// Update automation settings
router.put('/settings', requireAuth, async (req, res) => {
  try {
    const { automationEnabled, dailySummaryTime, timezone } = req.body;
    
    const User = require('../models/User');
    const user = await User.findById(req.session.user.id);
    
    if (automationEnabled !== undefined) user.automation_enabled = automationEnabled;
    if (dailySummaryTime !== undefined) user.daily_summary_time = dailySummaryTime;
    if (timezone !== undefined) user.timezone = timezone;
    
    await user.save();
    
    // Restart automation if enabled
    if (user.automation_enabled) {
      await automationService.startUserAutomation(user.id);
    } else {
      automationService.stopUserAutomation(user.id);
    }
    
    res.json({ 
      success: true, 
      message: 'Automation settings updated successfully' 
    });
  } catch (error) {
    console.error('Failed to update automation settings:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update automation settings',
      details: error.message
    });
  }
});

module.exports = router; 