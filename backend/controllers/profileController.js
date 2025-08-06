import axios from "axios";
import { UserProfileDB } from "../config/userProfile.js";

// Select user's business profile
const selectProfile = async (req, res) => {
  try {
    const { accountId, locationId } = req.body;
    const { access_token } = req.session.tokens || {};

    if (!access_token) {
      return res.status(401).json({
        success: false,
        message: "No access token available",
      });
    }

    if (!accountId || !locationId) {
      return res.status(400).json({
        success: false,
        message: "Account ID and Location ID are required",
      });
    }

    // Get user info
    const userResponse = await axios.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );
    const userInfo = userResponse.data;

    // Save user's selected profile
    await UserProfileDB.saveUserProfile(
      userInfo.id,
      userInfo.email,
      accountId,
      locationId,
      req.session.allBusinessProfiles || []
    );

    console.log(
      `✅ User ${userInfo.email} selected profile: ${accountId}/${locationId}`
    );

    res.status(200).json({
      success: true,
      message: "Profile selected successfully",
      selectedProfile: {
        accountId,
        locationId,
      },
    });
  } catch (error) {
    console.error("Error selecting profile:", error);
    res.status(500).json({
      success: false,
      message: "Failed to select profile",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export { selectProfile };
