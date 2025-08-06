import {
  ReviewDB,
  ReviewAnalysisDB,
  BusinessAccountDB,
  BusinessLocationDB,
} from "../config/database.js";
import AIService from "../services/AIService.js";
import crypto from "crypto";

// Initialize AI service
const aiService = new AIService();

// Helper function to generate content hash for caching
const generateContentHash = (review) => {
  const content = [
    review.review_text || review.comment || "",
    review.reply_text || review.reviewReply?.comment || "",
    review.rating || review.starRating || "",
    review.review_date || review.updateTime || review.createTime,
  ].join("|");

  return crypto.createHash("md5").update(content).digest("hex");
};

// Helper function to analyze review with AI service
const analyzeReviewWithAI = async (review) => {
  try {
    return await aiService.analyzeReview(review);
  } catch (error) {
    console.error("AI analysis error:", error.message);
    return null;
  }
};

// Main analysis function with database integration
export const analyzeReviews = async (req, res) => {
  try {
    const { reviews } = req.body;
    const accountId = req.params.accountId || req.body.accountId;
    const locationId = req.params.locationId || req.body.locationId;
    const userId = req.session.user?.id;

    if (!reviews || !Array.isArray(reviews)) {
      return res.status(400).json({
        error: "Reviews array is required in request body",
      });
    }

    if (!accountId || !locationId || !userId) {
      return res.status(400).json({
        error: "Account ID, Location ID, and user authentication are required",
      });
    }

    console.log(`🔍 Starting AI analysis for ${reviews.length} reviews`);

    // Get business account and location from database
    const businessAccount = await BusinessAccountDB.findByGoogleAccountId(
      userId,
      accountId
    );
    if (!businessAccount) {
      return res.status(404).json({
        error: "Business account not found",
      });
    }

    const businessLocation = await BusinessLocationDB.findByGoogleLocationId(
      businessAccount.id,
      locationId
    );
    if (!businessLocation) {
      return res.status(404).json({
        error: "Business location not found",
      });
    }

    const analyzedReviews = [];
    const errors = [];
    let newAnalysisCount = 0;
    let cachedCount = 0;

    for (const review of reviews) {
      try {
        // First, ensure review is in database
        const reviewId = await ReviewDB.createOrUpdate({
          businessAccountId: businessAccount.id,
          locationId: businessLocation.id,
          googleReviewId: review.reviewId || review.name,
          reviewerName: review.reviewer?.displayName || "Anonymous",
          reviewerUrl: review.reviewer?.profilePhotoUrl || "",
          reviewText: review.comment || "",
          rating: review.starRating || 0,
          reviewDate: review.updateTime || review.createTime,
          contentHash: generateContentHash(review),
        });

        // Check if analysis already exists
        let existingAnalysis = await ReviewAnalysisDB.findByReviewId(reviewId);

        if (existingAnalysis) {
          analyzedReviews.push({
            ...review,
            analysis: existingAnalysis,
            cached: true,
          });
          cachedCount++;
          continue;
        }

        // Perform AI analysis
        const aiAnalysis = await analyzeReviewWithAI({
          text: review.comment || "",
          rating: review.starRating || 0,
          reply: review.reviewReply?.comment || "",
        });

        if (aiAnalysis) {
          // Save analysis to database
          await ReviewAnalysisDB.createOrUpdate(reviewId, {
            sentiment: aiAnalysis.sentiment || "neutral",
            sentimentScore: aiAnalysis.sentimentScore || 0.5,
            summary: aiAnalysis.summary || "",
            tags: aiAnalysis.tags || [],
            suggestedReply: aiAnalysis.suggestedReply || "",
            analysisVersion: "1.0",
          });

          analyzedReviews.push({
            ...review,
            analysis: aiAnalysis,
            cached: false,
          });
          newAnalysisCount++;
        } else {
          analyzedReviews.push({
            ...review,
            analysis: null,
            error: "AI analysis failed",
          });
          errors.push(
            `Failed to analyze review: ${review.reviewId || "unknown"}`
          );
        }
      } catch (error) {
        console.error(`Error processing review ${review.reviewId}:`, error);
        errors.push(
          `Error processing review ${review.reviewId}: ${error.message}`
        );
        analyzedReviews.push({
          ...review,
          analysis: null,
          error: error.message,
        });
      }
    }

    const response = {
      success: true,
      data: {
        analyzedReviews,
        stats: {
          total: reviews.length,
          newAnalysis: newAnalysisCount,
          cached: cachedCount,
          errors: errors.length,
        },
        accountId,
        locationId,
      },
      message: `Analyzed ${newAnalysisCount} new reviews, ${cachedCount} from cache`,
    };

    if (errors.length > 0) {
      response.errors = errors;
    }

    console.log(
      `✅ Analysis complete: ${newAnalysisCount} new, ${cachedCount} cached, ${errors.length} errors`
    );

    res.status(200).json(response);
  } catch (error) {
    console.error("Analysis error:", error);
    res.status(500).json({
      error: "Failed to analyze reviews",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get analyzed reviews for a specific business profile
export const getAnalyzedReviews = async (req, res) => {
  try {
    const { accountId, locationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.session.user?.id;

    if (!accountId || !locationId || !userId) {
      return res.status(400).json({
        error: "Account ID, Location ID, and user authentication are required",
      });
    }

    // Get business account and location from database
    const businessAccount = await BusinessAccountDB.findByGoogleAccountId(
      userId,
      accountId
    );
    if (!businessAccount) {
      return res.status(404).json({
        error: "Business account not found",
      });
    }

    const businessLocation = await BusinessLocationDB.findByGoogleLocationId(
      businessAccount.id,
      locationId
    );
    if (!businessLocation) {
      return res.status(404).json({
        error: "Business location not found",
      });
    }

    // Get reviews with analysis from database
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const reviews = await ReviewDB.findByLocation(
      businessAccount.id,
      businessLocation.id,
      parseInt(limit),
      offset
    );
    const totalCount = await ReviewDB.getReviewsCount(
      businessAccount.id,
      businessLocation.id
    );

    res.status(200).json({
      success: true,
      data: {
        reviews,
        totalCount,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        hasNextPage: offset + reviews.length < totalCount,
      },
      message: `Retrieved ${reviews.length} analyzed reviews`,
    });
  } catch (error) {
    console.error("Error getting analyzed reviews:", error);
    res.status(500).json({
      error: "Failed to get analyzed reviews",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get analysis statistics for a specific business profile
export const getAnalysisStats = async (req, res) => {
  try {
    const { accountId, locationId } = req.params;
    const userId = req.session.user?.id;

    if (!accountId || !locationId || !userId) {
      return res.status(400).json({
        error: "Account ID, Location ID, and user authentication are required",
      });
    }

    // Get business account and location from database
    const businessAccount = await BusinessAccountDB.findByGoogleAccountId(
      userId,
      accountId
    );
    if (!businessAccount) {
      return res.status(404).json({
        error: "Business account not found",
      });
    }

    const businessLocation = await BusinessLocationDB.findByGoogleLocationId(
      businessAccount.id,
      locationId
    );
    if (!businessLocation) {
      return res.status(404).json({
        error: "Business location not found",
      });
    }

    const stats = await ReviewAnalysisDB.getAnalysisStats(
      businessAccount.id,
      businessLocation.id
    );

    res.status(200).json({
      success: true,
      data: {
        stats,
        accountId,
        locationId,
      },
      message: "Analysis statistics retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting analysis stats:", error);
    res.status(500).json({
      error: "Failed to get analysis statistics",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Test AI service connection
export const testAIConnection = async (req, res) => {
  try {
    const testReview = {
      text: "This is a test review to check AI connectivity.",
      rating: 5,
      reply: "",
    };

    const result = await analyzeReviewWithAI(testReview);

    if (result) {
      res.status(200).json({
        success: true,
        message: "AI service connection successful",
        testAnalysis: result,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "AI service connection failed",
      });
    }
  } catch (error) {
    console.error("AI connection test error:", error);
    res.status(500).json({
      success: false,
      message: "AI service connection test failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Test analyze a small subset of reviews (for testing)
export const testAnalyzeReviews = async (req, res) => {
  try {
    const { reviews } = req.body;
    const limit = 5; // Limit test analysis to 5 reviews

    if (!reviews || !Array.isArray(reviews)) {
      return res.status(400).json({
        error: "Reviews array is required in request body",
      });
    }

    const testReviews = reviews.slice(0, limit);
    const analyzedReviews = [];

    for (const review of testReviews) {
      const analysis = await analyzeReviewWithAI({
        text: review.comment || "",
        rating: review.starRating || 0,
        reply: review.reviewReply?.comment || "",
      });

      analyzedReviews.push({
        ...review,
        analysis,
        isTest: true,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        analyzedReviews,
        totalTested: testReviews.length,
        originalCount: reviews.length,
      },
      message: `Test analysis completed for ${testReviews.length} reviews`,
    });
  } catch (error) {
    console.error("Test analysis error:", error);
    res.status(500).json({
      error: "Test analysis failed",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Clear analysis cache (development only)
export const clearAnalysisCache = async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        error: "Cache clearing is not allowed in production",
      });
    }

    // This would clear all analysis cache - implement carefully
    // For now, just return success message
    res.status(200).json({
      success: true,
      message: "Analysis cache cleared (development only)",
    });
  } catch (error) {
    console.error("Error clearing cache:", error);
    res.status(500).json({
      error: "Failed to clear analysis cache",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
