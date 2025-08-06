import { db } from "./database.js";

export class UserProfileDB {
  // Create or update user with selected profile
  static async saveUserProfile(
    userId,
    userEmail,
    selectedAccountId,
    selectedLocationId,
    allBusinessProfiles = []
  ) {
    try {
      const [existingUser] = await db.query(
        "SELECT * FROM user_profiles WHERE user_id = ?",
        [userId]
      );

      if (existingUser.length > 0) {
        // Update existing user
        await db.query(
          `UPDATE user_profiles 
           SET user_email = ?, selected_account_id = ?, selected_location_id = ?, 
               all_business_profiles = ?, updated_at = NOW()
           WHERE user_id = ?`,
          [
            userEmail,
            selectedAccountId,
            selectedLocationId,
            JSON.stringify(allBusinessProfiles),
            userId,
          ]
        );
      } else {
        // Create new user
        await db.query(
          `INSERT INTO user_profiles 
           (user_id, user_email, selected_account_id, selected_location_id, all_business_profiles, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            userId,
            userEmail,
            selectedAccountId,
            selectedLocationId,
            JSON.stringify(allBusinessProfiles),
          ]
        );
      }

      return { success: true };
    } catch (error) {
      console.error("Error saving user profile:", error);
      throw error;
    }
  }

  // Get user's selected profile
  static async getUserProfile(userId) {
    try {
      const [rows] = await db.query(
        "SELECT * FROM user_profiles WHERE user_id = ?",
        [userId]
      );

      if (rows.length > 0) {
        const user = rows[0];
        return {
          userId: user.user_id,
          userEmail: user.user_email,
          selectedAccountId: user.selected_account_id,
          selectedLocationId: user.selected_location_id,
          allBusinessProfiles: JSON.parse(user.all_business_profiles || "[]"),
          hasSelectedProfile: !!(
            user.selected_account_id && user.selected_location_id
          ),
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        };
      }

      return null;
    } catch (error) {
      console.error("Error getting user profile:", error);
      throw error;
    }
  }

  // Check if user exists
  static async userExists(userId) {
    try {
      const [rows] = await db.query(
        "SELECT COUNT(*) as count FROM user_profiles WHERE user_id = ?",
        [userId]
      );
      return rows[0].count > 0;
    } catch (error) {
      console.error("Error checking if user exists:", error);
      throw error;
    }
  }

  // Get all users (for admin purposes)
  static async getAllUsers() {
    try {
      const [rows] = await db.query(
        "SELECT * FROM user_profiles ORDER BY created_at DESC"
      );
      return rows.map((user) => ({
        userId: user.user_id,
        userEmail: user.user_email,
        selectedAccountId: user.selected_account_id,
        selectedLocationId: user.selected_location_id,
        allBusinessProfiles: JSON.parse(user.all_business_profiles || "[]"),
        hasSelectedProfile: !!(
          user.selected_account_id && user.selected_location_id
        ),
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      }));
    } catch (error) {
      console.error("Error getting all users:", error);
      throw error;
    }
  }
}

// Create the table if it doesn't exist
export async function createUserProfileTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255) UNIQUE NOT NULL,
        user_email VARCHAR(255) NOT NULL,
        selected_account_id VARCHAR(255),
        selected_location_id VARCHAR(255),
        all_business_profiles JSON,
        subscription_status ENUM('free', 'premium') DEFAULT 'free',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_email (user_email)
      )
    `);
    console.log("✅ User profiles table created or verified");
  } catch (error) {
    console.error("Error creating user profiles table:", error);
    throw error;
  }
}
