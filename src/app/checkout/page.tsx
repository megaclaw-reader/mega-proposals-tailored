'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function CheckoutRedirect() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const agentIds = searchParams.get('agents')?.split(',').filter(Boolean) || [];
    const cycle = searchParams.get('cycle') || 'monthly';
    const slug = searchParams.get('slug') || '';

    if (agentIds.length === 0) {
      setError('No agents specified');
      setLoading(false);
      return;
    }

    // Create Stripe Checkout Session via gomega.ai (client-side, so cookies/context work)
    fetch('https://www.gomega.ai/api/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentIds, cycle }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Checkout failed: ${res.status}`);
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error('No checkout URL returned');
        }
      })
      .catch((err) => {
        console.error('Checkout error:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Checkout Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500">
            Please contact your MEGA representative for assistance.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Setting up your payment...</h1>
        <p className="text-gray-500">You&apos;ll be redirected to Stripe checkout momentarily.</p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
      </div>
    }>
      <CheckoutRedirect />
    </Suspense>
  );
}
