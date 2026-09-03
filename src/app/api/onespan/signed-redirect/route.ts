import { NextRequest, NextResponse } from 'next/server';
import { getStripeLink } from '@/lib/stripe-links';
import { Agent } from '@/lib/types';
import { list, put, del } from '@vercel/blob';

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
        
        // Update with signed flag
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
      // Non-fatal — continue to Stripe redirect
    }
  }

  // Resolve Stripe URL
  // 1. Direct stripe URL passed
  if (stripeUrlParam && stripeUrlParam !== '#' && stripeUrlParam !== '' && stripeUrlParam.startsWith('http')) {
    return NextResponse.redirect(stripeUrlParam);
  }

  // 2. Resolve from agent combo
  if (agentsParam) {
    try {
      const agents = JSON.parse(agentsParam) as Agent[];
      const link = getStripeLink(agents, 'monthly');
      if (link) {
        return NextResponse.redirect(link);
      }
    } catch {}
  }

  // 3. Fallback: back to proposal with signed flag
  const fallback = slug ? `${origin}/p/${slug}?signed=true` : origin;
  return NextResponse.redirect(fallback);
}
