import { NextRequest, NextResponse } from 'next/server';
import { head } from '@vercel/blob';

/**
 * Lightweight check: does a proposal blob exist for this slug?
 * Used by the retry loader to poll for newly created proposals
 * that aren't immediately visible due to blob eventual consistency.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  
  try {
    const meta = await head(`proposals/${slug}.json`);
    if (meta?.url) {
      return NextResponse.json({ exists: true });
    }
  } catch {
    // head() throws BlobNotFoundError if not found
  }

  return NextResponse.json({ exists: false }, { status: 404 });
}
