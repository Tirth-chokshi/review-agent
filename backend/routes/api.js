import express from "express";
import apiController from "../controllers/apiController.js";
import { selectProfile } from "../controllers/profileController.js";
import { refreshAccessToken } from "../middleware/auth.js";

const router = express.Router();

// Protected routes (require authentication)
router.get("/accounts", refreshAccessToken, apiController.getBusinessAccounts);
router.get(
  "/accounts/:accountId/locations",
  refreshAccessToken,
  apiController.getAccountLocations
);
router.get("/locations", refreshAccessToken, apiController.getAllLocations);
router.get("/data", refreshAccessToken, apiController.getData);
router.post("/select-profile", refreshAccessToken, selectProfile);
router.post("/refresh", apiController.refreshToken);

export default router;
