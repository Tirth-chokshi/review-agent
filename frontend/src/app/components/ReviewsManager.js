"use client";

import { useState, useEffect } from "react";

const BACKEND_URL = "http://localhost:8000";

export default function ReviewsManager({ data }) {
  const [selectedAccount, setSelectedAccount] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);
  const [paginationInfo, setPaginationInfo] = useState(null);

  const { accounts = [], locations = [] } = data || {};

  // Reset location when account changes
  useEffect(() => {
    setSelectedLocation("");
    setReviews([]);
    setReviewsLoaded(false);
    setPaginationInfo(null);
    setError(null);
  }, [selectedAccount]);

  // Get locations for selected account
  const getLocationsForAccount = () => {
    if (!selectedAccount) {
      return [];
    }

    console.log("Selected account:", selectedAccount);
    console.log("All locations:", locations);

    // Extract account ID from selected account (in case it's a full path)
    const accountId = selectedAccount.split("/").pop();

    // Filter locations that belong to the selected account
    const filtered = locations.filter((location) => {
      // Check if location's accountId matches (direct match)
      if (
        location.accountId === selectedAccount ||
        location.accountId === accountId
      ) {
        return true;
      }

      // Check if location's accountId ends with the account ID
      if (location.accountId && location.accountId.endsWith(accountId)) {
        return true;
      }

      // Check if location's name contains the account ID
      if (location.name && location.name.includes(accountId)) {
        return true;
      }

      // Check if location has accountName that matches
      if (location.accountName && location.accountName.includes(accountId)) {
        return true;
      }

      return false;
    });

    console.log("Filtered locations for account", accountId, ":", filtered);
    return filtered;
  };

  const fetchReviews = async () => {
    if (!selectedAccount || !selectedLocation) {
      setError("Please select both an account and location");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("🚀 Frontend: Starting review fetch process");
      console.log("🏢 Frontend: Selected Account ID:", selectedAccount);
      console.log("📍 Frontend: Selected Location ID:", selectedLocation);
      console.log("🌐 Frontend: Backend URL:", BACKEND_URL);
      console.log(
        "🔗 Frontend: Full API URL:",
        `${BACKEND_URL}/api/reviews/accounts/${selectedAccount}/locations/${selectedLocation}/reviews`
      );
      console.log("🍪 Frontend: Sending credentials with request");

      const response = await fetch(
        `${BACKEND_URL}/api/reviews/accounts/${selectedAccount}/locations/${selectedLocation}/reviews`,
        {
          credentials: "include",
        }
      );

      console.log("📡 Frontend: Response status:", response.status);
      console.log(
        "📊 Frontend: Response headers:",
        Object.fromEntries(response.headers.entries())
      );

      const result = await response.json();
      console.log("📦 Frontend: Response data:", result);

      if (result.success) {
        setReviews(result.data.reviews || []);
        setPaginationInfo(result.data.pagination || null);
        setReviewsLoaded(true);
        console.log(
          `✅ Frontend: Successfully fetched ${
            result.data.reviews?.length || 0
          } reviews`
        );
        console.log("📋 Frontend: Reviews data:", result.data.reviews);
        console.log("📊 Frontend: Pagination info:", result.data.pagination);
      } else {
        console.log("❌ Frontend: Request failed:", result.message);
        setError(result.message || "Failed to fetch reviews");
      }
    } catch (err) {
      console.error("🚨 Frontend: Error fetching reviews:", err);
      console.error("🚨 Frontend: Error details:", {
        message: err.message,
        stack: err.stack,
        name: err.name,
      });
      setError("Network error: Unable to fetch reviews");
    } finally {
      console.log("🏁 Frontend: Fetch reviews process completed");
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating || 0);
    const hasHalfStar = (rating || 0) % 1 !== 0;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <span key={i} className="text-yellow-400">
            ★
          </span>
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <span key={i} className="text-yellow-400">
            ☆
          </span>
        );
      } else {
        stars.push(
          <span key={i} className="text-gray-300">
            ★
          </span>
        );
      }
    }
    return stars;
  };

  if (!data || (accounts.length === 0 && locations.length === 0)) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          Reviews Manager
        </h3>
        <p className="text-gray-500">
          No business data available. Please authenticate first.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
        <svg
          className="w-6 h-6 mr-2 text-purple-600"
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
        Reviews Manager
      </h3>

      {/* Account Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-800 mb-3">
          Select Business Account
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {accounts.map((account, index) => {
            const accountId = account.name?.split("/").pop();
            const isSelected = selectedAccount === accountId;

            return (
              <div
                key={index}
                onClick={() => {
                  setSelectedAccount(accountId);
                  setSelectedLocation(""); // Reset location when account changes
                  setReviews([]);
                  setReviewsLoaded(false);
                }}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  isSelected
                    ? "border-purple-500 bg-purple-50 ring-2 ring-purple-200"
                    : "border-gray-200 hover:border-purple-300 hover:bg-purple-50"
                }`}
              >
                <div className="flex items-center">
                  <div
                    className={`w-5 h-5 rounded-full border-2 mr-3 flex-shrink-0 ${
                      isSelected
                        ? "bg-purple-500 border-purple-500"
                        : "border-gray-300"
                    }`}
                  >
                    {isSelected && (
                      <svg
                        className="w-full h-full text-white"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {account.accountName || `Account ${index + 1}`}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      ID: {accountId}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Location Selection */}
        {selectedAccount && (
          <>
            <h3 className="text-lg font-medium text-gray-800 mb-3">
              Select Location{" "}
              {getLocationsForAccount().length > 0 &&
                `(${getLocationsForAccount().length} available)`}
            </h3>

            {getLocationsForAccount().length === 0 ? (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-yellow-400"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      No locations found for the selected account.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {getLocationsForAccount().map((location, index) => {
                  const locationId =
                    location.locationId ||
                    location.name?.split("/").pop() ||
                    `loc-${index}`;
                  const isSelected = selectedLocation === locationId;

                  return (
                    <div
                      key={location.name || index}
                      onClick={() => {
                        setSelectedLocation(locationId);
                        setReviews([]);
                        setReviewsLoaded(false);
                        // Don't auto-fetch, let user click fetch button
                      }}
                      className={`border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                        isSelected ? "ring-2 ring-purple-500" : ""
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-medium text-gray-800">
                          {location.title || "Unnamed Location"}
                        </h4>
                        <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                          Location {index + 1}
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <p className="text-gray-600">
                          <strong>Location ID:</strong> {locationId}
                        </p>

                        {location.accountName && (
                          <p className="text-gray-600">
                            <strong>Account:</strong>{" "}
                            {location.accountDisplayName ||
                              location.accountName}
                          </p>
                        )}

                        {/* Show loading indicator when fetching reviews */}
                        {isSelected && loading && (
                          <div className="mt-2 flex items-center text-sm text-purple-600">
                            <svg
                              className="animate-spin -ml-1 mr-2 h-3 w-3 text-purple-600"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Loading reviews...
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Fetch Reviews Button */}
        {selectedAccount && selectedLocation && (
          <div className="mt-6">
            <button
              onClick={fetchReviews}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-6 py-2 rounded-lg transition-colors flex items-center"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Fetching Reviews...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Fetch Reviews
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Reviews Display */}
      {reviewsLoaded && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-semibold text-gray-800">
              Reviews ({reviews.length})
            </h4>
            {selectedAccount && selectedLocation && (
              <div className="text-sm text-gray-600">
                Account: {selectedAccount} | Location: {selectedLocation}
              </div>
            )}
          </div>

          {/* Pagination Info */}
          {paginationInfo && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h5 className="text-sm font-medium text-blue-800 mb-2">
                📊 Fetch Summary
              </h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-600 font-medium">
                    Total Reviews:
                  </span>
                  <span className="ml-1 text-blue-800">
                    {paginationInfo.totalReviews || 0}
                  </span>
                </div>
                <div>
                  <span className="text-blue-600 font-medium">Fetched:</span>
                  <span className="ml-1 text-blue-800">
                    {paginationInfo.fetchedReviews || 0}
                  </span>
                </div>
                <div>
                  <span className="text-blue-600 font-medium">Pages:</span>
                  <span className="ml-1 text-blue-800">
                    {paginationInfo.pagesProcessed || 0}
                  </span>
                </div>
                <div>
                  <span className="text-blue-600 font-medium">Status:</span>
                  <span className="ml-1 text-blue-800">
                    {paginationInfo.hasMore ? "More Available" : "Complete"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {reviews.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <svg
                className="w-12 h-12 mx-auto text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="text-gray-500">
                No reviews found for this location.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {reviews.map((review, index) => (
                <div
                  key={review.reviewId || index}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="flex">
                        {renderStars(review.starRating)}
                      </div>
                      <span className="text-sm text-gray-600">
                        ({review.starRating || 0}/5)
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(review.createTime)}
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="font-medium text-gray-800">
                      {review.reviewer?.displayName || "Anonymous"}
                    </p>
                    {review.comment && (
                      <p className="text-gray-700 mt-2 leading-relaxed">
                        {review.comment}
                      </p>
                    )}
                  </div>

                  {review.reviewReply && (
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mt-3">
                      <p className="text-sm font-medium text-blue-800 mb-1">
                        Business Reply:
                      </p>
                      <p className="text-blue-700 text-sm">
                        {review.reviewReply.comment}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        {formatDate(review.reviewReply.updateTime)}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                    <div className="text-xs text-gray-500">
                      Review ID: {review.reviewId || "N/A"}
                    </div>
                    {!review.reviewReply && (
                      <button className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded transition-colors">
                        Reply
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
