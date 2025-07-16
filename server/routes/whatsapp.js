const express = require('express');
const whatsappService = require('../services/whatsappService');
const router = express.Router();

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Send a test message
router.post('/send-test', requireAuth, async (req, res) => {
  try {
    const { recipientPhone, message } = req.body;
    
    if (!recipientPhone || !message) {
      return res.status(400).json({ error: 'Recipient phone and message are required' });
    }

    const result = await whatsappService.sendTextMessage(recipientPhone, message);
    res.json({ 
      success: true, 
      message: 'Test message sent successfully',
      result 
    });
  } catch (error) {
    console.error('Failed to send test message:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to send test message',
      details: error.message
    });
  }
});

// Send daily summary
router.post('/send-summary', requireAuth, async (req, res) => {
  try {
    const { recipientPhone, summary } = req.body;
    
    if (!recipientPhone || !summary) {
      return res.status(400).json({ error: 'Recipient phone and summary are required' });
    }

    const result = await whatsappService.sendDailySummary(recipientPhone, summary);
    res.json({ 
      success: true, 
      message: 'Daily summary sent successfully',
      result 
    });
  } catch (error) {
    console.error('Failed to send daily summary:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to send daily summary',
      details: error.message
    });
  }
});

// Send change notification
router.post('/send-changes', requireAuth, async (req, res) => {
  try {
    const { recipientPhone, changes } = req.body;
    
    if (!recipientPhone || !changes) {
      return res.status(400).json({ error: 'Recipient phone and changes are required' });
    }

    const result = await whatsappService.sendChangeNotification(recipientPhone, changes);
    res.json({ 
      success: true, 
      message: 'Change notification sent successfully',
      result 
    });
  } catch (error) {
    console.error('Failed to send change notification:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to send change notification',
      details: error.message
    });
  }
});

// Preview WhatsApp message format
router.post('/preview-summary', requireAuth, async (req, res) => {
  try {
    const calendarService = require('../services/calendarService');
    const summary = await calendarService.getTodaySummary(req.session.user.id);
    
    res.json({ 
      success: true, 
      message: 'Preview generated successfully',
      summary: summary.summary,
      events: summary.events
    });
  } catch (error) {
    console.error('Failed to preview summary:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to preview summary',
      details: error.message
    });
  }
});

// Test WhatsApp connection
router.get('/test', requireAuth, async (req, res) => {
  try {
    const isConnected = await whatsappService.testConnection();
    
    if (isConnected) {
      res.json({
        success: true,
        message: 'Twilio WhatsApp connection successful'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Twilio WhatsApp connection failed'
      });
    }
  } catch (error) {
    console.error('Twilio WhatsApp connection test failed:', error);
    res.status(500).json({ 
      success: false,
      error: 'Twilio WhatsApp connection test failed',
      details: error.message
    });
  }
});

module.exports = router; 