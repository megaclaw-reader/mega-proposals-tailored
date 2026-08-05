import { Agent, Bundle, ContractTerm, PricingBreakdown } from './types';

/**
 * Stripe upfront totals — these are the EXACT amounts Stripe charges.
 * Monthly rates are derived by dividing by term months.
 * This ensures our proposal numbers match checkout exactly.
 */
const STRIPE_UPFRONT_TOTALS: Record<string, Record<string, number>> = {
  seo: { monthly: 999, quarterly: 2397, bi_annual: 4554, annual: 8148 },
  paid_ads: { monthly: 1799, quarterly: 4797, bi_annual: 9114, annual: 16308 },
  seo_paid_combo: { monthly: 2798, quarterly: 7194, bi_annual: 13668, annual: 24456 },
  website: { quarterly: 1197, bi_annual: 2274, annual: 4068 },
  crm: { monthly: 999, quarterly: 2397, bi_annual: 4554, annual: 8148 },
};

/**
 * Bundle pricing — combined monthly rates for predefined bundles.
 * When a bundle is selected, we show the bundle price (not individual agent sum).
 */
const BUNDLE_PRICING: Record<string, Record<ContractTerm, number>> = {
  convert: { monthly: 959, quarterly: 799, bi_annual: 769, annual: 669 },
  grow: { monthly: 1619, quarterly: 1349, bi_annual: 1295, annual: 1099 },
  grow_faster: { monthly: 2399, quarterly: 1999, bi_annual: 1899, annual: 1679 },
  grow_faster_ecom: { monthly: 2399, quarterly: 1999, bi_annual: 1899, annual: 1679 },
};

// Advertised monthly rates (what we show on proposals)
const PRICING_TABLE = {
  seo: {
    annual: 679,
    bi_annual: 759,
    quarterly: 799,
    monthly: 999,
  },
  paid_ads: {
    annual: 1359,
    bi_annual: 1519,
    quarterly: 1599,
    monthly: 1799,
  },
  seo_paid_combo: {
    annual: 2038,
    bi_annual: 2278,
    quarterly: 2398,
    monthly: 2798,
  },
  website: {
    annual: 339,
    bi_annual: 379,
    quarterly: 399,
    monthly: 0,
  },
  crm: {
    annual: 679,
    bi_annual: 759,
    quarterly: 799,
    monthly: 999,
  },
};

const AGENT_NAMES: Record<string, string> = {
  seo: 'SEO & GEO Agent',
  paid_ads: 'Paid Ads Agent',
  seo_paid_combo: 'SEO & Paid Ads Agent',
  website: 'Website Agent',
  crm: 'Conversion Agent',
};

export function calculatePricing(
  selectedAgents: Agent[],
  contractTerm: ContractTerm,
  discountPercentage: number = 0,
  discountDollar: number = 0,
  selectedBundle?: Bundle
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

  // Conversion agent is always separate
  const hasCRM = selectedAgents.includes('crm');
  if (hasCRM) {
    const crmPrice = PRICING_TABLE.crm[contractTerm];
    agents.push({
      agent: 'crm' as Agent,
      name: AGENT_NAMES.crm,
      basePrice: crmPrice,
      finalPrice: crmPrice,
    });
    subtotal += crmPrice;
  }

  // Website agent
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
    subtotal = PRICING_TABLE.seo_paid_combo[contractTerm]
      + (hasWebsite ? PRICING_TABLE.website[contractTerm] : 0)
      + (hasCRM ? PRICING_TABLE.crm[contractTerm] : 0);
  }

  const termMonths = getTermMonths(contractTerm);

  // Bundle pricing override: use combined bundle price instead of individual agent sum
  if (selectedBundle && BUNDLE_PRICING[selectedBundle]) {
    const bundleMonthlyRate = BUNDLE_PRICING[selectedBundle][contractTerm];
    const bundleUpfront = bundleMonthlyRate * termMonths;

    // Apply discounts on top of bundle price
    const percentageDiscountAmount = bundleUpfront * (discountPercentage / 100);
    const afterPercentage = bundleUpfront - percentageDiscountAmount;
    const dollarDiscountAmount = Math.min(discountDollar, afterPercentage);
    const upfrontTotal = afterPercentage - dollarDiscountAmount;
    const total = upfrontTotal / termMonths;

    // Don't show per-agent breakdown for bundles — show agents but no individual prices
    // Set all agent finalPrices proportionally so they sum to bundle total
    const agentCount = agents.length;
    if (agentCount > 0) {
      const share = total / agentCount;
      agents.forEach(agent => {
        agent.basePrice = share;
        agent.finalPrice = share;
      });
    }

    return {
      agents,
      subtotal: bundleMonthlyRate,
      discountAmount: bundleMonthlyRate - total,
      total,
      upfrontTotal,
      termMonths,
      term: contractTerm,
    };
  }

  // Start with exact Stripe upfront totals
  let baseUpfront: number;
  let stripeTotal = 0;
  if (hasSEO && hasPaidAds) {
    stripeTotal += STRIPE_UPFRONT_TOTALS.seo_paid_combo[contractTerm] || 0;
  } else {
    if (hasSEO) stripeTotal += STRIPE_UPFRONT_TOTALS.seo[contractTerm] || 0;
    if (hasPaidAds) stripeTotal += STRIPE_UPFRONT_TOTALS.paid_ads[contractTerm] || 0;
  }
  if (hasWebsite) stripeTotal += STRIPE_UPFRONT_TOTALS.website[contractTerm] || 0;
  if (hasCRM) stripeTotal += STRIPE_UPFRONT_TOTALS.crm[contractTerm] || 0;
  baseUpfront = stripeTotal;

  // Apply percentage discount to upfront total first
  const percentageDiscountAmount = baseUpfront * (discountPercentage / 100);
  const afterPercentage = baseUpfront - percentageDiscountAmount;

  // Apply dollar discount directly off the upfront total
  const dollarDiscountAmount = Math.min(discountDollar, afterPercentage); // Don't go negative
  const upfrontTotal = afterPercentage - dollarDiscountAmount;

  // Derive monthly rate from discounted upfront
  const total = upfrontTotal / termMonths;
  const discountAmount = (subtotal * termMonths - upfrontTotal) / termMonths; // per-month discount for display

  // Update final prices with discounts applied proportionally
  if (discountPercentage > 0 || discountDollar > 0) {
    const discountRatio = subtotal > 0 ? total / subtotal : 1;
    agents.forEach(agent => {
      agent.finalPrice = agent.basePrice * discountRatio;
    });
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