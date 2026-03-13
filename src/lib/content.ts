import { Agent, Template } from './types';

export interface ServiceContent {
  title: string;
  description: string;
  highlights: string[];
  categories: {
    name: string;
    items: string[];
  }[];
  timeline?: {
    phase: string;
    items: string[];
  }[];
}

export const SERVICE_DESCRIPTIONS = {
  seo: {
    title: "SEO & GEO Agent",
    shortDescription: "AI agents that create, optimize, and adapt your content daily — not monthly like traditional agencies",
    badge: "SEO/GEO",
    color: "blue"
  },
  paid_ads: {
    title: "Paid Ads Agent",
    shortDescription: "AI agents living inside your ad accounts, optimizing bids, budgets, and creative around the clock",
    badge: "PAID ADS",
    color: "blue"
  },
  website: {
    title: "Website Agent",
    shortDescription: "Conversion-optimized websites with unlimited changes and 2-day turnaround",
    badge: "WEB",
    color: "blue"
  }
};

export function getServiceScope(agent: Agent, template: Template): ServiceContent {
  switch (agent) {
    case 'seo':
      return {
        title: "SEO/GEO Agent Services Scope",
        description: "Our SEO/GEO Agent deploys AI directly into your content and search strategy — creating 20-25 optimized pages per month, updating existing content daily, and adapting to algorithm changes in real time. Where traditional agencies review your SEO quarterly, our agents are optimizing every single day.",
        highlights: [
          "Dedicated Account Manager: You'll work one-on-one with a dedicated SEO/GEO Account Manager available for monthly strategy meetings to review performance, discuss goals, and align on priorities.",
          "Daily Optimization, Not Monthly Reviews: Our AI agents update and optimize your content every day — adapting to algorithm changes, search trend shifts, and competitor movements as they happen. Traditional agencies check in once a month; we never stop.",
          "20-25 Pages Per Month: Most agencies deliver 4-8 blog posts per month. Our AI content engine produces 20-25 fully optimized pages — building topical authority 3-5x faster than conventional approaches."
        ],
        categories: [
          {
            name: "SEO/GEO Strategy & Keyword Research",
            items: [
              "Comprehensive competitor analysis and gap identification",
              "High-value keyword research and opportunity mapping",
              "Local search optimization and geo-targeting strategy",
              "Content strategy development and editorial calendar planning"
            ]
          },
          {
            name: "Content Creation & Ongoing Optimization",
            items: [
              "20-25 SEO-optimized articles and pages per month",
              "Location-specific landing page development",
              "E-E-A-T content creation for authority building",
              "Regular content audits and metadata optimization",
              "Internal linking strategy implementation",
              "Content refresh and update programs"
            ]
          },
          {
            name: "Technical SEO/GEO & Continuous Monitoring",
            items: [
              "Comprehensive site audits and technical fixes",
              "Page speed optimization and Core Web Vitals",
              "Schema markup implementation and maintenance",
              "Mobile responsiveness and user experience optimization",
              "XML sitemap management and robots.txt optimization",
              "Google Search Console and Google My Business management"
            ]
          },
          {
            name: "LLM & AI Placement (GEO)",
            items: [
              "AI search optimization for ChatGPT, Claude, and emerging AI platforms",
              "Local AI search visibility enhancement",
              "Voice search optimization for local queries"
            ]
          },
          {
            name: "Link Building & Authority",
            items: [
              "High-quality backlink acquisition campaigns",
              "Local citation building and NAP consistency",
              "Industry partnership and collaboration outreach",
              "Digital PR and thought leadership positioning",
              "Link audit and toxic link disavowal"
            ]
          },
          {
            name: "Conversion Optimization",
            items: [
              "Landing page conversion rate optimization",
              "Local lead capture form optimization",
              "Call tracking and conversion attribution setup"
            ]
          }
        ],
        timeline: [
          {
            phase: "Day 0-30 (Foundation & Analysis)",
            items: [
              "Full site audit and technical SEO analysis",
              "Review and optimize sitemap & robots.txt",
              "Complete Google Search Console and Google My Business review",
              "Comprehensive competitor and keyword research",
              "Generate 20-25 SEO-optimized articles",
              "Content audit and metadata optimization",
              "Image SEO optimization and technical fixes",
              "Implement E-E-A-T best practices"
            ]
          },
          {
            phase: "Day 31-60 (Content & Growth)",
            items: [
              "Review 0-30 day performance data and insights",
              "Generate 20-25 additional SEO-optimized articles",
              "Update 5+ existing articles daily for freshness",
              "Program and launch location-based landing pages",
              "Optimize internal linking structure site-wide",
              "Weekly Google My Business posts and local SEO boost",
              "Add comprehensive schema markup implementation",
              "Page speed optimization and performance tuning"
            ]
          },
          {
            phase: "Day 61-90 (Scale & Authority)",
            items: [
              "Review 0-60 day comprehensive data analysis",
              "Generate 20-25 high-authority pages",
              "Rollout programmatic landing pages at scale",
              "Refresh and update older content for relevance",
              "Launch high-quality backlink acquisition campaigns",
              "Local citation building and directory submissions",
              "Conversion rate optimization review and implementation",
              "AI search crawlability and optimization setup"
            ]
          },
          {
            phase: "Ongoing (Month 4+)",
            items: [
              "Monthly comprehensive performance reviews",
              "Content expansion and topical authority building",
              "Continuous keyword opportunity mining",
              "Technical maintenance and optimization",
              "Competitive monitoring and strategy adjustments",
              "Quarterly strategy refinement and goal setting"
            ]
          }
        ]
      };

    case 'paid_ads':
      return template === 'leads' ? {
        title: "Paid Ads Agent Services Scope",
        description: "Our Paid Ads Agent deploys AI directly inside your ad accounts — optimizing bids, reallocating budgets, and refreshing creative continuously, not just during weekly check-ins. The result: faster learning, lower cost per qualified lead, and every dollar of your budget working harder than it would at a traditional agency.",
        highlights: [
          "Dedicated Paid Ads Expert: You'll work one-on-one with a dedicated Paid Ads Expert and Account Manager available for monthly strategy meetings to review performance, discuss goals, and align on priorities.",
          "Optimized for CPQL, Not Just CPL: We don't just chase cheap leads. Our AI optimizes for Cost Per Qualified Lead (CPQL) — focusing your budget on the leads that actually convert into revenue, not just form fills.",
          "Always-On Optimization: Our AI agents live inside your ad accounts 24/7 — adjusting bids, shifting budget to top performers, and pausing underperformers in real time. Traditional agencies review campaigns weekly or biweekly. We optimize continuously.",
          "AI-Powered Creative at Zero Extra Cost: Agencies charge $500-$2,000 per ad creative. Our AI generates and tests multiple creative variations at no additional cost — so 100% of your ad budget goes to media spend, not production fees."
        ],
        categories: [
          {
            name: "Strategic Direction",
            items: [
              "Business goal review and alignment",
              "Channel selection and prioritization",
              "Audience research and segmentation",
              "Budget allocation and optimization",
              "Offer strategy development and testing"
            ]
          },
          {
            name: "Implementation Solutions",
            items: [
              "Pixel setup and quality assurance",
              "Google Tag Manager implementation",
              "Conversion tracking and attribution",
              "Event mapping and custom audiences",
              "CRM integration and lead scoring"
            ]
          },
          {
            name: "AI-Powered Creative",
            items: [
              "AI-generated ad creative at no additional production cost",
              "Multiple creative variations tested simultaneously — not 3-4 ads recycled for months",
              "Winning patterns identified automatically, new variations generated from top performers",
              "Platform-native format adaptation across search, social, and display",
              "Creative refresh cycles that prevent ad fatigue before it impacts performance"
            ]
          },
          {
            name: "Campaign Management",
            items: [
              "Ad account setup and configuration",
              "Campaign launches with real-time monitoring",
              "AI-driven budget reallocation based on live performance signals",
              "Cross-platform campaign coordination",
              "Live issue detection and resolution within hours, not days"
            ]
          },
          {
            name: "Continuous Performance Optimization",
            items: [
              "Real-time bid adjustments based on conversion signals — not weekly manual reviews",
              "Automatic budget shift from underperforming to top-performing campaigns",
              "Audience refinement as the AI learns which segments drive qualified leads",
              "A/B testing running continuously with AI selecting winners automatically",
              "Seasonal and competitive adjustments made proactively as market conditions change"
            ]
          },
          {
            name: "Reporting & Insights",
            items: [
              "Weekly performance reporting and analysis",
              "Channel comparison and optimization",
              "Top performing ad and audience identification",
              "CPQL tracking and lead quality measurement",
              "Strategic recommendations and planning"
            ]
          }
        ],
        timeline: [
          {
            phase: "Day 0-30 (Foundation & Quick Wins)",
            items: [
              "Comprehensive onboarding meeting and goal setting",
              "Full audit of past ad performance and learnings",
              "Re-instrument website with proper pixel implementation",
              "CRM integration and lead tracking setup",
              "Deploy AI optimization agents into ad accounts",
              "Launch initial creative testing with AI-generated ad variations across multiple formats",
              "Begin incrementally testing branded search campaigns",
              "Identify and eliminate current spend inefficiencies — most accounts have 15-30% wasted spend",
              "Implement initial landing page A/B testing"
            ]
          },
          {
            phase: "Day 31-60 (Optimize & Accelerate)",
            items: [
              "Scale creative testing with fresh AI-generated variations based on first 30 days of performance data",
              "Deploy retargeting and remarketing campaigns to recapture warm audiences",
              "Refine keyword targeting and build negative keyword lists from real conversion data",
              "AI agents compound daily optimizations — bid adjustments, audience refinements, budget shifts",
              "Continue landing page refinement informed by actual conversion behavior"
            ]
          },
          {
            phase: "Day 61-90 (Scale & Compound)",
            items: [
              "Deploy advanced audience segmentation based on 60 days of qualified lead data",
              "Implement multi-approach bidding strategies informed by conversion patterns",
              "Launch lead scoring and quality-based optimization to focus spend on highest-value prospects",
              "AI optimization compounds — each day builds on the last, widening the performance gap vs. traditional management"
            ]
          }
        ]
      } : {
        title: "Paid Ads Agent Services Scope",
        description: "Our Paid Ads Agent deploys AI directly inside your ad accounts — optimizing bids, reallocating budgets, and generating fresh creative continuously. For eCommerce, creative volume is everything: Meta's algorithm needs variety to find winners. Our AI produces more creative variations in a week than most agencies produce in a quarter, at zero additional production cost — so every dollar of your ad spend goes to driving revenue.",
        highlights: [
          "Dedicated Paid Ads Expert: You'll work one-on-one with a dedicated Paid Ads Expert and Account Manager available for monthly strategy meetings to review performance, discuss goals, and align on priorities.",
          "Optimized for ROAS & CAC: We don't just chase clicks. Our AI optimizes for Return on Ad Spend (ROAS) and Customer Acquisition Cost (CAC) — focusing your budget on driving profitable revenue, not just traffic.",
          "Always-On Optimization: Our AI agents live inside your ad accounts 24/7 — adjusting bids, shifting budget to top-performing products and audiences, and pausing underperformers in real time. Agencies review campaigns weekly; we never stop.",
          "AI Creative Engine: The #1 reason eCommerce ads decline is creative fatigue. Our AI generates fresh creative variations continuously — testing new hooks, angles, and formats at a pace no human team can match. You get more creative variety AND 100% of your budget goes to media spend, not production fees."
        ],
        categories: [
          {
            name: "Strategic Direction",
            items: [
              "Revenue goal setting and ROAS target alignment",
              "Channel selection based on CAC optimization",
              "Product catalog analysis and prioritization",
              "Budget allocation for maximum profitability",
              "Offer strategy and promotional campaign development"
            ]
          },
          {
            name: "Implementation Solutions",
            items: [
              "Purchase event tracking and revenue attribution",
              "Product feed setup and optimization",
              "Cart abandonment tracking and retargeting",
              "Dynamic product ads implementation",
              "Customer lifetime value optimization"
            ]
          },
          {
            name: "AI-Powered Creative Engine",
            items: [
              "AI-generated creative variations at no additional production cost — agencies charge $500-$2,000 per creative",
              "Continuous creative testing across formats: static, carousel, short video, UGC-style, and product-focused",
              "AI identifies winning patterns and automatically generates new variations from top performers",
              "Creative rotation that prevents ad fatigue — fresh material keeps CPAs low and ROAS high",
              "Seasonal and promotional campaign creative produced in days, not the typical 2-3 week agency timeline"
            ]
          },
          {
            name: "Campaign Management",
            items: [
              "Prospecting campaign setup and scaling",
              "Retargeting and cart abandonment campaigns",
              "Shopping campaign management with AI-driven bidding",
              "Cross-platform campaign coordination",
              "Live performance monitoring with automatic issue resolution"
            ]
          },
          {
            name: "Continuous Performance Optimization",
            items: [
              "Real-time ROAS optimization — budget automatically flows to highest-returning products and audiences",
              "AI-driven bid adjustments based on live conversion and revenue signals",
              "Product-level performance analysis with automatic budget reallocation",
              "Customer journey optimization from first click to purchase",
              "Competitive response — campaigns adapt to market shifts within hours, not weeks"
            ]
          },
          {
            name: "Reporting & Insights",
            items: [
              "ROAS and CAC performance tracking",
              "Revenue attribution and customer journey analysis",
              "Product performance insights and recommendations",
              "Creative performance analysis — which hooks, angles, and formats drive the most revenue",
              "Profitability analysis and strategic recommendations"
            ]
          }
        ],
        timeline: [
          {
            phase: "Day 0-30 (Foundation & Quick Wins)",
            items: [
              "Comprehensive onboarding meeting and revenue goal alignment",
              "Full audit of past ad performance and eCommerce metrics",
              "Product feed setup and catalog optimization",
              "Purchase tracking implementation and testing",
              "Deploy AI optimization agents into ad accounts",
              "Launch Shopping campaigns and dynamic product ads",
              "Launch first round of AI-generated creative testing across multiple formats and hooks",
              "Identify and eliminate current spend inefficiencies — most accounts have 15-30% wasted spend",
              "Implement initial product page A/B testing"
            ]
          },
          {
            phase: "Day 31-60 (Creative Volume & Optimization)",
            items: [
              "Scale AI creative production — fresh variations weekly based on first 30 days of performance data",
              "Deploy cart abandonment retargeting with dynamic product creative",
              "Optimize Shopping and Search keyword targeting with real conversion data",
              "AI agents compound daily optimizations — bids, audiences, budget allocation all improving continuously",
              "Continue product page refinement informed by actual purchase behavior"
            ]
          },
          {
            phase: "Day 61-90 (Scale & Compound)",
            items: [
              "Deploy lookalike audience scaling based on actual purchaser profiles",
              "Full creative rotation preventing ad fatigue — fresh AI-generated variations replace declining performers automatically",
              "Advanced ROAS-optimized bidding across all channels",
              "AI optimization compounds — each day's improvements build on the last, widening the performance gap vs. traditional management"
            ]
          }
        ]
      };

    case 'website':
      return {
        title: "Website Agent Services Scope",
        description: "Our Website Agent delivers professional, AI-optimized websites designed for maximum conversion and seamless integration with your marketing ecosystem. From custom development to ongoing maintenance, we ensure your digital presence drives results.",
        highlights: [
          "Dedicated Web Expert: You'll work one-on-one with a dedicated Web Development Expert who understands your business goals and technical requirements.",
          "Dedicated Account Manager: Unlimited ongoing changes with 2 business-day turnaround. Need updates, new pages, or design tweaks? We've got you covered."
        ],
        categories: [
          {
            name: "Full Site Development",
            items: [
              "Custom website design and development",
              "Mobile-responsive design optimization",
              "User experience (UX) optimization"
            ]
          },
          {
            name: "Search & Conversion Ready",
            items: [
              "SEO-optimized site architecture and URL structure",
              "Conversion tracking setup and configuration",
              "Tracking pixel implementation and testing",
              "Meta tags and schema markup optimization",
              "Site speed optimization for better rankings"
            ]
          },
          {
            name: "Analytics Dashboard",
            items: [
              "Google Analytics 4 setup and configuration",
              "Custom conversion goal tracking",
              "Performance monitoring dashboard setup"
            ]
          },
          {
            name: "Performance & Reliability",
            items: [
              "99.9% uptime guarantee with monitoring",
              "Fast loading speeds (Core Web Vitals optimization)",
              "CDN implementation for global performance",
              "Regular performance audits and optimization"
            ]
          },
          {
            name: "Content Generation",
            items: [
              "AI-powered content creation and optimization",
              "Blog setup and content management system",
              "Landing page development and optimization"
            ]
          },
          {
            name: "Unlimited Changes",
            items: [
              "Design updates and modifications",
              "New page creation and content updates",
              "2 business-day turnaround guarantee"
            ]
          },
          {
            name: "Hosting & Infrastructure",
            items: [
              "Secure cloud hosting included",
              "SSL certificate and HTTPS implementation",
              "Daily backups and disaster recovery",
              "Domain management and DNS configuration"
            ]
          },
          {
            name: "Security & Compliance",
            items: [
              "GDPR compliance implementation",
              "Security monitoring and malware protection",
              "Regular security updates and patches",
              "Privacy policy and terms of service setup"
            ]
          }
        ]
      };

    default:
      throw new Error(`Unknown agent type: ${agent}`);
  }
}

// Legacy static summaries (kept for reference)
export const EXECUTIVE_SUMMARY_CONTENT = {
  leads: "This proposal outlines how MEGA's AI agents will generate high-quality leads for your business — not through periodic reviews like a traditional agency, but through always-on optimization that compounds daily improvements into measurable results.",
  ecom: "This proposal outlines how MEGA's AI agents will drive profitable revenue for your eCommerce business — with always-on optimization, AI-generated creative at zero production cost, and a results-driven approach that outperforms traditional agency models."
};

const AGENT_SUMMARY_PARTS: Record<string, { leads: string; ecom: string }> = {
  seo: {
    leads: "AI-powered SEO/GEO agents that produce 20-25 optimized pages per month and adapt to algorithm changes daily — building organic visibility 3-5x faster than conventional SEO",
    ecom: "AI-powered SEO/GEO agents that produce 20-25 optimized pages per month, increasing organic traffic and product discoverability while building sustainable, long-term search visibility"
  },
  paid_ads: {
    leads: "always-on paid advertising agents that live inside your ad accounts, optimizing bids and budgets continuously to drive down your cost per qualified lead",
    ecom: "always-on paid advertising agents that live inside your ad accounts, generating fresh creative and optimizing for ROAS around the clock"
  },
  website: {
    leads: "conversion-optimized web development with unlimited changes and 2-day turnaround",
    ecom: "conversion-optimized web development designed to turn traffic into purchases, with unlimited changes and 2-day turnaround"
  }
};

const TEMPLATE_OUTRO: Record<string, string> = {
  leads: "delivering measurable results that compound over time.",
  ecom: "driving sustainable, profitable revenue growth."
};

/** Generate an executive summary that only mentions the selected agents */
export function getExecutiveSummary(template: 'leads' | 'ecom', agents: string[]): string {
  const intro = EXECUTIVE_SUMMARY_CONTENT[template];
  const parts = agents
    .map(a => AGENT_SUMMARY_PARTS[a]?.[template])
    .filter(Boolean);

  if (parts.length === 0) return intro;

  let approach: string;
  if (parts.length === 1) {
    approach = parts[0];
  } else if (parts.length === 2) {
    approach = `${parts[0]} and ${parts[1]}`;
  } else {
    approach = `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
  }

  return `${intro} Our approach leverages ${approach} — ${TEMPLATE_OUTRO[template]}`;
}