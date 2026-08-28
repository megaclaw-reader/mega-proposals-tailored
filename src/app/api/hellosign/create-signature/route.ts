import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { ServiceAgreementPDF } from '@/lib/contract-pdf';
import { SERVICE_DESCRIPTIONS } from '@/lib/content';
import { Agent } from '@/lib/types';

const HELLOSIGN_API_KEY = process.env.HELLOSIGN_API_KEY || '';
const HELLOSIGN_CLIENT_ID = 'efb88771c235c6a5da81a1214e71c0ee';
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

    // Create embedded signature request
    const formData = new FormData();
    formData.append('client_id', HELLOSIGN_CLIENT_ID);
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
    formData.append('test_mode', '0');

    // Attach the generated PDF
    const pdfBlob = new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' });
    formData.append('file[0]', pdfBlob, `MEGA_Agreement_${companyName.replace(/\s+/g, '_')}.pdf`);

    // Set metadata for webhook
    if (proposalSlug) {
      formData.append('metadata[proposalSlug]', proposalSlug);
      formData.append('metadata[minimumTermMonths]', String(minimumTermMonths));
    }
    if (stripeUrl) {
      formData.append('metadata[stripeUrl]', stripeUrl);
    }

    const authHeader = 'Basic ' + Buffer.from(HELLOSIGN_API_KEY + ':').toString('base64');

    const hsResponse = await fetch(`${HELLOSIGN_API_BASE}/signature_request/create_embedded`, {
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

    // Get the embedded sign URL for the first signer (customer)
    const signatureId = signatureRequest.signatures?.[0]?.signature_id;
    let signUrl: string | null = null;

    if (signatureId) {
      const embedRes = await fetch(
        `${HELLOSIGN_API_BASE}/embedded/sign_url/${signatureId}`,
        { headers: { 'Authorization': authHeader } }
      );
      if (embedRes.ok) {
        const embedData = await embedRes.json();
        signUrl = embedData.embedded?.sign_url || null;
      }
    }

    return NextResponse.json({
      signatureRequestId,
      signUrl,
      clientId: HELLOSIGN_CLIENT_ID,
    });

  } catch (error) {
    console.error('Create signature error:', error);
    return NextResponse.json(
      { error: 'Failed to create signature request' },
      { status: 500 }
    );
  }
}
