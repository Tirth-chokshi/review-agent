import axios from "axios";
import querystring from "querystring";
import {
  UserDB,
  BusinessAccountDB,
  BusinessLocationDB,
  UserPreferencesDB,
} from "../config/database.js";

const googleAuth = (req, res) => {
  try {
    const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    const options = {
      redirect_uri: process.env.REDIRECT_URI,
      client_id: process.env.GOOGLE_CLIENT_ID,
      access_type: "offline",
      response_type: "code",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/business.manage",
        "profile",
        "email",
      ].join(" "),
    };

    const url = `${rootUrl}?${querystring.stringify(options)}`;
    res.redirect(url);
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(500).json({ success: false, message: "Authentication failed" });
  }
};

const googleAuthCallback = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res
        .status(400)
        .json({ success: false, message: "Authorization code not found" });
    }

    // Exchange code for tokens
    const tokenResponse = await axios.post(
      "https://oauth2.googleapis.com/token",
      {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.REDIRECT_URI,
        grant_type: "authorization_code",
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000);

    // Get user profile from Google
    const userResponse = await axios.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    const { id: googleUserId, email, name } = userResponse.data;

    // Save or update user in database
    const userId = await UserDB.createUser({
      email,
      name,
      googleUserId,
      accessToken: access_token,
      refreshToken: refresh_token,
      tokenExpiresAt,
    });

    // Store user session data
    req.session.user = {
      id: userId,
      email,
      name,
      googleUserId,
    };

    req.session.tokens = {
      access_token,
      refresh_token,
      expires_at: Date.now() + expires_in * 1000,
    };

    // Fetch and save business accounts and locations
    await syncBusinessData(userId, access_token);

    // Save session before redirect
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.redirect(
          `http://localhost:3000/?auth=error&message=${encodeURIComponent(
            "Session save failed"
          )}`
        );
      }

      console.log("✅ User authenticated and business data synced:", {
        userId,
        email,
        hasAccessToken: !!access_token,
        hasRefreshToken: !!refresh_token,
        expiresAt: tokenExpiresAt,
      });

      // Redirect back to frontend home page - it will detect authentication
      res.redirect(`http://localhost:3000/?auth=success`);
    });
  } catch (error) {
    console.error(
      "Google Auth Callback Error:",
      error.response?.data || error.message
    );
    res.redirect(
      `http://localhost:3000/?auth=error&message=${encodeURIComponent(
        "Authentication failed"
      )}`
    );
  }
};

// Sync business accounts and locations from Google My Business
const syncBusinessData = async (userId, accessToken) => {
  try {
    // Get business accounts
    const accountsResponse = await axios.get(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const accounts = accountsResponse.data.accounts || [];

    for (const account of accounts) {
      // Save business account
      const businessAccountId = await BusinessAccountDB.createOrUpdate(userId, {
        googleAccountId: account.name.split("/").pop(), // Extract just the ID
        accountName: account.accountName || account.name,
        accountType: account.type || "BUSINESS",
      });

      // Get locations for this account
      try {
        const locationsResponse = await axios.get(
          `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        const locations = locationsResponse.data.locations || [];

        for (const location of locations) {
          await BusinessLocationDB.createOrUpdate(businessAccountId, {
            googleLocationId: location.name,
            locationName: location.title || location.name,
            address: location.storefrontAddress
              ? `${location.storefrontAddress.addressLines?.join(", ")}, ${
                  location.storefrontAddress.locality
                }`
              : "",
            phone: location.primaryPhone || "",
            website: location.websiteUri || "",
          });
        }
      } catch (locationError) {
        console.warn(
          `Could not fetch locations for account ${account.name}:`,
          locationError.message
        );
      }
    }

    console.log(
      `✅ Synced ${accounts.length} business accounts for user ${userId}`
    );
  } catch (error) {
    console.error("Error syncing business data:", error.message);
    // Don't throw - allow authentication to continue even if business sync fails
  }
};

const refreshAccessToken = async (req, res, next) => {
  try {
    const { refresh_token } = req.session.tokens || {};
    if (!refresh_token) {
      return res
        .status(401)
        .json({ success: false, message: "No refresh token available" });
    }

    const response = await axios.post("https://oauth2.googleapis.com/token", {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token,
      grant_type: "refresh_token",
    });

    const { access_token, expires_in } = response.data;
    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000);

    // Update tokens in session
    req.session.tokens = {
      ...req.session.tokens,
      access_token,
      expires_at: Date.now() + expires_in * 1000,
    };

    // Update tokens in database
    if (req.session.user?.id) {
      await UserDB.updateTokens(
        req.session.user.id,
        access_token,
        refresh_token,
        tokenExpiresAt
      );
    }

    next();
  } catch (error) {
    console.error(
      "Token Refresh Error:",
      error.response?.data || error.message
    );
    res
      .status(401)
      .json({ success: false, message: "Failed to refresh token" });
  }
};

const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout Error:", err);
      return res.status(500).json({ success: false, message: "Logout failed" });
    }
    res.clearCookie("connect.sid");
    res.status(200).json({ success: true, message: "Logged out successfully" });
  });
};

const getAuthStatus = async (req, res) => {
  try {
    const isAuthenticated = !!req.session.tokens?.access_token;
    let userData = null;
    let businessAccounts = [];
    let userPreferences = null;

    if (isAuthenticated && req.session.user) {
      const { id: userId } = req.session.user;

      // Get user's business accounts and locations
      businessAccounts = await BusinessAccountDB.findByUserId(userId);

      // Get locations for each account
      for (const account of businessAccounts) {
        account.locations = await BusinessLocationDB.findByAccountId(
          account.id
        );
      }

      // Get user preferences
      userPreferences = await UserPreferencesDB.findByUserId(userId);

      userData = {
        ...req.session.user,
        businessAccounts,
        preferences: userPreferences,
      };
    }

    res.status(200).json({
      isAuthenticated,
      user: userData,
    });
  } catch (error) {
    console.error("Error getting auth status:", error);
    res.status(500).json({
      isAuthenticated: false,
      error: "Failed to get auth status",
    });
  }
};

// Get user's business profiles
const getBusinessProfiles = async (req, res) => {
  try {
    if (!req.session.user?.id) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    const userId = req.session.user.id;
    const businessAccounts = await BusinessAccountDB.findByUserId(userId);

    // Get locations for each account
    for (const account of businessAccounts) {
      account.locations = await BusinessLocationDB.findByAccountId(account.id);
    }

    res.json({
      success: true,
      businessAccounts,
    });
  } catch (error) {
    console.error("Error fetching business profiles:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch business profiles",
    });
  }
};

// Update user preferences (selected account/location)
const updateUserPreferences = async (req, res) => {
  try {
    if (!req.session.user?.id) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    const userId = req.session.user.id;
    const {
      selectedAccountId,
      selectedLocationId,
      autoReplyEnabled,
      notificationSettings,
      dashboardLayout,
    } = req.body;

    await UserPreferencesDB.createOrUpdate(userId, {
      selectedAccountId,
      selectedLocationId,
      autoReplyEnabled,
      notificationSettings,
      dashboardLayout,
    });

    res.json({
      success: true,
      message: "User preferences updated successfully",
    });
  } catch (error) {
    console.error("Error updating user preferences:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user preferences",
    });
  }
};

// Sync business data manually
const syncBusinessAccounts = async (req, res) => {
  try {
    if (!req.session.user?.id || !req.session.tokens?.access_token) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    const userId = req.session.user.id;
    const accessToken = req.session.tokens.access_token;

    await syncBusinessData(userId, accessToken);

    res.json({
      success: true,
      message: "Business accounts synced successfully",
    });
  } catch (error) {
    console.error("Error syncing business accounts:", error);
    res.status(500).json({
      success: false,
      message: "Failed to sync business accounts",
    });
  }
};

export {
  googleAuth,
  googleAuthCallback,
  logout,
  getAuthStatus,
  getBusinessProfiles,
  updateUserPreferences,
  syncBusinessAccounts,
  refreshAccessToken,
};

export default {
  googleAuth,
  googleAuthCallback,
  logout,
  getAuthStatus,
  getBusinessProfiles,
  updateUserPreferences,
  syncBusinessAccounts,
  refreshAccessToken,
};
