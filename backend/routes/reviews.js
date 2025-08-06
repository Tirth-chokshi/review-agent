import express from "express";
import {
  getReviews,
  getLocationInfo,
  replyToReview,
  refreshReviews,
  getBusinessLocations,
  testConnection,
} from "../controllers/reviewsController.js";
import { refreshAccessToken } from "../middleware/auth.js";

const router = express.Router();

// Protected routes (require authentication)
router.get(
  "/accounts/:accountId/locations/:locationId/reviews",
  refreshAccessToken,
  getReviews
);
router.get(
  "/accounts/:accountId/locations/:locationId/info",
  refreshAccessToken,
  getLocationInfo
);
router.put(
  "/accounts/:accountId/locations/:locationId/reviews/:reviewId/reply",
  refreshAccessToken,
  replyToReview
);
router.post(
  "/accounts/:accountId/locations/:locationId/refresh",
  refreshAccessToken,
  refreshReviews
);
router.get("/business-locations", refreshAccessToken, getBusinessLocations);
router.get("/test-connection", refreshAccessToken, testConnection);

export default router;
