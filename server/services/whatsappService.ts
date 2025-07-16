import axios from 'axios';

interface TwilioWhatsAppMessage {
  Body: string;
  From: string;
  To: string;
}

interface TwilioWhatsAppResponse {
  sid: string;
  account_sid: string;
  service_sid: string;
  channel_prefix: string;
  date_created: string;
  date_updated: string;
  last_updated_by: string;
  was_edited: boolean;
  is_deleted: boolean;
  is_scheduled: boolean;
  send_at: string;
  sending_at: string;
  failed_verification: boolean;
  url: string;
  attributes: string;
  date_sent: string;
  api_version: string;
  price: string;
  price_unit: string;
  error_code: string;
  error_message: string;
  num_media: string;
  num_segments: string;
  status: string;
  messaging_service_sid: string;
  direction: string;
  from: string;
  to: string;
  body: string;
}

class WhatsAppService {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;
  private contentSid: string;
  private apiUrl: string;

  constructor() {
    this.accountSid = process.env['TWILIO_ACCOUNT_SID'] || '';
    this.authToken = process.env['TWILIO_AUTH_TOKEN'] || '';
    this.fromNumber = process.env['TWILIO_WHATSAPP_FROM'] || '';
    this.contentSid = process.env['TWILIO_WHATSAPP_CONTENT_SID'] || '';
    
    // Validate required credentials
    if (!this.accountSid) {
      console.warn('Twilio account SID not configured');
    }
    if (!this.authToken) {
      console.warn('Twilio auth token not configured');
    }
    if (!this.fromNumber) {
      console.warn('Twilio WhatsApp from number not configured');
    }
    
    this.apiUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
  }

  // Send a simple text message
  async sendMessage(recipient: string, message: string): Promise<boolean> {
    try {
      // Check if credentials are properly configured
      if (!this.accountSid || !this.authToken || !this.fromNumber) {
        console.warn('Twilio credentials not properly configured, skipping message send');
        return false;
      }

      // Format recipient for WhatsApp
      const formattedRecipient = recipient.startsWith('whatsapp:') ? recipient : `whatsapp:${recipient}`;

      const payload = new URLSearchParams({
        Body: message,
        From: this.fromNumber,
        To: formattedRecipient
      });

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      console.log('WhatsApp message sent successfully:', response.data);
      return true;
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error);
      return false;
    }
  }

  // Send daily summary to multiple recipients
  async sendDailySummary(recipients: string | string[], summary: string): Promise<boolean> {
    try {
      const message = `📅 *Daily Schedule Summary*\n\n${summary}`;
      const recipientArray = Array.isArray(recipients) ? recipients : [recipients];
      
      const results = await Promise.allSettled(
        recipientArray.map(recipient => this.sendMessage(recipient, message))
      );
      
      const successCount = results.filter(result => 
        result.status === 'fulfilled' && result.value === true
      ).length;
      
      console.log(`Sent daily summary to ${successCount}/${recipientArray.length} recipients`);
      return successCount > 0;
    } catch (error) {
      console.error('Failed to send daily summary:', error);
      return false;
    }
  }

  // Send change notification to multiple recipients
  async sendChangeNotification(recipients: string | string[], changes: any[]): Promise<boolean> {
    try {
      let message = '🔄 *Calendar Changes Detected*\n\n';
      
      for (const change of changes) {
        switch (change.type) {
          case 'added':
            message += `➕ *New Event:* ${change.event.summary}\n`;
            if (change.event.start?.dateTime) {
              const startTime = new Date(change.event.start.dateTime).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              });
              message += `⏰ Time: ${startTime}\n`;
            }
            break;
          case 'modified':
            message += `✏️ *Modified Event:* ${change.event.summary}\n`;
            break;
          case 'deleted':
            message += `❌ *Cancelled Event:* ${change.event.summary}\n`;
            break;
        }
        message += '\n';
      }

      const recipientArray = Array.isArray(recipients) ? recipients : [recipients];
      
      const results = await Promise.allSettled(
        recipientArray.map(recipient => this.sendMessage(recipient, message))
      );
      
      const successCount = results.filter(result => 
        result.status === 'fulfilled' && result.value === true
      ).length;
      
      console.log(`Sent change notification to ${successCount}/${recipientArray.length} recipients`);
      return successCount > 0;
    } catch (error) {
      console.error('Failed to send change notification:', error);
      return false;
    }
  }

  // Send error notification
  async sendErrorNotification(recipient: string, errorMessage: string): Promise<boolean> {
    try {
      const message = `⚠️ *System Error*\n\nAn error occurred: ${errorMessage}\n\nPlease check your settings or contact support.`;
      return await this.sendMessage(recipient, message);
    } catch (error) {
      console.error('Failed to send error notification:', error);
      return false;
    }
  }

  // Test WhatsApp connection
  async testConnection(): Promise<boolean> {
    try {
      const testRecipient = process.env['DEFAULT_WHATSAPP_RECIPIENT'] || '';
      if (!testRecipient) {
        console.error('No default WhatsApp recipient configured');
        return false;
      }

      const result = await this.sendMessage(testRecipient, '🧪 Test message from GCal WhatsApp automation system');
      return result;
    } catch (error) {
      console.error('WhatsApp connection test failed:', error);
      return false;
    }
  }

  // Send test message
  async sendTestMessage(recipient: string): Promise<{ success: boolean; message: string }> {
    try {
      const testMessage = `🧪 *Test Message*\n\nThis is a test message from your GCal WhatsApp automation system.\n\nTime: ${new Date().toLocaleString()}\nStatus: ✅ Connected`;
      
      const success = await this.sendMessage(recipient, testMessage);
      
      return {
        success,
        message: success ? 'Test message sent successfully' : 'Failed to send test message'
      };
    } catch (error) {
      console.error('Test message failed:', error);
      return {
        success: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Validate phone number format
  validatePhoneNumber(phoneNumber: string): boolean {
    // Basic validation - should start with country code and be numeric
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    return cleanNumber.length >= 10 && cleanNumber.length <= 15;
  }

  // Format phone number for WhatsApp
  formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-numeric characters
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // If it doesn't start with a country code, assume US (+1)
    if (cleanNumber.length === 10) {
      return `+1${cleanNumber}`;
    }
    
    // If it starts with 1 and is 11 digits, add +
    if (cleanNumber.length === 11 && cleanNumber.startsWith('1')) {
      return `+${cleanNumber}`;
    }
    
    // Otherwise, just add + if it doesn't have it
    return cleanNumber.startsWith('+') ? cleanNumber : `+${cleanNumber}`;
  }
}

export default new WhatsAppService(); 