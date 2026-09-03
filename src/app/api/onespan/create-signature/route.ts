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
  return data.access_token;
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
    // Route through our signed-redirect endpoint to mark proposal as signed + redirect to Stripe
    const origin = request.nextUrl.origin;
    const redirectUrl = `${origin}/api/onespan/signed-redirect?agents=${encodeURIComponent(JSON.stringify(selectedAgents))}&slug=${encodeURIComponent(proposalSlug || '')}&stripeUrl=${encodeURIComponent(stripeUrl || '')}`;

    // Split customer name into first/last
    const nameParts = customerName.trim().split(/\s+/);
    const firstName = nameParts[0] || customerName;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : customerName;

    // Step 1: Create package as DRAFT
    const pkgRes = await fetch(`${ONESPAN_BASE_URL}/api/packages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
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
        settings: {
          ceremony: {
            handOver: {
              href: redirectUrl,
              text: 'Proceed to Payment',
              title: 'Agreement Signed Successfully',
            },
          },
        },
      }),
    });

    if (!pkgRes.ok) {
      const errText = await pkgRes.text();
      console.error('OneSpan create package error:', errText);
      return NextResponse.json({ error: `OneSpan create package failed: ${pkgRes.status}` }, { status: 500 });
    }

    const pkgData = await pkgRes.json();
    const packageId = pkgData.id;
    const encodedPackageId = encodeURIComponent(packageId);

    // Step 2: Upload PDF document to the package
    const docPayload = JSON.stringify({ name: 'Service Agreement' });
    const formData = new FormData();
    formData.append('payload', new Blob([docPayload], { type: 'application/json' }));
    formData.append('file', new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' }),
      `MEGA_Agreement_${companyName.replace(/\s+/g, '_')}.pdf`);

    const docRes = await fetch(`${ONESPAN_BASE_URL}/api/packages/${encodedPackageId}/documents`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      body: formData,
    });

    if (!docRes.ok) {
      const errText = await docRes.text();
      console.error('OneSpan upload doc error:', errText);
      return NextResponse.json({ error: `OneSpan document upload failed: ${docRes.status}` }, { status: 500 });
    }

    const docData = await docRes.json();
    const documentId = docData.id;

    // Step 3: Add signature approval field to the document
    const approvalRes = await fetch(
      `${ONESPAN_BASE_URL}/api/packages/${encodedPackageId}/documents/${documentId}/approvals`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          role: 'signer1',
          fields: [
            {
              type: 'SIGNATURE',
              subtype: 'FULLNAME',
              page: (docData.pages?.length || 3) - 1,
              top: 545,
              left: 380,
              width: 200,
              height: 50,
            },
            {
              type: 'INPUT',
              subtype: 'DATESTAMP',
              binding: '{approval.signed}',
              page: (docData.pages?.length || 3) - 1,
              top: 605,
              left: 380,
              width: 200,
              height: 20,
            },
          ],
        }),
      }
    );

    if (!approvalRes.ok) {
      const errText = await approvalRes.text();
      console.error('OneSpan approval error:', errText);
      // Non-fatal — continue anyway
    }

    // Step 4: Send the package (DRAFT → SENT)
    const sendRes = await fetch(`${ONESPAN_BASE_URL}/api/packages/${encodedPackageId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'SENT' }),
    });

    if (!sendRes.ok) {
      const errText = await sendRes.text();
      console.error('OneSpan send package error:', errText);
      return NextResponse.json({ error: `OneSpan send failed: ${sendRes.status}` }, { status: 500 });
    }

    // Step 5: Get the actual signer ID from roles
    const rolesRes = await fetch(`${ONESPAN_BASE_URL}/api/packages/${encodedPackageId}/roles`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
    });
    const rolesData = await rolesRes.json();
    const signerRole = rolesData.results?.find((r: any) => r.id === 'signer1');
    const signerId = signerRole?.signers?.[0]?.id || 'signer1';

    // Step 6: Get single-use signer authentication token
    const authRes = await fetch(`${ONESPAN_BASE_URL}/api/authenticationTokens/signer/singleUse`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ packageId, signerId }),
    });

    if (!authRes.ok) {
      const errText = await authRes.text();
      console.error('OneSpan signer auth error:', errText);
      return NextResponse.json({ error: 'Failed to get signing token' }, { status: 500 });
    }

    const authData = await authRes.json();
    const signerToken = authData.value;
    const signingUrl = `${ONESPAN_BASE_URL}/access?sessionToken=${signerToken}`;

    return NextResponse.json({ packageId, signingUrl });

  } catch (error) {
    console.error('Create signature error:', error);
    return NextResponse.json(
      { error: 'Failed to create signature request: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
