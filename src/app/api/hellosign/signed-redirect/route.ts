import { NextRequest, NextResponse } from 'next/server';

// HelloSign redirects here after the customer signs.
// We then redirect them to Stripe checkout.
export async function GET(request: NextRequest) {
  const stripeUrl = request.nextUrl.searchParams.get('stripe');
  const slug = request.nextUrl.searchParams.get('slug');

  if (stripeUrl) {
    // Redirect to Stripe checkout
    return NextResponse.redirect(stripeUrl);
  }

  // Fallback: if no Stripe URL, redirect to proposal page
  const origin = request.nextUrl.origin;
  const fallback = slug ? `${origin}/p/${slug}?signed=true` : origin;
  return NextResponse.redirect(fallback);
}
