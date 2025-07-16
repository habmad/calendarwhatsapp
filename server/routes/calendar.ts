import express, { Request, Response, NextFunction } from 'express';
import calendarService from '../services/calendarService';

interface AuthenticatedRequest extends Request {
  session: any;
}

const router = express.Router();

// Middleware to check if user is authenticated
const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.session.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
};

// Get today's summary
router.get('/today', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.session.user.id;
    
    const summary = await calendarService.getTodaySummary(userId);
    res.json(summary);
  } catch (error) {
    console.error('Failed to get today summary:', error);
    res.status(500).json({ error: 'Failed to get today summary' });
  }
});

// Get events for a date range
router.get('/events', requireAuth, async (req: Request, res: Response) => {
  try {
    const { start, end } = req.query;
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.session.user.id;
    
    if (!start || !end) {
      res.status(400).json({ error: 'Start and end dates are required' });
      return;
    }
    
    const startDate = new Date(start as string);
    const endDate = new Date(end as string);
    
    const events = await calendarService.fetchEvents(userId, startDate, endDate);
    res.json({ events: events || [] });
  } catch (error) {
    console.error('Failed to get events:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

// Sync calendar events
router.post('/sync', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.session.user.id;
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    
    const events = await calendarService.fetchEvents(userId, today, tomorrow);
    if (events) {
      await calendarService.syncEvents(userId, events);
      res.json({ success: true, message: `Synced ${events.length} events` });
    } else {
      res.json({ success: false, message: 'No events found' });
    }
  } catch (error) {
    console.error('Failed to sync calendar:', error);
    res.status(500).json({ error: 'Failed to sync calendar' });
  }
});

export default router; 