'use client';

import { useEffect, useState } from 'react';

/**
 * When a proposal page SSR can't find the blob (eventual consistency),
 * this client component retries by reloading the page up to 5 times
 * over ~10 seconds before showing a real 404.
 */
export default function ProposalRetryLoader({ slug }: { slug: string }) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const maxAttempts = 5;
  const delayMs = 2000;

  useEffect(() => {
    if (attempt >= maxAttempts) {
      setFailed(true);
      return;
    }

    const timer = setTimeout(() => {
      // Reload the page — Next.js will re-run the server component
      // and if the blob is now consistent, it'll render the proposal
      window.location.reload();
    }, delayMs);

    setAttempt(prev => prev + 1);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (failed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Proposal Not Found</h1>
          <p className="text-gray-600 mb-6">
            This proposal link may be invalid or the proposal may have been removed.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-lg text-gray-600">Loading proposal...</p>
      </div>
    </div>
  );
}
