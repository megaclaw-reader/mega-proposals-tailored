import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { ServiceAgreementPDF } from '@/lib/contract-pdf';
import { SERVICE_DESCRIPTIONS } from '@/lib/content';
import { Agent } from '@/lib/types';

const ONESPAN_CLIENT_ID = process.env.ONESPAN_CLIENT_ID || '';
const ONESPAN_API_KEY = process.env.ONESPAN_API_KEY || '';
const ONESPAN_BASE_URL = process.env.ONESPAN_BASE_URL || 'https://apps.e-signlive.com';

async function getOAuthToken(): Promise<string> {
  const credentials = Buffer.from(`${ONESPAN_CLIENT_ID}:${ONESPAN_API_KEY}`).toString('base64');
  const res = await fetch(`${ONESPAN_BASE_URL}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OneSpan OAuth failed: ${res.status} ${err}`);
  }
  const data = await res.json();
  return data.access_token || data.accessToken;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerName, companyName, selectedAgents, monthlyRate,
      minimumTermMonths, totalCommitment, salesRepName,
      salesRepEmail, customerEmail, proposalSlug, stripeUrl,
    } = body;

    if (!customerName || !companyName || !selectedAgents || !monthlyRate || !minimumTermMonths || !customerEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const agentDetails = (selectedAgents as Agent[]).map(agent => ({
      name: SERVICE_DESCRIPTIONS[agent]?.title || agent,
      description: SERVICE_DESCRIPTIONS[agent]?.shortDescription || '',
    }));

    const effectiveDate = new Date().toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });

    // Generate PDF contract
    const pdfBuffer = await renderToBuffer(
      React.createElement(ServiceAgreementPDF, {
        customerName,
        companyName,
        selectedAgents: agentDetails,
        monthlyRate,
        minimumTermMonths,
        totalCommitment,
        salesRepName,
        salesRepEmail,
        customerEmail,
        effectiveDate,
      }) as any
    );

    // Get OAuth2 token
    const token = await getOAuthToken();

    // Determine redirect URL after signing
    const hasStaticStripe = stripeUrl && stripeUrl !== '#' && stripeUrl.startsWith('http');
    const origin = request.nextUrl.origin;
    const dynamicCheckoutUrl = `${origin}/api/hellosign/signed-redirect?agents=${encodeURIComponent(JSON.stringify(selectedAgents))}&slug=${encodeURIComponent(proposalSlug || '')}`;
    const redirectUrl = hasStaticStripe ? stripeUrl : dynamicCheckoutUrl;

    // Split customer name into first/last
    const nameParts = customerName.trim().split(/\s+/);
    const firstName = nameParts[0] || customerName;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : customerName;

    // Create package with document
    const packagePayload = JSON.stringify({
      name: `MEGA Service Agreement — ${companyName}`,
      description: `Service agreement for ${companyName} — ${minimumTermMonths}-month engagement`,
      roles: [{
        id: 'signer1',
        type: 'SIGNER',
        signers: [{
          email: customerEmail,
          firstName,
          lastName,
          company: companyName,
        }],
      }],
      documents: [{
        name: 'Service Agreement',
        id: 'doc1',
        approvals: [{
          id: 'approval1',
          role: 'signer1',
          fields: [{
            type: 'SIGNATURE',
            subtype: 'FULLNAME',
            page: 0,
            top: 75,
            left: 55,
            width: 200,
            height: 50,
          }],
        }],
      }],
      status: 'SENT',
      settings: {
        ceremony: {
          handOver: {
            href: redirectUrl,
            text: 'Proceed to Payment',
            title: 'Agreement Signed Successfully',
          },
        },
      },
    });

    const formData = new FormData();
    formData.append('payload', new Blob([packagePayload], { type: 'application/json' }));
    const pdfBlob = new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' });
    formData.append('file', pdfBlob, `MEGA_Agreement_${companyName.replace(/\s+/g, '_')}.pdf`);

    const pkgRes = await fetch(`${ONESPAN_BASE_URL}/api/packages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });

    if (!pkgRes.ok) {
      const errText = await pkgRes.text();
      console.error('OneSpan create package error:', errText);
      return NextResponse.json({ error: `OneSpan API error: ${pkgRes.status}` }, { status: 500 });
    }

    const pkgData = await pkgRes.json();
    const packageId = pkgData.id;

    // Get signer authentication token
    const authRes = await fetch(`${ONESPAN_BASE_URL}/api/authenticationTokens/signer/singleUse`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ packageId, signerId: 'signer1' }),
    });

    if (!authRes.ok) {
      const errText = await authRes.text();
      console.error('OneSpan signer auth error:', errText);
      return NextResponse.json({ error: 'Failed to get signing token' }, { status: 500 });
    }

    const authData = await authRes.json();
    const signerToken = authData.value;
    const signingUrl = `${ONESPAN_BASE_URL}/access?sessionToken=${signerToken}`;

    return NextResponse.json({
      packageId,
      signingUrl,
    });

  } catch (error) {
    console.error('Create signature error:', error);
    return NextResponse.json(
      { error: 'Failed to create signature request' },
      { status: 500 }
    );
  }
}
