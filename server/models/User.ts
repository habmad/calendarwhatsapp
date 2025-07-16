import pool from '../database/config';
import { User, CreateUserData, UpdateUserSettings } from '../types/interfaces';
import { UserFactory } from './factories/UserFactory';

export class UserModel {
  static async findByGoogleId(googleId: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE google_id = $1';
    const result = await pool.query(query, [googleId]);
    return result.rows[0] ? UserFactory.createFromDatabaseRow(result.rows[0]) : null;
  }

  static async findById(id: number): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] ? UserFactory.createFromDatabaseRow(result.rows[0]) : null;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0] ? UserFactory.createFromDatabaseRow(result.rows[0]) : null;
  }

  static async create(userData: CreateUserData): Promise<User> {
    const userFields = UserFactory.createFromGoogleData(userData);
    
    const query = `
      INSERT INTO users (
        google_id, email, name, picture, access_token, refresh_token, 
        token_expiry, whatsapp_recipient, automation_enabled, 
        daily_summary_time, timezone
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const values = [
      userFields.google_id,
      userFields.email,
      userFields.name,
      userFields.picture,
      userFields.access_token,
      userFields.refresh_token,
      userFields.token_expiry,
      JSON.stringify(userFields.whatsapp_recipients),
      userFields.automation_enabled,
      userFields.daily_summary_time,
      userFields.timezone
    ];

    const result = await pool.query(query, values);
    return UserFactory.createFromDatabaseRow(result.rows[0]);
  }

  static async updateTokens(id: number, accessToken: string, refreshToken: string, expiry: Date): Promise<User> {
    const query = `
      UPDATE users 
      SET access_token = $1, refresh_token = $2, token_expiry = $3, last_login = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;
    
    const result = await pool.query(query, [accessToken, refreshToken, expiry, id]);
    return UserFactory.createFromDatabaseRow(result.rows[0]);
  }

  static async updateSettings(id: number, settings: UpdateUserSettings): Promise<User> {
    const { query, values } = UserFactory.createUpdateQuery(settings);
    const finalValues = [...values, id];
    
    const result = await pool.query(query, finalValues);
    return UserFactory.createFromDatabaseRow(result.rows[0]);
  }

  static async findAutomationEnabled(): Promise<User[]> {
    const query = 'SELECT * FROM users WHERE automation_enabled = true';
    const result = await pool.query(query);
    return result.rows.map(row => UserFactory.createFromDatabaseRow(row));
  }

  static async deleteById(id: number): Promise<boolean> {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  static async count(): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM users';
    const result = await pool.query(query);
    return parseInt(result.rows[0].count);
  }

  static async findActiveUsers(): Promise<User[]> {
    const query = 'SELECT * FROM users WHERE last_login > NOW() - INTERVAL \'30 days\'';
    const result = await pool.query(query);
    return result.rows.map(row => UserFactory.createFromDatabaseRow(row));
  }

  // Instance methods for backward compatibility
  static isTokenExpired(user: User): boolean {
    return UserFactory.isTokenExpired(user);
  }

  static shouldRefreshToken(user: User): boolean {
    return UserFactory.shouldRefreshToken(user);
  }

  static getTimeUntilExpiry(user: User): number {
    return UserFactory.getTimeUntilExpiry(user);
  }
} 