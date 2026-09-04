import { NextRequest, NextResponse } from 'next/server';
import { Agent } from '@/lib/types';
import { list, put, del } from '@vercel/blob';

// Map our agent IDs to gomega.ai agent IDs
const AGENT_MAP: Record<string, string> = {
  seo: 'seo',
  paid_ads: 'paid_ads',
  crm: 'crm',
  website: 'website',
};

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const agentsParam = request.nextUrl.searchParams.get('agents');
  const stripeUrlParam = request.nextUrl.searchParams.get('stripeUrl');
  const origin = request.nextUrl.origin;

  // Mark proposal as signed in blob storage
  if (slug) {
    try {
      const { blobs } = await list({ prefix: `proposals/${slug}.json` });
      const blob = blobs.find(b => b.pathname === `proposals/${slug}.json`);
      if (blob) {
        const res = await fetch(blob.url, {
          headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
        });
        const data = await res.json();
        await del(blob.url);
        await put(`proposals/${slug}.json`, JSON.stringify({
          ...data,
          signed: true,
          signedAt: new Date().toISOString(),
        }), {
          access: 'private',
          contentType: 'application/json',
          addRandomSuffix: false,
        });
      }
    } catch (err) {
      console.error('Failed to mark proposal as signed:', err);
    }
  }

  // Resolve Stripe checkout URL
  // 1. If a direct valid Stripe URL was passed and it's a checkout session (not a dead payment link)
  if (stripeUrlParam && stripeUrlParam.includes('checkout.stripe.com/c/pay/cs_') && stripeUrlParam.startsWith('http')) {
    return NextResponse.redirect(stripeUrlParam);
  }

  // 2. Create a fresh Stripe Checkout Session via gomega.ai/checkout
  if (agentsParam) {
    try {
      const agents = JSON.parse(agentsParam) as Agent[];
      const agentIds = agents.map(a => AGENT_MAP[a] || a).filter(Boolean);

      if (agentIds.length > 0) {
        const checkoutRes = await fetch('https://www.gomega.ai/api/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentIds, cycle: 'monthly' }),
        });

        if (checkoutRes.ok) {
          const checkoutData = await checkoutRes.json();
          if (checkoutData.url) {
            return NextResponse.redirect(checkoutData.url);
          }
        }
        console.error('gomega.ai checkout failed:', checkoutRes.status, await checkoutRes.text());
      }
    } catch (err) {
      console.error('Checkout session creation failed:', err);
    }
  }

  // 3. Fallback: back to proposal with signed flag
  const fallback = slug ? `${origin}/p/${slug}?signed=true` : origin;
  return NextResponse.redirect(fallback);
}
