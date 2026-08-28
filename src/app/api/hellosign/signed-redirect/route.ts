import { NextRequest, NextResponse } from 'next/server';
import { getStripeLink } from '@/lib/stripe-links';
import { Agent } from '@/lib/types';

// HelloSign redirects here after signing when no static Stripe URL was available.
// Tries to resolve a Stripe checkout link from agent IDs, otherwise falls back to proposal page.
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const agentsParam = request.nextUrl.searchParams.get('agents');
  const origin = request.nextUrl.origin;

  // Try to get a static Stripe link from agent IDs
  if (agentsParam) {
    try {
      const agents = JSON.parse(agentsParam) as Agent[];
      const staticLink = getStripeLink(agents, 'monthly');
      if (staticLink) {
        return NextResponse.redirect(staticLink);
      }
    } catch {}
  }

  // Fallback: redirect to proposal page with signed flag
  const fallback = slug ? `${origin}/p/${slug}?signed=true` : origin;
  return NextResponse.redirect(fallback);
}
