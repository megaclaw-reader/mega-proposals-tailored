import { NextRequest, NextResponse } from 'next/server';
import { Agent } from '@/lib/types';
import { list, put, del } from '@vercel/blob';

const ONESPAN_CLIENT_ID = process.env.ONESPAN_CLIENT_ID || '';
const ONESPAN_API_KEY = process.env.ONESPAN_API_KEY || '';
const ONESPAN_BASE_URL = process.env.ONESPAN_BASE_URL || 'https://apps.e-signlive.com';
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN || '';

// Map our agent IDs to gomega.ai agent IDs
const AGENT_MAP: Record<string, string> = {
  seo: 'seo',
  paid_ads: 'paid_ads',
  crm: 'crm',
  website: 'website',
};

// Slack user lookup by email
async function getSlackUserId(email: string): Promise<string | null> {
  try {
    const res = await fetch(`https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`, {
      headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
    });
    const data = await res.json();
    return data.ok ? data.user.id : null;
  } catch {
    return null;
  }
}

async function getOAuthToken(): Promise<string> {
  const credentials = Buffer.from(`${ONESPAN_CLIENT_ID}:${ONESPAN_API_KEY}`).toString('base64');
  const res = await fetch(`${ONESPAN_BASE_URL}/oauth2/token`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  return data.access_token;
}

async function downloadSignedPdf(packageId: string, documentId: string): Promise<Buffer | null> {
  try {
    const token = await getOAuthToken();
    const encodedPkgId = encodeURIComponent(packageId);
    const res = await fetch(
      `${ONESPAN_BASE_URL}/api/packages/${encodedPkgId}/documents/${documentId}/pdf`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/pdf' } }
    );
    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch {
    return null;
  }
}

async function sendSlackDM(
  userId: string,
  companyName: string,
  customerName: string,
  monthlyRate: number,
  minimumTermMonths: number,
  agents: string[],
  pdfBuffer: Buffer | null,
  pdfFilename: string,
) {
  const agentNames = agents.join(', ');
  const message = `🎉 *${companyName} just signed their service agreement!*\n\n` +
    `• *Customer:* ${customerName}\n` +
    `• *Agents:* ${agentNames}\n` +
    `• *Monthly Rate:* $${monthlyRate.toLocaleString()}/mo\n` +
    `• *Commitment:* ${minimumTermMonths} months\n\n` +
    `The signed agreement is attached below. 🔽`;

  if (pdfBuffer) {
    // Upload file to Slack with message
    const form = new FormData();
    form.append('token', SLACK_BOT_TOKEN);
    form.append('channels', userId);
    form.append('initial_comment', message);
    form.append('filename', pdfFilename);
    form.append('filetype', 'pdf');
    form.append('file', new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' }), pdfFilename);

    await fetch('https://slack.com/api/files.upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
      body: form,
    });
  } else {
    // Send just the message without PDF
    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channel: userId, text: message }),
    });
  }
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const agentsParam = request.nextUrl.searchParams.get('agents');
  const stripeUrlParam = request.nextUrl.searchParams.get('stripeUrl');
  const origin = request.nextUrl.origin;

  let onespan: any = null;

  // Mark proposal as signed + retrieve signing metadata
  if (slug) {
    try {
      const { blobs } = await list({ prefix: `proposals/${slug}.json` });
      const blob = blobs.find(b => b.pathname === `proposals/${slug}.json`);
      if (blob) {
        const res = await fetch(blob.url, {
          headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
        });
        const data = await res.json();
        onespan = data.onespan;

        await del(blob.url);
        await put(`proposals/${slug}.json`, JSON.stringify({
          ...data,
          signed: true,
          signedAt: new Date().toISOString(),
        }), {
          access: 'private',
          contentType: 'application/json',
          addRandomSuffix: false,
        });
      }
    } catch (err) {
      console.error('Failed to mark proposal as signed:', err);
    }
  }

  // Send signed agreement to sales rep via Slack (non-blocking)
  if (onespan) {
    (async () => {
      try {
        const { packageId, documentId, companyName, customerName, salesRepEmail,
                monthlyRate, minimumTermMonths, selectedAgents } = onespan;

        // Find rep's Slack user ID
        const slackUserId = await getSlackUserId(salesRepEmail);
        if (!slackUserId) {
          console.error('Could not find Slack user for:', salesRepEmail);
          return;
        }

        // Download signed PDF from OneSpan
        let pdfBuffer: Buffer | null = null;
        if (packageId && documentId) {
          pdfBuffer = await downloadSignedPdf(packageId, documentId);
        }

        const filename = `Signed_Agreement_${(companyName || 'Company').replace(/\s+/g, '_')}.pdf`;

        await sendSlackDM(
          slackUserId,
          companyName || 'Unknown Company',
          customerName || 'Unknown',
          monthlyRate || 0,
          minimumTermMonths || 3,
          selectedAgents || [],
          pdfBuffer,
          filename,
        );
      } catch (err) {
        console.error('Failed to send Slack notification:', err);
      }
    })();
  }

  // Resolve Stripe checkout URL
  if (stripeUrlParam && stripeUrlParam.includes('checkout.stripe.com/c/pay/cs_') && stripeUrlParam.startsWith('http')) {
    return NextResponse.redirect(stripeUrlParam);
  }

  if (agentsParam) {
    try {
      const agents = JSON.parse(agentsParam) as Agent[];
      const agentIds = agents.map(a => AGENT_MAP[a] || a).filter(Boolean);

      if (agentIds.length > 0) {
        const checkoutRes = await fetch('https://www.gomega.ai/api/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentIds, cycle: 'monthly' }),
        });

        if (checkoutRes.ok) {
          const checkoutData = await checkoutRes.json();
          if (checkoutData.url) {
            return NextResponse.redirect(checkoutData.url);
          }
        }
        console.error('gomega.ai checkout failed:', checkoutRes.status);
      }
    } catch (err) {
      console.error('Checkout session creation failed:', err);
    }
  }

  const fallback = slug ? `${origin}/p/${slug}?signed=true` : origin;
  return NextResponse.redirect(fallback);
}
