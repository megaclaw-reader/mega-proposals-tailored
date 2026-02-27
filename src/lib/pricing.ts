import { Agent, ContractTerm, PricingBreakdown } from './types';

/**
 * Stripe upfront totals — these are the EXACT amounts Stripe charges.
 * Monthly rates are derived by dividing by term months.
 * This ensures our proposal numbers match checkout exactly.
 */
const STRIPE_UPFRONT_TOTALS: Record<string, Record<string, number>> = {
  seo: { monthly: 999, quarterly: 2547, bi_annual: 4496, annual: 8399 },
  paid_ads: { monthly: 1999, quarterly: 5097, bi_annual: 8996, annual: 16800 },
  seo_paid_combo: { monthly: 2998, quarterly: 7645, bi_annual: 13491, annual: 25200 },
  website: { monthly: 399, quarterly: 1017, bi_annual: 1796, annual: 3348 },
};

// Advertised monthly rates (what we show on proposals)
const PRICING_TABLE = {
  seo: {
    annual: 699,
    bi_annual: 749,
    quarterly: 849,
    monthly: 999,
  },
  paid_ads: {
    annual: 1399,
    bi_annual: 1499,
    quarterly: 1699,
    monthly: 1999,
  },
  seo_paid_combo: {
    annual: 2099,
    bi_annual: 2249,
    quarterly: 2548,
    monthly: 2998,
  },
  website: {
    annual: 279,
    bi_annual: 299,
    quarterly: 339,
    monthly: 399,
  },
};

const AGENT_NAMES = {
  seo: 'SEO & GEO Agent',
  paid_ads: 'Paid Ads Agent',
  seo_paid_combo: 'SEO & Paid Ads Agent',
  website: 'Website Agent',
};

export function calculatePricing(
  selectedAgents: Agent[],
  contractTerm: ContractTerm,
  discountPercentage: number = 0
): PricingBreakdown {
  const agents = [];
  let subtotal = 0;

  // Check if both SEO and Paid Ads are selected - use combo pricing
  const hasSEO = selectedAgents.includes('seo');
  const hasPaidAds = selectedAgents.includes('paid_ads');
  const hasWebsite = selectedAgents.includes('website');

  // Always show individual line items for SEO and Paid Ads
  if (hasSEO) {
    const seoPrice = PRICING_TABLE.seo[contractTerm];
    agents.push({
      agent: 'seo' as Agent,
      name: AGENT_NAMES.seo,
      basePrice: seoPrice,
      finalPrice: seoPrice,
    });
    subtotal += seoPrice;
  }

  if (hasPaidAds) {
    const paidAdsPrice = PRICING_TABLE.paid_ads[contractTerm];
    agents.push({
      agent: 'paid_ads' as Agent,
      name: AGENT_NAMES.paid_ads,
      basePrice: paidAdsPrice,
      finalPrice: paidAdsPrice,
    });
    subtotal += paidAdsPrice;
  }

  // Website agent is always separate (addon)
  if (hasWebsite) {
    const websitePrice = PRICING_TABLE.website[contractTerm];
    agents.push({
      agent: 'website' as Agent,
      name: AGENT_NAMES.website,
      basePrice: websitePrice,
      finalPrice: websitePrice,
    });
    subtotal += websitePrice;
  }

  // When both SEO + Paid Ads selected, use combo monthly rate for the total
  // (individual prices may be $1 less due to rounding)
  if (hasSEO && hasPaidAds) {
    subtotal = PRICING_TABLE.seo_paid_combo[contractTerm] + (hasWebsite ? PRICING_TABLE.website[contractTerm] : 0);
  }

  // Apply discount
  const discountAmount = subtotal * (discountPercentage / 100);
  const total = subtotal - discountAmount;

  // Update final prices with discount applied proportionally
  if (discountPercentage > 0) {
    agents.forEach(agent => {
      agent.finalPrice = agent.basePrice * (1 - discountPercentage / 100);
    });
  }

  const termMonths = getTermMonths(contractTerm);

  // Use exact Stripe upfront totals when available (no rounding errors)
  let upfrontTotal: number;
  if (discountPercentage === 0) {
    // Sum exact Stripe upfront amounts
    let stripeTotal = 0;
    if (hasSEO && hasPaidAds) {
      stripeTotal += STRIPE_UPFRONT_TOTALS.seo_paid_combo[contractTerm] || 0;
    } else {
      if (hasSEO) stripeTotal += STRIPE_UPFRONT_TOTALS.seo[contractTerm] || 0;
      if (hasPaidAds) stripeTotal += STRIPE_UPFRONT_TOTALS.paid_ads[contractTerm] || 0;
    }
    if (hasWebsite) stripeTotal += STRIPE_UPFRONT_TOTALS.website[contractTerm] || 0;
    upfrontTotal = stripeTotal;
  } else {
    // Discounted or monthly — calculate normally
    upfrontTotal = total * termMonths;
  }

  return {
    agents,
    subtotal,
    discountAmount,
    total,
    upfrontTotal,
    termMonths,
    term: contractTerm,
  };
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export function getTermDisplayName(term: ContractTerm): string {
  const names = {
    annual: 'Annual',
    bi_annual: 'Bi-Annual',
    quarterly: 'Quarterly',
    monthly: 'Monthly',
  };
  return names[term];
}

export function getTermMonths(term: ContractTerm): number {
  const months = {
    annual: 12,
    bi_annual: 6,
    quarterly: 3,
    monthly: 1,
  };
  return months[term];
}