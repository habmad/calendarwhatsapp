const cron = require('node-cron');
const User = require('../models/User');
const calendarService = require('./calendarService');
const whatsappService = require('./whatsappService');

class AutomationService {
  constructor() {
    this.jobs = new Map();
    this.changeCheckInterval = null;
  }

  // Start automation for a user
  async startUserAutomation(userId) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.automation_enabled) {
        return;
      }

      // Stop existing job if any
      this.stopUserAutomation(userId);

      // Parse daily summary time
      const [hour, minute] = user.daily_summary_time.split(':').map(Number);
      
      // Schedule daily summary (run every day at specified time)
      const job = cron.schedule(`${minute} ${hour} * * *`, async () => {
        await this.sendDailySummary(userId);
      }, {
        timezone: user.timezone || 'America/New_York'
      });

      this.jobs.set(userId.toString(), job);
      console.log(`Started automation for user ${userId} at ${user.daily_summary_time}`);
    } catch (error) {
      console.error('Failed to start user automation:', error);
    }
  }

  // Stop automation for a user
  stopUserAutomation(userId) {
    const job = this.jobs.get(userId.toString());
    if (job) {
      job.stop();
      this.jobs.delete(userId.toString());
      console.log(`Stopped automation for user ${userId}`);
    }
  }

  // Send daily summary for a user
  async sendDailySummary(userId) {
    try {
      const user = await User.findById(userId);
      console.log(`[AutomationService] User lookup result for ${userId}:`, user ? { 
        id: user.id, 
        automation_enabled: user.automation_enabled,
        whatsapp_recipient: user.whatsapp_recipient,
        name: user.name
      } : 'null');
      if (!user || !user.automation_enabled) {
        console.log(`[AutomationService] User not found or automation disabled for userId: ${userId}`);
        return;
      }

      console.log(`[AutomationService] Sending daily summary for user ${userId} to ${user.whatsapp_recipient}`);
      
      // Get today's summary
      const summary = await calendarService.getTodaySummary(userId);
      console.log(`[AutomationService] WhatsApp summary content:`, summary.summary);
      
      // Send via WhatsApp
      const result = await whatsappService.sendDailySummary(user.whatsapp_recipient, summary.summary);
      console.log(`[AutomationService] WhatsApp send result:`, result);
      
      console.log(`Daily summary sent successfully for user ${userId}`);
    } catch (error) {
      console.error(`[AutomationService] Failed to send daily summary for user ${userId}:`, error);
      // Send error notification
      try {
        const user = await User.findById(userId);
        if (user) {
          await whatsappService.sendErrorNotification(user.whatsapp_recipient, error.message);
        }
      } catch (notifyError) {
        console.error('[AutomationService] Failed to send error notification:', notifyError);
      }
    }
  }

  // Start change detection for all users
  startChangeDetection() {
    // Check for changes every 5 minutes
    this.changeCheckInterval = setInterval(async () => {
      await this.checkAllUsersForChanges();
    }, 5 * 60 * 1000);
    
    console.log('Started change detection service');
  }

  // Stop change detection
  stopChangeDetection() {
    if (this.changeCheckInterval) {
      clearInterval(this.changeCheckInterval);
      this.changeCheckInterval = null;
      console.log('Stopped change detection service');
    }
  }

  // Check all users for calendar changes
  async checkAllUsersForChanges() {
    try {
      const users = await User.findAutomationEnabled();
      
      for (const user of users) {
        try {
          await this.checkUserForChanges(user);
        } catch (error) {
          console.error(`Failed to check changes for user ${user.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to check all users for changes:', error);
    }
  }

  // Check a specific user for changes
  async checkUserForChanges(user) {
    try {
      const changes = await calendarService.checkForChanges(user.id);
      
      if (changes.length > 0) {
        console.log(`Found ${changes.length} changes for user ${user.id}`);
        
        // Send change notification
        await whatsappService.sendChangeNotification(user.whatsapp_recipient, changes);
        
        // Update local database with changes
        await this.processChanges(user.id, changes);
      }
    } catch (error) {
      console.error(`Failed to check changes for user ${user.id}:`, error);
    }
  }

  // Process changes and update local database
  async processChanges(userId, changes) {
    try {
      for (const change of changes) {
        switch (change.type) {
          case 'added':
            await calendarService.syncEvents(userId, [change.event]);
            break;
          case 'modified':
            await calendarService.syncEvents(userId, [change.event]);
            break;
          case 'deleted':
            // Mark event as cancelled in database
            const CalendarEvent = require('../models/CalendarEvent');
            await CalendarEvent.markAsCancelled(userId, change.event.event_id);
            break;
        }
      }
    } catch (error) {
      console.error('Failed to process changes:', error);
    }
  }

  // Start automation for all users
  async startAllAutomations() {
    try {
      const users = await User.findAutomationEnabled();
      
      for (const user of users) {
        await this.startUserAutomation(user.id);
      }
      
      // Start change detection
      this.startChangeDetection();
      
      console.log(`Started automation for ${users.length} users`);
    } catch (error) {
      console.error('Failed to start all automations:', error);
    }
  }

  // Stop all automations
  stopAllAutomations() {
    // Stop all user jobs
    for (const [userId, job] of this.jobs) {
      job.stop();
    }
    this.jobs.clear();
    
    // Stop change detection
    this.stopChangeDetection();
    
    console.log('Stopped all automations');
  }

  // Manual trigger for daily summary
  async triggerDailySummary(userId) {
    try {
      console.log(`[AutomationService] triggerDailySummary called for userId: ${userId}`);
      await this.sendDailySummary(userId);
      return { success: true, message: 'Daily summary sent successfully' };
    } catch (error) {
      console.error('[AutomationService] Failed to trigger daily summary:', error);
      return { success: false, error: error.message };
    }
  }

  // Manual trigger for change check
  async triggerChangeCheck(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      await this.checkUserForChanges(user);
      return { success: true, message: 'Change check completed' };
    } catch (error) {
      console.error('Failed to trigger change check:', error);
      return { success: false, error: error.message };
    }
  }

  // Get automation status for a user
  async getAutomationStatus(userId) {
    const user = await User.findById(userId);
    if (!user) {
      return { error: 'User not found' };
    }

    const hasJob = this.jobs.has(userId.toString());
    
    return {
      automationEnabled: user.automation_enabled,
      dailySummaryTime: user.daily_summary_time,
      timezone: user.timezone,
      jobActive: hasJob,
      changeDetectionActive: this.changeCheckInterval !== null
    };
  }
}

module.exports = new AutomationService(); 