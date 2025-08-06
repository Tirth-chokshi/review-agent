import axios from "axios";
import { UserProfileDB } from "../config/userProfile.js";
import { BusinessAccountDB, BusinessLocationDB } from "../config/database.js";

const getBusinessAccounts = async (req, res) => {
  try {
    const { access_token } = req.session.tokens;
    const userId = req.session.user?.id;

    console.log("🏢 API Controller: getBusinessAccounts called");
    console.log(
      "🔑 API Controller: Access Token:",
      access_token ? "***REDACTED***" : "MISSING"
    );
    console.log("🌐 API Controller: Making request to Google My Business API");

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "No user found in session",
      });
    }

    const response = await axios.get(
      "https://mybusinessbusinessinformation.googleapis.com/v1/accounts",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    const accounts = response.data.accounts || [];
    console.log(
      "✅ API Controller: Successfully fetched",
      accounts.length,
      "accounts"
    );
    console.log(
      "📋 API Controller: Account details:",
      accounts.map((acc) => ({
        name: acc.name,
        accountName: acc.accountName,
        id: acc.name?.split("/").pop(),
      }))
    );

    // Save accounts to database
    for (const account of accounts) {
      await BusinessAccountDB.createOrUpdate(userId, {
        googleAccountId: account.name.split("/").pop(), // Extract just the ID
        accountName: account.accountName || account.name,
        accountType: account.type || "BUSINESS",
      });
    }

    req.session.accounts = accounts;
    console.log("💾 API Controller: Accounts stored in session and database");

    res.status(200).json({ success: true, data: accounts });
  } catch (error) {
    console.error(
      "Error fetching business accounts:",
      error.response?.data || error.message
    );
    res.status(500).json({
      success: false,
      message: "Failed to fetch business accounts",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const getAccountLocations = async (req, res) => {
  try {
    const { accountId } = req.params;
    const { access_token } = req.session.tokens;
    const userId = req.session.user?.id;

    console.log("📍 API Controller: getAccountLocations called");
    console.log("🏢 API Controller: Account ID:", accountId);
    console.log(
      "🔑 API Controller: Access Token:",
      access_token ? "***REDACTED***" : "MISSING"
    );
    console.log(
      "🌐 API Controller: Making request to Google My Business API for locations"
    );

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "No user found in session",
      });
    }

    // First, ensure the account exists in the database
    const accounts = req.session.accounts || [];
    const account = accounts.find(
      (acc) => acc.name === `accounts/${accountId}`
    );

    if (account) {
      await BusinessAccountDB.createOrUpdate(userId, {
        googleAccountId: account.name.split("/").pop(), // Extract just the ID
        accountName: account.accountName || account.name,
        accountType: account.type || "BUSINESS",
      });
    }

    const response = await axios.get(
      `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        params: {
          readMask: "name,title",
        },
      }
    );

    const locations = response.data.locations || [];
    console.log(
      "✅ API Controller: Successfully fetched",
      locations.length,
      "locations for account",
      accountId
    );
    console.log(
      "📋 API Controller: Location details:",
      locations.map((loc) => ({
        name: loc.name,
        title: loc.title,
        locationId: loc.name?.split("/").pop(),
      }))
    );

    // Save locations to database if account exists
    if (account) {
      const businessAccount = await BusinessAccountDB.findByGoogleAccountId(
        userId,
        account.name
      );
      if (businessAccount) {
        for (const location of locations) {
          await BusinessLocationDB.createOrUpdate(businessAccount.id, {
            googleLocationId: location.name.split("/").pop(), // Extract just the ID
            locationName: location.title || location.name,
            address: "", // Could be enhanced later with more location details
            phone: "",
            website: "",
          });
        }
      }
    }

    res.status(200).json({ success: true, data: locations });
  } catch (error) {
    console.error(
      "Error fetching account locations:",
      error.response?.data || error.message
    );
    res.status(500).json({
      success: false,
      message: "Failed to fetch account locations",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const getAllLocations = async (req, res) => {
  try {
    const { access_token } = req.session.tokens;
    const accounts = req.session.accounts || [];
    const userId = req.session.user?.id;

    console.log("📍 API Controller: getAllLocations called");
    console.log(
      "🔑 API Controller: Access Token:",
      access_token ? "***REDACTED***" : "MISSING"
    );
    console.log(
      "🏢 API Controller: Found",
      accounts.length,
      "accounts in session"
    );

    if (!accounts.length) {
      console.log("⚠️ API Controller: No accounts found in session");
      return res.status(400).json({
        success: false,
        message: "No business accounts found. Please fetch accounts first.",
      });
    }

    if (!userId) {
      console.log("⚠️ API Controller: No user ID found in session");
      return res.status(401).json({
        success: false,
        message: "No user found in session",
      });
    }

    const allLocations = [];

    for (const account of accounts) {
      try {
        console.log(
          "🔄 API Controller: Fetching locations for account:",
          account.name
        );

        // Save business account to database if not already saved
        const businessAccountId = await BusinessAccountDB.createOrUpdate(
          userId,
          {
            googleAccountId: account.name.split("/").pop(), // Extract just the ID
            accountName: account.accountName || account.name,
            accountType: account.type || "BUSINESS",
          }
        );

        const response = await axios.get(
          `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations`,
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
              "Content-Type": "application/json",
            },
            params: {
              readMask: "name,title",
            },
          }
        );

        const locations = (response.data.locations || []).map((location) => ({
          ...location,
          locationId: location.name.split("/").pop(), // Extract locationId like in your example
          accountId: account.name,
          accountName: account.accountName || "Unnamed Account",
        }));

        // Save locations to database
        for (const location of locations) {
          await BusinessLocationDB.createOrUpdate(businessAccountId, {
            googleLocationId: location.name.split("/").pop(), // Extract just the ID
            locationName: location.title || location.name,
            address: "", // Could be enhanced later with more location details
            phone: "",
            website: "",
          });
        }

        console.log(
          "✅ API Controller: Found",
          locations.length,
          "locations for account",
          account.name
        );
        console.log(
          "📋 API Controller: Location details:",
          locations.map((loc) => ({
            name: loc.name,
            title: loc.title,
            locationId: loc.locationId,
            accountId: loc.accountId,
          }))
        );

        allLocations.push(...locations);
      } catch (error) {
        console.error(
          `Error fetching locations for account ${account.name}:`,
          error.message
        );
        // Continue with next account even if one fails
      }
    }

    console.log(
      "✅ API Controller: Successfully compiled",
      allLocations.length,
      "total locations from all accounts"
    );
    console.log(
      "📋 API Controller: Final location summary:",
      allLocations.map((loc) => ({
        title: loc.title,
        locationId: loc.locationId,
        accountName: loc.accountName,
      }))
    );

    res.status(200).json({ success: true, data: allLocations });
  } catch (error) {
    console.error(
      "Error fetching all locations:",
      error.response?.data || error.message
    );
    res.status(500).json({
      success: false,
      message: "Failed to fetch all locations",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const getData = async (req, res) => {
  try {
    console.log("getData called. Session ID:", req.sessionID);
    console.log("Session tokens:", req.session.tokens);
    console.log("Full session:", req.session);

    const { access_token } = req.session.tokens || {};
    const userId = req.session.user?.id;

    if (!access_token) {
      return res.status(401).json({
        success: false,
        message: "No access token available",
        debug: {
          hasSession: !!req.session,
          sessionID: req.sessionID,
          hasTokens: !!req.session.tokens,
          sessionKeys: Object.keys(req.session || {}),
        },
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "No user found in session",
      });
    }

    // Fetch accounts first
    console.log(
      `🚀 Fetching accounts with access token: ${access_token.substring(
        0,
        20
      )}...`
    );
    const accountsResponse = await axios.get(
      "https://mybusinessbusinessinformation.googleapis.com/v1/accounts",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const accounts = accountsResponse.data.accounts || [];
    console.log(
      `✅ Found ${accounts.length} accounts:`,
      accounts.map((acc) => acc.name)
    );
    req.session.accounts = accounts;

    // Fetch all locations for all accounts and save to database
    const allLocations = [];

    for (const account of accounts) {
      try {
        console.log(`🚀 Fetching locations for account: ${account.name}`);
        console.log(
          `📡 Using access token: ${access_token.substring(0, 20)}...`
        );

        // Save business account to database
        const businessAccountId = await BusinessAccountDB.createOrUpdate(
          userId,
          {
            googleAccountId: account.name.split("/").pop(), // Extract just the ID
            accountName: account.accountName || account.name,
            accountType: account.type || "BUSINESS",
          }
        );

        const locationsResponse = await axios.get(
          `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations`,
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
              "Content-Type": "application/json",
            },
            params: {
              readMask: "name,title",
            },
          }
        );

        console.log(
          `✅ Locations found for ${account.name}:`,
          locationsResponse.data.locations?.length || 0
        );

        const locations = (locationsResponse.data.locations || []).map(
          (location) => ({
            ...location,
            locationId: location.name.split("/").pop(), // Extract locationId like in your example
            accountId: account.name,
            accountName: account.accountName || "Unnamed Account",
          })
        );

        // Save locations to database
        for (const location of locations) {
          await BusinessLocationDB.createOrUpdate(businessAccountId, {
            googleLocationId: location.name.split("/").pop(), // Extract just the ID
            locationName: location.title || location.name,
            address: "", // Could be enhanced later with more location details
            phone: "",
            website: "",
          });
        }

        allLocations.push(...locations);
      } catch (error) {
        console.error(
          `❌ Error fetching locations for account ${account.name}:`,
          error.response?.data || error.message
        );
        console.error(
          "Full error:",
          error.response?.status,
          error.response?.statusText
        );
      }
    }

    req.session.locations = allLocations;

    res.status(200).json({
      success: true,
      tokens: req.session.tokens,
      accounts: accounts,
      locations: allLocations,
      totalAccounts: accounts.length,
      totalLocations: allLocations.length,
    });
  } catch (error) {
    console.error("Error getting data:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "Failed to get data",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.session.tokens || {};

    if (!refresh_token) {
      return res.status(401).json({
        success: false,
        error: "No refresh token available",
      });
    }

    const response = await axios.post("https://oauth2.googleapis.com/token", {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token,
      grant_type: "refresh_token",
    });

    // Update session with new tokens
    req.session.tokens = {
      ...req.session.tokens,
      access_token: response.data.access_token,
      expires_at: Date.now() + response.data.expires_in * 1000,
    };

    res.json({
      success: true,
      message: "Token refreshed successfully",
    });
  } catch (error) {
    console.error(
      "Error refreshing token:",
      error.response?.data || error.message
    );
    res.status(500).json({
      success: false,
      error: "Failed to refresh token",
    });
  }
};

export {
  getBusinessAccounts,
  getAccountLocations,
  getAllLocations,
  getData,
  refreshToken,
};

export default {
  getBusinessAccounts,
  getAccountLocations,
  getAllLocations,
  getData,
  refreshToken,
};
