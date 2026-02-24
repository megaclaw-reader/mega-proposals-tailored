import { Agent, ContractTerm } from './types';

/**
 * Stripe checkout links mapped by agent combo and term.
 * Website is always an add-on on Stripe's checkout page, not a separate link.
 */
const STRIPE_LINKS: Record<string, Record<string, string>> = {
  monthly: {
    seo: 'https://buy.stripe.com/4gw8x67exbnH85G7sR?client_reference_id=049e965d-8d5d-4c2a-929c-80a6796ab5ad',
    paid_ads: 'https://buy.stripe.com/3cs3cM7ex1N7dq0bJe?client_reference_id=8d4dd8c3-0d6a-47e3-8730-c7b3d2846303',
    seo_paid_ads: 'https://buy.stripe.com/cN28x61UdbnH5Xy3cM?client_reference_id=8ffaf857-c886-4d3c-bd7c-b1de9e85baba',
  },
  quarterly: {
    seo: 'https://buy.stripe.com/fZufZh4xB1QleSv5fFbbG12?client_reference_id=b168e221-e541-4947-b3b7-6b7d244b0ba3',
    paid_ads: 'https://buy.stripe.com/6oU28r3txeD75hV9vVbbG15?client_reference_id=42437bbf-67f8-4c1b-bc02-aebebf4d0c53',
    seo_paid_ads: 'https://buy.stripe.com/bJeaEXc038eJ6lZ6jJbbG1b?client_reference_id=86908001-bd45-4895-8cee-826e5b1f2100',
  },
  bi_annual: {
    seo: 'https://buy.stripe.com/14A7sLe8bcuZaCf5fFbbG14?client_reference_id=2a1c6a5a-1a69-4c29-8d63-a82442d5c450',
    paid_ads: 'https://buy.stripe.com/eVq14n9RVfHbfWzbE3bbG16?client_reference_id=3f62006e-613f-4842-8990-255b785c5acd',
    seo_paid_ads: 'https://buy.stripe.com/eVq8wP3tx7aF5hVfUjbbG1a?client_reference_id=2b21104b-e235-4bf2-9040-ab1069660ebd',
  },
  annual: {
    seo: 'https://buy.stripe.com/eVq7sL2pt2UpbGjbE3bbG1C?client_reference_id=93c22364-d3a4-48fd-ac66-d674097f8f6c',
    paid_ads: 'https://buy.stripe.com/28EfZh0hlfHbaCfeQfbbG1D?client_reference_id=9f5f0a70-4133-4137-9d75-b9bff2b266dd',
    seo_paid_ads: 'https://buy.stripe.com/aFa4gz8NR3Yt8u74bBbbG1E?client_reference_id=954dec9e-71bb-40fb-8d30-d97ad14de399',
  },
};

/**
 * Get the Stripe checkout link for a given agent combo and term.
 * Returns null for monthly (no Stripe link) or unsupported combos.
 */
export function getStripeLink(agents: Agent[], term: ContractTerm): string | null {
  // Monthly now has Stripe links

  const termLinks = STRIPE_LINKS[term];
  if (!termLinks) return null;

  const hasSEO = agents.includes('seo');
  const hasPaidAds = agents.includes('paid_ads');

  // Determine the key (website is always an add-on, not part of the key)
  let key: string;
  if (hasSEO && hasPaidAds) {
    key = 'seo_paid_ads';
  } else if (hasSEO) {
    key = 'seo';
  } else if (hasPaidAds) {
    key = 'paid_ads';
  } else {
    return null; // Website-only has no Stripe link
  }

  return termLinks[key] || null;
}

/**
 * Check if website is selected (it's always an add-on on Stripe checkout).
 */
export function hasWebsiteAddon(agents: Agent[]): boolean {
  return agents.includes('website');
}

/**
 * Check if any term option has a discount applied.
 */
export function hasAnyDiscount(termOptions: { discountPercentage: number }[]): boolean {
  return termOptions.some(t => t.discountPercentage > 0);
}
