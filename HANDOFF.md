# MEGA Proposal Generator — Implementation Handoff

**Repository:** https://github.com/megaclaw-reader/mega-proposals-tailored  
**Branch:** `main`  
**Commit:** `83a143f` (Oct 5, 2026)  
**Live URL:** https://mega-proposals-tailored.vercel.app  
**Create page:** https://mega-proposals-tailored.vercel.app/create  

---

## 1. Architecture & Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 16.1.6 (App Router) | TypeScript, React 19 |
| Styling | Tailwind CSS 4 | PostCSS integration |
| Hosting | Vercel (Pro plan) | Serverless functions, auto-deploy from GitHub |
| Proposal Storage | **Vercel Blob** (private) | ~5,735 proposals as JSON files (`proposals/{slug}.json`) |
| Legacy DB | SQLite (`data/proposals.db`) | Old proposal storage — still in codebase but **not used by the `/p/` slug-based flow** |
| AI | Anthropic Claude API | Transcript analysis + executive summary generation |
| Transcripts | Fireflies.ai GraphQL API | Meeting transcript ingestion |
| Transcripts | JustCall (shared voice links) | Phone call transcript ingestion (no auth needed) |
| E-Signatures | OneSpan Sign (OAuth2) | Contract signing for monthly + commitment proposals |
| Payments | Stripe | Static Payment Links (bundles) + dynamic checkout via `gomega.ai/api/create-checkout` (à la carte) |
| Notifications | Slack Bot API | DMs signed contracts to sales reps |
| PDF Generation | `@react-pdf/renderer` | Service agreement PDFs for OneSpan signing |

### Key Architecture Decision: Stateless Proposals via URL Encoding

Proposals are **self-contained in a base64-encoded JSON payload**. The encoded string contains ALL proposal configuration (customer, agents, terms, discounts, transcript insights, etc.). This means:

- The **slug-based URL** (`/p/{slug}`) looks up blob storage to get the encoded payload + metadata
- The **legacy URL** (`/proposal/{id}`) decodes the ID directly — no server lookup needed
- Blob metadata stores **overrides** on top of the encoded payload: custom addenda, Stripe link overrides, guarantee settings, signing status, custom pricing, etc.

---

## 2. How to Install, Run, Build, and Test

```bash
# Clone
git clone https://github.com/megaclaw-reader/mega-proposals-tailored.git
cd mega-proposals-tailored

# Install
npm install

# Configure (see .env.example)
cp .env.example .env.local

# Run locally
npm run dev        # http://localhost:3000

# Build for production
npm run build

# Start production server
npm run start
```

**No tests exist.** Verification has been manual. See Section 8 for an acceptance checklist.

---

## 3. Complete Workflow: User Input → Final Proposal

### 3a. Creating a Proposal (`/create`)

1. Sales rep fills the form:
   - Customer name, company name
   - Template: `leads` (lead gen) or `ecom` (eCommerce)
   - Agent selection: individual agents OR predefined bundles (Starter/Grow/Grow Faster/Grow Faster Ecom)
   - Contract terms: annual/bi-annual/quarterly/monthly with per-term discounts (% and/or $)
   - Optional: Fireflies URL(s), JustCall URL(s), free-text business context
   - Optional: money-back guarantee, discount expiry timer, monthly billing toggle

2. If transcript URL(s) provided:
   - `POST /api/fetch-transcript` — fetches meeting notes from Fireflies GraphQL API
   - `POST /api/fetch-justcall` — fetches phone transcript from JustCall shared link API
   - `POST /api/analyze-transcript` — sends combined transcript text to Claude for analysis → returns `FirefliesInsights` (pain points, solutions, discussion topics, executive summary)
   - Rep can review and edit AI-generated insights before finalizing

3. If only business context provided (no transcript):
   - `POST /api/generate-summary` — sends context to Claude → returns executive summary

4. On submit:
   - All config encoded via `encodeProposal()` → base64url string
   - `POST /api/proposals/create` — stores blob at `proposals/{slug}.json`, returns slug + URL
   - Rep gets shareable link: `https://mega-proposals-tailored.vercel.app/p/{slug}`

### 3b. Viewing a Proposal (`/p/{slug}`)

1. Server component (`page.tsx`) fetches blob from Vercel Blob (tries `head()` then `list()` for consistency)
2. Extracts: `encodedProposal` + all metadata overrides (addenda, guarantees, custom pricing, signing status, etc.)
3. Passes to `ProposalClient.tsx` which:
   - Decodes the base64 payload via `decodeProposal()`
   - Calculates pricing via `calculatePricing()` with bundle/à la carte/custom overrides
   - Renders: hero, executive summary, pain points + solutions (if insights exist), agent service scopes, 30/60/90-day timeline, pricing cards, CTA buttons, optional addendum
4. Pricing card CTA buttons:
   - **Bundles:** link to static Stripe Payment Links (`getBundleStripeLink()`)
   - **À la carte:** `POST /api/create-checkout` → proxies to `gomega.ai/api/create-checkout` → returns Stripe Checkout Session URL
   - **Monthly + commitment:** opens OneSpan e-signature flow first, then redirects to Stripe after signing

### 3c. Editing a Proposal (`/p/{slug}/edit`)

- `EditClient.tsx` — loads blob data, decodes payload, presents edit form
- On save: re-encodes payload, `PUT /api/proposals/update/{slug}` — updates blob

### 3d. E-Signature Flow (OneSpan)

1. Customer clicks "Sign & Pay" on a monthly+commitment proposal
2. Frontend calls `POST /api/onespan/create-signature` with contract details
3. Server: generates PDF via `@react-pdf/renderer` → uploads to OneSpan → creates package → returns signing URL
4. Customer signs in OneSpan embedded UI
5. OneSpan redirects to `GET /api/onespan/signed-redirect`:
   - Marks proposal blob as `signed: true`
   - Downloads signed PDF from OneSpan
   - DMs sales rep on Slack with signed PDF attached
   - Redirects customer to Stripe checkout

### 3e. Proposal Directory (`/directory`)

- Lists all proposals from Vercel Blob with search/filter
- Shows company name, creation date, signing status

---

## 4. Pricing System

### Bundle Pricing (`src/lib/pricing.ts`)

Four bundles with per-term monthly rates:

| Bundle | Monthly | Quarterly | Bi-Annual | Annual |
|--------|---------|-----------|-----------|--------|
| Starter (SEO + Website) | $1,199 | $998 | $795 | $849 |
| Grow (CRM + Website + SEO) | $1,549 | $1,328 | $1,165 | $1,099 |
| Grow Faster (All 4) | $2,399 | $1,998 | $1,665 | $1,699 |
| Grow Faster Ecom (Web + SEO + Ads) | $2,399 | $1,999 | $1,899 | $1,679 |

### À la Carte Pricing

Individual agent rates in `PRICING_TABLE` and `STRIPE_UPFRONT_TOTALS`. SEO + Paid Ads combo gets special pricing.

### Stripe Links (`src/lib/stripe-links.ts`)

- `BUNDLE_STRIPE_LINKS` — static Payment Links for each bundle × term
- `STRIPE_LINKS` — static Payment Links for every agent combo × term (currently disabled — `getStripeLink()` returns `null`)
- À la carte checkout goes through dynamic sessions via `gomega.ai/api/create-checkout`

### Per-Proposal Overrides (stored in blob metadata)

- `customMonthlyPrice` — override monthly rate (global or per-term: `{ bi_annual: 1899 }`)
- `customAgentPrices` — override per-agent prices (global or per-term)
- `customStripeLinks` — override Stripe checkout URL per term
- `discountExpiresAt` — ISO timestamp; shows countdown timer, zeroes discounts when expired

---

## 5. AI Integration (Anthropic Claude API)

The running app makes **two types of API calls** to Anthropic:

### 5a. Transcript Analysis (`/api/analyze-transcript`)

- **Model:** `claude-sonnet-4-5-20250929` (fallback: `claude-sonnet-4-6`)
- **Input:** Combined transcript text from Fireflies and/or JustCall, company name, selected agents, template type
- **Output:** `FirefliesInsights` JSON — pain points, MEGA solutions, summary, discussion topics
- **Key behaviors:**
  - Only generates insights relevant to selected services (scrubs references to unselected agents)
  - Post-generation validation removes "cop-out" solutions and paid ads terms if paid ads not selected
  - Truncates transcripts >22K chars (keeps first 18K + last 4K)
  - Retries on 429/5xx with model fallback
  - 60s function timeout (`maxDuration = 60`)

### 5b. Summary Generation (`/api/generate-summary`)

- **Model:** `claude-sonnet-4-6`
- **Input:** Free-text business context, company name, template, agents
- **Output:** 2-3 sentence executive summary
- Simpler prompt, no retries

**The full prompts are in the source code** — `src/app/api/analyze-transcript/route.ts` and `src/app/api/generate-summary/route.ts`. They are extensive and carefully tuned (see the inline rules about service-specific filtering, price scrubbing, and specificity requirements).

---

## 6. Proposal Data Storage

### Primary: Vercel Blob (Private)

- **~5,735 proposals** stored as `proposals/{slug}.json`
- Each blob contains:
  - `encodedProposal` — base64url-encoded JSON with all proposal config
  - `companyName`, `createdAt`, `updatedAt`
  - Optional metadata: `showTerms`, `guaranteeDays`, `midpointGuarantee`, `guaranteePlans`, `customNotes`, `customNotesTitle`, `currency`, `currencyRate`, `customStripeLinks`, `customAddendum`, `customAddendumTitle`, `customAddendumSubtitle`, `monthlyBilling`, `discountExpiresAt`, `signedAgreement`, `signed`, `signedAt`, `selectedBundle`, `customMonthlyPrice`, `customAgentPrices`, `onespan` (signing metadata)
- Access: private blobs require `BLOB_READ_WRITE_TOKEN` to read
- Tied to Vercel project `mega-proposals-tailored` under team `june-hamiltons-projects`

### Legacy: SQLite (`data/proposals.db`)

- Used by the old `/proposal/{id}` route (numeric/nanoid-based URLs)
- Contains `proposals` and `signatures` tables
- **Not used by the current `/p/{slug}` flow** — kept for backward compatibility
- File lives at `{project}/data/proposals.db` on the server filesystem
- On Vercel serverless, this is **ephemeral** — data doesn't persist between cold starts
- Any proposals created via the old flow that aren't in blob storage are effectively lost

### Proposal ↔ User Association

**There is currently no user/auth system.** Proposals are not tied to user accounts. The sales rep's name and email are stored in the encoded payload (`sr`, `se` fields), but there's no login, no RBAC, no per-user proposal lists. The `/create` page is open. The `/directory` page lists all proposals.

---

## 7. Integration Notes for Admin Migration

### Components That Can Be Reused Directly

1. **`src/lib/pricing.ts`** — Pure pricing calculation logic. No UI dependencies.
2. **`src/lib/stripe-links.ts`** — Stripe link mappings. Pure data + lookup functions.
3. **`src/lib/types.ts`** — TypeScript type definitions. Framework-agnostic.
4. **`src/lib/encode.ts`** — Proposal encode/decode. Pure logic (works in browser + Node).
5. **`src/lib/content.ts`** — Service descriptions, scope content, timelines. Pure data.
6. **`src/lib/contract-pdf.tsx`** — PDF generation with `@react-pdf/renderer`. React dependency but no Next.js coupling.
7. **API route logic** — The business logic in each API route (`analyze-transcript`, `fetch-transcript`, `create-signature`, etc.) is portable. The Next.js `NextRequest`/`NextResponse` wrappers are thin.

### Components Tied to Current Platform

1. **Vercel Blob storage** — All CRUD for proposals. Must be replaced with Admin's database/storage.
2. **Vercel serverless runtime** — `maxDuration` settings, `VERCEL_PROJECT_PRODUCTION_URL`, etc.
3. **Next.js App Router patterns** — `page.tsx` server components, `route.ts` API routes, `dynamic = 'force-dynamic'`.
4. **`ProposalClient.tsx` (1,453 lines)** — The main proposal rendering component. Heavy, complex, many conditional branches. Uses Tailwind for styling. Will need UI adaptation to match Admin's design system.
5. **`create/page.tsx` (1,069 lines)** — The proposal creation form. Same considerations.

### What the Receiving Developer Needs to Inspect in Admin

1. **Authentication & permissions** — Who can create/view/edit proposals? Map to existing Admin roles.
2. **Database** — Where to store proposals. The blob JSON structure is documented above; could map to a DB table.
3. **Design system** — ProposalClient.tsx uses Tailwind + custom styling. Adapt to Admin's component library.
4. **Navigation** — Where "Proposal Generator" sits in the Sales sidebar.
5. **API layer** — Admin likely has its own API pattern (REST/GraphQL). Port the route logic.
6. **Deployment** — Admin's CI/CD pipeline vs. current Vercel auto-deploy.
7. **External service credentials** — Anthropic, Fireflies, OneSpan, Slack, Stripe need to be configured in Admin's env.

### Migration Strategy

The encoded proposal format (`encodeProposal`/`decodeProposal`) is **self-contained and portable**. You could:

1. **Keep the encoding scheme** — Existing proposal URLs can still work if you can decode them
2. **Migrate blob data** — Export all 5,735 proposal JSONs from Vercel Blob into Admin's database
3. **Port API routes** — The business logic is separable from Next.js wrappers
4. **Rebuild the UI** — Adapt ProposalClient.tsx to Admin's design system (this is the biggest lift)

---

## 8. Verification & Acceptance Checklist

### Representative Test Cases

**Test 1: Basic bundle proposal (no transcript)**
- Create: Grow Faster bundle, leads template, quarterly, "Acme Corp", any rep
- Verify: pricing shows $1,998/mo, $5,994 quarterly total
- Verify: CTA links to correct Stripe Payment Link
- Verify: service scope shows all 4 agents with timelines

**Test 2: Transcript-based proposal**
- Create: SEO + Paid Ads, provide a Fireflies URL
- Verify: AI generates pain points and solutions
- Verify: pain points only reference SEO and Paid Ads (no CRM/Website mentions)
- Verify: executive summary is personalized, not generic

**Test 3: Per-term discounts**
- Create: any agents, multiple terms, 10% discount on annual
- Verify: annual card shows strikethrough original + discounted price
- Verify: other term cards show undiscounted prices

**Test 4: Custom addendum**
- After creating, manually add `customAddendum` to blob
- Verify: addendum renders at bottom of proposal

**Test 5: E-signature flow (monthly + commitment)**
- Create: monthly term with `minimumTermMonths`
- Verify: "Sign & Pay" button appears
- Verify: clicking triggers OneSpan flow
- Verify: after signing, Slack DM is sent to rep with PDF

**Test 6: Discount expiry**
- Create with `discountExpiresAt` set to 5 minutes from now
- Verify: countdown timer shows
- Wait for expiry → verify: discounts zero out, timer shows "Expired"

**Test 7: Edit flow**
- Navigate to `/p/{slug}/edit`
- Change customer name or agents
- Save → verify changes reflected on proposal page

**Test 8: Directory**
- Navigate to `/directory`
- Verify: lists proposals with search functionality

### Edge Cases

- Proposal with all 4 agents individually (no bundle) — uses `STRIPE_UPFRONT_TOTALS` math
- Proposal with `customMonthlyPrice` per-term override — verify correct total
- Proposal with `customStripeLinks` — verify CTA uses override link
- Proposal with CAD currency — verify `$CAD` prefix and rate conversion
- eCommerce template — verify different Paid Ads scope content
- Proposal with `quoteOptions` (multi-quote cards) — verify multiple pricing cards render

---

## 9. Access Checklist

| Resource | What | Access Needed | Current Status |
|----------|------|---------------|----------------|
| **GitHub repo** | `megaclaw-reader/mega-proposals-tailored` | Read + write for the integrating developer | You (Julien) have owner access via the `megaclaw-reader` org |
| **Vercel project** | `mega-proposals-tailored` on team `june-hamiltons-projects` | Admin access to manage env vars, view deployments, access Blob storage | Currently under june@gomega.ai's Vercel account. You need to invite the new developer or transfer the project. |
| **Vercel Blob store** | ~5,735 proposal JSONs | Read access to export/migrate existing proposals | Tied to the Vercel project. Accessible via `BLOB_READ_WRITE_TOKEN`. |
| **Anthropic API** | Claude API for transcript analysis + summary generation | API key with billing | Key exists in Vercel env vars. New developer needs their own key or shared access. |
| **Fireflies.ai** | Meeting transcript API | API key | Current key: in Vercel env. Covers all team transcripts. |
| **OneSpan Sign** | E-signature service | OAuth2 client credentials | Account under Julien's email. Client ID + API key in Vercel env. |
| **Slack workspace** | Bot for DM notifications | Bot token with `chat:write`, `files:write`, `users:read.email` scopes | Bot token in Vercel env. |
| **Stripe** | Payment Links + checkout | No direct Stripe API key needed — checkout proxies through `gomega.ai/api/create-checkout` | Static Payment Links are hardcoded URLs. Dynamic checkout depends on gomega.ai's API. |
| **gomega.ai** | Dynamic Stripe checkout endpoint | The Admin app presumably already has this | `POST gomega.ai/api/create-checkout` with `{ agentIds, cycle }` |

### To export existing proposals from Vercel Blob:

```bash
# In the project directory with BLOB_READ_WRITE_TOKEN set:
node -e "
const { list } = require('@vercel/blob');
const fs = require('fs');
(async () => {
  let cursor; const all = [];
  do {
    const r = await list({ prefix: 'proposals/', limit: 100, cursor });
    all.push(...r.blobs);
    cursor = r.cursor;
  } while (cursor);
  
  fs.mkdirSync('export', { recursive: true });
  for (const blob of all) {
    const res = await fetch(blob.url, { 
      headers: { Authorization: 'Bearer ' + process.env.BLOB_READ_WRITE_TOKEN } 
    });
    const data = await res.text();
    const filename = blob.pathname.replace('proposals/', '');
    fs.writeFileSync('export/' + filename, data);
  }
  console.log('Exported', all.length, 'proposals');
})();
"
```

---

## 10. Known Issues, Limitations & Unfinished Work

1. **No authentication/authorization.** `/create` and `/directory` are open. Any proposal URL is accessible to anyone with the link.
2. **No tests.** Zero unit, integration, or e2e tests exist.
3. **SQLite is vestigial.** `database.ts` and the old `/proposal/{id}` routes use SQLite which doesn't persist on Vercel serverless. Only blob storage matters.
4. **HelloSign routes are dead code.** `src/app/api/hellosign/` — replaced by OneSpan. Still in codebase.
5. **Puppeteer dependency** is in `package.json` but appears unused in current flows (was likely for PDF generation before `@react-pdf/renderer`).
6. **Blob eventual consistency.** Newly created proposals occasionally 404 for a few seconds. Mitigated by `ProposalRetryLoader.tsx` (client-side retry) and `head()` before `list()`.
7. **`proposals/.json`** — there's a malformed blob with an empty slug (first in the listing). Harmless but messy.
8. **Grow Faster Ecom bundle** bi-annual pricing ($1,899/mo) was NOT updated with the Oct 5 2026 pricing changes — only Starter/Grow/Grow Faster were updated.
9. **OneSpan free trial limits:** 100 packages, 5 senders, eSign Disclosure banner cannot be removed.

---

## 11. Environment Variables

See `.env.example` (created alongside this document) for all required variables with placeholder values.

---

## 12. Missing Items / Blockers

1. **Vercel project access** — The integrating developer needs to be invited to the Vercel team, OR the `BLOB_READ_WRITE_TOKEN` must be shared for proposal export.
2. **Proposal data migration plan** — 5,735 proposals need a migration path. Export script provided above.
3. **Admin codebase access** — Not available to me. The integrating developer needs to determine: framework, API patterns, auth system, database, and design system.
4. **Stripe account access** — Static Payment Links are hardcoded URLs. If pricing changes, someone with Stripe dashboard access needs to create new links.
5. **OneSpan account credentials** — Currently under Julien's email. May need to be transferred or shared.
