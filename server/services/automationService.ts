import cron from 'node-cron';
import { UserModel } from '../models/User';
import calendarService from './calendarService';
import whatsappService from './whatsappService';
import { CalendarEventModel } from '../models/CalendarEvent';

class AutomationService {
  private jobs: Map<string, cron.ScheduledTask>;
  private changeCheckInterval: NodeJS.Timeout | null;

  constructor() {
    this.jobs = new Map();
    this.changeCheckInterval = null;
  }

  // Start automation for a user
  async startUserAutomation(userId: number): Promise<void> {
    try {
      const user = await UserModel.findById(userId);
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
  stopUserAutomation(userId: number): void {
    const job = this.jobs.get(userId.toString());
    if (job) {
      job.stop();
      this.jobs.delete(userId.toString());
      console.log(`Stopped automation for user ${userId}`);
    }
  }

  // Send daily summary for a user
  async sendDailySummary(userId: number): Promise<void> {
    try {
      const user = await UserModel.findById(userId);
      console.log(`[AutomationService] User lookup result for ${userId}:`, user ? { 
        id: user.id, 
        automation_enabled: user.automation_enabled,
        whatsapp_recipients: user.whatsapp_recipients,
        name: user.name
      } : 'null');
      if (!user || !user.automation_enabled) {
        console.log(`[AutomationService] User not found or automation disabled for userId: ${userId}`);
        return;
      }

      console.log(`[AutomationService] Sending daily summary for user ${userId} to ${user.whatsapp_recipients?.length || 0} recipients`);
      
      // Get today's summary
      const summary = await calendarService.getTodaySummary(userId);
      console.log(`[AutomationService] WhatsApp summary content:`, summary.summary);
      
      // Send via WhatsApp to multiple recipients
      const recipients = user.whatsapp_recipients || [process.env['DEFAULT_WHATSAPP_RECIPIENT'] || ''];
      const result = await whatsappService.sendDailySummary(recipients, summary.summary);
      console.log(`[AutomationService] WhatsApp send result:`, result);
      
      console.log(`Daily summary sent successfully for user ${userId}`);
    } catch (error) {
      console.error(`[AutomationService] Failed to send daily summary for user ${userId}:`, error);
      // Send error notification
      try {
        const user = await UserModel.findById(userId);
        if (user) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          const recipients = user.whatsapp_recipients || [process.env['DEFAULT_WHATSAPP_RECIPIENT'] || ''];
          if (recipients[0]) {
            await whatsappService.sendErrorNotification(recipients[0], errorMessage);
          }
        }
      } catch (notifyError) {
        console.error('[AutomationService] Failed to send error notification:', notifyError);
      }
    }
  }

  // Start change detection for all users
  startChangeDetection(): void {
    // Check for changes every 5 minutes
    this.changeCheckInterval = setInterval(async () => {
      await this.checkAllUsersForChanges();
    }, 5 * 60 * 1000);
    
    console.log('Started change detection service');
  }

  // Stop change detection
  stopChangeDetection(): void {
    if (this.changeCheckInterval) {
      clearInterval(this.changeCheckInterval);
      this.changeCheckInterval = null;
      console.log('Stopped change detection service');
    }
  }

  // Check all users for calendar changes
  async checkAllUsersForChanges(): Promise<void> {
    try {
      const users = await UserModel.findAutomationEnabled();
      
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
  async checkUserForChanges(user: any): Promise<void> {
    try {
      const changes = await calendarService.checkForChanges(user.id);
      
      if (changes.length > 0) {
        console.log(`Found ${changes.length} changes for user ${user.id}`);
        
        // Send change notification to multiple recipients
        const recipients = user.whatsapp_recipients || [process.env['DEFAULT_WHATSAPP_RECIPIENT'] || ''];
        await whatsappService.sendChangeNotification(recipients, changes);
        
        // Update local database with changes
        await this.processChanges(user.id, changes);
      }
    } catch (error) {
      console.error(`Failed to check changes for user ${user.id}:`, error);
    }
  }

  // Process changes and update local database
  async processChanges(userId: number, changes: any[]): Promise<void> {
    try {
      console.log(`[AutomationService] Processing ${changes.length} changes for user ${userId}`);
      for (const change of changes) {
        console.log(`[AutomationService] Processing change: ${change.type} - ${change.event.summary}`);
        switch (change.type) {
          case 'added':
            await calendarService.syncEvents(userId, [change.event]);
            console.log(`[AutomationService] Synced added event: ${change.event.summary}`);
            break;
          case 'modified':
            await calendarService.syncEvents(userId, [change.event]);
            console.log(`[AutomationService] Synced modified event: ${change.event.summary}`);
            break;
          case 'deleted':
            // Mark event as cancelled in database
            await CalendarEventModel.markAsCancelled(userId, change.event.event_id);
            console.log(`[AutomationService] Marked deleted event: ${change.event.summary}`);
            break;
        }
      }
    } catch (error) {
      console.error('Failed to process changes:', error);
    }
  }

  // Start automation for all users
  async startAllAutomations(): Promise<void> {
    try {
      const users = await UserModel.findAutomationEnabled();
      
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
  stopAllAutomations(): void {
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
  async triggerDailySummary(userId: number): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      console.log(`[AutomationService] triggerDailySummary called for userId: ${userId}`);
      await this.sendDailySummary(userId);
      return { success: true, message: 'Daily summary sent successfully' };
    } catch (error) {
      console.error('[AutomationService] Failed to trigger daily summary:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  }

  // Manual trigger for change check
  async triggerChangeCheck(userId: number): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      await this.checkUserForChanges(user);
      return { success: true, message: 'Change check completed' };
    } catch (error) {
      console.error('Failed to trigger change check:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  }

  // Get automation status for a user
  async getAutomationStatus(userId: number): Promise<any> {
    const user = await UserModel.findById(userId);
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

export default new AutomationService(); 