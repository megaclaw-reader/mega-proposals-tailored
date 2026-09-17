#!/usr/bin/env node
/**
 * E2E deploy gate — tests the full proposal creation flow in a real browser.
 * Creates a proposal with a Fireflies link, verifies it loads, checks key elements.
 * Runs 3 times to catch flaky issues.
 * 
 * Env: BASE_URL (defaults to production)
 */
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL || process.env.TARGET_URL || 'https://mega-proposals-tailored.vercel.app';
const FF_URL = 'https://app.fireflies.ai/view/Mega-Intro-Call::01M2QTV0CVCZRJXB974VAXXT6D';
const RUNS = 3;

async function runTest(runNumber) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const suffix = Math.random().toString(36).slice(2, 6);
  let alertMsg = null;
  page.on('dialog', async d => { alertMsg = d.message(); await d.accept(); });

  try {
    // Load create page
    await page.goto(`${BASE}/create`, { waitUntil: 'networkidle', timeout: 30000 });

    // Fill form
    await page.locator('input').first().fill(`Deploy Test ${suffix}`);
    await page.locator('input').nth(1).fill(`TestCo ${suffix}`);
    await page.locator('input[placeholder*="fireflies"]').first().fill(FF_URL);

    const seoBox = page.locator('input[type="checkbox"]').nth(0);
    if (!(await seoBox.isChecked())) await seoBox.check();

    await page.locator('input[required]').nth(2).fill('Test Rep');
    await page.locator('input[required]').nth(3).fill('test@gomega.ai');

    // Submit
    await page.locator('button:has-text("Generate")').first().click();

    // Wait for proposal URL
    const start = Date.now();
    let proposalUrl = null;
    while (Date.now() - start < 90000) {
      if (alertMsg) {
        throw new Error(`Alert during creation: ${alertMsg}`);
      }
      const links = await page.locator('a[href*="/p/"]').all();
      for (const l of links) {
        const h = await l.getAttribute('href');
        if (h?.includes('/p/') && !h.includes('/create')) { proposalUrl = h; break; }
      }
      if (proposalUrl) break;
      await page.waitForTimeout(2000);
    }

    if (!proposalUrl) throw new Error('No proposal URL after 90s');

    // Load the proposal
    const fullUrl = proposalUrl.startsWith('http') ? proposalUrl : `${BASE}${proposalUrl}`;
    await page.goto(fullUrl, { timeout: 30000 });
    await page.waitForSelector('text=Proposal ID', { timeout: 25000 });

    // Verify key elements
    const body = await page.textContent('body');
    const checks = {
      'Company name': body.includes(`TestCo ${suffix}`),
      'SEO section': body.includes('SEO'),
      'Pricing': body.includes('/mo') || body.includes('month'),
      'Proposal ID': body.includes('Proposal ID'),
    };

    const failed = Object.entries(checks).filter(([, v]) => !v);
    if (failed.length > 0) {
      throw new Error(`Missing elements: ${failed.map(([k]) => k).join(', ')}`);
    }

    const slug = proposalUrl.split('/p/')[1];
    console.log(`  ✅ Run ${runNumber}: ${slug} — all checks passed`);
    return true;

  } catch (err) {
    console.log(`  ❌ Run ${runNumber}: ${err.message}`);
    return false;

  } finally {
    await browser.close();
  }
}

async function main() {
  console.log(`\n🧪 E2E Deploy Gate — ${RUNS} runs against ${BASE}\n`);

  let passed = 0;
  for (let i = 1; i <= RUNS; i++) {
    const ok = await runTest(i);
    if (ok) passed++;
  }

  console.log(`\nResults: ${passed}/${RUNS} passed`);

  if (passed < RUNS) {
    console.log('❌ DEPLOY BLOCKED — not all E2E runs passed');
    process.exit(1);
  }

  console.log('✅ E2E gate passed');
}

main();
