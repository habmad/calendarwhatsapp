const pool = require('../database/config');

class CalendarEvent {
  static async findByUserIdAndDateRange(userId, startDate, endDate) {
    console.log(`[CalendarEvent] Querying events for user ${userId} from ${startDate} to ${endDate}`);
    const query = `
      SELECT * FROM calendar_events 
      WHERE user_id = $1 
      AND start_time >= $2 
      AND start_time < $3 
      AND status != 'cancelled'
      ORDER BY start_time ASC
    `;
    
    const result = await pool.query(query, [userId, startDate, endDate]);
    console.log(`[CalendarEvent] Query returned ${result.rows.length} rows`);
    return result.rows;
  }

  static async findByUserIdAndEventId(userId, eventId) {
    const query = 'SELECT * FROM calendar_events WHERE user_id = $1 AND event_id = $2';
    const result = await pool.query(query, [userId, eventId]);
    return result.rows[0] || null;
  }

  static async upsert(eventData) {
    console.log(`[CalendarEvent] Upserting event for user ${eventData.userId}, eventId ${eventData.eventId}`);
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
        last_modified = CURRENT_TIMESTAMP
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
      JSON.stringify(eventData.attendees || [])
    ];

    const result = await pool.query(query, values);
    console.log(`[CalendarEvent] Upsert result:`, result.rows[0]);
    return result.rows[0];
  }

  static async markAsCancelled(userId, eventId) {
    const query = `
      UPDATE calendar_events 
      SET status = 'cancelled', last_modified = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND event_id = $2
      RETURNING *
    `;
    
    const result = await pool.query(query, [userId, eventId]);
    return result.rows[0];
  }

  static async findTodayEvents(userId) {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    console.log(`[CalendarEvent] findTodayEvents for user ${userId}: ${startOfDay} to ${endOfDay}`);
    return this.findByUserIdAndDateRange(userId, startOfDay, endOfDay);
  }

  // Instance methods (for compatibility)
  isToday() {
    const today = new Date();
    const eventDate = new Date(this.start_time);
    return eventDate.toDateString() === today.toDateString();
  }

  getFormattedTime() {
    const start = new Date(this.start_time);
    const end = new Date(this.end_time);
    
    const formatTime = (date) => {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    };

    return `${formatTime(start)} - ${formatTime(end)}`;
  }
}

module.exports = CalendarEvent; 