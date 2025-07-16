const pool = require('../database/config');

class User {
  static async findByGoogleId(googleId) {
    const query = 'SELECT * FROM users WHERE google_id = $1';
    const result = await pool.query(query, [googleId]);
    return result.rows[0] || null;
  }

  static async findById(id) {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }

  static async create(userData) {
    const query = `
      INSERT INTO users (
        google_id, email, name, picture, access_token, refresh_token, 
        token_expiry, whatsapp_recipient, automation_enabled, 
        daily_summary_time, timezone
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const values = [
      userData.googleId,
      userData.email,
      userData.name,
      userData.picture,
      userData.accessToken,
      userData.refreshToken,
      userData.tokenExpiry,
      userData.whatsappRecipient || process.env.DEFAULT_WHATSAPP_RECIPIENT,
      userData.automationEnabled !== false,
      userData.dailySummaryTime || '08:00',
      userData.timezone || 'America/New_York'
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async updateTokens(id, accessToken, refreshToken, expiry) {
    const query = `
      UPDATE users 
      SET access_token = $1, refresh_token = $2, token_expiry = $3, last_login = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;
    
    const result = await pool.query(query, [accessToken, refreshToken, expiry, id]);
    return result.rows[0];
  }

  static async updateSettings(id, settings) {
    const query = `
      UPDATE users 
      SET 
        whatsapp_recipient = COALESCE($1, whatsapp_recipient),
        automation_enabled = COALESCE($2, automation_enabled),
        daily_summary_time = COALESCE($3, daily_summary_time),
        timezone = COALESCE($4, timezone)
      WHERE id = $5
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      settings.whatsappRecipient,
      settings.automationEnabled,
      settings.dailySummaryTime,
      settings.timezone,
      id
    ]);
    
    return result.rows[0];
  }

  static async findAutomationEnabled() {
    const query = 'SELECT * FROM users WHERE automation_enabled = true';
    const result = await pool.query(query);
    return result.rows;
  }

  // Instance methods (for compatibility)
  isTokenExpired() {
    return new Date() > new Date(this.token_expiry);
  }

  async updateTokens(accessToken, refreshToken, expiry) {
    const updated = await User.updateTokens(this.id, accessToken, refreshToken, expiry);
    Object.assign(this, updated);
    return this;
  }
}

module.exports = User; 