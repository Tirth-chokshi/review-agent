"use client";

import { useState } from "react";

export default function BusinessProfileCard({
  account,
  location,
  onSelect,
  isSelected = false,
}) {
  const [isHovered, setIsHovered] = useState(false);

  // Extract business name and location details
  const businessName =
    account?.accountName || account?.name?.split("/").pop() || "Business";
  const locationName =
    location?.locationName || location?.name?.split("/").pop() || "Location";
  const address = location?.address || "Address not available";
  const phone = location?.primaryPhone || "Phone not available";

  // Generate a color based on business name for consistency
  const getBusinessColor = (name) => {
    const colors = [
      "bg-gradient-to-br from-purple-500 to-pink-500",
      "bg-gradient-to-br from-blue-500 to-cyan-500",
      "bg-gradient-to-br from-green-500 to-emerald-500",
      "bg-gradient-to-br from-orange-500 to-red-500",
      "bg-gradient-to-br from-indigo-500 to-purple-500",
      "bg-gradient-to-br from-teal-500 to-green-500",
    ];
    const index = name.length % colors.length;
    return colors[index];
  };

  const businessColor = getBusinessColor(businessName);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl transition-all duration-300 cursor-pointer transform hover:scale-105 ${
        isSelected
          ? "ring-4 ring-blue-500 shadow-2xl"
          : "shadow-lg hover:shadow-xl"
      }`}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background Gradient */}
      <div className={`${businessColor} p-6 text-white relative`}>
        {/* Selected Indicator */}
        {isSelected && (
          <div className="absolute top-4 right-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
              <svg
                className="w-5 h-5 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        )}

        {/* Business Icon */}
        <div className="flex items-center mb-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 mr-4">
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

          {/* Business Info */}
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-1">
              {businessName}
            </h3>
            <p className="text-white/80 text-sm font-medium">{locationName}</p>
          </div>
        </div>

        {/* Location Details */}
        <div className="space-y-2 text-sm text-white/90">
          <div className="flex items-center">
            <svg
              className="w-4 h-4 mr-2 text-white/70"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="truncate">{address}</span>
          </div>

          <div className="flex items-center">
            <svg
              className="w-4 h-4 mr-2 text-white/70"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
            <span>{phone}</span>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="bg-white p-4 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex items-center text-yellow-500">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <span className="ml-1 text-sm font-medium text-gray-600">
                Reviews
              </span>
            </div>

            <div className="flex items-center text-blue-500">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <span className="ml-1 text-sm font-medium text-gray-600">
                Analytics
              </span>
            </div>
          </div>

          <div className="flex items-center text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span className="text-xs font-medium">Active</span>
          </div>
        </div>
      </div>

      {/* Hover Overlay */}
      {isHovered && !isSelected && (
        <div className="absolute inset-0 bg-black/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
          <div className="bg-white/90 backdrop-blur-sm rounded-full px-6 py-3">
            <span className="text-gray-800 font-medium">View Reviews</span>
          </div>
        </div>
      )}
    </div>
  );
}
