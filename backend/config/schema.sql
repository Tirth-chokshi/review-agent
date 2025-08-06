-- Complete Database Schema for Review Agent Platform
-- Based on provided ERD and user flow diagrams

-- Users table (OAuth + session management)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    google_user_id VARCHAR(255) UNIQUE NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_google_user_id (google_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Business Accounts table
CREATE TABLE IF NOT EXISTS business_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    google_account_id VARCHAR(255) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_google_account_id (google_account_id),
    UNIQUE KEY unique_user_account (user_id, google_account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Business Locations table
CREATE TABLE IF NOT EXISTS business_locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    business_account_id INT NOT NULL,
    google_location_id VARCHAR(255) NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    website VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    last_synced_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (business_account_id) REFERENCES business_accounts(id) ON DELETE CASCADE,
    INDEX idx_business_account_id (business_account_id),
    INDEX idx_google_location_id (google_location_id),
    UNIQUE KEY unique_account_location (business_account_id, google_location_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reviews table (cached from Google My Business)
CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    business_account_id INT NOT NULL,
    location_id INT NOT NULL,
    google_review_id VARCHAR(500) NOT NULL,
    reviewer_name VARCHAR(255),
    reviewer_url VARCHAR(500),
    review_text TEXT,
    rating INT NOT NULL,
    review_date TIMESTAMP NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    content_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (business_account_id) REFERENCES business_accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES business_locations(id) ON DELETE CASCADE,
    INDEX idx_business_location (business_account_id, location_id),
    INDEX idx_review_date (review_date),
    INDEX idx_rating (rating),
    INDEX idx_content_hash (content_hash),
    UNIQUE KEY unique_review (business_account_id, location_id, google_review_id(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sync Logs table (track data synchronization)
CREATE TABLE IF NOT EXISTS sync_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    location_id INT NOT NULL,
    sync_type ENUM('full', 'incremental') NOT NULL,
    sync_status ENUM('pending', 'running', 'completed', 'failed') NOT NULL,
    reviews_fetched INT DEFAULT 0,
    error_message TEXT,
    sync_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_completed_at TIMESTAMP NULL,
    FOREIGN KEY (location_id) REFERENCES business_locations(id) ON DELETE CASCADE,
    INDEX idx_location_id (location_id),
    INDEX idx_sync_status (sync_status),
    INDEX idx_sync_started (sync_started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Review Analysis table (AI analysis results with caching)
CREATE TABLE IF NOT EXISTS review_analysis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    review_id INT NOT NULL,
    sentiment VARCHAR(50),
    sentiment_score DECIMAL(3,2),
    summary TEXT,
    tags JSON,
    suggested_reply TEXT,
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    analysis_version VARCHAR(20) DEFAULT '1.0',
    FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
    INDEX idx_review_id (review_id),
    INDEX idx_sentiment (sentiment),
    INDEX idx_analyzed_at (analyzed_at),
    UNIQUE KEY unique_analysis (review_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Review Replies table (replies to reviews)
CREATE TABLE IF NOT EXISTS review_replies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    review_id INT NOT NULL,
    google_reply_id VARCHAR(255),
    reply_text TEXT NOT NULL,
    sentiment VARCHAR(50),
    reply_type ENUM('manual', 'ai_generated') NOT NULL,
    is_posted BOOLEAN DEFAULT FALSE,
    posted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
    INDEX idx_review_id (review_id),
    INDEX idx_posted_at (posted_at),
    INDEX idx_reply_type (reply_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Analytics Summary table (aggregated analytics data)
CREATE TABLE IF NOT EXISTS analytics_summary (
    id INT AUTO_INCREMENT PRIMARY KEY,
    location_id INT NOT NULL,
    summary_date DATE NOT NULL,
    total_reviews INT DEFAULT 0,
    avg_rating DECIMAL(3,2) DEFAULT 0,
    positive_reviews INT DEFAULT 0,
    negative_reviews INT DEFAULT 0,
    neutral_reviews INT DEFAULT 0,
    reply_rate DECIMAL(5,2) DEFAULT 0,
    common_tags JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES business_locations(id) ON DELETE CASCADE,
    INDEX idx_location_date (location_id, summary_date),
    INDEX idx_summary_date (summary_date),
    UNIQUE KEY unique_location_date (location_id, summary_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Sessions table (enhanced session management)
CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id INT NOT NULL,
    session_data JSON,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Preferences table (user settings and preferences)
CREATE TABLE IF NOT EXISTS user_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    selected_account_id INT,
    selected_location_id INT,
    auto_reply_enabled BOOLEAN DEFAULT FALSE,
    notification_settings JSON,
    dashboard_layout JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (selected_account_id) REFERENCES business_accounts(id) ON DELETE SET NULL,
    FOREIGN KEY (selected_location_id) REFERENCES business_locations(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    UNIQUE KEY unique_user_preferences (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Profiles table (for selected business profile management)
CREATE TABLE IF NOT EXISTS user_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    selected_account_id VARCHAR(255),
    selected_location_id VARCHAR(255),
    all_business_profiles JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_user_email (user_email),
    UNIQUE KEY unique_user_profile (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
