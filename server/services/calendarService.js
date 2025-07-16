const { google } = require('googleapis');
const User = require('../models/User');
const CalendarEvent = require('../models/CalendarEvent');

class CalendarService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  // Refresh user's access token
  async refreshUserToken(user) {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: user.refresh_token
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      await user.updateTokens(
        credentials.access_token,
        user.refresh_token, // Keep existing refresh token
        new Date(credentials.expiry_date)
      );

      return credentials.access_token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  // Get authenticated calendar client
  async getCalendarClient(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if token is expired and refresh if needed
    if (new Date() > new Date(user.token_expiry)) {
      await this.refreshUserToken(user);
    }

    this.oauth2Client.setCredentials({
      access_token: user.access_token,
      refresh_token: user.refresh_token
    });

    return google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  // Fetch events for a specific date range
  async fetchEvents(userId, startDate, endDate) {
    try {
      console.log(`[CalendarService] Fetching events for user ${userId} from ${startDate} to ${endDate}`);
      const calendar = await this.getCalendarClient(userId);
      
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });
      console.log(`[CalendarService] Google returned ${response.data.items?.length || 0} events`);
      return response.data.items || [];
    } catch (error) {
      console.error('[CalendarService] Failed to fetch events:', error);
      throw error;
    }
  }

  // Sync events to database
  async syncEvents(userId, events) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    console.log(`[CalendarService] Syncing ${events.length} events to DB for user ${userId}`);
    for (const event of events) {
      const eventData = {
        userId: user.id,
        eventId: event.id,
        summary: event.summary || 'No title',
        description: event.description || '',
        location: event.location || '',
        startTime: new Date(event.start.dateTime || event.start.date),
        endTime: new Date(event.end.dateTime || event.end.date),
        allDay: !event.start.dateTime,
        status: event.status || 'confirmed',
        attendees: event.attendees ? event.attendees.map(attendee => ({
          email: attendee.email,
          name: attendee.displayName,
          responseStatus: attendee.responseStatus
        })) : []
      };
      console.log(`[CalendarService] Upserting event:`, eventData);
      await CalendarEvent.upsert(eventData);
    }
  }

  // Get today's events summary
  async getTodaySummary(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    const today = new Date();
    const events = await CalendarEvent.findTodayEvents(user.id);

    // Create detailed schedule for WhatsApp
    let summary = `${user.name}'s Schedule – ${today.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    })}\n\n`;

    if (events.length === 0) {
      summary += `No events scheduled for today.`;
    } else {
      // Sort events by start time
      const sortedEvents = events.sort((a, b) => 
        new Date(a.starttime || a.start_time) - new Date(b.starttime || b.start_time)
      );

      // Calculate free time blocks
      const freeBlocks = [];
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      
      let currentTime = startOfDay;
      
      for (const event of sortedEvents) {
        const eventStart = new Date(event.starttime || event.start_time);
        const eventEnd = new Date(event.endtime || event.end_time);
        
        // If there's a gap before this event, it's free time
        if (currentTime < eventStart) {
          const freeStart = new Date(currentTime);
          const freeEnd = new Date(eventStart);
          freeBlocks.push({ start: freeStart, end: freeEnd });
        }
        
        currentTime = eventEnd;
      }
      
      // If there's time after the last event, it's also free
      if (currentTime < endOfDay) {
        freeBlocks.push({ start: currentTime, end: endOfDay });
      }

      // Add BUSY section
      summary += `📅 BUSY:\n`;
      sortedEvents.forEach(event => {
        const start = new Date(event.starttime || event.start_time);
        const end = new Date(event.endtime || event.end_time);
        const timeStr = event.allday || event.all_day
          ? 'All Day'
          : `${start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })} - ${end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
        
        const location = event.location ? `\n📍 ${event.location}` : '';
        summary += `🕐 ${timeStr}\n📝 ${event.summary}${location}\n\n`;
      });

      // Add FREE section
      if (freeBlocks.length > 0) {
        summary += `⏰ FREE:\n`;
        freeBlocks.forEach(block => {
          const start = block.start;
          const end = block.end;
          const timeStr = `${start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })} - ${end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
          
          // Only show blocks longer than 15 minutes
          const durationMinutes = (end - start) / (1000 * 60);
          if (durationMinutes >= 15) {
            summary += `🆓 ${timeStr}\n`;
          }
        });
        summary += `\n`;
      }
      
      summary += `Total appointments: ${events.length}`;
    }

    // Return raw event data for the API
    return {
      date: today.toISOString(), // UTC ISO string
      summary, // detailed schedule string
      events: events.map(event => ({
        id: event.eventid || event.event_id,
        summary: event.summary,
        description: event.description,
        location: event.location,
        startTime: event.starttime || event.start_time, // UTC from DB
        endTime: event.endtime || event.end_time, // UTC from DB
        allDay: event.allday || event.all_day,
        status: event.status,
        attendees: event.attendees,
        lastModified: event.lastmodified || event.last_modified,
        createdAt: event.createdat || event.created_at
      }))
    };
  }

  // Check for calendar changes
  async checkForChanges(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    // Fetch latest events from Google Calendar
    const calendar = await this.getCalendarClient(userId);
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      updatedMin: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Check last 24 hours
    });

    const googleEvents = response.data.items || [];
    const dbEvents = await CalendarEvent.findByUserIdAndDateRange(user.id, startOfDay, endOfDay);

    const changes = [];

    // Check for new or modified events
    for (const googleEvent of googleEvents) {
      const dbEvent = dbEvents.find(e => e.eventId === googleEvent.id);
      
      if (!dbEvent) {
        // New event
        changes.push({
          type: 'added',
          event: googleEvent
        });
      } else if (new Date(googleEvent.updated) > dbEvent.lastModified) {
        // Modified event
        changes.push({
          type: 'modified',
          event: googleEvent,
          oldEvent: dbEvent
        });
      }
    }

            // Check for deleted events
        for (const dbEvent of dbEvents) {
          const googleEvent = googleEvents.find(e => e.id === dbEvent.event_id);
          if (!googleEvent && dbEvent.status !== 'cancelled') {
            changes.push({
              type: 'deleted',
              event: dbEvent
            });
          }
        }

    return changes;
  }
}

module.exports = new CalendarService(); 