import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database path
const dbPath = join(__dirname, '..', 'data', 'reviews.db');

console.log('🔄 Starting database migration for business profile separation...');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Connected to SQLite database');
    runMigration();
  }
});

function runMigration() {
  // First, check if the new columns already exist
  db.all("PRAGMA table_info(review_analysis)", (err, columns) => {
    if (err) {
      console.error('❌ Error checking table structure:', err.message);
      process.exit(1);
    }

    const hasAccountId = columns.some(col => col.name === 'account_id');
    const hasLocationId = columns.some(col => col.name === 'location_id');

    if (hasAccountId && hasLocationId) {
      console.log('✅ Database already migrated - account_id and location_id columns exist');
      process.exit(0);
    }

    console.log('🔄 Migrating database schema...');

    // Step 1: Create new table with updated schema
    const createNewTableQuery = `
      CREATE TABLE IF NOT EXISTS review_analysis_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id TEXT NOT NULL DEFAULT 'unknown',
        location_id TEXT NOT NULL DEFAULT 'unknown',
        review_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        review_date DATETIME NOT NULL,
        last_seen DATETIME NOT NULL,
        original_text TEXT NOT NULL,
        rating INTEGER NOT NULL,
        reply_text TEXT DEFAULT '',
        has_reply BOOLEAN DEFAULT 0,
        reply_sent_at DATETIME,
        reply_tone TEXT,
        content_hash TEXT NOT NULL,
        processed_at DATETIME NOT NULL,
        
        -- AI Analysis fields
        summary TEXT DEFAULT '',
        sentiment TEXT DEFAULT 'Neutral',
        tags TEXT DEFAULT '[]',
        reply_summary TEXT DEFAULT '',
        reply_sentiment TEXT DEFAULT 'N/A',
        error_message TEXT,
        
        -- Timestamps
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        -- Composite unique constraint for business profile separation
        UNIQUE(account_id, location_id, review_id)
      )
    `;

    db.run(createNewTableQuery, (err) => {
      if (err) {
        console.error('❌ Error creating new table:', err.message);
        process.exit(1);
      }

      console.log('✅ Created new table structure');

      // Step 2: Copy existing data to new table (if any exists)
      const copyDataQuery = `
        INSERT INTO review_analysis_new (
          account_id, location_id, review_id, user_name, review_date, last_seen, 
          original_text, rating, reply_text, has_reply, reply_sent_at, reply_tone, 
          content_hash, processed_at, summary, sentiment, tags, reply_summary, 
          reply_sentiment, error_message, created_at, updated_at
        )
        SELECT 
          'unknown' as account_id,
          'unknown' as location_id,
          review_id, user_name, review_date, last_seen, original_text, rating, 
          reply_text, has_reply, reply_sent_at, reply_tone, content_hash, 
          processed_at, summary, sentiment, tags, reply_summary, reply_sentiment, 
          error_message, created_at, updated_at
        FROM review_analysis
      `;

      db.run(copyDataQuery, function(err) {
        if (err) {
          console.error('❌ Error copying data:', err.message);
          process.exit(1);
        }

        console.log(`✅ Copied ${this.changes} existing records to new table`);

        // Step 3: Drop old table
        db.run('DROP TABLE review_analysis', (err) => {
          if (err) {
            console.error('❌ Error dropping old table:', err.message);
            process.exit(1);
          }

          console.log('✅ Dropped old table');

          // Step 4: Rename new table
          db.run('ALTER TABLE review_analysis_new RENAME TO review_analysis', (err) => {
            if (err) {
              console.error('❌ Error renaming table:', err.message);
              process.exit(1);
            }

            console.log('✅ Renamed new table to review_analysis');
            console.log('🎉 Database migration completed successfully!');
            
            // Close database connection
            db.close((err) => {
              if (err) {
                console.error('❌ Error closing database:', err.message);
              } else {
                console.log('✅ Database connection closed');
              }
              process.exit(0);
            });
          });
        });
      });
    });
  });
}
