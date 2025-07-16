const express = require('express');
const { google } = require('googleapis');
const User = require('../models/User');
const router = express.Router();

// Google OAuth configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Scopes for Google Calendar access
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

// Generate OAuth URL
router.get('/google', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent' // Force consent to get refresh token
  });
  res.json({ authUrl });
});

// OAuth callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code not provided' });
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    console.log('[Auth] Tokens from Google:', tokens);
    oauth2Client.setCredentials(tokens);

    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    // Find or create user
    let user = await User.findByGoogleId(userInfo.id);
    
    if (!user) {
      user = await User.create({
        googleId: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token, // will be set below
        tokenExpiry: new Date(tokens.expiry_date)
      });
      // Patch: update refreshToken if missing
      if (!tokens.refresh_token && tokens.access_token) {
        await User.updateTokens(
          user.id,
          tokens.access_token,
          user.refreshToken,
          new Date(tokens.expiry_date)
        );
      }
    } else {
      // Update existing user's tokens
      user = await User.updateTokens(
        user.id,
        tokens.access_token,
        tokens.refresh_token || user.refresh_token,
        new Date(tokens.expiry_date)
      );
    }

    // Store user in session
    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      picture: user.picture
    };

    // Sync today's events after login
    const calendarService = require('../services/calendarService');
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    try {
      const events = await calendarService.fetchEvents(user.id, startOfDay, endOfDay);
      await calendarService.syncEvents(user.id, events);
      console.log(`[Auth] Synced today's events for user ${user.id}`);
    } catch (err) {
      console.error('[Auth] Failed to sync events after login:', err);
    }

    // Redirect to frontend
    res.redirect(process.env.NODE_ENV === 'production' 
      ? `${process.env.FRONTEND_URL || 'https://your-app.vercel.app'}/dashboard` 
      : 'http://localhost:3000/dashboard'
    );

  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Check authentication status
router.get('/status', (req, res) => {
  if (req.session.user) {
    res.json({ 
      authenticated: true, 
      user: req.session.user 
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Get current user
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      picture: user.picture,
      whatsappRecipient: user.whatsapp_recipient,
      automationEnabled: user.automation_enabled,
      dailySummaryTime: user.daily_summary_time,
      timezone: user.timezone
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Update user settings
router.put('/settings', requireAuth, async (req, res) => {
  try {
    const { whatsappRecipient, automationEnabled, dailySummaryTime, timezone } = req.body;
    
    const user = await User.updateSettings(req.session.user.id, {
      whatsappRecipient,
      automationEnabled,
      dailySummaryTime,
      timezone
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router; 