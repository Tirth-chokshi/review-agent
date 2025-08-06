import axios from 'axios';

/**
 * Google My Business API Service
 * Handles all interactions with Google My Business API
 */
class GoogleApiService {
  constructor() {
    this.baseURL = "https://mybusiness.googleapis.com/v4";
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getReviews(accountId, locationId, accessToken, retryCount = 0) {
    if (!accountId || !locationId) {
      throw new Error("Account ID and Location ID are required");
    }

    if (!accessToken) {
      throw new Error("Access token is required");
    }

    let allReviews = [];
    let nextPageToken = null;
    let totalReviewCount = 0;
    let averageRating = 0;
    let pageCount = 0;

    try {
      do {
        pageCount++;
        console.log(
          `📄 Fetching reviews page ${pageCount}${
            nextPageToken
              ? ` with token: ${nextPageToken.substring(0, 20)}...`
              : ""
          }`
        );

        const params = {};
        if (nextPageToken) {
          params.pageToken = nextPageToken;
        }

        const response = await axios.get(
          `${this.baseURL}/accounts/${accountId}/locations/${locationId}/reviews`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            params: params,
            timeout: 30000,
          }
        );

        const data = response.data;
        console.log(
          `✅ Page ${pageCount}: Fetched ${data.reviews?.length || 0} reviews`
        );

        // Add reviews from this page
        if (data.reviews && data.reviews.length > 0) {
          allReviews = allReviews.concat(data.reviews);
        }

        // Update metadata from the latest response
        totalReviewCount = data.totalReviewCount || totalReviewCount;
        averageRating = data.averageRating || averageRating;

        // Get next page token
        nextPageToken = data.nextPageToken;

        // Add a small delay between requests to be respectful to the API
        if (nextPageToken) {
          await this.delay(100); // 100ms delay
        }
      } while (nextPageToken && pageCount < 50); // Safety limit of 50 pages

      console.log(
        `🎯 Total reviews fetched: ${allReviews.length} out of ${totalReviewCount} total reviews`
      );

      return {
        reviews: allReviews,
        totalReviewCount: totalReviewCount,
        averageRating: averageRating,
        fetchedCount: allReviews.length,
        pagesProcessed: pageCount,
      };
    } catch (error) {
      console.error("Error fetching reviews:", error.message);

      // Handle API errors
      if (error.response) {
        const status = error.response.status;
        const statusText = error.response.statusText;

        if (status === 401) {
          throw new Error("Authentication failed: Token expired or invalid");
        }

        if (status === 403) {
          throw new Error(
            "Access forbidden: Insufficient permissions for this location"
          );
        }

        if (status === 404) {
          throw new Error("Location not found or no reviews available");
        }

        throw new Error(`Google API Error: ${status} - ${statusText}`);
      }

      // Handle network errors
      if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
        throw new Error(
          "Network error: Unable to reach Google API. Please check your internet connection."
        );
      }

      throw error;
    }
  }

  /**
   * Get business location information
   */
  async getLocationInfo(accountId, locationId, accessToken) {
    if (!accountId || !locationId || !accessToken) {
      throw new Error("Account ID, Location ID, and access token are required");
    }

    try {
      const response = await axios.get(
        `${this.baseURL}/accounts/${accountId}/locations/${locationId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("Error fetching location info:", error.message);
      throw error;
    }
  }

  /**
   * Reply to a specific review
   */
  async replyToReview(
    accountId,
    locationId,
    reviewId,
    replyComment,
    accessToken
  ) {
    if (
      !accountId ||
      !locationId ||
      !reviewId ||
      !replyComment ||
      !accessToken
    ) {
      throw new Error("All parameters are required for replying to a review");
    }

    const maxRetries = 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `🔄 Attempting to reply to review ${reviewId} (attempt ${attempt}/${maxRetries})`
        );

        const response = await axios.put(
          `${this.baseURL}/accounts/${accountId}/locations/${locationId}/reviews/${reviewId}/reply`,
          {
            comment: replyComment,
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            timeout: 30000,
          }
        );

        console.log(`✅ Successfully replied to review ${reviewId}`);
        return response.data;
      } catch (error) {
        lastError = error;
        console.error(
          `❌ Attempt ${attempt} failed for review reply:`,
          error.message
        );

        // Handle rate limiting
        if (error.response?.status === 429) {
          const retryAfter =
            error.response.headers["retry-after"] || Math.pow(2, attempt);
          console.log(`⏱️  Rate limited, waiting ${retryAfter} seconds...`);
          await this.delay(retryAfter * 1000);
          continue;
        }

        // For other errors on final attempt, throw
        if (attempt === maxRetries) {
          break;
        }

        // Wait before retry
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }

    throw new Error(
      `Failed to reply to review after ${maxRetries} attempts: ${lastError.message}`
    );
  }

  /**
   * Test API connectivity
   */
  async testConnection(accountId, locationId, accessToken) {
    try {
      const data = await this.getReviews(accountId, locationId, accessToken);
      return {
        success: true,
        reviewCount: data.reviews?.length || 0,
        message: "API connection successful",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: "API connection failed",
      };
    }
  }
}

export default GoogleApiService;
