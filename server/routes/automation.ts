import express, { Request, Response, NextFunction } from 'express';
import automationService from '../services/automationService';

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

// Start automation for current user
router.post('/start', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.session.user.id;
    
    await automationService.startUserAutomation(userId);
    res.json({ success: true, message: 'Automation started successfully' });
  } catch (error) {
    console.error('Failed to start automation:', error);
    res.status(500).json({ error: 'Failed to start automation' });
  }
});

// Stop automation for current user
router.post('/stop', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.session.user.id;
    
    automationService.stopUserAutomation(userId);
    res.json({ success: true, message: 'Automation stopped successfully' });
  } catch (error) {
    console.error('Failed to stop automation:', error);
    res.status(500).json({ error: 'Failed to stop automation' });
  }
});

// Get automation status for current user
router.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.session.user.id;
    
    const status = await automationService.getAutomationStatus(userId);
    res.json(status);
  } catch (error) {
    console.error('Failed to get automation status:', error);
    res.status(500).json({ error: 'Failed to get automation status' });
  }
});

// Get automation status for a specific user
router.get('/status/:userId', async (req: Request, res: Response) => {
  try {
    const userIdParam = req.params['userId'];
    if (!userIdParam) {
      res.status(400).json({ error: 'User ID parameter is required' });
      return;
    }
    
    const userId = parseInt(userIdParam);
    if (isNaN(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    const status = await automationService.getAutomationStatus(userId);
    res.json(status);
  } catch (error) {
    console.error('Failed to get automation status:', error);
    res.status(500).json({ error: 'Failed to get automation status' });
  }
});

// Manual trigger for daily summary
router.post('/trigger-summary', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.session.user.id;

    const result = await automationService.triggerDailySummary(userId);
    res.json(result);
  } catch (error) {
    console.error('Failed to trigger daily summary:', error);
    res.status(500).json({ error: 'Failed to trigger daily summary' });
  }
});

// Manual trigger for change check
router.post('/trigger-change-check', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.session.user.id;

    const result = await automationService.triggerChangeCheck(userId);
    res.json(result);
  } catch (error) {
    console.error('Failed to trigger change check:', error);
    res.status(500).json({ error: 'Failed to trigger change check' });
  }
});

// Start all automations (admin only)
router.post('/start-all', async (_req: Request, res: Response) => {
  try {
    await automationService.startAllAutomations();
    res.json({ success: true, message: 'All automations started successfully' });
  } catch (error) {
    console.error('Failed to start all automations:', error);
    res.status(500).json({ error: 'Failed to start all automations' });
  }
});

// Stop all automations (admin only)
router.post('/stop-all', async (_req: Request, res: Response) => {
  try {
    automationService.stopAllAutomations();
    res.json({ success: true, message: 'All automations stopped successfully' });
  } catch (error) {
    console.error('Failed to stop all automations:', error);
    res.status(500).json({ error: 'Failed to stop all automations' });
  }
});

export default router; 