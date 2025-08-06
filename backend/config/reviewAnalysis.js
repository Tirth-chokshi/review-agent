import { db } from "./database.js";

export async function createReviewAnalysisTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS review_analysis (
      id INT AUTO_INCREMENT PRIMARY KEY,
      account_id VARCHAR(255) NOT NULL,
      location_id VARCHAR(255) NOT NULL,
      review_id VARCHAR(500) NOT NULL,
      user_name VARCHAR(255),
      review_date DATETIME,
      last_seen DATETIME,
      original_text TEXT,
      rating INT,
      reply_text TEXT,
      has_reply BOOLEAN DEFAULT FALSE,
      reply_sent_at DATETIME,
      reply_tone VARCHAR(100),
      content_hash VARCHAR(255),
      processed_at DATETIME,
      summary TEXT,
      sentiment VARCHAR(50),
      tags JSON,
      reply_summary TEXT,
      reply_sentiment VARCHAR(50),
      error_message TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_review (account_id, location_id, review_id),
      INDEX idx_business_profile (account_id, location_id),
      INDEX idx_review_date (review_date),
      INDEX idx_sentiment (sentiment),
      INDEX idx_processed (processed_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await db.query(createTableQuery);
    console.log("✅ Review analysis table created/verified");
  } catch (error) {
    console.error("❌ Error creating review_analysis table:", error);
    throw error;
  }
}
