const axios = require('axios');

class WhatsAppService {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.from = process.env.TWILIO_WHATSAPP_FROM;
    this.contentSid = process.env.TWILIO_WHATSAPP_CONTENT_SID;
    this.baseURL = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}`;
  }

  // Send a text message
  async sendTextMessage(recipientPhone, message) {
    try {
      const response = await axios.post(
        `${this.baseURL}/Messages.json`,
        {
          To: `whatsapp:${recipientPhone}`,
          From: this.from,
          Body: message
        },
        {
          auth: {
            username: this.accountSid,
            password: this.authToken
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      console.log('WhatsApp message sent successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error.response?.data || error.message);
      throw new Error('Failed to send WhatsApp message');
    }
  }

  // Send a template message (for daily summaries)
  async sendTemplateMessage(recipientPhone, templateName, variables = {}) {
    try {
      const response = await axios.post(
        `${this.baseURL}/Messages.json`,
        {
          To: `whatsapp:${recipientPhone}`,
          From: this.from,
          ContentSid: this.contentSid,
          ContentVariables: JSON.stringify(variables)
        },
        {
          auth: {
            username: this.accountSid,
            password: this.authToken
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      console.log('WhatsApp template message sent successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to send WhatsApp template message:', error.response?.data || error.message);
      throw new Error('Failed to send WhatsApp template message');
    }
  }

  // Send daily schedule summary
  async sendDailySummary(recipientPhone, summary) {
    return this.sendTextMessage(recipientPhone, summary);
  }

  // Send calendar change notification
  async sendChangeNotification(recipientPhone, changes) {
    let message = '📅 Calendar Update:\n\n';
    
    changes.forEach(change => {
      switch (change.type) {
        case 'added':
          message += `➕ New event: ${change.event.summary}\n`;
          if (change.event.start.dateTime) {
            const time = new Date(change.event.start.dateTime).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            });
            message += `   Time: ${time}\n`;
          }
          break;
        case 'modified':
          message += `✏️ Event updated: ${change.event.summary}\n`;
          break;
        case 'deleted':
          message += `❌ Event cancelled: ${change.event.summary}\n`;
          break;
      }
      message += '\n';
    });

    return this.sendTextMessage(recipientPhone, message);
  }

  // Send error notification
  async sendErrorNotification(recipientPhone, error) {
    const message = `⚠️ Calendar Sync Error:\n\n${error}\n\nPlease check your Google Calendar connection.`;
    return this.sendTextMessage(recipientPhone, message);
  }

  // Test connection
  async testConnection() {
    try {
      const response = await axios.get(
        `${this.baseURL}`,
        {
          auth: {
            username: this.accountSid,
            password: this.authToken
          }
        }
      );
      
      console.log('Twilio WhatsApp API connection successful:', response.data);
      return true;
    } catch (error) {
      console.error('Twilio WhatsApp API connection failed:', error.response?.data || error.message);
      return false;
    }
  }
}

module.exports = new WhatsAppService(); 