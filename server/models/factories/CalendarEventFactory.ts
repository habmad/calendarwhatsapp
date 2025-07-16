import { CalendarEvent, CreateEventData, GoogleCalendarEvent } from '../../types/interfaces';
import { EventType, EventStatus } from '../../types/enums';

export class CalendarEventFactory {
  static createFromGoogleEvent(userId: number, googleEvent: GoogleCalendarEvent): CreateEventData {
    const startTime = googleEvent.start.dateTime 
      ? new Date(googleEvent.start.dateTime)
      : new Date(googleEvent.start.date!);
    
    const endTime = googleEvent.end.dateTime 
      ? new Date(googleEvent.end.dateTime)
      : new Date(googleEvent.end.date!);

    const allDay = !googleEvent.start.dateTime && !googleEvent.end.dateTime;
    
    const eventType = this.categorizeEvent(googleEvent.summary, googleEvent.description);
    const status = this.mapGoogleStatus(googleEvent.status);

    const attendees = googleEvent.attendees?.map(attendee => attendee.email) || [];

    return {
      userId,
      eventId: googleEvent.id,
      summary: googleEvent.summary,
      description: googleEvent.description || null,
      location: googleEvent.location || null,
      startTime,
      endTime,
      allDay,
      eventType,
      status,
      attendees
    };
  }

  static createFromDatabaseRow(row: any): CalendarEvent {
    return {
      id: row.id,
      user_id: row.user_id,
      event_id: row.event_id,
      summary: row.summary,
      description: row.description,
      location: row.location,
      start_time: new Date(row.start_time),
      end_time: new Date(row.end_time),
      all_day: row.all_day,
      event_type: row.event_type as EventType,
      status: row.status as EventStatus,
      attendees: row.attendees ? (typeof row.attendees === 'string' ? JSON.parse(row.attendees) : row.attendees) : [],
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      last_modified: row.last_modified ? new Date(row.last_modified) : null
    };
  }

  static categorizeEvent(summary: string, description?: string): EventType {
    const text = `${summary} ${description || ''}`.toLowerCase();
    
    // Work-related keywords
    const workKeywords = [
      'meeting', 'call', 'interview', 'presentation', 'conference', 'workshop',
      'training', 'review', 'planning', 'standup', 'sprint', 'demo', 'client',
      'business', 'work', 'office', 'team', 'project', 'deadline', 'deliverable'
    ];

    // Personal keywords
    const personalKeywords = [
      'birthday', 'anniversary', 'dinner', 'lunch', 'coffee', 'date', 'party',
      'celebration', 'family', 'friend', 'personal', 'vacation', 'holiday',
      'doctor', 'dentist', 'appointment', 'gym', 'workout', 'exercise'
    ];

    // Check for work keywords
    if (workKeywords.some(keyword => text.includes(keyword))) {
      return EventType.WORK;
    }

    // Check for personal keywords
    if (personalKeywords.some(keyword => text.includes(keyword))) {
      return EventType.PERSONAL;
    }

    // Default to unknown if no clear categorization
    return EventType.UNKNOWN;
  }

  static mapGoogleStatus(googleStatus?: string): EventStatus {
    switch (googleStatus?.toLowerCase()) {
      case 'confirmed':
        return EventStatus.CONFIRMED;
      case 'tentative':
        return EventStatus.TENTATIVE;
      case 'cancelled':
        return EventStatus.CANCELLED;
      default:
        return EventStatus.CONFIRMED;
    }
  }

  static isToday(event: CalendarEvent): boolean {
    const today = new Date();
    const eventDate = new Date(event.start_time);
    return eventDate.toDateString() === today.toDateString();
  }

  static isUpcoming(event: CalendarEvent, hours: number = 24): boolean {
    const now = new Date();
    const eventTime = new Date(event.start_time);
    const timeDiff = eventTime.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    return hoursDiff >= 0 && hoursDiff <= hours;
  }

  static getFormattedTime(event: CalendarEvent): string {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    
    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    };

    if (event.all_day) {
      return 'All Day';
    }

    return `${formatTime(start)} - ${formatTime(end)}`;
  }

  static getDuration(event: CalendarEvent): number {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    return end.getTime() - start.getTime();
  }

  static getDurationInMinutes(event: CalendarEvent): number {
    return Math.round(this.getDuration(event) / (1000 * 60));
  }

  static getDurationInHours(event: CalendarEvent): number {
    return Math.round(this.getDuration(event) / (1000 * 60 * 60) * 10) / 10;
  }

  static isOverlapping(event1: CalendarEvent, event2: CalendarEvent): boolean {
    const start1 = new Date(event1.start_time);
    const end1 = new Date(event1.end_time);
    const start2 = new Date(event2.start_time);
    const end2 = new Date(event2.end_time);

    return start1 < end2 && start2 < end1;
  }

  static sortByStartTime(events: CalendarEvent[]): CalendarEvent[] {
    return events.sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
  }

  static filterByDateRange(events: CalendarEvent[], startDate: Date, endDate: Date): CalendarEvent[] {
    return events.filter(event => {
      const eventStart = new Date(event.start_time);
      return eventStart >= startDate && eventStart < endDate;
    });
  }

  static filterByType(events: CalendarEvent[], eventType: EventType): CalendarEvent[] {
    return events.filter(event => event.event_type === eventType);
  }

  static filterByStatus(events: CalendarEvent[], status: EventStatus): CalendarEvent[] {
    return events.filter(event => event.status === status);
  }
} 