import { User, CreateUserData, UpdateUserSettings } from '../../types/interfaces';
import { TimeZone } from '../../types/enums';
// Removed unused import

export class UserFactory {
  static createFromGoogleData(data: CreateUserData): Partial<User> {
    return {
      google_id: data.googleId,
      email: data.email,
      name: data.name,
      picture: data.picture || undefined,
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
      token_expiry: data.tokenExpiry,
      whatsapp_recipients: data.whatsappRecipients || [process.env['DEFAULT_WHATSAPP_RECIPIENT'] || ''],
      automation_enabled: data.automationEnabled !== false,
      daily_summary_time: data.dailySummaryTime || '08:00',
      timezone: data.timezone || TimeZone.AMERICA_NEW_YORK
    };
  }

  static createFromDatabaseRow(row: any): User {
    return {
      id: row.id,
      google_id: row.google_id,
      email: row.email,
      name: row.name,
      picture: row.picture,
      access_token: row.access_token,
      refresh_token: row.refresh_token,
      token_expiry: new Date(row.token_expiry),
      whatsapp_recipients: row.whatsapp_recipients || [process.env['DEFAULT_WHATSAPP_RECIPIENT'] || ''],
      automation_enabled: row.automation_enabled,
      daily_summary_time: row.daily_summary_time,
      timezone: row.timezone as TimeZone,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      last_login: row.last_login ? new Date(row.last_login) : null
    };
  }

  static createUpdateQuery(settings: UpdateUserSettings): {
    query: string;
    values: (string | boolean | TimeZone)[];
  } {
    const updates: string[] = [];
    const values: (string | boolean | TimeZone)[] = [];
    let paramIndex = 1;

    if (settings.whatsappRecipients !== undefined) {
      updates.push(`whatsapp_recipients = $${paramIndex++}`);
      values.push(JSON.stringify(settings.whatsappRecipients));
    }

    if (settings.automationEnabled !== undefined) {
      updates.push(`automation_enabled = $${paramIndex++}`);
      values.push(settings.automationEnabled);
    }

    if (settings.dailySummaryTime !== undefined) {
      updates.push(`daily_summary_time = $${paramIndex++}`);
      values.push(settings.dailySummaryTime);
    }

    if (settings.timezone !== undefined) {
      updates.push(`timezone = $${paramIndex++}`);
      values.push(settings.timezone);
    }

    const query = `
      UPDATE users 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    return { query, values };
  }

  static isTokenExpired(user: User): boolean {
    return new Date() > user.token_expiry;
  }

  static getTokenExpiryTime(user: User): Date {
    return user.token_expiry;
  }

  static getTimeUntilExpiry(user: User): number {
    return user.token_expiry.getTime() - Date.now();
  }

  static shouldRefreshToken(user: User): boolean {
    // Refresh token if it expires in less than 1 hour
    const oneHour = 60 * 60 * 1000;
    return this.getTimeUntilExpiry(user) < oneHour;
  }
} 