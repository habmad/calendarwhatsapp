import { EventType, EventStatus, TimeZone, MessageType, NotificationPriority } from './enums';

export interface User {
  id: number;
  google_id: string;
  email: string;
  name: string;
  picture?: string | undefined;
  access_token: string;
  refresh_token: string;
  token_expiry: Date;
  whatsapp_recipients: string[]; // Changed from single string to array
  automation_enabled: boolean;
  daily_summary_time: string;
  timezone: TimeZone;
  created_at: Date;
  updated_at: Date;
  last_login?: Date | null;
}

export interface CalendarEvent {
  id: number;
  user_id: number;
  event_id: string;
  summary: string;
  description?: string;
  location?: string;
  start_time: Date;
  end_time: Date;
  all_day: boolean;
  event_type: EventType;
  status: EventStatus;
  attendees?: string[];
  created_at: Date;
  updated_at: Date;
  last_modified?: Date | null;
}

export interface CreateUserData {
  googleId: string;
  email: string;
  name: string;
  picture?: string | null;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: Date;
  whatsappRecipients?: string[];
  automationEnabled?: boolean;
  dailySummaryTime?: string;
  timezone?: TimeZone;
}

export interface UpdateUserSettings {
  whatsappRecipients?: string[];
  automationEnabled?: boolean;
  dailySummaryTime?: string;
  timezone?: TimeZone;
}

export interface CreateEventData {
  userId: number;
  eventId: string;
  summary: string;
  description?: string | null;
  location?: string | null;
  startTime: Date;
  endTime: Date;
  allDay: boolean;
  eventType: EventType;
  status: EventStatus;
  attendees?: string[];
}

export interface WhatsAppMessage {
  type: MessageType;
  recipient: string;
  content: string;
  priority?: NotificationPriority;
  metadata?: Record<string, any>;
}

export interface DailySummary {
  userId: number;
  date: Date;
  events: CalendarEvent[];
  firstMeeting?: CalendarEvent;
  lastMeeting?: CalendarEvent;
  totalEvents: number;
  workEvents: number;
  personalEvents: number;
  freeEvents: number;
}

export interface EventChange {
  userId: number;
  eventId: string;
  changeType: 'added' | 'modified' | 'cancelled';
  oldEvent?: CalendarEvent;
  newEvent?: CalendarEvent;
  timestamp: Date;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  status?: string;
}

export interface OAuthTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  scope: string;
  token_type: string;
}

export interface AutomationConfig {
  userId: number;
  enabled: boolean;
  dailySummaryTime: string;
  timezone: TimeZone;
  whatsappRecipient: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
}

export interface EnvironmentConfig {
  nodeEnv: string;
  port: number;
  jwtSecret: string;
  googleClientId: string;
  googleClientSecret: string;
  googleRedirectUri: string;
  whatsappAccessToken: string;
  whatsappPhoneNumberId: string;
  whatsappVerifyToken: string;
  databaseUrl: string;
  defaultWhatsappRecipient: string;
  frontendUrl?: string;
} 