#!/usr/bin/env node
/**
 * Comprehensive Proposal Generator Test Suite
 * Tests every critical code path end-to-end against production.
 * 
 * Usage: node scripts/test-proposal-generator.js [--quick]
 *   --quick: skip the slow AI analysis tests (for rapid checks)
 */

const BASE_URL = process.env.BASE_URL || 'https://mega-proposals-tailored.vercel.app';
const QUICK = process.argv.includes('--quick');

const results = [];
let passed = 0;
let failed = 0;

function log(status, name, detail = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  results.push({ status, name, detail });
  if (status === 'PASS') passed++;
  else if (status === 'FAIL') failed++;
  console.log(`${icon} ${name}${detail ? ' — ' + detail : ''}`);
}

async function fetchJSON(path, body, timeoutMs = 60000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = null; }
    return { status: res.status, json, text, ok: res.ok };
  } catch (err) {
    clearTimeout(timer);
    return { status: 0, json: null, text: err.message, ok: false, error: err };
  }
}

async function fetchPage(path, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE_URL}${path}`, { signal: controller.signal, redirect: 'follow' });
    clearTimeout(timer);
    const text = await res.text();
    return { status: res.status, text, ok: res.ok };
  } catch (err) {
    clearTimeout(timer);
    return { status: 0, text: err.message, ok: false };
  }
}

// ─── TEST SUITES ───

async function testPages() {
  console.log('\n═══ PAGE LOAD TESTS ═══');
  
  const pages = [
    ['/create', 'Create page'],
    ['/checkout', 'Checkout page'],
  ];
  for (const [path, name] of pages) {
    const res = await fetchPage(path);
    if (res.ok && res.text.includes('DOCTYPE')) log('PASS', name, `HTTP ${res.status}`);
    else log('FAIL', name, `HTTP ${res.status}`);
  }
}

async function testTranscriptFetch() {
  console.log('\n═══ TRANSCRIPT FETCH TESTS ═══');
  
  // Valid URL with -id format
  const r1 = await fetchJSON('/api/fetch-transcript', { firefliesUrl: 'https://app.fireflies.ai/view/Meeting-id01M2NWXE5CE57DYTTN9KFYDPPE' });
  if (r1.ok && r1.json?.title && r1.json?.summary) log('PASS', 'Valid Fireflies URL (-id format)', r1.json.title);
  else log('FAIL', 'Valid Fireflies URL (-id format)', r1.json?.error || `HTTP ${r1.status}`);
  
  // Valid URL with :: format
  const r2 = await fetchJSON('/api/fetch-transcript', { firefliesUrl: 'https://app.fireflies.ai/view/Meeting::01M2NWXE5CE57DYTTN9KFYDPPE' });
  if (r2.ok && r2.json?.title) log('PASS', 'Valid Fireflies URL (:: format)', r2.json.title);
  else log('FAIL', 'Valid Fireflies URL (:: format)', r2.json?.error || `HTTP ${r2.status}`);
  
  // Nonexistent transcript
  const r3 = await fetchJSON('/api/fetch-transcript', { firefliesUrl: 'https://app.fireflies.ai/view/test-id01AAAAAAAAAAAAAAAAAAAAAA' });
  if (r3.status === 404 && r3.json?.error) log('PASS', 'Nonexistent transcript returns 404', r3.json.error);
  else log('FAIL', 'Nonexistent transcript', `Expected 404, got ${r3.status}`);
  
  // Invalid URL
  const r4 = await fetchJSON('/api/fetch-transcript', { firefliesUrl: 'https://google.com' });
  if (r4.status === 400) log('PASS', 'Non-Fireflies URL returns 400');
  else log('FAIL', 'Non-Fireflies URL', `Expected 400, got ${r4.status}`);
  
  // Empty URL
  const r5 = await fetchJSON('/api/fetch-transcript', { firefliesUrl: '' });
  if (r5.status === 400) log('PASS', 'Empty URL returns 400');
  else log('FAIL', 'Empty URL', `Expected 400, got ${r5.status}`);
}

async function testAnalyzeTranscript() {
  console.log('\n═══ AI ANALYSIS TESTS (agent constraint validation) ═══');
  if (QUICK) { console.log('  [skipped — use without --quick for full test]'); return; }
  
  const transcript = `Prospect runs a personal injury law firm with 5 attorneys in Miami. 
They spend $5K/month on Google Ads with poor ROI — getting clicks but not quality cases. 
No SEO strategy at all, zero organic traffic. They use Clio as their CRM but leads aren't 
tracked properly. After-hours calls go to voicemail and they lose cases to faster competitors.
Website is outdated, loads slowly, not mobile-friendly. They want 20+ new cases per month.
Current revenue is about $2M/year. Average case value is $15K. They mentioned competitors 
like Morgan & Morgan dominating search results.`;

  const agentCombos = [
    { agents: ['seo'], name: 'SEO only' },
    { agents: ['paid_ads'], name: 'Paid Ads only' },
    { agents: ['website'], name: 'Website only' },
    { agents: ['crm'], name: 'CRM only' },
    { agents: ['seo', 'website'], name: 'SEO + Website (previously broken combo)' },
    { agents: ['seo', 'paid_ads', 'crm', 'website'], name: 'All 4 agents' },
  ];
  
  const copOutPattern = /no selected services|not in scope|noted for (internal )?reference only|outside the scope|not included in.*selected|no solutions can be mapped/i;
  
  for (const combo of agentCombos) {
    const t0 = Date.now();
    const res = await fetchJSON('/api/analyze-transcript', {
      transcriptSummary: transcript,
      meetingTitle: 'Test Call',
      companyName: 'Miami Injury Law',
      sourceType: 'fireflies',
      selectedAgents: combo.agents,
      template: 'leads',
    }, 65000);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    
    if (!res.ok) {
      log('FAIL', `Analysis: ${combo.name}`, `HTTP ${res.status} in ${elapsed}s — ${res.json?.error || 'no response'}`);
      continue;
    }
    
    const insights = res.json?.insights;
    if (!insights || !insights.painPoints?.length) {
      log('FAIL', `Analysis: ${combo.name}`, `No insights returned in ${elapsed}s`);
      continue;
    }
    
    // Check for cop-out solutions
    const copOuts = insights.megaSolutions.filter(s => copOutPattern.test(s));
    if (copOuts.length > 0) {
      log('FAIL', `Analysis: ${combo.name}`, `${copOuts.length} cop-out solution(s) in ${elapsed}s: "${copOuts[0].substring(0, 80)}..."`);
      continue;
    }
    
    // Check solution count matches pain points
    if (insights.megaSolutions.length !== insights.painPoints.length) {
      log('WARN', `Analysis: ${combo.name}`, `${insights.painPoints.length} pain points but ${insights.megaSolutions.length} solutions`);
    }
    
    // Check empty solutions
    const emptySolutions = insights.megaSolutions.filter(s => !s || s.trim().length < 20);
    if (emptySolutions.length > 0) {
      log('FAIL', `Analysis: ${combo.name}`, `${emptySolutions.length} empty/stub solution(s)`);
      continue;
    }
    
    log('PASS', `Analysis: ${combo.name}`, `${insights.painPoints.length} pairs, ${elapsed}s`);
  }
}

async function testProposalCreateAndLoad() {
  console.log('\n═══ PROPOSAL CREATE + LOAD TESTS ═══');
  
  const basePayload = {
    cn: 'Audit Test Co', co: 'Audit Test Company', t: 'leads',
    a: ['seo', 'paid_ads'], sr: 'Test Rep', se: 'test@gomega.ai',
    ts: Date.now(), st: [{ t: 'annual', d: 0, dd: 0 }],
  };
  
  const testCases = [
    { name: 'Basic proposal (no insights)', payload: { ...basePayload }, opts: {} },
    { name: 'With Fireflies insights', payload: { ...basePayload, fi: {
      painPoints: ['Test pain point about SEO'], megaSolutions: ['Test solution about SEO'],
      summary: 'Test summary', discussionTopics: ['Test topic'],
    }}, opts: {} },
    { name: 'With 30-day guarantee', payload: { ...basePayload }, opts: { guaranteeDays: 30 } },
    { name: 'With 60-day guarantee', payload: { ...basePayload }, opts: { guaranteeDays: 60 } },
    { name: 'With bundle (grow_faster)', payload: { ...basePayload, sb: 'grow_faster', a: ['crm', 'website', 'seo', 'paid_ads'] }, opts: {} },
    { name: 'With dollar discount', payload: { ...basePayload, st: [{ t: 'annual', d: 0, dd: 500 }] }, opts: {} },
    { name: 'With monthly billing', payload: { ...basePayload }, opts: { monthlyBilling: true } },
    { name: 'With discount expiry', payload: { ...basePayload }, opts: { discountExpiresAt: new Date(Date.now() + 86400000).toISOString() } },
    { name: 'Ecom template', payload: { ...basePayload, t: 'ecom' }, opts: {} },
    { name: 'Special chars in company', payload: { ...basePayload, co: "O'Brien & Associates — «Test»" }, opts: {} },
    { name: 'Long company name', payload: { ...basePayload, co: 'A'.repeat(200) }, opts: {} },
    { name: 'Single agent (website)', payload: { ...basePayload, a: ['website'], st: [{ t: 'quarterly', d: 10, dd: 0 }] }, opts: {} },
    { name: 'Multi-term', payload: { ...basePayload, st: [{ t: 'annual', d: 0, dd: 0 }, { t: 'bi_annual', d: 0, dd: 0 }, { t: 'quarterly', d: 0, dd: 0 }] }, opts: {} },
  ];
  
  for (const tc of testCases) {
    const encoded = Buffer.from(JSON.stringify(tc.payload)).toString('base64url');
    const createRes = await fetchJSON('/api/proposals/create', {
      encodedProposal: encoded,
      companyName: tc.payload.co,
      ...tc.opts,
    });
    
    if (!createRes.ok || !createRes.json?.slug) {
      log('FAIL', `Create: ${tc.name}`, `HTTP ${createRes.status} — ${createRes.json?.error || 'no slug'}`);
      continue;
    }
    
    const slug = createRes.json.slug;
    const pageRes = await fetchPage(`/p/${slug}`);
    
    if (pageRes.ok && pageRes.text.includes('DOCTYPE') && pageRes.text.includes('encodedId')) {
      log('PASS', `Create+Load: ${tc.name}`, `slug=${slug}`);
    } else {
      log('FAIL', `Load: ${tc.name}`, `HTTP ${pageRes.status} for /p/${slug}`);
    }
  }
}

async function testPricingConsistency() {
  console.log('\n═══ PRICING CONSISTENCY AUDIT ═══');
  
  const fs = require('fs');
  const pricingSource = fs.readFileSync(
    require('path').join(__dirname, '..', 'src', 'lib', 'pricing.ts'), 'utf-8'
  );
  
  // Extract STRIPE_UPFRONT_TOTALS
  const stripeMatch = pricingSource.match(/STRIPE_UPFRONT_TOTALS[^{]*\{([\s\S]*?)\n\};/);
  // Extract PRICING_TABLE
  const tableMatch = pricingSource.match(/PRICING_TABLE\s*=\s*\{([\s\S]*?)\n\};/);
  
  if (!stripeMatch || !tableMatch) {
    log('FAIL', 'Pricing file parse', 'Could not extract pricing tables');
    return;
  }
  
  const termMonths = { annual: 12, bi_annual: 6, quarterly: 3, monthly: 1 };
  const agents = ['seo', 'paid_ads', 'website', 'crm'];
  
  for (const agent of agents) {
    // Extract agent's stripe totals
    const stripeAgentMatch = stripeMatch[1].match(new RegExp(`${agent}:\\s*\\{([^}]+)\\}`));
    // Extract agent's pricing table
    const tableAgentMatch = tableMatch[1].match(new RegExp(`${agent}:\\s*\\{([^}]+)\\}`));
    
    if (!stripeAgentMatch || !tableAgentMatch) {
      log('WARN', `Pricing: ${agent}`, 'Could not parse');
      continue;
    }
    
    for (const [term, months] of Object.entries(termMonths)) {
      const stripeVal = stripeAgentMatch[1].match(new RegExp(`${term}:\\s*(\\d+)`));
      const tableVal = tableAgentMatch[1].match(new RegExp(`${term}:\\s*(\\d+)`));
      
      if (!stripeVal || !tableVal) continue;
      
      const stripe = parseInt(stripeVal[1]);
      const display = parseInt(tableVal[1]);
      const expected = display * months;
      
      if (stripe === expected) {
        log('PASS', `Pricing: ${agent} ${term}`, `$${display}/mo × ${months} = $${stripe} ✓`);
      } else {
        log('FAIL', `Pricing: ${agent} ${term}`, `Display $${display}/mo × ${months} = $${expected}, but Stripe has $${stripe}`);
      }
    }
  }
}

async function testGenerateSummary() {
  console.log('\n═══ GENERATE SUMMARY TEST ═══');
  if (QUICK) { console.log('  [skipped — use without --quick for full test]'); return; }
  
  const res = await fetchJSON('/api/generate-summary', {
    businessContext: 'Runs a plumbing company in Dallas, 15 employees, wants to grow online presence',
    companyName: 'Dallas Plumbing Pro',
    template: 'leads',
    agents: ['seo', 'paid_ads'],
  }, 30000);
  
  if (res.ok && res.json?.summary?.length > 20) {
    log('PASS', 'Generate summary', `${res.json.summary.length} chars`);
  } else {
    log('FAIL', 'Generate summary', `HTTP ${res.status} — ${res.json?.error || 'empty'}`);
  }
}

// ─── HEALTH CHECK ENDPOINT TEST ───
async function testHealthCheck() {
  console.log('\n═══ HEALTH CHECK ENDPOINT ═══');
  const res = await fetchPage('/api/health');
  if (res.ok) {
    try {
      const data = JSON.parse(res.text);
      if (data.status === 'ok') log('PASS', 'Health check endpoint', JSON.stringify(data));
      else log('FAIL', 'Health check endpoint', `Status: ${data.status}`);
    } catch {
      log('WARN', 'Health check endpoint', 'Returns 200 but not JSON (may not exist yet)');
    }
  } else {
    log('WARN', 'Health check endpoint', `HTTP ${res.status} (may not exist yet)`);
  }
}

// ─── RUN ALL ───
async function main() {
  console.log(`\n🔍 PROPOSAL GENERATOR AUDIT — ${new Date().toISOString()}`);
  console.log(`   Target: ${BASE_URL}`);
  console.log(`   Mode: ${QUICK ? 'QUICK (skipping AI tests)' : 'FULL'}\n`);
  
  await testPages();
  await testTranscriptFetch();
  await testAnalyzeTranscript();
  await testProposalCreateAndLoad();
  await testPricingConsistency();
  await testGenerateSummary();
  await testHealthCheck();
  
  console.log('\n═══════════════════════════════');
  console.log(`RESULTS: ${passed} passed, ${failed} failed, ${results.filter(r => r.status === 'WARN').length} warnings`);
  console.log('═══════════════════════════════\n');
  
  if (failed > 0) {
    console.log('FAILURES:');
    results.filter(r => r.status === 'FAIL').forEach(r => console.log(`  ❌ ${r.name}: ${r.detail}`));
    console.log('');
  }
  
  // Write results to JSON for monitoring
  const fs = require('fs');
  const resultFile = require('path').join(__dirname, '..', '..', '..', 'memory', 'proposal-audit-results.json');
  fs.writeFileSync(resultFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    passed, failed,
    warnings: results.filter(r => r.status === 'WARN').length,
    results: results,
  }, null, 2));
  
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => { console.error('AUDIT CRASHED:', err); process.exit(2); });
