'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const BACKEND_URL = 'http://localhost:8000';

export default function CallbackPage() {
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Processing authentication...');
  const router = useRouter();

  useEffect(() => {
    // Check if authentication was successful by polling the backend
    const checkAuthStatus = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/data`);
        const result = await response.json();
        
        if (result.tokens && (result.accounts?.length > 0 || result.locations?.length > 0)) {
          setStatus('success');
          setMessage('Authentication successful! Redirecting...');
          
          // Redirect to home page after a short delay
          setTimeout(() => {
            router.push('/');
          }, 2000);
        } else {
          // Keep checking for a bit longer
          setTimeout(checkAuthStatus, 1000);
        }
      } catch (error) {
        setStatus('error');
        setMessage('Authentication failed. Please try again.');
      }
    };

    // Start checking after a short delay to allow backend processing
    setTimeout(checkAuthStatus, 1000);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        {status === 'processing' && (
          <>
            <div className="mb-6">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Processing Authentication
            </h2>
            <p className="text-gray-600">
              Please wait while we complete your Google My Business authentication...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mb-6">
              <svg className="mx-auto h-16 w-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Authentication Successful!
            </h2>
            <p className="text-gray-600">
              Your Google My Business account has been connected successfully. Redirecting you now...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mb-6">
              <svg className="mx-auto h-16 w-16 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Authentication Failed
            </h2>
            <p className="text-gray-600 mb-4">
              There was an issue connecting your Google My Business account. Please try again.
            </p>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </>
        )}

        <p className="text-xs text-gray-500 mt-4">
          {message}
        </p>
      </div>
    </div>
  );
}
