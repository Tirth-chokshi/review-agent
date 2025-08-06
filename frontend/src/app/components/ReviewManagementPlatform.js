"use client";

import { useState, useEffect } from "react";
import BusinessProfileCard from "./BusinessProfileCard";
import ReviewDashboard from "./ReviewDashboard";

const BACKEND_URL = "http://localhost:8000";

export default function ReviewManagementPlatform({ data }) {
  const [currentView, setCurrentView] = useState("profiles"); // 'profiles' or 'dashboard'
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [paginationInfo, setPaginationInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { accounts = [], locations = [] } = data || {};

  // Create business profiles (combination of account + location)
  const createBusinessProfiles = () => {
    const profiles = [];

    accounts.forEach((account) => {
      // Find locations for this account
      const accountId = account.name?.split("/").pop();

      const accountLocations = locations.filter((location) => {
        const locationAccountId =
          location.accountId || location.name?.split("/")[1];
        return (
          locationAccountId === accountId ||
          location.accountId === account.name ||
          location.name?.includes(accountId)
        );
      });

      // Create a profile for each location
      accountLocations.forEach((location) => {
        profiles.push({
          id: `${accountId}-${location.name?.split("/").pop()}`,
          account: {
            ...account,
            accountName:
              account.accountName ||
              account.name?.split("/").pop() ||
              "Business",
          },
          location: {
            ...location,
            locationName:
              location.locationName ||
              location.name?.split("/").pop() ||
              "Location",
          },
          accountId: accountId,
          locationId: location.name?.split("/").pop(),
        });
      });
    });

    return profiles;
  };

  const businessProfiles = createBusinessProfiles();

  const fetchReviewsForProfile = async (profile) => {
    setLoading(true);
    setError(null);

    try {
      console.log("🚀 Platform: Fetching reviews for profile:", profile);

      const response = await fetch(
        `${BACKEND_URL}/api/reviews/accounts/${profile.accountId}/locations/${profile.locationId}/reviews`,
        {
          credentials: "include",
        }
      );

      const result = await response.json();
      console.log("📦 Platform: Response data:", result);

      if (result.success) {
        setReviews(result.data.reviews || []);
        setPaginationInfo(result.data.pagination || null);
        setCurrentView("dashboard");
        console.log(
          `✅ Platform: Successfully fetched ${
            result.data.reviews?.length || 0
          } reviews`
        );
      } else {
        setError(result.message || "Failed to fetch reviews");
      }
    } catch (err) {
      console.error("🚨 Platform: Error fetching reviews:", err);
      setError("Network error: Unable to fetch reviews");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSelect = (profile) => {
    setSelectedProfile(profile);
    fetchReviewsForProfile(profile);
  };

  const handleBackToProfiles = () => {
    setCurrentView("profiles");
    setSelectedProfile(null);
    setReviews([]);
    setPaginationInfo(null);
    setError(null);
  };

  if (currentView === "dashboard") {
    return (
      <div>
        {/* Back Button */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={handleBackToProfiles}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Business Profiles
            </button>
          </div>
        </div>

        <ReviewDashboard
          reviews={reviews}
          paginationInfo={paginationInfo}
          loading={loading}
          businessInfo={
            selectedProfile
              ? {
                  businessName: selectedProfile.account.accountName,
                  locationName: selectedProfile.location.locationName,
                }
              : null
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                  </svg>
                </div>
              </div>

              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-2">
                Review Management Platform
              </h1>

              <p className="text-xl text-gray-600 mb-2">
                Manage all your business reviews from one powerful dashboard
              </p>

              <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span>{businessProfiles.length} Business Locations</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  <span>Real-time Sync</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                  <span>AI-Powered Insights</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-red-500 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {businessProfiles.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-12 max-w-md mx-auto">
              <svg
                className="w-16 h-16 mx-auto text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Business Profiles Found
              </h3>
              <p className="text-gray-600 mb-6">
                Connect your Google My Business account to see your business
                locations and manage reviews.
              </p>
              <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all">
                Connect Account
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Your Business Locations
              </h2>
              <p className="text-gray-600">
                Select a business location to view and manage its reviews
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {businessProfiles.map((profile) => (
                <BusinessProfileCard
                  key={profile.id}
                  account={profile.account}
                  location={profile.location}
                  onSelect={() => handleProfileSelect(profile)}
                  isSelected={selectedProfile?.id === profile.id}
                />
              ))}
            </div>

            {/* Quick Stats */}
            <div className="mt-12 bg-white/60 backdrop-blur-sm rounded-2xl p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">
                Platform Overview
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-gradient-to-r from-blue-500 to-cyan-500 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {businessProfiles.length}
                  </p>
                  <p className="text-gray-600">Business Locations</p>
                </div>

                <div className="text-center">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">100%</p>
                  <p className="text-gray-600">Sync Rate</p>
                </div>

                <div className="text-center">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">AI</p>
                  <p className="text-gray-600">Powered</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-sm mx-auto text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Loading Reviews...
            </h3>
            <p className="text-gray-600">
              Fetching all reviews for your business location
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
