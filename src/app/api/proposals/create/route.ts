import { NextRequest, NextResponse } from 'next/server';
import { put, head } from '@vercel/blob';
import { calculatePricing } from '@/lib/pricing';
import { Agent, ContractTerm } from '@/lib/types';

/**
 * Validate that insights text doesn't contain pricing that conflicts
 * with the actual pricing configuration. Returns array of warnings.
 */
function validateInsightsVsPricing(decoded: Record<string, unknown>): string[] {
  const warnings: string[] = [];
  const fi = decoded.fi as Record<string, unknown> | undefined;
  if (!fi) return warnings;

  const agents = (decoded.a as Agent[]) || [];
  const terms = (decoded.st as Array<{ t: string; d: number; dd?: number }>) || [];

  // Calculate actual prices for all terms
  const actualPrices: { term: string; monthly: number }[] = [];
  for (const t of terms) {
    const pricing = calculatePricing(agents, t.t as ContractTerm, t.d || 0, t.dd || 0);
    actualPrices.push({ term: t.t, monthly: Math.round(pricing.total) });
  }

  // Extract all dollar amounts from insights text
  const allText = [
    ...(fi.painPoints as string[] || []),
    ...(fi.megaSolutions as string[] || []),
    fi.summary as string || '',
  ].join(' ');

  // Find dollar amounts that look like monthly fees (e.g. $1,000/month, $2,000)
  const dollarPattern = /\$[\d,]+(?:\/mo(?:nth)?)?/gi;
  const matches = allText.match(dollarPattern) || [];

  for (const match of matches) {
    const amount = parseInt(match.replace(/[$,\/a-z]/gi, ''));
    // Check if this amount matches any actual price (within $5 tolerance)
    const isActualPrice = actualPrices.some(p => Math.abs(p.monthly - amount) <= 5);
    // Check if it's a reasonable prospect number (ad budget, revenue, CAC) — skip those
    const isLikelyProspectNumber = amount >= 5000 || amount <= 200;
    
    if (!isActualPrice && !isLikelyProspectNumber) {
      warnings.push(`Insights mention "${match}" which doesn't match any configured pricing (${actualPrices.map(p => `$${p.monthly}/mo ${p.term}`).join(', ')})`);
    }
  }

  return warnings;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export async function POST(request: NextRequest) {
  try {
    const { encodedProposal, companyName } = await request.json();

    if (!encodedProposal || !companyName) {
      return NextResponse.json(
        { error: 'Missing encodedProposal or companyName' },
        { status: 400 }
      );
    }

    // Validate insights vs pricing consistency
    try {
      const base64 = encodedProposal.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
      const warnings = validateInsightsVsPricing(decoded);
      if (warnings.length > 0) {
        console.warn('[PROPOSAL VALIDATION]', companyName, warnings);
        // Return warnings but don't block — the create page can show them
        // In future, could block with status 422
      }
    } catch (e) {
      console.warn('Proposal validation decode error:', e);
    }

    // Generate a clean slug from company name
    let slug = slugify(companyName);
    
    // Check if slug already exists, append a short random suffix if so
    try {
      const existing = await head(`proposals/${slug}.json`);
      if (existing) {
        const suffix = Math.random().toString(36).slice(2, 6);
        slug = `${slug}-${suffix}`;
      }
    } catch {
      // Blob doesn't exist — slug is available
    }

    // Store the proposal data
    await put(`proposals/${slug}.json`, JSON.stringify({
      encodedProposal,
      companyName,
      createdAt: new Date().toISOString(),
    }), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : request.nextUrl.origin;

    return NextResponse.json({
      slug,
      url: `${baseUrl}/p/${slug}`,
    });

  } catch (error) {
    console.error('Create proposal error:', error);
    return NextResponse.json(
      { error: 'Failed to create proposal' },
      { status: 500 }
    );
  }
}
