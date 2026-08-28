import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { ServiceAgreementPDF } from '@/lib/contract-pdf';
import { SERVICE_DESCRIPTIONS } from '@/lib/content';
import { Agent } from '@/lib/types';

const HELLOSIGN_API_KEY = process.env.HELLOSIGN_API_KEY || '';
const HELLOSIGN_API_BASE = 'https://api.hellosign.com/v3';

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

    // Build agent descriptions for the contract
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

    // Build the redirect URL: after signing → our callback page → Stripe
    const origin = request.nextUrl.origin;
    const redirectUrl = `${origin}/api/hellosign/signed-redirect?stripe=${encodeURIComponent(stripeUrl || '')}&slug=${encodeURIComponent(proposalSlug || '')}`;

    // Create HelloSign signature request (non-embedded, redirect-based)
    const formData = new FormData();
    formData.append('title', `MEGA Service Agreement — ${companyName}`);
    formData.append('subject', `Service Agreement for ${companyName}`);
    formData.append('message', `Please review and sign the service agreement for your ${minimumTermMonths}-month engagement with MEGA.`);
    formData.append('signers[0][email_address]', customerEmail);
    formData.append('signers[0][name]', customerName);
    formData.append('signers[0][order]', '0');
    // Only add sales rep as second signer if different from customer
    if (salesRepEmail && salesRepEmail.toLowerCase() !== customerEmail.toLowerCase()) {
      formData.append('signers[1][email_address]', salesRepEmail);
      formData.append('signers[1][name]', salesRepName);
      formData.append('signers[1][order]', '1');
    }
    formData.append('signing_redirect_url', redirectUrl);
    formData.append('test_mode', '0');

    // Attach the generated PDF
    const pdfBlob = new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' });
    formData.append('file[0]', pdfBlob, `MEGA_Agreement_${companyName.replace(/\s+/g, '_')}.pdf`);

    // Set metadata for webhook
    if (proposalSlug) {
      formData.append('metadata[proposalSlug]', proposalSlug);
      formData.append('metadata[minimumTermMonths]', String(minimumTermMonths));
    }

    const authHeader = 'Basic ' + Buffer.from(HELLOSIGN_API_KEY + ':').toString('base64');

    const hsResponse = await fetch(`${HELLOSIGN_API_BASE}/signature_request/send`, {
      method: 'POST',
      headers: { 'Authorization': authHeader },
      body: formData,
    });

    if (!hsResponse.ok) {
      const errorData = await hsResponse.json().catch(() => ({ error: { error_msg: `HTTP ${hsResponse.status}` } }));
      console.error('HelloSign API error:', errorData);
      return NextResponse.json(
        { error: errorData.error?.error_msg || 'HelloSign API error' },
        { status: 500 }
      );
    }

    const hsData = await hsResponse.json();
    const signatureRequest = hsData.signature_request;
    const signatureRequestId = signatureRequest.signature_request_id;

    // Get the signing URL from the first signer (the customer)
    const signingUrl = signatureRequest.signing_url;

    return NextResponse.json({
      signatureRequestId,
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
