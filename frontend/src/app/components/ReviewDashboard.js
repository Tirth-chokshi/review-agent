import { useState } from "react";

const ReviewDashboard = ({
  reviews = [],
  businessInfo,
  onBack,
  onAnalyzeWithAI,
  aiError = null,
  aiQuotaExceeded = false,
}) => {
  const [selectedFilter, setSelectedFilter] = useState("all");

  // Debug logging
  console.log("ReviewDashboard received:", {
    reviewsCount: reviews?.length,
    reviewsType: typeof reviews,
    businessInfo,
    firstReview: reviews?.[0],
    aiError,
    aiQuotaExceeded,
  });

  const getStarValue = (starRating) => {
    const starMap = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
    return starMap[starRating] || 0;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const totalReviews = reviews.length;
  const averageRating =
    reviews.length > 0
      ? (
          reviews.reduce(
            (sum, review) => sum + getStarValue(review.starRating),
            0
          ) / reviews.length
        ).toFixed(1)
      : "0.0";

  const filteredReviews = reviews.filter((review) => {
    if (selectedFilter === "all") return true;
    return getStarValue(review.starRating).toString() === selectedFilter;
  });

  const renderStars = (rating) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? "text-yellow-400" : "text-gray-300"
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {businessInfo?.name || "Review Dashboard"}
            </h1>
            <p className="text-gray-600">Manage your customer reviews</p>
          </div>

          <div className="flex flex-col items-end space-y-2">
            {/* AI Error Message */}
            {aiError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm max-w-md">
                <strong className="font-bold">AI Error:</strong>
                <span className="block sm:inline"> {aiError}</span>
              </div>
            )}

            {/* AI Analysis Button - only show if no quota error */}
            {onAnalyzeWithAI && !aiQuotaExceeded && (
              <button
                onClick={onAnalyzeWithAI}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                <svg
                  className="w-5 h-5"
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
                <span>AI Analysis</span>
              </button>
            )}

            {/* Quota Exceeded Message */}
            {aiQuotaExceeded && (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-3 py-2 rounded text-sm max-w-md">
                <strong className="font-bold">AI Quota Exceeded:</strong>
                <span className="block sm:inline">
                  {" "}
                  AI analysis is temporarily unavailable. Please try again later
                  or upgrade your plan.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-2xl font-bold text-gray-900">{totalReviews}</div>
          <div className="text-sm text-gray-600">Total Reviews</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-gray-900">
              {averageRating}
            </span>
            {renderStars(Math.round(averageRating))}
          </div>
          <div className="text-sm text-gray-600">Average Rating</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-2xl font-bold text-gray-900">
            {reviews.filter((r) => getStarValue(r.starRating) >= 4).length}
          </div>
          <div className="text-sm text-gray-600">Positive Reviews</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="flex space-x-2">
          {["all", "5", "4", "3", "2", "1"].map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`px-3 py-1 rounded-full text-sm ${
                selectedFilter === filter
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {filter === "all" ? "All" : `${filter} Star`}
            </button>
          ))}
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No reviews found for the selected filter.
          </div>
        ) : (
          filteredReviews.map((review, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">
                      {review.reviewer?.displayName?.[0] || "U"}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {review.reviewer?.displayName || "Anonymous"}
                    </div>
                    <div className="flex items-center space-x-2">
                      {renderStars(getStarValue(review.starRating))}
                      <span className="text-sm text-gray-500">
                        {formatDate(review.createTime)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {review.comment && (
                <p className="text-gray-700 leading-relaxed">
                  {review.comment}
                </p>
              )}

              {review.reviewReply && (
                <div className="mt-4 pl-4 border-l-4 border-blue-200 bg-blue-50 p-3 rounded">
                  <div className="text-sm font-medium text-blue-800 mb-1">
                    Business Reply
                  </div>
                  <p className="text-blue-700">{review.reviewReply.comment}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ReviewDashboard;
