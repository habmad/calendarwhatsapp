import { google } from 'googleapis';
import { UserModel } from '../models/User';
import { CalendarEventModel } from '../models/CalendarEvent';

class CalendarService {
  // Get Google Calendar API client for a user
  async getCalendarClient(userId: number) {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env['GOOGLE_CLIENT_ID'],
        process.env['GOOGLE_CLIENT_SECRET'],
        process.env['GOOGLE_REDIRECT_URI']
      );

      oauth2Client.setCredentials({
        access_token: user.access_token,
        refresh_token: user.refresh_token,
        expiry_date: user.token_expiry ? new Date(user.token_expiry).getTime() : null
      });

      return google.calendar({ version: 'v3', auth: oauth2Client });
    } catch (error) {
      console.error('Failed to get calendar client:', error);
      throw error;
    }
  }

  // Fetch events from Google Calendar
  async fetchEvents(userId: number, startDate: Date, endDate: Date) {
    try {
      const calendar = await this.getCalendarClient(userId);
      
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Failed to fetch events:', error);
      return null;
    }
  }

  // Sync events to local database
  async syncEvents(userId: number, events: any[]) {
    try {
      for (const event of events) {
        const eventData = {
          userId: userId,
          eventId: event.id,
          summary: event.summary || 'No Title',
          description: event.description || '',
          startTime: new Date(event.start?.dateTime || event.start?.date || new Date()),
          endTime: new Date(event.end?.dateTime || event.end?.date || new Date()),
          location: event.location || '',
          status: event.status || 'confirmed',
          allDay: !event.start?.dateTime,
          eventType: 'WORK' as any, // Default to WORK type
          attendees: event.attendees?.map((a: any) => a.email) || []
        };

        await CalendarEventModel.upsert(eventData);
      }
      
      console.log(`Synced ${events.length} events for user ${userId}`);
    } catch (error) {
      console.error('Failed to sync events:', error);
      throw error;
    }
  }

  // Get today's events summary
  async getTodaySummary(userId: number) {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const today = new Date();
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      
      const events = await this.fetchEvents(userId, today, tomorrow);
      
      if (!events || events.length === 0) {
        return {
          summary: `${user.name}'s Schedule – ${today.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          })}\n\nNo events scheduled for today.`,
          eventCount: 0,
          firstMeeting: null,
          lastMeeting: null
        };
      }

      // Filter out all-day events and sort by start time
      const timedEvents = events
        .filter(event => event.start?.dateTime)
        .sort((a, b) => {
          const aTime = a.start?.dateTime ? new Date(a.start.dateTime).getTime() : 0;
          const bTime = b.start?.dateTime ? new Date(b.start.dateTime).getTime() : 0;
          return aTime - bTime;
        });

      if (timedEvents.length === 0) {
        return {
          summary: `${user.name}'s Schedule – ${today.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          })}\n\nNo timed events scheduled for today.`,
          eventCount: 0,
          firstMeeting: null,
          lastMeeting: null
        };
      }

      // Create detailed schedule
      let summary = `${user.name}'s Schedule – ${today.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      })}\n\n`;

      // Calculate free time blocks
      const freeBlocks = [];
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      
      let currentTime = startOfDay;
      
      for (const event of timedEvents) {
        const eventStart = new Date(event.start?.dateTime || new Date());
        const eventEnd = new Date(event.end?.dateTime || new Date());
        
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
      timedEvents.forEach(event => {
        const start = new Date(event.start?.dateTime || new Date());
        const end = new Date(event.end?.dateTime || new Date());
        const timeStr = `${start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })} - ${end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
        
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
          const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
          if (durationMinutes >= 15) {
            summary += `🆓 ${timeStr}\n`;
          }
        });
        summary += `\n`;
      }
      
      summary += `Total appointments: ${timedEvents.length}`;

      return {
        summary,
        eventCount: timedEvents.length,
        firstMeeting: timedEvents[0]?.start?.dateTime || null,
        lastMeeting: timedEvents[timedEvents.length - 1]?.end?.dateTime || null
      };
    } catch (error) {
      console.error('Failed to get today summary:', error);
      return {
        summary: 'Failed to retrieve today\'s schedule.',
        eventCount: 0,
        firstMeeting: null,
        lastMeeting: null
      };
    }
  }

  // Check for calendar changes
  async checkForChanges(userId: number) {
    try {
      const today = new Date();
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      
      // Get current events from Google Calendar
      const googleEvents = await this.fetchEvents(userId, today, tomorrow);
      if (!googleEvents) {
        return [];
      }

      // Get stored events from database
      const storedEvents = await CalendarEventModel.findByUserIdAndDateRange(userId, today, tomorrow);
      
      console.log(`[CalendarService] checkForChanges: Found ${googleEvents.length} Google events and ${storedEvents.length} stored events`);
      
      const changes: any[] = [];

      // Check for new events
      for (const googleEvent of googleEvents) {
        const storedEvent = storedEvents.find(e => e.event_id === googleEvent.id);
        console.log(`[CalendarService] Checking event ${googleEvent.id} (${googleEvent.summary}): stored=${!!storedEvent}`);
        
        if (!storedEvent) {
          console.log(`[CalendarService] NEW EVENT: ${googleEvent.summary}`);
          changes.push({
            type: 'added',
            event: googleEvent
          });
        } else {
          // Check if the event was actually modified by comparing timestamps
          const googleUpdated = googleEvent.updated ? new Date(googleEvent.updated) : null;
          const storedUpdated = storedEvent.last_modified ? new Date(storedEvent.last_modified) : null;
          
          if (googleUpdated && storedUpdated && googleUpdated > storedUpdated) {
            // Only mark as modified if the difference is significant (more than 5 minutes)
            // AND if the actual event content has changed
            const timeDiff = googleUpdated.getTime() - storedUpdated.getTime();
            const minutesDiff = timeDiff / (1000 * 60);
            
            if (minutesDiff > 5) {
              // Check if the actual event content has changed by comparing key fields
              const contentChanged = 
                storedEvent.summary !== googleEvent.summary ||
                storedEvent.description !== (googleEvent.description || '') ||
                storedEvent.location !== (googleEvent.location || '') ||
                storedEvent.start_time.getTime() !== new Date(googleEvent.start?.dateTime || googleEvent.start?.date || new Date()).getTime() ||
                storedEvent.end_time.getTime() !== new Date(googleEvent.end?.dateTime || googleEvent.end?.date || new Date()).getTime() ||
                storedEvent.status !== (googleEvent.status || 'confirmed');
              
              if (contentChanged) {
                console.log(`[CalendarService] MODIFIED EVENT: ${googleEvent.summary} (content changed, diff: ${minutesDiff.toFixed(1)} minutes)`);
                changes.push({
                  type: 'modified',
                  event: googleEvent
                });
              } else {
                console.log(`[CalendarService] UNCHANGED EVENT: ${googleEvent.summary} (timestamp changed but content unchanged, diff: ${minutesDiff.toFixed(1)} minutes)`);
              }
            } else {
              console.log(`[CalendarService] UNCHANGED EVENT: ${googleEvent.summary} (minor timestamp difference: ${minutesDiff.toFixed(1)} minutes)`);
            }
          } else {
            console.log(`[CalendarService] UNCHANGED EVENT: ${googleEvent.summary}`);
          }
        }
      }

      // Check for deleted events
      for (const storedEvent of storedEvents) {
        const googleEvent = googleEvents.find(e => e.id === storedEvent.event_id);
        if (!googleEvent) {
          console.log(`[CalendarService] DELETED EVENT: ${storedEvent.summary}`);
          changes.push({
            type: 'deleted',
            event: storedEvent
          });
        }
      }

      console.log(`[CalendarService] Total changes detected: ${changes.length}`);
      return changes;
    } catch (error) {
      console.error('Failed to check for changes:', error);
      return [];
    }
  }

  /*
  // Helper method to format time
  private formatTime(dateTimeString: string | null | undefined): string {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }

  // Helper method to categorize events
  private categorizeEvent(event: any): string {
    const summary = event.summary?.toLowerCase() || '';
    const description = event.description?.toLowerCase() || '';
    
    if (summary.includes('meeting') || summary.includes('call') || summary.includes('work')) {
      return '💼';
    } else if (summary.includes('lunch') || summary.includes('dinner') || summary.includes('coffee')) {
      return '🍽️';
    } else if (summary.includes('gym') || summary.includes('workout') || summary.includes('exercise')) {
      return '💪';
    } else if (summary.includes('doctor') || summary.includes('appointment') || summary.includes('medical')) {
      return '🏥';
    } else {
      return '📅';
    }
  }
  */
}

export default new CalendarService(); 