/**
 * Update the Grooved Learning proposal with agreement terms.
 * 
 * Usage: node scripts/update-grooved-learning.mjs
 * 
 * This fetches the current encoded proposal from the slug,
 * adds agreement sections, re-encodes, and PUTs back.
 */

const VERCEL_URL = 'https://mega-proposals-tailored.vercel.app';
const SLUG = 'grooved-learning';

const agreementSections = [
  {
    title: "1. Campaign Optimization Focus",
    description: "All paid advertising campaigns for Grooved Learning will be optimized for purchases and return on ad spend (ROAS) — not lead-generation metrics such as CPL or CPQL. Campaign success will be measured by revenue generated relative to ad spend."
  },
  {
    title: "2. Creative & Content Approval Rights",
    description: "Grooved Learning will have approval rights before new ad creatives are launched and before SEO content is published, especially during the initial calibration period as we learn your brand voice and direction.",
    subsections: [
      {
        title: "Paid Ads Creatives",
        items: [
          "New creative batches will be shared for review before they go live",
          "Grooved Learning will have 48 hours to review and provide feedback on each batch",
          "Edits and revisions will be incorporated and resubmitted for final approval",
          "Once a strong library of approved creatives is established, Grooved Learning may choose to move to a \"launch and review\" model where creatives go live and are reviewed within 24–48 hours, with the ability to pause any creative immediately"
        ]
      },
      {
        title: "SEO Blog Content & Landing Pages",
        items: [
          "Content briefs and draft articles will be shared before publication",
          "Grooved Learning will have 48 hours to review, request edits, or approve",
          "Feedback will be incorporated and the final version resubmitted for sign-off before going live",
          "Over time, as brand voice calibration strengthens, we may move to a batch review cadence (e.g., weekly review of upcoming content) — but only with mutual agreement"
        ]
      }
    ]
  },
  {
    title: "3. Review & Feedback Process",
    description: "Early feedback is especially valuable — it directly trains our AI on your brand voice, preferred messaging, and visual style. We encourage detailed feedback in the first 30–60 days so output quality ramps quickly. Your involvement early on will directly improve the consistency and quality of everything we produce going forward.",
    items: [
      "Creative feedback shapes future AI-generated variations — the more specific, the faster we calibrate",
      "Content feedback refines tone, structure, and topic selection over time",
      "The goal is to build a strong feedback loop early so the process becomes increasingly efficient"
    ]
  },
  {
    title: "4. Ownership & Intellectual Property",
    description: "All assets created by MEGA AI for Grooved Learning during this engagement belong to Grooved Learning. This includes:",
    items: [
      "Ad creatives (images, videos, copy)",
      "SEO content (blog articles, landing pages, metadata)",
      "Landing pages created within Grooved Learning's Shopify site",
      "Tracking setups and conversion configurations",
      "Campaign structures and audience data within Grooved Learning's ad accounts",
      "Ad account data and performance history"
    ],
    subsections: [
      {
        title: "Ad Account Access",
        description: "Grooved Learning retains full ownership and admin access to all advertising accounts at all times. MEGA AI operates within Grooved Learning's existing ad accounts under granted access — we do not create separate accounts."
      },
      {
        title: "Post-Termination",
        description: "Upon termination, Grooved Learning retains full ownership of all assets listed above. MEGA AI's access to ad accounts and tools will be revoked, and all deliverables completed during the engagement remain property of Grooved Learning."
      }
    ]
  },
  {
    title: "5. Monthly Plan Structure",
    description: "This engagement operates on a month-to-month basis with the following terms:",
    items: [
      "Billing: Monthly, due at the start of each service month",
      "Onboarding fee: None",
      "Minimum commitment: None — this is a month-to-month engagement with no minimum term",
      "Ad spend: Paid directly by Grooved Learning to the advertising platforms (Meta, Google, etc.) and is not included in the management fee"
    ]
  },
  {
    title: "6. Cancellation Process",
    description: "Either party may cancel this agreement by providing 30 days' written notice via email.",
    items: [
      "Cancellation becomes effective at the end of the current billing period following the 30-day notice window",
      "During the notice period, MEGA AI will continue to deliver services as normal and ensure a clean transition, including final reports, data exports, and asset handoffs",
      "Since this is a month-to-month engagement with no minimum commitment, there are no early termination fees or penalties"
    ]
  },
  {
    title: "7. 30/60/90-Day KPI Reporting Framework",
    description: "To ensure alignment on expectations and measurable progress, the following framework will guide performance reviews:",
    subsections: [
      {
        title: "Days 0–30: Foundation & Quick Wins",
        description: "Focus: Account audit, tracking setup, campaign restructuring, first creative tests",
        items: [
          "Tracking accuracy and data integrity (pixel, Shopify integration) verified",
          "Baseline ROAS and CPA established",
          "Wasted spend identified and reduced",
          "First round of creative tests launched",
          "Initial SEO audit completed, keyword strategy defined"
        ]
      },
      {
        title: "Days 31–60: Optimization & Scaling",
        description: "Focus: Creative iteration, audience refinement, SEO content production ramping",
        items: [
          "ROAS trend (target: measurable improvement from baseline toward 3x)",
          "CPA reduction from Month 1",
          "Creative performance data (CTR, conversion rate by creative)",
          "SEO content published (volume and quality)",
          "Keyword rankings and organic traffic trajectory"
        ]
      },
      {
        title: "Days 61–90: Growth & Compounding",
        description: "Focus: Scaling winning campaigns, advanced audience segmentation, SEO authority building",
        items: [
          "ROAS performance vs. target",
          "Revenue growth from paid ads",
          "Cost efficiency improvement (CPA, CAC trends)",
          "Organic keyword growth and traffic volume",
          "Conversion rate from organic traffic",
          "Overall return on investment (management fee + ad spend vs. revenue)"
        ]
      }
    ]
  },
  {
    title: "8. What's Included vs. Additional Costs",
    subsections: [
      {
        title: "Included in the Management Fee",
        items: [
          "All services described in this proposal (Paid Ads management, SEO content creation, technical SEO, campaign optimization, creative production, reporting, and strategy meetings)",
          "Account manager and paid ads specialist time",
          "AI-powered optimization and creative generation tools",
          "All internal tools, software, and technology used by MEGA AI to deliver services"
        ]
      },
      {
        title: "Not Included (Additional Costs Borne by Grooved Learning)",
        items: [
          "Ad spend on Meta, Google, or other advertising platforms",
          "Any third-party tools or subscriptions that Grooved Learning uses independently (e.g., Klaviyo, Shopify apps)",
          "Stock photography, licensed music, or premium stock assets if specifically requested beyond what MEGA AI can produce",
          "Physical product samples or shipping for UGC/content creation (if applicable)"
        ]
      }
    ],
    description: "If any additional cost arises during the engagement, MEGA AI will notify Grooved Learning in advance and obtain approval before proceeding."
  },
  {
    title: "9. Expected Deliverables & Cadence",
    items: [
      "15–25 new ad creative variations per month (static, video, UGC-style)",
      "20–25 SEO-optimized articles and pages per month",
      "SEO landing pages within Shopify as needed, based on keyword opportunities",
      "Weekly performance summary email (key metrics, spend, ROAS, notable changes)",
      "Monthly comprehensive strategy review meeting (30–60 min)"
    ],
    description: "Deliverable volume may fluctuate based on performance priorities, seasonal opportunities, and strategic direction. The above represents typical output — not rigid minimums or maximums. Ad hoc calls or emails are available as needed for creative approvals, questions, or urgent optimizations."
  },
  {
    title: "10. Your Team & Point of Contact",
    description: "Your dedicated Account Manager will be your primary human point of contact for all day-to-day communication, approvals, and strategic discussions. They will be introduced during onboarding and will be your single point of accountability throughout the engagement.",
    subsections: [
      {
        title: "How Communication Works",
        items: [
          "Day-to-day questions, approvals, and feedback: Direct email or messaging with your Account Manager",
          "Creative and content review: Shared via email with clear timelines for feedback",
          "Monthly strategy reviews: Scheduled call with your Account Manager (and paid ads specialist when relevant)",
          "Urgent issues: Your Account Manager is available via email during business hours with same-day response"
        ]
      },
      {
        title: "The AI + Human Model",
        description: "While MEGA AI's technology handles the heavy lifting on optimization, creative generation, and data analysis, every strategic decision, client communication, and approval is managed by a human team member. The AI is a tool that makes your team faster and more effective — it does not replace the human relationship."
      }
    ]
  },
  {
    title: "11. Governing Law & Dispute Resolution",
    description: "This agreement shall be governed by and construed in accordance with the laws of the State of Georgia, United States, without regard to conflict of law principles. In the event of any dispute, both parties agree to first attempt resolution through good-faith negotiation. If the dispute cannot be resolved within 30 days, either party may pursue mediation or binding arbitration in accordance with the rules of the American Arbitration Association, with proceedings held in the State of Georgia."
  },
  {
    title: "Website Scope",
    description: "MEGA AI acknowledges that Grooved Learning's Shopify website was recently rebuilt and that this engagement does not include website redesign, website rebuilding, website migration, or general website management services.",
    items: [
      "Website-related work is strictly limited to adding or recommending SEO-focused landing pages within the existing Shopify site as needed",
      "Conversion rate optimization (CRO) updates within the existing site structure are available only when supported by data and approved in advance by Grooved Learning",
      "No major structural, design, or technical changes will be made without prior discussion and written approval",
      "Any landing pages or content assets created within the existing Shopify site as part of SEO support belong to Grooved Learning and are not subject to any website buyout or retained ownership provisions",
      "MEGA AI will not have administrative access to Shopify beyond what is necessary for implementing approved SEO landing pages and tracking"
    ]
  },
  {
    title: "Transition & Onboarding Plan",
    description: "Target Start Date: Monday, April 14, 2026 | Current Agency Contract End: April 27, 2026 | Transition Period: ~2 weeks of overlap",
    subsections: [
      {
        title: "Week 1 (April 14–18): Research & Audit",
        items: [
          "Onboarding meeting and goal alignment",
          "Full audit of existing Meta and Google Ads accounts",
          "Review of existing creative assets and brand guidelines",
          "Tracking audit and re-instrumentation as needed",
          "SEO audit and keyword strategy development",
          "Access to all existing digital assets for creatives and blog content"
        ]
      },
      {
        title: "Week 2 (April 21–25): Build & Launch",
        items: [
          "New campaign structures built and ready for launch",
          "First batch of creatives shared for approval",
          "SEO content calendar established",
          "Tracking verified and tested",
          "Campaigns launched with budget allocation strategy"
        ]
      }
    ]
  }
];

// Now we need to: fetch current encoded proposal, decode, add sections, re-encode, PUT back
// Since we can't import the TS encode module directly, we'll replicate the encode/decode logic here

function decodeProposal(encoded) {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const json = Buffer.from(base64, 'base64').toString('utf-8');
  return JSON.parse(json);
}

function encodeProposal(payload) {
  const json = JSON.stringify(payload);
  return Buffer.from(json).toString('base64url');
}

async function main() {
  // Step 1: Fetch current proposal from Vercel Blob via the page's API
  // We need the BLOB_READ_WRITE_TOKEN or use the public API
  // Let's try the proposals API
  
  console.log('Fetching current Grooved Learning proposal...');
  
  // We'll read the blob directly. We need the token.
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error('Need BLOB_READ_WRITE_TOKEN env var. Check Vercel project settings.');
    // Try to get it from .env.local
    const fs = await import('fs');
    const path = await import('path');
    try {
      const envPath = path.join(process.cwd(), '.env.local');
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const match = envContent.match(/BLOB_READ_WRITE_TOKEN=(.+)/);
      if (match) {
        process.env.BLOB_READ_WRITE_TOKEN = match[1].trim();
        console.log('Found token in .env.local');
      }
    } catch (e) {
      // ignore
    }
  }

  // Alternative: use the update API which just needs the encoded proposal
  // First, let's construct the new encoded proposal by reading the current one from the page source
  
  // Actually, let's just hit the slug page server-side to get the encoded proposal
  // The page fetches from blob and passes to client. We can use the API instead.
  
  // Let's try fetching the proposal page and extracting the encoded ID from server-rendered data
  // OR better: use the Vercel Blob API directly
  
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    console.error('Set BLOB_READ_WRITE_TOKEN environment variable');
    process.exit(1);
  }

  // List blobs to find the proposal
  const listRes = await fetch(`https://blob.vercel-storage.com?prefix=proposals/${SLUG}.json`, {
    headers: { Authorization: `Bearer ${blobToken}` },
  });
  
  if (!listRes.ok) {
    console.error('Failed to list blobs:', await listRes.text());
    process.exit(1);
  }

  const listData = await listRes.json();
  const blob = listData.blobs?.find(b => b.pathname === `proposals/${SLUG}.json`);
  
  if (!blob) {
    console.error('Proposal not found in blob storage');
    process.exit(1);
  }

  // Fetch the blob content
  const blobRes = await fetch(blob.url, {
    headers: { Authorization: `Bearer ${blobToken}` },
  });
  
  if (!blobRes.ok) {
    console.error('Failed to fetch blob:', await blobRes.text());
    process.exit(1);
  }

  const blobData = await blobRes.json();
  console.log('Current blob data keys:', Object.keys(blobData));
  
  const currentEncoded = blobData.encodedProposal;
  if (!currentEncoded) {
    console.error('No encodedProposal in blob data');
    process.exit(1);
  }

  // Decode current proposal
  const payload = decodeProposal(currentEncoded);
  console.log('Current proposal:', {
    customerName: payload.cn,
    companyName: payload.co,
    template: payload.t,
    agents: payload.a,
    terms: payload.st,
  });

  // Add agreement sections
  payload.as = agreementSections;
  
  // Update timestamp
  payload.ts = Date.now();

  // Re-encode
  const newEncoded = encodeProposal(payload);
  console.log(`New encoded length: ${newEncoded.length} chars`);

  // PUT back via the update API
  const updateRes = await fetch(`${VERCEL_URL}/api/proposals/update/${SLUG}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ encodedProposal: newEncoded }),
  });

  if (!updateRes.ok) {
    console.error('Failed to update:', await updateRes.text());
    process.exit(1);
  }

  const result = await updateRes.json();
  console.log('Updated successfully:', result);
  console.log(`View at: ${VERCEL_URL}/p/${SLUG}`);
}

main().catch(console.error);
