'use client';

import { useEffect, useState } from 'react';

/**
 * When SSR can't find the blob (eventual consistency after creation),
 * this polls a lightweight API to check if the blob exists yet,
 * then reloads the page once it's ready.
 */
export default function ProposalRetryLoader({ slug }: { slug: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const maxAttempts = 10;
    const delayMs = 1500;

    async function poll() {
      for (let i = 0; i < maxAttempts; i++) {
        if (cancelled) return;
        await new Promise(r => setTimeout(r, delayMs));
        if (cancelled) return;

        try {
          const res = await fetch(`/api/proposals/check/${slug}`, { cache: 'no-store' });
          if (res.ok) {
            // Blob is now consistent — reload to get the full SSR page
            window.location.reload();
            return;
          }
        } catch {
          // keep trying
        }
      }

      if (!cancelled) setFailed(true);
    }

    poll();
    return () => { cancelled = true; };
  }, [slug]);

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
