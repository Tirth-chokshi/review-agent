"use client";

import { useState, useEffect, useCallback } from "react";
import GoogleAuthButton from "./components/GoogleAuthButton";
import LocationProfileGrid from "./components/LocationProfileGrid";
import ReviewDashboard from "./components/ReviewDashboard";
import AIReviewAnalysis from "./components/AIReviewAnalysis";

const BACKEND_URL = "http://localhost:8000";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState("auth"); // 'auth', 'profile-selection', 'locations', 'dashboard', 'ai-analysis'
  const [selectedLocationData, setSelectedLocationData] = useState(null);
  const [dataCache, setDataCache] = useState(new Map());
  const [aiError, setAiError] = useState(null);
  const [aiQuotaExceeded, setAiQuotaExceeded] = useState(false);

  // Fetch location data with caching
  const fetchLocationData = useCallback(
    async (accountId, locationId, options = {}) => {
      const { forceRefresh = false, page = 1, limit = 50 } = options;
      const cacheKey = `${accountId}-${locationId}`;

      // Check cache first (unless force refresh)
      if (!forceRefresh && dataCache.has(cacheKey)) {
        const cachedData = dataCache.get(cacheKey);
        const cacheAge = Date.now() - cachedData.timestamp;
        // Use cache if less than 5 minutes old
        if (cacheAge < 5 * 60 * 1000) {
          return cachedData.data;
        }
      }

      try {
        // Build URL with query parameters
        const url = new URL(
          `${BACKEND_URL}/api/reviews/accounts/${accountId}/locations/${locationId}/reviews`
        );
        url.searchParams.append("page", page.toString());
        url.searchParams.append("limit", limit.toString());
        if (forceRefresh) {
          url.searchParams.append("forceRefresh", "true");
        }

        const response = await fetch(url.toString(), {
          credentials: "include",
        });

        if (!response.ok) {
          console.error("❌ Error fetching reviews:", response.statusText);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        console.log("Frontend received API response:", {
          success: result.success,
          dataExists: !!result.data,
          reviewsCount: result.data?.reviews?.length,
          totalReviewCount: result.data?.totalReviewCount,
          currentPage: result.data?.currentPage,
          totalPages: result.data?.totalPages,
          hasNextPage: result.data?.hasNextPage,
          analysisStats: result.data?.analysisStats,
        });

        if (result.success) {
          const locationData = {
            reviews: result.data?.reviews || [],
            pagination: {
              totalReviews: result.data?.totalReviewCount || 0,
              fetchedCount: result.data?.fetchedCount || 0,
              currentPage: result.data?.currentPage || 1,
              totalPages: result.data?.totalPages || 1,
              hasNextPage: result.data?.hasNextPage || false,
            },
            location: result.data?.location || {
              title: `Location ${locationId}`,
              name: result.data?.location?.name,
              address: result.data?.location?.address,
              phone: result.data?.location?.phone,
              website: result.data?.location?.website,
            },
            analysisStats: result.data?.analysisStats,
            accountId,
            locationId,
          };

          // Cache the data (only if not a force refresh)
          if (!forceRefresh) {
            const updatedCache = new Map(dataCache);
            updatedCache.set(cacheKey, {
              data: locationData,
              timestamp: Date.now(),
            });
            setDataCache(updatedCache);
          }

          return locationData;
        } else {
          throw new Error(result.message || "Failed to fetch location data");
        }
      } catch (err) {
        console.error("Error fetching location data:", err);
        throw err;
      }
    },
    [dataCache]
  );

  // Refresh reviews using the dedicated refresh endpoint
  const refreshLocationReviews = useCallback(
    async (accountId, locationId) => {
      try {
        const response = await fetch(
          `${BACKEND_URL}/api/reviews/accounts/${accountId}/locations/${locationId}/refresh`,
          {
            method: "POST",
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.success) {
          // Clear cache for this location to force fresh fetch
          const cacheKey = `${accountId}-${locationId}`;
          const updatedCache = new Map(dataCache);
          updatedCache.delete(cacheKey);
          setDataCache(updatedCache);

          return result;
        } else {
          throw new Error(result.message || "Failed to refresh reviews");
        }
      } catch (err) {
        console.error("Error refreshing reviews:", err);
        throw err;
      }
    },
    [dataCache]
  );

  // Fetch business locations using the dedicated endpoint
  const fetchBusinessLocations = useCallback(async () => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/reviews/business-locations`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        return result.accounts;
      } else {
        throw new Error(result.message || "Failed to fetch business locations");
      }
    } catch (err) {
      console.error("Error fetching business locations:", err);
      throw err;
    }
  }, []);

  // Test connection to Google My Business API
  const testConnection = useCallback(async () => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/reviews/test-connection`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log("Connection test successful:", result);
        return result;
      } else {
        throw new Error(result.message || "Connection test failed");
      }
    } catch (err) {
      console.error("Error testing connection:", err);
      throw err;
    }
  }, []);

  // Load more reviews (pagination)
  const loadMoreReviews = useCallback(
    async (accountId, locationId, page) => {
      try {
        const moreData = await fetchLocationData(accountId, locationId, {
          page,
          forceRefresh: true,
        });

        // Merge with existing reviews
        setSelectedLocationData((prev) => ({
          ...prev,
          reviews: [...(prev?.reviews || []), ...moreData.reviews],
          pagination: moreData.pagination,
        }));

        return moreData;
      } catch (err) {
        console.error("Error loading more reviews:", err);
        throw err;
      }
    },
    [fetchLocationData]
  );

  // Check authentication status and fetch data
  const checkAuthAndFetchData = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/data`, {
        credentials: "include",
      });

      const result = await response.json();
      console.log("Auth check result:", result);

      if (result.success) {
        if (result.userType === "existing" && result.selectedProfile) {
          // User has existing selected profile, fetch their dashboard data
          const { accountId, locationId } = result.selectedProfile;
          try {
            const locationData = await fetchLocationData(accountId, locationId);
            setSelectedLocationData(locationData);
            setCurrentView("dashboard");
            setIsAuthenticated(true);
            setError(null);
          } catch (err) {
            setError(`Failed to load dashboard: ${err.message}`);
            setCurrentView("auth");
          }
        } else if (result.requiresProfileSelection) {
          // New user needs to select a profile - fetch fresh business locations
          try {
            const businessLocations = await fetchBusinessLocations();
            const updatedResult = { ...result, accounts: businessLocations };
            setData(updatedResult);
            setIsAuthenticated(true);
            setCurrentView("profile-selection");
            setError(null);
          } catch (err) {
            console.error("Failed to fetch business locations:", err);
            setData(result);
            setIsAuthenticated(true);
            setCurrentView("profile-selection");
            setError(null);
          }
        } else {
          // Fallback - show locations with fresh data
          try {
            const businessLocations = await fetchBusinessLocations();
            const updatedResult = { ...result, accounts: businessLocations };
            setData(updatedResult);
          } catch (err) {
            setData(result);
          }
          setIsAuthenticated(true);
          setCurrentView("locations");
          setError(null);
        }
      } else {
        setIsAuthenticated(false);
        setCurrentView("auth");
        if (result.message) {
          setError(result.message);
        }
      }
    } catch (err) {
      console.error("Auth check failed:", err);
      setIsAuthenticated(false);
      setCurrentView("auth");
      setError("Failed to connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [fetchLocationData, fetchBusinessLocations]);

  useEffect(() => {
    // Handle OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get("auth");
    const errorMessage = urlParams.get("error");

    if (authStatus === "success") {
      // Clear URL parameters and check auth
      window.history.replaceState({}, document.title, window.location.pathname);
      checkAuthAndFetchData();
    } else if (authStatus === "error") {
      setError(errorMessage || "Authentication failed");
      setCurrentView("auth");
      setLoading(false);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      // Initial load - check if already authenticated
      checkAuthAndFetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAiError = useCallback((error, isQuotaError) => {
    setAiError(error);
    setAiQuotaExceeded(isQuotaError);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/auth/logout`, {
        method: "GET",
        credentials: "include",
      });
      setIsAuthenticated(false);
      setData(null);
      setSelectedLocationData(null);
      setCurrentView("auth");
      setDataCache(new Map());
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handleAuthSuccess = (authData) => {
    setData(authData);
    setIsAuthenticated(true);
    setCurrentView("locations");
    setError(null);
  };

  const handleProfileSelect = async (location) => {
    setLoading(true);
    setError(null);

    try {
      const accountIdRaw = location.accountId;
      const accountId = accountIdRaw ? accountIdRaw.split("/").pop() : null;
      const locationId = location.locationId;

      if (!accountId || !locationId) {
        throw new Error("Missing account or location information");
      }

      // Save selected profile to backend
      const response = await fetch(`${BACKEND_URL}/api/select-profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ accountId, locationId }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Failed to save profile selection");
      }

      // Fetch dashboard data for selected profile
      const locationData = await fetchLocationData(accountId, locationId);
      setSelectedLocationData(locationData);
      setCurrentView("dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                ReviewMaster
              </h1>
              {currentView !== "auth" && (
                <nav className="ml-8 flex space-x-4">
                  {currentView === "dashboard" && (
                    <button
                      onClick={() => setCurrentView("locations")}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      ← Back to Locations
                    </button>
                  )}
                  {currentView === "ai-analysis" && (
                    <button
                      onClick={() => setCurrentView("dashboard")}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      ← Back to Dashboard
                    </button>
                  )}
                </nav>
              )}
            </div>

            {isAuthenticated && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Connected</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 rounded-md hover:bg-gray-100"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && currentView === "auth" ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading...</p>
            </div>
          </div>
        ) : currentView === "auth" ? (
          /* Authentication View */
          <div className="max-w-md mx-auto mt-16">
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome to ReviewMaster
              </h2>
              <p className="text-gray-600 mb-6">
                Connect your Google Business Profile to manage reviews with
                AI-powered insights.
              </p>

              <GoogleAuthButton
                backendUrl={BACKEND_URL}
                onSuccess={handleAuthSuccess}
                onError={setError}
              />

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          </div>
        ) : currentView === "locations" ||
          currentView === "profile-selection" ? (
          /* Business Locations Grid */
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {currentView === "profile-selection"
                  ? "Select Your Business Profile"
                  : "Your Business Locations"}
              </h2>
              <p className="text-gray-600">
                {currentView === "profile-selection"
                  ? "Choose the business location you want to manage reviews for"
                  : "Select a location to manage reviews"}
              </p>
            </div>
            <LocationProfileGrid
              locations={data?.locations || []}
              accounts={data?.accounts || []}
              onLocationSelect={handleProfileSelect}
            />
          </div>
        ) : currentView === "dashboard" ? (
          /* Review Dashboard */
          <ReviewDashboard
            reviews={selectedLocationData?.reviews || []}
            paginationInfo={selectedLocationData?.pagination}
            businessInfo={{
              name:
                selectedLocationData?.location?.title ||
                selectedLocationData?.location?.name,
              locationId: selectedLocationData?.locationId,
              accountId: selectedLocationData?.accountId,
              address: selectedLocationData?.location?.address,
              phone: selectedLocationData?.location?.phone,
              website: selectedLocationData?.location?.website,
            }}
            analysisStats={selectedLocationData?.analysisStats}
            onBack={() => setCurrentView("locations")}
            onAnalyzeWithAI={() => {
              setAiError(null);
              setAiQuotaExceeded(false);
              setCurrentView("ai-analysis");
            }}
            onRefreshReviews={async () => {
              try {
                setLoading(true);
                await refreshLocationReviews(
                  selectedLocationData.accountId,
                  selectedLocationData.locationId
                );
                // Fetch fresh data
                const refreshedData = await fetchLocationData(
                  selectedLocationData.accountId,
                  selectedLocationData.locationId,
                  { forceRefresh: true }
                );
                setSelectedLocationData(refreshedData);
              } catch (err) {
                setError(`Failed to refresh reviews: ${err.message}`);
              } finally {
                setLoading(false);
              }
            }}
            onLoadMoreReviews={async (page) => {
              try {
                setLoading(true);
                await loadMoreReviews(
                  selectedLocationData.accountId,
                  selectedLocationData.locationId,
                  page
                );
              } catch (err) {
                setError(`Failed to load more reviews: ${err.message}`);
              } finally {
                setLoading(false);
              }
            }}
            onTestConnection={testConnection}
            aiError={aiError}
            aiQuotaExceeded={aiQuotaExceeded}
          />
        ) : (
          /* AI Analysis View */
          <AIReviewAnalysis
            reviews={selectedLocationData?.reviews || []}
            accountId={selectedLocationData?.accountId}
            locationId={selectedLocationData?.locationId}
            onBack={() => setCurrentView("dashboard")}
            onError={handleAiError}
          />
        )}

        {loading && currentView !== "auth" && (
          <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading...</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
