import mysql from "mysql2/promise";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { EventEmitter } from "events";
import session from "express-session";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MySQL connection pool (adjust credentials as needed)
export const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "admin",
  database: process.env.DB_NAME || "reviewagent",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true,
});

// Create all tables from schema.sql
async function createAllTables() {
  try {
    const schemaPath = path.join(__dirname, "schema.sql");
    const schema = await fs.readFile(schemaPath, "utf8");

    // Split schema into individual statements and execute them
    const statements = schema
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    for (const statement of statements) {
      await db.execute(statement);
    }

    console.log("✅ All database tables created/verified from schema.sql");
  } catch (error) {
    console.error("❌ Error creating tables from schema:", error);
    throw error;
  }
}

// Initialize database tables
async function initializeDatabase() {
  try {
    await createAllTables();
    console.log("✅ Database initialization completed");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  }
}

// Initialize database on module load
initializeDatabase().catch(console.error);

// Database operations for Users
export class UserDB {
  static async createUser(userData) {
    const {
      email,
      name,
      googleUserId,
      accessToken,
      refreshToken,
      tokenExpiresAt,
    } = userData;

    const [result] = await db.execute(
      `INSERT INTO users (email, name, google_user_id, access_token, refresh_token, token_expires_at) 
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       name = VALUES(name), access_token = VALUES(access_token), 
       refresh_token = VALUES(refresh_token), token_expires_at = VALUES(token_expires_at)`,
      [email, name, googleUserId, accessToken, refreshToken, tokenExpiresAt]
    );

    return result.insertId || (await this.findByGoogleId(googleUserId)).id;
  }

  static async findByGoogleId(googleUserId) {
    const [rows] = await db.execute(
      "SELECT * FROM users WHERE google_user_id = ?",
      [googleUserId]
    );
    return rows[0] || null;
  }

  static async findByEmail(email) {
    const [rows] = await db.execute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    return rows[0] || null;
  }

  static async updateTokens(userId, accessToken, refreshToken, tokenExpiresAt) {
    await db.execute(
      "UPDATE users SET access_token = ?, refresh_token = ?, token_expires_at = ? WHERE id = ?",
      [accessToken, refreshToken, tokenExpiresAt, userId]
    );
  }
}

// Database operations for Business Accounts
export class BusinessAccountDB {
  static async createOrUpdate(userId, accountData) {
    const { googleAccountId, accountName, accountType } = accountData;

    const [result] = await db.execute(
      `INSERT INTO business_accounts (user_id, google_account_id, account_name, account_type) 
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       account_name = VALUES(account_name), account_type = VALUES(account_type)`,
      [userId, googleAccountId, accountName, accountType]
    );

    return (
      result.insertId ||
      (await this.findByGoogleAccountId(userId, googleAccountId)).id
    );
  }

  static async findByGoogleAccountId(userId, googleAccountId) {
    const [rows] = await db.execute(
      "SELECT * FROM business_accounts WHERE user_id = ? AND google_account_id = ?",
      [userId, googleAccountId]
    );
    return rows[0] || null;
  }

  static async findByUserId(userId) {
    const [rows] = await db.execute(
      "SELECT * FROM business_accounts WHERE user_id = ? AND is_active = 1",
      [userId]
    );
    return rows;
  }
}

// Database operations for Business Locations
export class BusinessLocationDB {
  static async createOrUpdate(businessAccountId, locationData) {
    const { googleLocationId, locationName, address, phone, website } =
      locationData;

    const [result] = await db.execute(
      `INSERT INTO business_locations (business_account_id, google_location_id, location_name, address, phone, website) 
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       location_name = VALUES(location_name), address = VALUES(address), 
       phone = VALUES(phone), website = VALUES(website)`,
      [
        businessAccountId,
        googleLocationId,
        locationName,
        address,
        phone,
        website,
      ]
    );

    return (
      result.insertId ||
      (await this.findByGoogleLocationId(businessAccountId, googleLocationId))
        .id
    );
  }

  static async findByGoogleLocationId(businessAccountId, googleLocationId) {
    const [rows] = await db.execute(
      "SELECT * FROM business_locations WHERE business_account_id = ? AND google_location_id = ?",
      [businessAccountId, googleLocationId]
    );
    return rows[0] || null;
  }

  static async findByAccountId(businessAccountId) {
    const [rows] = await db.execute(
      "SELECT * FROM business_locations WHERE business_account_id = ? AND is_active = 1",
      [businessAccountId]
    );
    return rows;
  }

  static async updateLastSynced(locationId) {
    await db.execute(
      "UPDATE business_locations SET last_synced_at = NOW() WHERE id = ?",
      [locationId]
    );
  }

  static async findById(locationId) {
    const [rows] = await db.execute(
      "SELECT * FROM business_locations WHERE id = ?",
      [locationId]
    );
    return rows[0] || null;
  }
}

// Database operations for Reviews
export class ReviewDB {
  static async createOrUpdate(reviewData) {
    const {
      businessAccountId,
      locationId,
      googleReviewId,
      reviewerName,
      reviewerUrl,
      reviewText,
      rating,
      reviewDate,
      contentHash,
    } = reviewData;

    const [result] = await db.execute(
      `INSERT INTO reviews (business_account_id, location_id, google_review_id, reviewer_name, 
       reviewer_url, review_text, rating, review_date, content_hash) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       reviewer_name = ?, reviewer_url = ?,
       review_text = ?, rating = ?, 
       review_date = ?, content_hash = ?`,
      [
        businessAccountId,
        locationId,
        googleReviewId,
        reviewerName,
        reviewerUrl,
        reviewText,
        rating,
        reviewDate,
        contentHash,
        // Duplicate values for UPDATE clause
        reviewerName,
        reviewerUrl,
        reviewText,
        rating,
        reviewDate,
        contentHash,
      ]
    );

    return (
      result.insertId ||
      (
        await this.findByGoogleReviewId(
          businessAccountId,
          locationId,
          googleReviewId
        )
      ).id
    );
  }

  static async findByGoogleReviewId(
    businessAccountId,
    locationId,
    googleReviewId
  ) {
    const [rows] = await db.execute(
      "SELECT * FROM reviews WHERE business_account_id = ? AND location_id = ? AND google_review_id = ?",
      [businessAccountId, locationId, googleReviewId]
    );
    return rows[0] || null;
  }

  static async findByLocation(
    businessAccountId,
    locationId,
    limit = 50,
    offset = 0
  ) {
    // Ensure all parameters are integers
    const accountId = parseInt(businessAccountId);
    const locId = parseInt(locationId);
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);

    // Validate that all parameters are valid numbers
    if (
      isNaN(accountId) ||
      isNaN(locId) ||
      isNaN(limitNum) ||
      isNaN(offsetNum)
    ) {
      throw new Error("Invalid parameters - all must be valid integers");
    }

    console.log("🔍 ReviewDB.findByLocation - Parameters:", {
      accountId,
      locId,
      limitNum,
      offsetNum,
    });

    // Use string concatenation for LIMIT/OFFSET since some MySQL versions don't support parameterized LIMIT
    const [rows] = await db.execute(
      `SELECT r.*, ra.sentiment, ra.summary, ra.tags 
       FROM reviews r 
       LEFT JOIN review_analysis ra ON r.id = ra.review_id 
       WHERE r.business_account_id = ? AND r.location_id = ? AND r.is_deleted = 0 
       ORDER BY r.review_date DESC 
       LIMIT ${offsetNum}, ${limitNum}`,
      [accountId, locId]
    );
    return rows.map((row) => ({
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : [],
    }));
  }

  static async getReviewsCount(businessAccountId, locationId) {
    const [[result]] = await db.execute(
      "SELECT COUNT(*) as count FROM reviews WHERE business_account_id = ? AND location_id = ? AND is_deleted = 0",
      [businessAccountId, locationId]
    );
    return result.count;
  }
}

// Database operations for Review Analysis
export class ReviewAnalysisDB {
  static async createOrUpdate(reviewId, analysisData) {
    const {
      sentiment,
      sentimentScore,
      summary,
      tags,
      suggestedReply,
      analysisVersion,
    } = analysisData;

    await db.execute(
      `INSERT INTO review_analysis (review_id, sentiment, sentiment_score, summary, tags, suggested_reply, analysis_version) 
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       sentiment = VALUES(sentiment), sentiment_score = VALUES(sentiment_score),
       summary = VALUES(summary), tags = VALUES(tags), suggested_reply = VALUES(suggested_reply),
       analysis_version = VALUES(analysis_version), analyzed_at = CURRENT_TIMESTAMP`,
      [
        reviewId,
        sentiment,
        sentimentScore,
        summary,
        JSON.stringify(tags),
        suggestedReply,
        analysisVersion,
      ]
    );
  }

  static async findByReviewId(reviewId) {
    const [rows] = await db.execute(
      "SELECT * FROM review_analysis WHERE review_id = ?",
      [reviewId]
    );
    if (rows[0]) {
      return {
        ...rows[0],
        tags: JSON.parse(rows[0].tags || "[]"),
      };
    }
    return null;
  }

  static async getAnalysisStats(businessAccountId, locationId) {
    const [[stats]] = await db.execute(
      `SELECT 
        COUNT(ra.id) as total_analyzed,
        AVG(r.rating) as avg_rating,
        SUM(CASE WHEN ra.sentiment = 'positive' THEN 1 ELSE 0 END) as positive_count,
        SUM(CASE WHEN ra.sentiment = 'negative' THEN 1 ELSE 0 END) as negative_count,
        SUM(CASE WHEN ra.sentiment = 'neutral' THEN 1 ELSE 0 END) as neutral_count
       FROM reviews r
       LEFT JOIN review_analysis ra ON r.id = ra.review_id
       WHERE r.business_account_id = ? AND r.location_id = ? AND r.is_deleted = 0`,
      [businessAccountId, locationId]
    );
    return stats;
  }
}

// Database operations for User Preferences
export class UserPreferencesDB {
  static async createOrUpdate(userId, preferences) {
    const {
      selectedAccountId,
      selectedLocationId,
      autoReplyEnabled,
      notificationSettings,
      dashboardLayout,
    } = preferences;

    await db.execute(
      `INSERT INTO user_preferences (user_id, selected_account_id, selected_location_id, auto_reply_enabled, notification_settings, dashboard_layout) 
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       selected_account_id = VALUES(selected_account_id), selected_location_id = VALUES(selected_location_id),
       auto_reply_enabled = VALUES(auto_reply_enabled), notification_settings = VALUES(notification_settings),
       dashboard_layout = VALUES(dashboard_layout)`,
      [
        userId,
        selectedAccountId,
        selectedLocationId,
        autoReplyEnabled,
        JSON.stringify(notificationSettings),
        JSON.stringify(dashboardLayout),
      ]
    );
  }

  static async findByUserId(userId) {
    const [rows] = await db.execute(
      "SELECT * FROM user_preferences WHERE user_id = ?",
      [userId]
    );
    if (rows[0]) {
      return {
        ...rows[0],
        notificationSettings: JSON.parse(rows[0].notification_settings || "{}"),
        dashboardLayout: JSON.parse(rows[0].dashboard_layout || "{}"),
      };
    }
    return null;
  }
}

// Session Store for express-session
export class MySQLSessionStore extends EventEmitter {
  constructor() {
    super();
    this.db = db;
  }

  async get(sessionId, callback) {
    try {
      const [rows] = await this.db.execute(
        "SELECT session_data FROM user_sessions WHERE id = ? AND expires_at > NOW()",
        [sessionId]
      );

      if (rows[0] && rows[0].session_data) {
        let sessionData;

        // Handle different types of stored data
        if (typeof rows[0].session_data === "string") {
          try {
            sessionData = JSON.parse(rows[0].session_data);
          } catch (parseError) {
            console.error(
              "Session parse error for session:",
              sessionId,
              "Data:",
              rows[0].session_data
            );
            callback();
            return;
          }
        } else if (typeof rows[0].session_data === "object") {
          sessionData = rows[0].session_data;
        } else {
          callback();
          return;
        }

        callback(null, sessionData);
      } else {
        // No session found - call callback with no arguments (undefined)
        callback();
      }
    } catch (error) {
      console.error("Session get error:", error);
      callback(error);
    }
  }

  async set(sessionId, sessionData, callback) {
    try {
      const expiresAt = new Date(
        Date.now() + (sessionData.cookie?.maxAge || 24 * 60 * 60 * 1000)
      );

      // Ensure sessionData is properly stringified
      const sessionDataString =
        typeof sessionData === "string"
          ? sessionData
          : JSON.stringify(sessionData);

      await this.db.execute(
        `INSERT INTO user_sessions (id, user_id, session_data, expires_at) 
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         session_data = VALUES(session_data), expires_at = VALUES(expires_at)`,
        [sessionId, sessionData.user?.id || null, sessionDataString, expiresAt]
      );
      callback();
    } catch (error) {
      console.error("Session set error:", error);
      callback(error);
    }
  }

  async destroy(sessionId, callback) {
    try {
      await this.db.execute("DELETE FROM user_sessions WHERE id = ?", [
        sessionId,
      ]);
      callback();
    } catch (error) {
      console.error("Session destroy error:", error);
      callback(error);
    }
  }

  async touch(sessionId, session, callback) {
    try {
      const expiresAt = new Date(
        Date.now() + (session.cookie?.maxAge || 24 * 60 * 60 * 1000)
      );

      await this.db.execute(
        "UPDATE user_sessions SET expires_at = ? WHERE id = ?",
        [expiresAt, sessionId]
      );
      callback();
    } catch (error) {
      console.error("Session touch error:", error);
      callback(error);
    }
  }

  async all(callback) {
    try {
      const [rows] = await this.db.execute(
        "SELECT id, session_data FROM user_sessions WHERE expires_at > NOW()"
      );

      const sessions = {};
      rows.forEach((row) => {
        try {
          sessions[row.id] = JSON.parse(row.session_data);
        } catch (error) {
          console.error("Session parse error for session:", row.id);
        }
      });

      callback(null, sessions);
    } catch (error) {
      console.error("Session all error:", error);
      callback(error);
    }
  }

  async length(callback) {
    try {
      const [[result]] = await this.db.execute(
        "SELECT COUNT(*) as count FROM user_sessions WHERE expires_at > NOW()"
      );
      callback(null, result.count);
    } catch (error) {
      console.error("Session length error:", error);
      callback(error);
    }
  }

  async clear(callback) {
    try {
      await this.db.execute("DELETE FROM user_sessions");
      callback();
    } catch (error) {
      console.error("Session clear error:", error);
      callback(error);
    }
  }

  createSession(req, sess) {
    // This method is required by express-session
    // According to express-session source, this should create a new Session object

    // Use the Session constructor from express-session
    const { Session } = session;

    // Create a new session if sess is undefined/null
    if (!sess) {
      sess = {};
    }

    // Return a new Session instance
    return new Session(req, sess);
  }

  async cleanup() {
    try {
      await this.db.execute(
        "DELETE FROM user_sessions WHERE expires_at < NOW()"
      );
    } catch (error) {
      console.error("Session cleanup error:", error);
    }
  }
}
