import pool from '../database/config';
import { CalendarEvent, CreateEventData } from '../types/interfaces';
import { CalendarEventFactory } from './factories/CalendarEventFactory';
import { EventStatus } from '../types/enums';

export class CalendarEventModel {
  static async findByUserIdAndDateRange(userId: number, startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    console.log(`[CalendarEvent] Querying events for user ${userId} from ${startDate} to ${endDate}`);
    const query = `
      SELECT * FROM calendar_events 
      WHERE user_id = $1 
      AND start_time >= $2 
      AND start_time < $3 
      AND status != $4
      ORDER BY start_time ASC
    `;
    
    const result = await pool.query(query, [userId, startDate, endDate, EventStatus.CANCELLED]);
    console.log(`[CalendarEvent] Query returned ${result.rows.length} rows`);
    return result.rows.map(row => CalendarEventFactory.createFromDatabaseRow(row));
  }

  static async findByUserIdAndEventId(userId: number, eventId: string): Promise<CalendarEvent | null> {
    const query = 'SELECT * FROM calendar_events WHERE user_id = $1 AND event_id = $2';
    const result = await pool.query(query, [userId, eventId]);
    return result.rows[0] ? CalendarEventFactory.createFromDatabaseRow(result.rows[0]) : null;
  }

  static async upsert(eventData: CreateEventData): Promise<CalendarEvent> {
    console.log(`[CalendarEvent] Upserting event for user ${eventData.userId}, eventId ${eventData.eventId}`);
    
    // First check if the event exists and if it has changed
    const existingEvent = await this.findByUserIdAndEventId(eventData.userId, eventData.eventId);
    let hasChanged = false;
    
    if (existingEvent) {
      // Compare key fields to see if anything has actually changed
      hasChanged = 
        existingEvent.summary !== eventData.summary ||
        existingEvent.description !== eventData.description ||
        existingEvent.location !== eventData.location ||
        existingEvent.start_time.getTime() !== eventData.startTime.getTime() ||
        existingEvent.end_time.getTime() !== eventData.endTime.getTime() ||
        existingEvent.status !== eventData.status ||
        JSON.stringify(existingEvent.attendees) !== JSON.stringify(eventData.attendees || []);
      
      console.log(`[CalendarEvent] Event ${eventData.eventId} changed: ${hasChanged}`);
    } else {
      // New event
      hasChanged = true;
      console.log(`[CalendarEvent] New event ${eventData.eventId}`);
    }
    
    const query = `
      INSERT INTO calendar_events (
        user_id, event_id, summary, description, location, 
        start_time, end_time, all_day, event_type, status, attendees
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (user_id, event_id) 
      DO UPDATE SET
        summary = EXCLUDED.summary,
        description = EXCLUDED.description,
        location = EXCLUDED.location,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        all_day = EXCLUDED.all_day,
        event_type = EXCLUDED.event_type,
        status = EXCLUDED.status,
        attendees = EXCLUDED.attendees,
        last_modified = CASE WHEN $12::boolean THEN CURRENT_TIMESTAMP ELSE calendar_events.last_modified END
      RETURNING *
    `;
    
    const values = [
      eventData.userId,
      eventData.eventId,
      eventData.summary,
      eventData.description,
      eventData.location,
      eventData.startTime,
      eventData.endTime,
      eventData.allDay,
      eventData.eventType,
      eventData.status,
      JSON.stringify(eventData.attendees || []),
      hasChanged
    ];

    const result = await pool.query(query, values);
    console.log(`[CalendarEvent] Upsert result:`, result.rows[0]);
    return CalendarEventFactory.createFromDatabaseRow(result.rows[0]);
  }

  static async markAsCancelled(userId: number, eventId: string): Promise<CalendarEvent> {
    const query = `
      UPDATE calendar_events 
      SET status = $1, last_modified = CURRENT_TIMESTAMP
      WHERE user_id = $2 AND event_id = $3
      RETURNING *
    `;
    
    const result = await pool.query(query, [EventStatus.CANCELLED, userId, eventId]);
    return CalendarEventFactory.createFromDatabaseRow(result.rows[0]);
  }

  static async findTodayEvents(userId: number): Promise<CalendarEvent[]> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    console.log(`[CalendarEvent] findTodayEvents for user ${userId}: ${startOfDay} to ${endOfDay}`);
    return this.findByUserIdAndDateRange(userId, startOfDay, endOfDay);
  }

  static async findUpcomingEvents(userId: number, hours: number = 24): Promise<CalendarEvent[]> {
    const now = new Date();
    const endTime = new Date(now.getTime() + hours * 60 * 60 * 1000);
    return this.findByUserIdAndDateRange(userId, now, endTime);
  }

  static async deleteByUserIdAndEventId(userId: number, eventId: string): Promise<boolean> {
    const query = 'DELETE FROM calendar_events WHERE user_id = $1 AND event_id = $2 RETURNING id';
    const result = await pool.query(query, [userId, eventId]);
    return (result.rowCount ?? 0) > 0;
  }

  static async countByUserId(userId: number): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM calendar_events WHERE user_id = $1';
    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].count);
  }

  static async findRecentEvents(userId: number, days: number = 7): Promise<CalendarEvent[]> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    return this.findByUserIdAndDateRange(userId, startDate, endDate);
  }

  // Static utility methods using the factory
  static isToday(event: CalendarEvent): boolean {
    return CalendarEventFactory.isToday(event);
  }

  static isUpcoming(event: CalendarEvent, hours: number = 24): boolean {
    return CalendarEventFactory.isUpcoming(event, hours);
  }

  static getFormattedTime(event: CalendarEvent): string {
    return CalendarEventFactory.getFormattedTime(event);
  }

  static getDuration(event: CalendarEvent): number {
    return CalendarEventFactory.getDuration(event);
  }

  static getDurationInMinutes(event: CalendarEvent): number {
    return CalendarEventFactory.getDurationInMinutes(event);
  }

  static getDurationInHours(event: CalendarEvent): number {
    return CalendarEventFactory.getDurationInHours(event);
  }

  static isOverlapping(event1: CalendarEvent, event2: CalendarEvent): boolean {
    return CalendarEventFactory.isOverlapping(event1, event2);
  }

  static sortByStartTime(events: CalendarEvent[]): CalendarEvent[] {
    return CalendarEventFactory.sortByStartTime(events);
  }

  static filterByDateRange(events: CalendarEvent[], startDate: Date, endDate: Date): CalendarEvent[] {
    return CalendarEventFactory.filterByDateRange(events, startDate, endDate);
  }
} 