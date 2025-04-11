'use client';

import { useEffect, useState } from 'react';

export default function ErrorHandler() {
  const [error, setError] = useState<Error | null>(null);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    // Capture unhandled errors
    const handleError = (event: ErrorEvent) => {
      console.error('Uncaught error:', event.error);
      setError(event.error);
      setShowError(true);
    };

    // Listen for unhandled errors
    window.addEventListener('error', handleError);

    // Clean up event listener
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  // Auto-hide the error message after 5 seconds
  useEffect(() => {
    if (showError) {
      const timeout = setTimeout(() => {
        setShowError(false);
      }, 5000);

      return () => clearTimeout(timeout);
    }
  }, [showError]);

  if (!showError || !error) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold">Error</p>
          <p className="text-sm">{error.message || 'An unknown error occurred'}</p>
        </div>
        <button
          className="ml-4 text-red-700"
          onClick={() => setShowError(false)}
        >
          ×
        </button>
      </div>
    </div>
  );
}
