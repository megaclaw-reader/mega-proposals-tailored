import { NextRequest, NextResponse } from 'next/server';

/**
 * OneSpan Sign webhook handler.
 * Receives callback events when packages are completed, declined, etc.
 * 
 * OneSpan sends POST requests with JSON body containing event details.
 * Common event names:
 *   - PACKAGE_COMPLETE: all signers have signed
 *   - PACKAGE_DECLINE: a signer declined
 *   - PACKAGE_EXPIRE: package expired
 *   - DOCUMENT_SIGNED: individual document signed
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name: eventName, packageId, sessionUser } = body;

    console.log(`OneSpan webhook: ${eventName} for package ${packageId}`, JSON.stringify(body, null, 2));

    switch (eventName) {
      case 'PACKAGE_COMPLETE': {
        // All signers have completed — package is fully executed
        // The handOver redirect already sends the user to Stripe,
        // so this webhook is mainly for backend record-keeping.
        console.log(`Package ${packageId} completed. Signer: ${sessionUser}`);
        
        // If using Vercel Blob to track proposal state, update here:
        // await updateProposalBlob(packageId, { signed: true, signedAt: new Date().toISOString() });
        break;
      }

      case 'PACKAGE_DECLINE': {
        console.log(`Package ${packageId} was declined by ${sessionUser}`);
        break;
      }

      case 'PACKAGE_EXPIRE': {
        console.log(`Package ${packageId} has expired`);
        break;
      }

      case 'DOCUMENT_SIGNED': {
        console.log(`Document signed in package ${packageId} by ${sessionUser}`);
        break;
      }

      default: {
        console.log(`Unhandled OneSpan event: ${eventName}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('OneSpan webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
