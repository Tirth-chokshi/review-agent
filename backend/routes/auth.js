import express from "express";
import authController from "../controllers/authController.js";

const router = express.Router();

// Google OAuth routes
router.get("/google", authController.googleAuth);
router.get("/google/callback", authController.googleAuthCallback);
router.get("/logout", authController.logout);
router.get("/status", authController.getAuthStatus);

// Business profiles and user preferences
router.get("/business-profiles", authController.getBusinessProfiles);
router.put("/preferences", authController.updateUserPreferences);
router.post("/sync-business", authController.syncBusinessAccounts);

export default router;
