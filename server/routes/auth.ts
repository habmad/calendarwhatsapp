import express, { Request, Response, NextFunction } from 'express';
import { google } from 'googleapis';
import { UserModel } from '../models/User';
import { CreateUserData } from '../types/interfaces';
import { Environment } from '../types/enums';

const router = express.Router();

// Google OAuth configuration
const oauth2Client = new google.auth.OAuth2(
  process.env['GOOGLE_CLIENT_ID'],
  process.env['GOOGLE_CLIENT_SECRET'],
  process.env['GOOGLE_REDIRECT_URI']
);

// Scopes for Google Calendar access
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

// Extend Express Request interface
interface AuthenticatedRequest extends Request {
  session: any; // Using any for session to avoid complex typing
}

// Generate OAuth URL
router.get('/google', (_req: Request, res: Response) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent' // Force consent to get refresh token
  });
  res.json({ authUrl });
});

// OAuth callback
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    
    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'Authorization code not provided' });
      return;
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    console.log('[Auth] Tokens from Google:', tokens);
    oauth2Client.setCredentials(tokens);

    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    // Validate required user info
    if (!userInfo.id || !userInfo.email || !userInfo.name) {
      res.status(500).json({ error: 'Incomplete user information received from Google' });
      return;
    }

    // Find or create user
    let user = await UserModel.findByGoogleId(userInfo.id);
    
    if (!user) {
      if (!tokens.access_token) {
        res.status(500).json({ error: 'No access token received from Google' });
        return;
      }
      
      const userData: CreateUserData = {
        googleId: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture || null,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || '',
        tokenExpiry: new Date(tokens.expiry_date || Date.now())
      };
      
      user = await UserModel.create(userData);
      
      // Patch: update refreshToken if missing
      if (!tokens.refresh_token && tokens.access_token) {
        await UserModel.updateTokens(
          user.id,
          tokens.access_token,
          user.refresh_token,
          new Date(tokens.expiry_date!)
        );
      }
    } else {
      // Update existing user's tokens
      user = await UserModel.updateTokens(
        user.id,
        tokens.access_token!,
        tokens.refresh_token || user.refresh_token,
        new Date(tokens.expiry_date!)
      );
    }

    // Store user in session
    const authReq = req as AuthenticatedRequest;
    authReq.session.userId = user.id;
    authReq.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      picture: user.picture
    };

    // Sync today's events after login
    const calendarServiceModule = await import('../services/calendarService');
    const calendarService = calendarServiceModule.default;
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    try {
      const events = await calendarService.fetchEvents(user.id, startOfDay, endOfDay);
      if (events) {
        await calendarService.syncEvents(user.id, events);
        console.log(`[Auth] Synced today's events for user ${user.id}`);
      }
    } catch (err) {
      console.error('[Auth] Failed to sync events after login:', err);
    }

    // Redirect to frontend
    res.redirect(process.env['NODE_ENV'] === Environment.PRODUCTION
      ? `${process.env['FRONTEND_URL'] || 'https://your-app.vercel.app'}/dashboard` 
      : 'http://localhost:3000/dashboard'
    );
    return;

  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
    return;
  }
});

// Check authentication status
router.get('/status', (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  if (authReq.session.user) {
    res.json({ 
      authenticated: true, 
      user: authReq.session.user 
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Logout
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    return res.json({ message: 'Logged out successfully' });
  });
});

// Middleware to check if user is authenticated
const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.session.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
};

// Get current user
router.get('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = await UserModel.findById(authReq.session.user!.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
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
router.put('/settings', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { whatsappRecipient, automationEnabled, dailySummaryTime, timezone } = req.body;
    
    const user = await UserModel.updateSettings(authReq.session.user!.id, {
      whatsappRecipient,
      automationEnabled,
      dailySummaryTime,
      timezone
    });
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router; 