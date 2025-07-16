const express = require('express');
const calendarService = require('../services/calendarService');
const router = express.Router();

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Get today's events
router.get('/today', requireAuth, async (req, res) => {
  try {
    console.log(`[Route] /calendar/today for user ${req.session.user.id}`);
    const summary = await calendarService.getTodaySummary(req.session.user.id);
    res.json(summary);
  } catch (error) {
    console.error('Failed to get today\'s events:', error);
    res.status(500).json({ error: 'Failed to fetch today\'s events' });
  }
});

// Get events for a specific date range
router.get('/events', requireAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const events = await calendarService.fetchEvents(req.session.user.id, start, end);
    res.json({ events });
  } catch (error) {
    console.error('Failed to fetch events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Sync calendar events
router.post('/sync', requireAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default to 7 days

    const events = await calendarService.fetchEvents(req.session.user.id, start, end);
    await calendarService.syncEvents(req.session.user.id, events);

    res.json({ 
      message: 'Calendar synced successfully',
      syncedEvents: events.length
    });
  } catch (error) {
    console.error('Failed to sync calendar:', error);
    res.status(500).json({ error: 'Failed to sync calendar' });
  }
});

// Check for calendar changes
router.get('/changes', requireAuth, async (req, res) => {
  try {
    const changes = await calendarService.checkForChanges(req.session.user.id);
    res.json({ changes });
  } catch (error) {
    console.error('Failed to check for changes:', error);
    res.status(500).json({ error: 'Failed to check for changes' });
  }
});

// Get user's calendar settings
router.get('/settings', requireAuth, async (req, res) => {
  try {
    // This would typically come from the user model
    // For now, return basic settings
    res.json({
      timezone: 'America/New_York',
      dailySummaryTime: '08:00',
      automationEnabled: true
    });
  } catch (error) {
    console.error('Failed to get calendar settings:', error);
    res.status(500).json({ error: 'Failed to get calendar settings' });
  }
});

// Test calendar connection
router.get('/test', requireAuth, async (req, res) => {
  try {
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    
    const events = await calendarService.fetchEvents(req.session.user.id, today, tomorrow);
    
    res.json({
      success: true,
      message: 'Calendar connection successful',
      eventsFound: events.length
    });
  } catch (error) {
    console.error('Calendar connection test failed:', error);
    res.status(500).json({ 
      success: false,
      error: 'Calendar connection failed',
      details: error.message
    });
  }
});

module.exports = router; 