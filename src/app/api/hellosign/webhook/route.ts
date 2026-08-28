import { NextRequest, NextResponse } from 'next/server';
import { list, put } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    // HelloSign sends webhook events as form data with a "json" field
    const formData = await request.formData();
    const jsonStr = formData.get('json') as string;

    if (!jsonStr) {
      // HelloSign sends a GET/POST to verify the webhook — respond with "Hello API Event Received"
      return new NextResponse('Hello API Event Received', { status: 200 });
    }

    const event = JSON.parse(jsonStr);
    const eventType = event.event?.event_type;
    const signatureRequest = event.signature_request;

    console.log(`[HelloSign Webhook] Event: ${eventType}, Request ID: ${signatureRequest?.signature_request_id}`);

    if (eventType === 'signature_request_all_signed') {
      const metadata = signatureRequest?.metadata || {};
      const proposalSlug = metadata.proposalSlug;
      const minimumTermMonths = parseInt(metadata.minimumTermMonths) || 0;

      if (proposalSlug) {
        // Update the proposal blob data
        try {
          const { blobs } = await list({ prefix: `proposals/${proposalSlug}.json` });
          const blob = blobs.find(b => b.pathname === `proposals/${proposalSlug}.json`);

          if (blob) {
            const response = await fetch(blob.url, {
              headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
            });

            if (response.ok) {
              const data = await response.json();
              data.signedAgreement = {
                signedAt: new Date().toISOString(),
                signatureRequestId: signatureRequest.signature_request_id,
                minimumTermMonths,
              };

              await put(`proposals/${proposalSlug}.json`, JSON.stringify(data), {
                access: 'private',
                contentType: 'application/json',
                addRandomSuffix: false,
                allowOverwrite: true,
              });

              console.log(`[HelloSign Webhook] Updated proposal ${proposalSlug} with signed agreement`);
            }
          }
        } catch (err) {
          console.error('[HelloSign Webhook] Error updating proposal:', err);
        }
      }
    }

    // HelloSign expects "Hello API Event Received" response
    return new NextResponse('Hello API Event Received', { status: 200 });
  } catch (error) {
    console.error('[HelloSign Webhook] Error:', error);
    return new NextResponse('Hello API Event Received', { status: 200 });
  }
}

// HelloSign also sends GET requests for webhook verification
export async function GET() {
  return new NextResponse('Hello API Event Received', { status: 200 });
}
