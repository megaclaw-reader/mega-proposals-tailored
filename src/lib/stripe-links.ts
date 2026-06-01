import { Agent, Bundle, ContractTerm } from './types';

/**
 * Stripe checkout links mapped by agent combo key and billing term.
 * Keys are sorted agent names joined by '+'. Website is now a full agent, not just an add-on.
 * 3-agent bundles use code BUNDLE3 (applied at Stripe checkout).
 */
const STRIPE_LINKS: Record<string, Record<string, string>> = {
  // === Single Agents ===
  crm: {
    monthly: 'https://buy.stripe.com/aFa8wP5BFdz3fWzdMbbbG1T',
    quarterly: 'https://buy.stripe.com/9B64gz9RV1Ql7q35fFbbG1U',
    bi_annual: 'https://buy.stripe.com/9B66oH5BF8eJ39N5fFbbG1V',
    annual: 'https://buy.stripe.com/cNi4gz6FJ52x39N8rRbbG1W',
  },
  paid_ads: {
    monthly: 'https://buy.stripe.com/fZuaEX5BFdz39ybgYnbbG1X',
    quarterly: 'https://buy.stripe.com/3cI9AT5BF7aFcKncI7bbG1Y',
    bi_annual: 'https://buy.stripe.com/dRm6oHggj8eJ8u79vVbbG1Z',
    annual: 'https://buy.stripe.com/fZu4gz8NRamR25JeQfbbG20',
  },
  seo: {
    monthly: 'https://buy.stripe.com/eVq5kD8NR9iN11FfUjbbG21',
    quarterly: 'https://buy.stripe.com/6oUbJ1d472UpeSveQfbbG22',
    bi_annual: 'https://buy.stripe.com/5kQ6oH9RVcuZ11FgYnbbG23',
    annual: 'https://buy.stripe.com/fZucN5ggjbqVfWz23tbbG24',
  },
  website: {
    monthly: 'https://buy.stripe.com/4gM28r4xBfHbfWzfUjbbG25',
    quarterly: 'https://buy.stripe.com/00w7sLc03amR9yb6jJbbG26',
    bi_annual: 'https://buy.stripe.com/5kQ5kD8NRcuZ11F37xbbG27',
    annual: 'https://buy.stripe.com/3cIdR9d47eD74dRgYnbbG28',
  },

  // === 2-Agent Combos ===
  'crm+paid_ads': {
    monthly: 'https://buy.stripe.com/dRm9AT7JNgLf11F9vVbbG29',
    quarterly: 'https://buy.stripe.com/8x2dR93tx3Yt11FcI7bbG2a',
    bi_annual: 'https://buy.stripe.com/bJebJ1d477aFbGj9vVbbG2b',
    annual: 'https://buy.stripe.com/4gMcN50hl3YteSv37xbbG2c',
  },
  'crm+seo': {
    monthly: 'https://buy.stripe.com/9B66oH8NR66BdOrdMbbbG2d',
    quarterly: 'https://buy.stripe.com/5kQdR99RV1Ql11F9vVbbG2e',
    bi_annual: 'https://buy.stripe.com/9B6fZhggj1QldOr37xbbG2f',
    annual: 'https://buy.stripe.com/9B65kD6FJ8eJ6lZfUjbbG2g',
  },
  'crm+website': {
    monthly: 'https://buy.stripe.com/7sY00jggj0Mh5hVgYnbbG2h',
    quarterly: 'https://buy.stripe.com/4gMfZhfcfgLf25J37xbbG2i',
    bi_annual: 'https://buy.stripe.com/cNiaEXfcf52x6lZ37xbbG2j',
    annual: 'https://buy.stripe.com/fZu5kD5BFdz34dRdMbbbG2k',
  },
  'paid_ads+seo': {
    monthly: 'https://buy.stripe.com/3cI28r6FJ52xbGjgYnbbG2l',
    quarterly: 'https://buy.stripe.com/dRm00j0hl9iNaCf5fFbbG2m',
    bi_annual: 'https://buy.stripe.com/8x2cN50hlgLf25J6jJbbG2n',
    annual: 'https://buy.stripe.com/bJecN5e8b0Mh5hVazZbbG2o',
  },
  'paid_ads+website': {
    monthly: 'https://buy.stripe.com/aFa6oHggj8eJh0D23tbbG2p',
    quarterly: 'https://buy.stripe.com/4gM9AT2pt7aF8u74bBbbG2q',
    bi_annual: 'https://buy.stripe.com/dRmeVdd479iN39N0ZpbbG2r',
    annual: 'https://buy.stripe.com/14A4gz1lp66B11F23tbbG2s',
  },
  'seo+website': {
    monthly: 'https://buy.stripe.com/14A9AT5BF52x25JcI7bbG2t',
    quarterly: 'https://buy.stripe.com/9B614n1lpfHbfWzcI7bbG2u',
    bi_annual: 'https://buy.stripe.com/bJe5kDd478eJ8u7fUjbbG2v',
    annual: 'https://buy.stripe.com/fZu00j8NR0Mh11F7nNbbG2w',
  },

  // === 3-Agent Bundles (use code BUNDLE3) ===
  'crm+paid_ads+seo': {
    monthly: 'https://buy.stripe.com/7sYeVdfcfeD7eSv4bBbbG2x',
    quarterly: 'https://buy.stripe.com/28EfZh4xB7aFcKnbE3bbG2y',
    bi_annual: 'https://buy.stripe.com/aFa7sL5BF2UpaCf9vVbbG2z',
    annual: 'https://buy.stripe.com/fZu7sL7JNfHbdOreQfbbG2A',
  },
  'crm+paid_ads+website': {
    monthly: 'https://buy.stripe.com/4gM28r2ptfHbcKncI7bbG2B',
    quarterly: 'https://buy.stripe.com/dRmaEX3tx3Yth0DdMbbbG2C',
    bi_annual: 'https://buy.stripe.com/14A00jaVZfHbdOrbE3bbG2D',
    annual: 'https://buy.stripe.com/eVqcN54xBbqV5hV5fFbbG2E',
  },
  'crm+seo+website': {
    monthly: 'https://buy.stripe.com/4gMbJ19RV0Mh4dR6jJbbG2F',
    quarterly: 'https://buy.stripe.com/aFa5kDe8bbqVh0D4bBbbG2G',
    bi_annual: 'https://buy.stripe.com/bJe28re8b8eJeSvdMbbbG2H',
    annual: 'https://buy.stripe.com/00w3cv8NR3Yt4dRfUjbbG2I',
  },
  'paid_ads+seo+website': {
    monthly: 'https://buy.stripe.com/eVq14n1lp3YtcKneQfbbG2J',
    quarterly: 'https://buy.stripe.com/6oU8wP4xB52xeSvazZbbG2K',
    bi_annual: 'https://buy.stripe.com/3cI14nd473Yt6lZ6jJbbG2L',
    annual: 'https://buy.stripe.com/8x2aEX4xB0Mh4dR6jJbbG2M',
  },

  // === All 4 Agents ===
  'crm+paid_ads+seo+website': {
    monthly: 'https://buy.stripe.com/6oU8wPd47cuZaCfgYnbbG2N',
    quarterly: 'https://buy.stripe.com/14A3cv6FJfHb6lZ6jJbbG2O',
    bi_annual: 'https://buy.stripe.com/7sYeVd3tx52xeSvfUjbbG2P',
    annual: 'https://buy.stripe.com/aFa4gzfcf66B5hVbE3bbG2Q',
  },
};

/**
 * Stripe checkout links for predefined bundles.
 */
const BUNDLE_STRIPE_LINKS: Record<Bundle, Record<string, string>> = {
  convert: {
    monthly: 'https://buy.stripe.com/00w3cv4xB66B11FgYnbbG2R',
    quarterly: 'https://buy.stripe.com/aFa9AT7JNgLf11FgYnbbG2S',
    bi_annual: 'https://buy.stripe.com/eVqcN5c030MhcKn6jJbbG2T',
    annual: 'https://buy.stripe.com/eVq7sLe8bdz3eSveQfbbG2U',
  },
  grow: {
    monthly: 'https://buy.stripe.com/3cI5kDc039iNh0DgYnbbG2V',
    quarterly: 'https://buy.stripe.com/8x2bJ1fcf8eJ25J6jJbbG2W',
    bi_annual: 'https://buy.stripe.com/00w9ATd4766B9ybfUjbbG2X',
    annual: 'https://buy.stripe.com/7sYeVde8b3Yt8u737xbbG2Y',
  },
  grow_faster: {
    monthly: 'https://buy.stripe.com/8x2bJ15BFgLf25J6jJbbG30',
    quarterly: 'https://buy.stripe.com/8x2bJ15BFgLf25J6jJbbG30',
    bi_annual: 'https://buy.stripe.com/9B6fZhe8bamR39NbE3bbG31',
    annual: 'https://buy.stripe.com/7sYbJ1fcfgLffWz23tbbG32',
  },
};

/**
 * Get the Stripe checkout link for a predefined bundle and term.
 */
export function getBundleStripeLink(bundle: Bundle, term: ContractTerm): string | null {
  const termLinks = BUNDLE_STRIPE_LINKS[bundle];
  if (!termLinks) return null;
  return termLinks[term] || null;
}

/**
 * Build a sorted combo key from selected agents.
 * Agents are sorted alphabetically and joined with '+'.
 */
function getComboKey(agents: Agent[]): string {
  return [...agents].sort().join('+');
}

/**
 * Check if the combo is a 3-agent bundle (needs BUNDLE3 code).
 */
export function isBundle3(agents: Agent[]): boolean {
  return agents.length === 3;
}

/**
 * Get the Stripe checkout link for a given agent combo and term.
 * Returns null if no matching link exists.
 */
export function getStripeLink(agents: Agent[], term: ContractTerm): string | null {
  const key = getComboKey(agents);
  const termLinks = STRIPE_LINKS[key];
  if (!termLinks) return null;
  return termLinks[term] || null;
}

/**
 * Check if website is selected (kept for backward compat).
 */
export function hasWebsiteAddon(agents: Agent[]): boolean {
  return agents.includes('website');
}

/**
 * Check if any term option has a discount applied.
 */
export function hasAnyDiscount(termOptions: { discountPercentage: number; discountDollar?: number }[]): boolean {
  return termOptions.some(t => t.discountPercentage > 0 || (t.discountDollar || 0) > 0);
}
