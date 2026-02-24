import { NextRequest, NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';

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

    // Verify the proposal exists
    const { blobs } = await list({ prefix: `proposals/${slug}.json` });
    const existing = blobs.find(b => b.pathname === `proposals/${slug}.json`);

    if (!existing) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    // Read existing data to preserve metadata
    const existingRes = await fetch(existing.url, {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
    });
    const existingData = existingRes.ok ? await existingRes.json() : {};

    // Update the proposal
    await put(`proposals/${slug}.json`, JSON.stringify({
      ...existingData,
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
