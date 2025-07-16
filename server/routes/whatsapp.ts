import express, { Request, Response, NextFunction } from 'express';
import whatsappService from '../services/whatsappService';
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

// Send test message
router.post('/send-test', async (req: Request, res: Response) => {
  try {
    const { recipient } = req.body;
    if (!recipient) {
      res.status(400).json({ 
        success: false, 
        error: 'Recipient phone number is required' 
      });
      return;
    }

    const result = await whatsappService.sendTestMessage(recipient);
    res.json(result);
  } catch (error) {
    console.error('WhatsApp test failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send test message' 
    });
  }
});

// Preview summary without sending
router.post('/preview-summary', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.session.user.id;
    
    // Get today's summary
    const summary = await calendarService.getTodaySummary(userId);
    
    if (!summary) {
      res.status(404).json({ 
        success: false, 
        error: 'No summary available for today' 
      });
      return;
    }

    res.json({ 
      success: true, 
      summary: summary.summary 
    });
  } catch (error) {
    console.error('Failed to preview summary:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate summary preview' 
    });
  }
});

// Send daily summary
router.post('/send-summary', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.session.user.id;
    
    // Get user from database to get WhatsApp recipient
    const { UserModel } = await import('../models/User');
    const user = await UserModel.findById(userId);
    if (!user) {
      res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
      return;
    }

    const recipients = user.whatsapp_recipients || [process.env['DEFAULT_WHATSAPP_RECIPIENT'] || ''];
    if (!recipients.length || !recipients[0]) {
      res.status(400).json({ 
        success: false, 
        error: 'No WhatsApp recipients configured' 
      });
      return;
    }

    const summary = await calendarService.getTodaySummary(userId);
    if (!summary) {
      res.status(404).json({ 
        success: false, 
        error: 'No summary available for today' 
      });
      return;
    }

    const success = await whatsappService.sendDailySummary(recipients, summary.summary);
    
    res.json({ 
      success, 
      message: success ? 'Summary sent successfully' : 'Failed to send summary' 
    });
  } catch (error) {
    console.error('Failed to send summary:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send summary' 
    });
  }
});

export default router; 