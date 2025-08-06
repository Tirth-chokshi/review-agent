import express from "express";
import {
  analyzeReviews,
  getAnalyzedReviews,
  getAnalysisStats,
  testAIConnection,
  testAnalyzeReviews,
  clearAnalysisCache,
} from "../controllers/analysisController.js";

const router = express.Router();

// POST /api/analysis/analyze - Analyze reviews with AI and cache results
router.post("/analyze", analyzeReviews);

// POST /api/analysis/:accountId/:locationId - Analyze reviews for specific business profile
router.post("/:accountId/:locationId", analyzeReviews);

// POST /api/analysis/test-analyze - Test analyze limited reviews (for testing AI service)
router.post("/test-analyze", testAnalyzeReviews);

// GET /api/analysis/accounts/:accountId/locations/:locationId/reviews - Get analyzed reviews for specific business profile
router.get(
  "/accounts/:accountId/locations/:locationId/reviews",
  getAnalyzedReviews
);

// GET /api/analysis/accounts/:accountId/locations/:locationId/stats - Get analysis statistics for specific business profile
router.get(
  "/accounts/:accountId/locations/:locationId/stats",
  getAnalysisStats
);

// GET /api/analysis/test - Test AI service connection
router.get("/test", testAIConnection);

// GET /api/analysis/simple-test - Simple test route
router.get("/simple-test", (req, res) => {
  console.log("🧪 Simple test route hit");
  res.json({
    success: true,
    message: "Simple test route works",
    timestamp: new Date().toISOString(),
  });
});

// GET /api/analysis/debug/:accountId/:locationId - Debug route matching
router.get("/debug/:accountId/:locationId", (req, res) => {
  const { accountId, locationId } = req.params;
  console.log("🔍 Debug route hit with params:", { accountId, locationId });
  res.json({
    success: true,
    message: "Route matching works",
    params: { accountId, locationId },
    url: req.url,
  });
});

// DELETE /api/analysis/cache - Clear analysis cache (development only)
router.delete("/cache", clearAnalysisCache);

export default router;
