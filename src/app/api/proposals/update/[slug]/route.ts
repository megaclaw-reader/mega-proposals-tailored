import { NextRequest, NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const body = await request.json();
    const { encodedProposal } = body;

    if (!encodedProposal) {
      return NextResponse.json({ error: 'Missing encodedProposal' }, { status: 400 });
    }

    // Read existing blob to preserve metadata (companyName, createdAt)
    let existingData: Record<string, unknown> = {};
    try {
      const { blobs } = await list({ prefix: `proposals/${slug}.json` });
      const blob = blobs.find(b => b.pathname === `proposals/${slug}.json`);
      if (blob) {
        const res = await fetch(blob.url, {
          headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
        });
        if (res.ok) {
          existingData = await res.json();
        }
      } else {
        return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
      }
    } catch (listErr) {
      console.error('Blob list/read error (non-fatal):', listErr);
      // Continue anyway — we can still overwrite
    }

    // Write updated proposal
    await put(`proposals/${slug}.json`, JSON.stringify({
      ...existingData,
      encodedProposal,
      updatedAt: new Date().toISOString(),
    }), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    return NextResponse.json({ ok: true, slug });
  } catch (error) {
    console.error('Update proposal error for slug:', slug, error);
    return NextResponse.json(
      { error: 'Failed to update proposal', detail: String(error) },
      { status: 500 }
    );
  }
}
