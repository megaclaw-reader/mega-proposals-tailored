export type Agent = 'seo' | 'paid_ads' | 'website';

export type Template = 'leads' | 'ecom';

export type ContractTerm = 'annual' | 'bi_annual' | 'quarterly' | 'monthly';

export interface TermOption {
  term: ContractTerm;
  discountPercentage: number;
  /** Fixed dollar discount applied to monthly rate (after percentage discount) */
  discountDollar?: number;
}

export interface ProposalConfig {
  id: string;
  customerName: string;
  companyName: string;
  template: Template;
  selectedAgents: Agent[];
  /** @deprecated Use selectedTerms instead */
  contractTerm: ContractTerm;
  /** @deprecated Use selectedTerms instead */
  discountPercentage?: number;
  /** Multiple term options with per-term discounts */
  selectedTerms?: TermOption[];
  salesRepName: string;
  salesRepEmail: string;
  /** Fireflies meeting transcript URL for tailored proposals */
  firefliesUrl?: string;
  /** Extracted insights from the Fireflies transcript */
  firefliesInsights?: FirefliesInsights;
  /** Free-text business context from the rep */
  businessContext?: string;
  /** AI-generated or manually edited executive summary */
  customExecutiveSummary?: string;
  createdAt: Date;
  isLocked?: boolean;
}

export interface FirefliesInsights {
  /** Key pain points discussed in the call */
  painPoints: string[];
  /** Specific topics/goals discussed */
  discussionTopics: string[];
  /** How MEGA can address their needs */
  megaSolutions: string[];
  /** Raw transcript summary */
  summary: string;
}

export interface SignatureData {
  fullName: string;
  email: string;
  signedAt: Date;
  ipAddress: string;
  userAgent: string;
  agreedToTerms: boolean;
}

export interface Proposal extends ProposalConfig {
  signature?: SignatureData;
  pricing: PricingBreakdown;
}

export interface PricingBreakdown {
  agents: Array<{
    agent: Agent | 'seo_paid_combo';
    name: string;
    basePrice: number;
    finalPrice: number;
  }>;
  subtotal: number;
  discountAmount: number;
  total: number;
  /** Upfront total (monthly rate × term months, after discount) */
  upfrontTotal: number;
  /** Number of months in the term */
  termMonths: number;
  term: ContractTerm;
}

export interface ServiceHighlight {
  title: string;
  description: string;
}

export interface ServiceCategory {
  name: string;
  items: string[];
}

export interface TimelinePhase {
  phase: string;
  items: string[];
}