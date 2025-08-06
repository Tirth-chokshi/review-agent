import { useState, useEffect, useCallback } from "react";

const AIReviewAnalysis = ({
  reviews = [],
  accountId,
  locationId,
  onBack,
  onError,
}) => {
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiQuotaError, setAiQuotaError] = useState(false);

  const analyzeReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAiQuotaError(false);

    try {
      const response = await fetch(
        `http://localhost:8000/api/analysis/${accountId}/${locationId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ reviews }),
        }
      );

      const result = await response.json();

      if (result.success) {
        setAnalysisData(result.analysis);

        // Check if there were AI quota errors in the analysis
        if (result.analysis && result.analysis.errors > 0) {
          // Check if the error messages contain quota/rate limit errors
          const hasQuotaError = result.analysis.errorDetails?.some(
            (error) =>
              error.includes("quota") ||
              error.includes("rate limit") ||
              error.includes("Too Many Requests") ||
              error.includes("429")
          );

          if (hasQuotaError) {
            setAiQuotaError(true);
            setError(
              "AI analysis quota exceeded. Some reviews were analyzed successfully. Please try again later or upgrade your plan."
            );
            if (onError)
              onError(
                "AI analysis quota exceeded. Some reviews were analyzed successfully. Please try again later or upgrade your plan.",
                true
              );
          }
        }
      } else {
        // Check if the error is quota-related
        if (
          result.message &&
          (result.message.includes("quota") ||
            result.message.includes("rate limit") ||
            result.message.includes("Too Many Requests") ||
            result.message.includes("429"))
        ) {
          setAiQuotaError(true);
          setError(
            "AI analysis quota exceeded. Please try again later or upgrade your plan."
          );
          if (onError)
            onError(
              "AI analysis quota exceeded. Please try again later or upgrade your plan.",
              true
            );
        } else {
          setError(result.message || "Analysis failed");
          if (onError) onError(result.message || "Analysis failed", false);
        }
      }
    } catch (err) {
      setError("Failed to analyze reviews");
      if (onError) onError("Failed to analyze reviews", false);
      console.error("Analysis error:", err);
    } finally {
      setLoading(false);
    }
  }, [accountId, locationId, reviews, onError]);

  useEffect(() => {
    if (reviews.length > 0 && accountId && locationId) {
      analyzeReviews();
    }
  }, [analyzeReviews, reviews.length, accountId, locationId]);

  const getStarValue = (starRating) => {
    const starMap = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
    return starMap[starRating] || 0;
  };

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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          AI Review Analysis
        </h1>
        <p className="text-gray-600">
          AI-powered insights from your customer reviews
        </p>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Analyzing reviews...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="text-red-700">{error}</div>
          <button
            onClick={analyzeReviews}
            className="mt-2 text-sm text-red-600 hover:text-red-800"
          >
            Try again
          </button>
        </div>
      )}

      {analysisData && (
        <div className="space-y-6">
          {/* Overall Sentiment */}
          <div className="bg-white p-6 rounded-lg shadow border">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Overall Sentiment
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {analysisData.sentiment?.positive || 0}%
                </div>
                <div className="text-sm text-gray-600">Positive</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">
                  {analysisData.sentiment?.neutral || 0}%
                </div>
                <div className="text-sm text-gray-600">Neutral</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">
                  {analysisData.sentiment?.negative || 0}%
                </div>
                <div className="text-sm text-gray-600">Negative</div>
              </div>
            </div>
          </div>

          {/* Key Themes */}
          {analysisData.themes && (
            <div className="bg-white p-6 rounded-lg shadow border">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Key Themes
              </h2>
              <div className="flex flex-wrap gap-2">
                {analysisData.themes.map((theme, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI Generated Responses */}
          {analysisData.suggestedResponses && (
            <div className="bg-white p-6 rounded-lg shadow border">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                AI Generated Responses
              </h2>
              <div className="space-y-4">
                {analysisData.suggestedResponses.map((response, index) => (
                  <div key={index} className="border-l-4 border-blue-200 pl-4">
                    <div className="text-sm text-gray-600 mb-1">
                      For {response.reviewType} reviews:
                    </div>
                    <p className="text-gray-800">{response.response}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Reviews with AI Insights */}
          <div className="bg-white p-6 rounded-lg shadow border">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Recent Reviews
            </h2>
            <div className="space-y-4">
              {reviews.slice(0, 5).map((review, index) => (
                <div
                  key={index}
                  className="border-b border-gray-200 pb-4 last:border-b-0"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {renderStars(getStarValue(review.starRating))}
                      <span className="text-sm text-gray-600">
                        {review.reviewer?.displayName || "Anonymous"}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(review.createTime).toLocaleDateString()}
                    </span>
                  </div>

                  {review.comment && (
                    <p className="text-gray-700 mb-2">{review.comment}</p>
                  )}

                  {analysisData.reviewInsights?.[index] && (
                    <div className="bg-blue-50 p-3 rounded text-sm">
                      <div className="font-medium text-blue-800">
                        AI Insight:
                      </div>
                      <div className="text-blue-700">
                        {analysisData.reviewInsights[index]}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading && !analysisData && !error && reviews.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No reviews available for analysis.
        </div>
      )}
    </div>
  );
};

export default AIReviewAnalysis;
