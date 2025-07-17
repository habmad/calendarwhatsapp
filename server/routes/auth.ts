import express, { Request, Response, NextFunction } from 'express';
import { google } from 'googleapis';
import { UserPrismaModel as UserModel } from '../models/UserPrisma';
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
  console.log('[Auth] OAuth callback started');
  console.log('[Auth] Request URL:', req.url);
  console.log('[Auth] Request query:', req.query);
  console.log('[Auth] Request headers:', req.headers);
  
  try {
    const { code } = req.query;
    
    if (!code || typeof code !== 'string') {
      console.log('[Auth] No authorization code provided');
      res.status(400).json({ error: 'Authorization code not provided' });
      return;
    }

    console.log('[Auth] Exchanging code for tokens...');
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    console.log('[Auth] Tokens from Google:', tokens);
    oauth2Client.setCredentials(tokens);

    console.log('[Auth] Getting user info from Google...');
    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();
    console.log('[Auth] User info from Google:', userInfo);

    // Validate required user info
    if (!userInfo.id || !userInfo.email || !userInfo.name) {
      console.log('[Auth] Incomplete user information received from Google');
      res.status(500).json({ error: 'Incomplete user information received from Google' });
      return;
    }

    console.log('[Auth] Finding or creating user...');
    // Find or create user
    let user = await UserModel.findByGoogleId(userInfo.id);
    
    if (!user) {
      console.log('[Auth] Creating new user...');
      if (!tokens.access_token) {
        console.log('[Auth] No access token received from Google');
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
      console.log('[Auth] New user created:', user.id);
      
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
      console.log('[Auth] Updating existing user...');
      // Update existing user's tokens
      user = await UserModel.updateTokens(
        user.id,
        tokens.access_token!,
        tokens.refresh_token || user.refresh_token,
        new Date(tokens.expiry_date!)
      );
      console.log('[Auth] Existing user updated:', user.id);
    }

    console.log('[Auth] Storing user in session...');
    // Store user in session
    const authReq = req as AuthenticatedRequest;
    authReq.session.userId = user.id;
    authReq.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      picture: user.picture
    };
    console.log('[Auth] User stored in session:', authReq.session.user);

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

    // Log redirect information
    const frontendUrl = process.env['FRONTEND_URL'] || 'https://calendarwhatsapp.vercel.app';
    const redirectUrl = process.env['NODE_ENV'] === Environment.PRODUCTION
      ? `${frontendUrl}/dashboard` 
      : 'http://localhost:3000/dashboard';
    
    console.log('[Auth] FRONTEND_URL env:', process.env['FRONTEND_URL']);
    console.log('[Auth] frontendUrl variable:', frontendUrl);
    console.log('[Auth] NODE_ENV:', process.env['NODE_ENV']);
    console.log('[Auth] Redirecting to:', redirectUrl);
    console.log('[Auth] Session user:', authReq.session.user);
    console.log('[Auth] Session ID:', authReq.sessionID);
    
    // Redirect to frontend
    res.redirect(redirectUrl);
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
  console.log('[Auth] Status check - Session ID:', authReq.sessionID);
  console.log('[Auth] Status check - Session user:', authReq.session.user);
  console.log('[Auth] Status check - Session exists:', !!authReq.session);
  
  if (authReq.session.user) {
    res.json({ 
      authenticated: true, 
      user: authReq.session.user 
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Debug endpoint to check session
router.get('/debug-session', (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  res.json({
    sessionID: authReq.sessionID,
    sessionExists: !!authReq.session,
    sessionUser: authReq.session.user,
    sessionKeys: Object.keys(authReq.session || {}),
    headers: req.headers
  });
});

// Test session creation
router.get('/test-session', (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  authReq.session.test = 'session-working';
  authReq.session.user = { id: 999, name: 'Test User' };
  console.log('[Test] Session created:', authReq.sessionID, authReq.session);
  console.log('[Test] Request headers:', req.headers);
  console.log('[Test] Response will set cookie for domain:', req.get('host'));
  res.json({ 
    message: 'Session created', 
    sessionID: authReq.sessionID,
    sessionData: authReq.session,
    cookie: req.headers.cookie,
    host: req.get('host'),
    origin: req.get('origin')
  });
});

// Test session retrieval
router.get('/test-session-check', (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  console.log('[Test] Session check:', authReq.sessionID, authReq.session);
  console.log('[Test] Request headers:', req.headers);
  res.json({ 
    message: 'Session check', 
    sessionID: authReq.sessionID,
    sessionExists: !!authReq.session,
    sessionData: authReq.session,
    cookie: req.headers.cookie,
    host: req.get('host'),
    origin: req.get('origin')
  });
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
      whatsappRecipients: user.whatsapp_recipients,
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
    
    const currentUser = await UserModel.findById(authReq.session.user!.id);
    if (!currentUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    const user = await UserModel.updateSettings(authReq.session.user!.id, {
      whatsappRecipients: whatsappRecipient ? [whatsappRecipient] : currentUser.whatsapp_recipients,
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