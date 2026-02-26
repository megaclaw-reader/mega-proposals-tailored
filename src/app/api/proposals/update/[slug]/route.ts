import { NextRequest, NextResponse } from 'next/server';
import { put, head } from '@vercel/blob';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { encodedProposal } = await request.json();

    if (!encodedProposal) {
      return NextResponse.json({ error: 'Missing encodedProposal' }, { status: 400 });
    }

    // Verify the proposal exists using head() (works with private blobs)
    try {
      await head(`proposals/${slug}.json`);
    } catch {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    // Overwrite the proposal with updated encoded data
    await put(`proposals/${slug}.json`, JSON.stringify({
      encodedProposal,
      updatedAt: new Date().toISOString(),
    }), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    return NextResponse.json({ ok: true, slug });
  } catch (error) {
    console.error('Update proposal error:', error);
    return NextResponse.json({ error: 'Failed to update proposal' }, { status: 500 });
  }
}
