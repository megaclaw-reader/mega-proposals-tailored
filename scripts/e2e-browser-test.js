#!/usr/bin/env node
/**
 * Full E2E browser test — fills the form, submits with a Fireflies link, 
 * waits for the proposal to be created, then loads it.
 */
const { chromium } = require('playwright');

const BASE = 'https://mega-proposals-tailored.vercel.app';
const FIREFLIES_URL = 'https://app.fireflies.ai/view/Mega-Intro-Call::01M2QTV0CVCZRJXB974VAXXT6D';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Collect console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));
  
  try {
    console.log('1. Loading create page...');
    await page.goto(`${BASE}/create`, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('   ✅ Create page loaded');
    
    // Fill form
    console.log('2. Filling form...');
    const nameInput = page.locator('input').first();
    await nameInput.fill('E2E Test Customer');
    
    const companyInput = page.locator('input').nth(1);
    await companyInput.fill('E2E Test Company');
    
    // Add Fireflies link
    console.log('3. Adding Fireflies link...');
    const fireflyInput = page.locator('input[placeholder*="fireflies"]').first();
    await fireflyInput.fill(FIREFLIES_URL);
    
    // Check SEO agent (should be unchecked by default)
    const seoCheckbox = page.locator('text=SEO & GEO Agent').locator('..').locator('input[type="checkbox"]');
    if (!(await seoCheckbox.isChecked())) {
      await seoCheckbox.check();
    }
    
    // Scroll down to find Sales Rep fields
    console.log('4. Filling sales rep info...');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    
    // Find rep name and email fields
    const repNameInput = page.locator('input[placeholder*="rep" i], input[placeholder*="name" i]').last();
    const repEmailInput = page.locator('input[type="email"]').last();
    
    // Try to find by label
    const allInputs = await page.locator('input[type="text"], input[type="email"]').all();
    console.log(`   Found ${allInputs.length} text/email inputs`);
    
    // Fill last two text inputs (usually rep name and email)
    // Let's find them by checking nearby labels
    for (const input of allInputs) {
      const placeholder = await input.getAttribute('placeholder');
      const value = await input.inputValue();
      const nearby = await input.evaluate(el => {
        const parent = el.closest('div');
        return parent ? parent.textContent.substring(0, 50) : '';
      });
      if (!value) {
        console.log(`   Empty input: placeholder="${placeholder}", nearby="${nearby}"`);
      }
    }
    
    // Fill rep name - find input after "Your Name" or "Sales Rep"
    const labels = await page.locator('label, div > span, div > p').allTextContents();
    console.log('   Labels found:', labels.filter(l => l.includes('Name') || l.includes('Email') || l.includes('Rep')).join(', '));
    
    // Just fill the required fields by their position
    await page.locator('input[required]').nth(2).fill('Test Rep');
    await page.locator('input[required]').nth(3).fill('test@gomega.ai');
    
    console.log('5. Submitting form...');
    // Find and click the submit/generate button
    const submitBtn = page.locator('button[type="submit"], button:has-text("Generate"), button:has-text("Create")');
    const btnText = await submitBtn.first().textContent();
    console.log(`   Button text: "${btnText}"`);
    await submitBtn.first().click();
    
    // Wait for the Fireflies analysis (can take 20-30s)
    console.log('6. Waiting for transcript analysis (up to 60s)...');
    
    // Watch for alerts (which indicate errors)
    let alertMessage = null;
    page.on('dialog', async dialog => {
      alertMessage = dialog.message();
      console.log(`   ⚠️ ALERT: ${alertMessage}`);
      await dialog.accept();
    });
    
    // Wait for either the proposal link to appear or an error
    const startTime = Date.now();
    let proposalUrl = null;
    let lastStatus = '';
    
    while (Date.now() - startTime < 90000) {
      // Check if a proposal URL appeared
      const linkEl = await page.locator('a[href*="/p/"]').first();
      if (await linkEl.count() > 0) {
        proposalUrl = await linkEl.getAttribute('href');
        if (proposalUrl && proposalUrl.includes('/p/')) {
          console.log(`   ✅ Proposal created: ${proposalUrl}`);
          break;
        }
      }
      
      // Check for generating/analyzing status text
      const pageText = await page.textContent('body');
      if (pageText.includes('Analyzing') && lastStatus !== 'analyzing') {
        console.log('   📡 Status: Analyzing transcript...');
        lastStatus = 'analyzing';
      }
      if (pageText.includes('Generating') && lastStatus !== 'generating') {
        console.log('   📡 Status: Generating proposal...');
        lastStatus = 'generating';
      }
      if (pageText.includes('Creating') && lastStatus !== 'creating') {
        console.log('   📡 Status: Creating...');
        lastStatus = 'creating';
      }
      
      await page.waitForTimeout(2000);
    }
    
    if (!proposalUrl) {
      // Take a screenshot for debugging
      const pageText = await page.textContent('body');
      console.log('   ❌ No proposal URL found after 90s');
      console.log('   Page text (last 500 chars):', pageText.slice(-500));
      if (alertMessage) console.log('   Alert was:', alertMessage);
      
      // Check for error messages on page
      const errors = await page.locator('.text-red-600, .text-red-500, [role="alert"]').allTextContents();
      if (errors.length) console.log('   On-page errors:', errors);
      
      await browser.close();
      process.exit(1);
    }
    
    // Step 7: Load the proposal page
    const fullUrl = proposalUrl.startsWith('http') ? proposalUrl : `${BASE}${proposalUrl}`;
    console.log(`7. Loading proposal: ${fullUrl}`);
    await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for the proposal to render (it starts with "Loading proposal...")
    await page.waitForTimeout(3000);
    const bodyText = await page.textContent('body');
    
    if (bodyText.includes('Loading proposal...') && !bodyText.includes('Proposal ID')) {
      console.log('   ❌ Proposal stuck on "Loading proposal..."');
      console.log('   Console errors:', consoleErrors);
      await browser.close();
      process.exit(1);
    }
    
    if (bodyText.includes('not be found') || bodyText.includes('404')) {
      console.log('   ❌ Proposal returned 404');
      await browser.close();
      process.exit(1);
    }
    
    // Check for key elements
    const hasProposalId = bodyText.includes('Proposal ID');
    const hasCompanyName = bodyText.includes('E2E Test Company');
    const hasInsights = bodyText.includes('pain') || bodyText.includes('challenge') || bodyText.includes('Discussion') || bodyText.includes('Tailored');
    
    console.log(`   ✅ Proposal rendered`);
    console.log(`   - Has Proposal ID: ${hasProposalId}`);
    console.log(`   - Has Company Name: ${hasCompanyName}`);
    console.log(`   - Has Insights section: ${hasInsights}`);
    
    // Check console errors
    if (consoleErrors.length > 0) {
      console.log(`   ⚠️ Console errors (${consoleErrors.length}):`);
      consoleErrors.forEach(e => console.log(`     - ${e.substring(0, 200)}`));
    } else {
      console.log('   ✅ No console errors');
    }
    
    console.log('\n✅ FULL E2E TEST PASSED');
    
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    console.log('Console errors:', consoleErrors);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
