import { NextRequest, NextResponse } from 'next/server';
import { put, head } from '@vercel/blob';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export async function POST(request: NextRequest) {
  try {
    const { encodedProposal, companyName } = await request.json();

    if (!encodedProposal || !companyName) {
      return NextResponse.json(
        { error: 'Missing encodedProposal or companyName' },
        { status: 400 }
      );
    }

    // Generate a clean slug from company name
    let slug = slugify(companyName);
    
    // Check if slug already exists, append a short random suffix if so
    try {
      const existing = await head(`proposals/${slug}.json`);
      if (existing) {
        const suffix = Math.random().toString(36).slice(2, 6);
        slug = `${slug}-${suffix}`;
      }
    } catch {
      // Blob doesn't exist — slug is available
    }

    // Store the proposal data
    await put(`proposals/${slug}.json`, JSON.stringify({
      encodedProposal,
      companyName,
      createdAt: new Date().toISOString(),
    }), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : request.nextUrl.origin;

    return NextResponse.json({
      slug,
      url: `${baseUrl}/p/${slug}`,
    });

  } catch (error) {
    console.error('Create proposal error:', error);
    return NextResponse.json(
      { error: 'Failed to create proposal' },
      { status: 500 }
    );
  }
}
