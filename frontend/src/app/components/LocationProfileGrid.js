"use client";

export default function LocationProfileGrid({
  locations,
  accounts,
  onLocationSelect,
}) {
  if (!locations || locations.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-white rounded-lg shadow p-8 max-w-md mx-auto">
          <div className="text-gray-400 mb-4">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 8h1m-1-4h1m4 4h1m-1-4h1"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Locations Found
          </h3>
          <p className="text-gray-600">
            No business locations are associated with this account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {locations.map((location, index) => (
        <div
          key={location.name || index}
          onClick={() => onLocationSelect(location)}
          className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer p-6 border border-gray-200 hover:border-gray-300"
        >
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 8h1m-1-4h1m4 4h1m-1-4h1"
                  />
                </svg>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-medium text-gray-900 truncate">
                {location.title || location.name || "Unnamed Location"}
              </h3>

              {location.address && (
                <p className="text-sm text-gray-600 mt-1">
                  {location.address.addressLines?.[0] || location.address}
                </p>
              )}

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  {location.metadata?.reviewCount && (
                    <span>{location.metadata.reviewCount} reviews</span>
                  )}
                  {location.metadata?.averageRating && (
                    <span>⭐ {location.metadata.averageRating}</span>
                  )}
                </div>

                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
