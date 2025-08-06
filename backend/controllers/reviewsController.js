import axios from "axios";
import crypto from "crypto";
import {
  ReviewDB,
  BusinessAccountDB,
  BusinessLocationDB,
  ReviewAnalysisDB,
} from "../config/database.js";
import GoogleApiService from "../services/GoogleApiService.js";

/**
 * Reviews Controller
 * Handles all review-related API endpoints with database caching
 */
class ReviewsController {
  constructor() {
    this.googleApiService = new GoogleApiService();
  }

  /**
   * Get reviews for a specific account and location
   * First checks database cache, then fetches from Google if needed
   */
  getReviews = async (req, res) => {
    try {
      const { accountId, locationId } = req.params;
      const { page = 1, limit = 50, forceRefresh = false } = req.query;
      const { access_token } = req.session.tokens || {};
      const userId = req.session.user?.id;

      if (!access_token || !userId) {
        return res.status(401).json({
          success: false,
          message: "No access token found. Please authenticate first.",
        });
      }

      if (!accountId || !locationId) {
        return res.status(400).json({
          success: false,
          message: "Account ID and Location ID are required",
        });
      }

      console.log(
        `🔄 Fetching reviews for account: ${accountId}, location: ${locationId}`
      );

      // Get business account and location from database
      // Try both the account ID and the full account name format
      let businessAccount = await BusinessAccountDB.findByGoogleAccountId(
        userId,
        accountId
      );

      if (!businessAccount) {
        // Try with the full account name format
        businessAccount = await BusinessAccountDB.findByGoogleAccountId(
          userId,
          `accounts/${accountId}`
        );
      }

      if (!businessAccount) {
        return res.status(404).json({
          success: false,
          message: "Business account not found",
        });
      }

      // Try to find location by ID, handling both formats
      let businessLocation = await BusinessLocationDB.findByGoogleLocationId(
        businessAccount.id,
        locationId
      );

      if (!businessLocation) {
        // Try with the full location name format
        businessLocation = await BusinessLocationDB.findByGoogleLocationId(
          businessAccount.id,
          `accounts/${accountId}/locations/${locationId}`
        );
      }

      if (!businessLocation) {
        return res.status(404).json({
          success: false,
          message: "Business location not found",
        });
      }

      // Check if we need to refresh reviews from Google
      const shouldRefresh =
        forceRefresh === "true" ||
        (await this.shouldRefreshReviews(businessLocation.id));

      if (shouldRefresh) {
        console.log("📥 Fetching fresh reviews from Google API...");
        await this.syncReviewsFromGoogle(
          businessAccount.id,
          businessLocation.id,
          accountId,
          locationId,
          access_token
        );
      }

      // Get reviews from database with pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);

      console.log(
        `🔍 Fetching reviews with params: businessAccountId=${
          businessAccount.id
        }, locationId=${businessLocation.id}, limit=${parseInt(
          limit
        )}, offset=${offset}`
      );

      // Debug parameter types and values
      console.log("🔍 Parameter types and values:", {
        businessAccountId: {
          value: businessAccount.id,
          type: typeof businessAccount.id,
        },
        locationId: {
          value: businessLocation.id,
          type: typeof businessLocation.id,
        },
        limit: { value: parseInt(limit), type: typeof parseInt(limit) },
        offset: { value: parseInt(offset), type: typeof parseInt(offset) },
      });

      let reviews, totalCount, analysisStats;

      try {
        reviews = await ReviewDB.findByLocation(
          parseInt(businessAccount.id),
          parseInt(businessLocation.id),
          parseInt(limit),
          parseInt(offset)
        );
        console.log(
          `✅ Successfully fetched ${reviews.length} reviews from findByLocation`
        );
      } catch (error) {
        console.error("❌ Error in ReviewDB.findByLocation:", error);
        throw error;
      }

      try {
        totalCount = await ReviewDB.getReviewsCount(
          parseInt(businessAccount.id),
          parseInt(businessLocation.id)
        );
        console.log(`✅ Successfully got total count: ${totalCount}`);
      } catch (error) {
        console.error("❌ Error in ReviewDB.getReviewsCount:", error);
        throw error;
      }

      // Get analysis stats
      try {
        analysisStats = await ReviewAnalysisDB.getAnalysisStats(
          parseInt(businessAccount.id),
          parseInt(businessLocation.id)
        );
        console.log(`✅ Successfully got analysis stats:`, analysisStats);
      } catch (error) {
        console.error("❌ Error in ReviewAnalysisDB.getAnalysisStats:", error);
        throw error;
      }

      console.log(
        `✅ Successfully fetched ${reviews.length} reviews from database (${totalCount} total)`
      );

      res.status(200).json({
        success: true,
        data: {
          reviews,
          totalReviewCount: totalCount,
          fetchedCount: reviews.length,
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          hasNextPage: offset + reviews.length < totalCount,
          location: {
            id: businessLocation.id,
            name: businessLocation.location_name,
            address: businessLocation.address,
            phone: businessLocation.phone,
            website: businessLocation.website,
          },
          accountId,
          locationId,
          analysisStats,
        },
        message: `Fetched ${reviews.length} reviews`,
      });
    } catch (error) {
      console.error("Error in getReviews controller:", error.message);

      // Handle specific error types
      if (error.message.includes("Authentication failed")) {
        return res.status(401).json({
          success: false,
          message: "Authentication failed. Please re-authenticate.",
          error:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }

      if (error.message.includes("Access forbidden")) {
        return res.status(403).json({
          success: false,
          message:
            "Access to this business location is forbidden. Please check permissions.",
          error:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to fetch reviews",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  };

  /**
   * Convert text rating to numeric value
   */
  convertRatingToNumber = (rating) => {
    if (typeof rating === "number") {
      return rating;
    }

    if (typeof rating === "string") {
      const ratingMap = {
        ONE: 1,
        TWO: 2,
        THREE: 3,
        FOUR: 4,
        FIVE: 5,
      };

      return ratingMap[rating.toUpperCase()] || 0;
    }

    return 0;
  };

  /**
   * Convert ISO 8601 datetime to MySQL-compatible format
   */
  convertDateToMysqlFormat = (dateString) => {
    if (!dateString) {
      return new Date().toISOString().slice(0, 19).replace("T", " ");
    }

    try {
      // Parse the ISO date and convert to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
      const date = new Date(dateString);
      return date.toISOString().slice(0, 19).replace("T", " ");
    } catch (error) {
      console.warn("Failed to parse date:", dateString, error);
      return new Date().toISOString().slice(0, 19).replace("T", " ");
    }
  };

  /**
   * Sync reviews from Google API to database
   */
  syncReviewsFromGoogle = async (
    businessAccountId,
    locationId,
    googleAccountId,
    googleLocationId,
    accessToken
  ) => {
    try {
      const reviewsData = await this.googleApiService.getReviews(
        googleAccountId,
        googleLocationId,
        accessToken
      );

      const reviews = reviewsData.reviews || [];

      for (const review of reviews) {
        const contentHash = this.generateContentHash(review);

        const reviewData = {
          businessAccountId,
          locationId,
          googleReviewId:
            review.reviewId ||
            review.name ||
            `review_${Date.now()}_${Math.random()}`,
          reviewerName: review.reviewer?.displayName || "Anonymous",
          reviewerUrl: review.reviewer?.profilePhotoUrl || "",
          reviewText: review.comment || "",
          rating: this.convertRatingToNumber(review.starRating),
          reviewDate: this.convertDateToMysqlFormat(
            review.updateTime || review.createTime
          ),
          contentHash,
        };

        // Validate required fields
        if (
          !reviewData.businessAccountId ||
          !reviewData.locationId ||
          !reviewData.googleReviewId
        ) {
          console.error("❌ Missing required fields:", reviewData);
          continue; // Skip this review
        }

        console.log("🔍 Debug - Review data before saving:", {
          ...reviewData,
          reviewText: reviewData.reviewText?.substring(0, 50) + "...", // Truncate for logging
        });

        // Log the raw Google review for debugging
        console.log("Raw Google review:", review);

        try {
          await ReviewDB.createOrUpdate(reviewData);
        } catch (dbError) {
          console.error("❌ Database error saving review:", dbError);
          console.error("❌ Failed review data:", reviewData);
          throw dbError; // Re-throw to stop the sync process
        }
      }
      console.log(`✅ Synced ${reviews.length} reviews to database`);
      return reviews.length;
    } catch (error) {
      console.error("Error syncing reviews from Google:", error);
      throw error;
    }
  };

  /**
   * Check if reviews should be refreshed from Google
   */
  shouldRefreshReviews = async (locationId) => {
    try {
      // For now, always refresh on first load
      // In production, implement smart caching logic
      return true;
    } catch (error) {
      console.error("Error checking if reviews should refresh:", error);
      return false;
    }
  };

  /**
   * Force refresh reviews from Google
   */
  refreshReviews = async (req, res) => {
    try {
      const { accountId, locationId } = req.params;
      const { access_token } = req.session.tokens || {};
      const userId = req.session.user?.id;

      if (!access_token || !userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // Try both account ID formats
      let businessAccount = await BusinessAccountDB.findByGoogleAccountId(
        userId,
        accountId
      );

      if (!businessAccount) {
        businessAccount = await BusinessAccountDB.findByGoogleAccountId(
          userId,
          `accounts/${accountId}`
        );
      }

      // Try both location ID formats
      let businessLocation = null;
      if (businessAccount) {
        businessLocation = await BusinessLocationDB.findByGoogleLocationId(
          businessAccount.id,
          locationId
        );

        if (!businessLocation) {
          businessLocation = await BusinessLocationDB.findByGoogleLocationId(
            businessAccount.id,
            `accounts/${accountId}/locations/${locationId}`
          );
        }
      }

      if (!businessAccount || !businessLocation) {
        return res.status(404).json({
          success: false,
          message: "Business account or location not found",
        });
      }

      const syncedCount = await this.syncReviewsFromGoogle(
        businessAccount.id,
        businessLocation.id,
        accountId,
        locationId,
        access_token
      );

      res.json({
        success: true,
        message: `Successfully synced ${syncedCount} reviews`,
        syncedCount,
      });
    } catch (error) {
      console.error("Error refreshing reviews:", error);
      res.status(500).json({
        success: false,
        message: "Failed to refresh reviews",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  };

  /**
   * Get business accounts and locations for the authenticated user
   */
  getBusinessLocations = async (req, res) => {
    try {
      const { access_token } = req.session.tokens || {};
      const userId = req.session.user?.id;

      if (!access_token || !userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const businessAccounts = await BusinessAccountDB.findByUserId(userId);

      // Get locations for each account
      for (const account of businessAccounts) {
        account.locations = await BusinessLocationDB.findByAccountId(
          account.id
        );
      }

      res.json({
        success: true,
        accounts: businessAccounts,
      });
    } catch (error) {
      console.error("Error fetching business locations:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch business locations",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  };

  /**
   * Get location info
   */
  getLocationInfo = async (req, res) => {
    try {
      const { accountId, locationId } = req.params;
      const { access_token } = req.session.tokens || {};
      const userId = req.session.user?.id;

      if (!access_token || !userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // Try both account ID formats
      let businessAccount = await BusinessAccountDB.findByGoogleAccountId(
        userId,
        accountId
      );

      if (!businessAccount) {
        businessAccount = await BusinessAccountDB.findByGoogleAccountId(
          userId,
          `accounts/${accountId}`
        );
      }

      // Try both location ID formats
      let businessLocation = null;
      if (businessAccount) {
        businessLocation = await BusinessLocationDB.findByGoogleLocationId(
          businessAccount.id,
          locationId
        );

        if (!businessLocation) {
          businessLocation = await BusinessLocationDB.findByGoogleLocationId(
            businessAccount.id,
            `accounts/${accountId}/locations/${locationId}`
          );
        }
      }

      if (!businessLocation) {
        return res.status(404).json({
          success: false,
          message: "Location not found",
        });
      }

      // Get fresh location info from Google
      let googleLocationInfo = null;
      try {
        googleLocationInfo = await this.googleApiService.getLocationInfo(
          accountId,
          locationId,
          access_token
        );
      } catch (error) {
        console.warn(
          "Could not fetch location info from Google:",
          error.message
        );
      }

      const locationInfo = {
        ...businessLocation,
        google: googleLocationInfo,
      };

      res.json({
        success: true,
        location: locationInfo,
      });
    } catch (error) {
      console.error("Error fetching location info:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch location info",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  };

  /**
   * Reply to a review
   */
  replyToReview = async (req, res) => {
    try {
      const { accountId, locationId, reviewId } = req.params;
      const { replyText } = req.body;
      const { access_token } = req.session.tokens || {};

      if (!access_token) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      if (!replyText || replyText.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Reply text is required",
        });
      }

      // Use Google API service to post reply
      const result = await this.googleApiService.replyToReview(
        accountId,
        locationId,
        reviewId,
        replyText,
        access_token
      );

      res.json({
        success: true,
        message: "Reply posted successfully",
        data: result,
      });
    } catch (error) {
      console.error("Error replying to review:", error);
      res.status(500).json({
        success: false,
        message: "Failed to post reply",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  };

  /**
   * Test connection to Google My Business API
   */
  testConnection = async (req, res) => {
    try {
      const { access_token } = req.session.tokens || {};

      if (!access_token) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // Test by fetching accounts
      const result = await this.googleApiService.getAccounts(access_token);

      res.json({
        success: true,
        message: "Connection successful",
        accountsCount: result.accounts?.length || 0,
      });
    } catch (error) {
      console.error("Error testing connection:", error);
      res.status(500).json({
        success: false,
        message: "Connection test failed",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  };

  /**
   * Generate content hash for review caching
   */
  generateContentHash = (review) => {
    const content = [
      review.comment || "",
      review.reviewReply?.comment || "",
      review.starRating || "",
      review.updateTime || review.createTime,
    ].join("|");

    return crypto.createHash("md5").update(content).digest("hex");
  };
}

const reviewsController = new ReviewsController();

// Export individual methods
export const getReviews = reviewsController.getReviews;
export const refreshReviews = reviewsController.refreshReviews;
export const getBusinessLocations = reviewsController.getBusinessLocations;
export const getLocationInfo = reviewsController.getLocationInfo;
export const replyToReview = reviewsController.replyToReview;
export const testConnection = reviewsController.testConnection;

// Export default
export default reviewsController;
