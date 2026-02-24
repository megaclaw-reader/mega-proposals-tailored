#!/usr/bin/env node
/**
 * Fireflies Transcript Proxy
 * Runs locally on the Mac, called by the Vercel app to fetch Fireflies transcripts.
 * Uses puppeteer to scrape the transcript from the Fireflies page.
 */

const http = require('http');
const puppeteer = require('puppeteer');

const PORT = 3099;
const FIREFLIES_COOKIES_PATH = __dirname + '/../.fireflies-cookies.json';
const fs = require('fs');

let browser = null;

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  return browser;
}

async function fetchTranscript(firefliesUrl) {
  const b = await getBrowser();
  const page = await b.newPage();
  
  // Load cookies if available
  try {
    const cookies = JSON.parse(fs.readFileSync(FIREFLIES_COOKIES_PATH, 'utf8'));
    await page.setCookie(...cookies);
  } catch (e) {
    console.log('No saved cookies, proceeding without auth');
  }

  await page.goto(firefliesUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  
  // Wait for transcript to load
  await page.waitForTimeout(5000);

  // Extract __NEXT_DATA__ and page content
  const data = await page.evaluate(() => {
    const nextData = window.__NEXT_DATA__;
    const meetingNote = nextData?.props?.pageProps?.initialMeetingNote || {};
    
    // Get transcript text from the page
    const transcriptElements = document.querySelectorAll('[class*="transcript"] [class*="sentence"], [class*="Sentence"]');
    let transcriptText = '';
    transcriptElements.forEach(el => {
      transcriptText += el.textContent + '\n';
    });

    // Get summary/notes from the page
    const summarySection = document.querySelector('[class*="summary"], [class*="Summary"], [class*="notes"]');
    const summaryText = summarySection ? summarySection.textContent : '';

    // Also get the full visible text from main content
    const mainContent = document.querySelector('main');
    const fullText = mainContent ? mainContent.innerText : '';

    return {
      title: meetingNote.title || document.title,
      summary: meetingNote.summary || {},
      transcriptText: transcriptText || '',
      summaryText: summaryText,
      fullText: fullText.slice(0, 50000) // cap at 50k chars
    };
  });

  // Save cookies for next time
  const cookies = await page.cookies();
  fs.writeFileSync(FIREFLIES_COOKIES_PATH, JSON.stringify(cookies, null, 2));
  
  await page.close();
  return data;
}

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/fetch-transcript') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { firefliesUrl } = JSON.parse(body);
        if (!firefliesUrl || !firefliesUrl.includes('fireflies.ai')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid Fireflies URL' }));
          return;
        }
        
        console.log(`Fetching transcript from: ${firefliesUrl}`);
        const data = await fetchTranscript(firefliesUrl);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      } catch (err) {
        console.error('Error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`Fireflies proxy running on http://localhost:${PORT}`);
});
