export enum EventType {
  WORK = 'work',
  PERSONAL = 'personal',
  FREE = 'free',
  UNKNOWN = 'unknown'
}

export enum EventStatus {
  CONFIRMED = 'confirmed',
  TENTATIVE = 'tentative',
  CANCELLED = 'cancelled'
}

export enum AutomationStatus {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  PAUSED = 'paused'
}

export enum MessageType {
  DAILY_SUMMARY = 'daily_summary',
  EVENT_CHANGE = 'event_change',
  EVENT_CANCELLED = 'event_cancelled',
  EVENT_ADDED = 'event_added',
  TEST_MESSAGE = 'test_message'
}

export enum TimeZone {
  AMERICA_NEW_YORK = 'America/New_York',
  AMERICA_LOS_ANGELES = 'America/Los_Angeles',
  AMERICA_CHICAGO = 'America/Chicago',
  AMERICA_DENVER = 'America/Denver',
  EUROPE_LONDON = 'Europe/London',
  EUROPE_PARIS = 'Europe/Paris',
  ASIA_TOKYO = 'Asia/Tokyo',
  ASIA_SHANGHAI = 'Asia/Shanghai',
  UTC = 'UTC'
}

export enum Environment {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test'
}

export enum DatabaseTable {
  USERS = 'users',
  CALENDAR_EVENTS = 'calendar_events',
  SESSIONS = 'sessions'
}

export enum OAuthProvider {
  GOOGLE = 'google'
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
} 