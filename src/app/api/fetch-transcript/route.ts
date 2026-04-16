import { NextRequest, NextResponse } from 'next/server';

const FIREFLIES_API_KEY = process.env.FIREFLIES_API_KEY || '';
const FIREFLIES_GRAPHQL = 'https://api.fireflies.ai/graphql';

/**
 * Extract transcript ID from a Fireflies URL.
 * Handles:
 *   /view/Some-Title-id01KPBTRF03VFXSTWX9JZ9902YK
 *   /view/01KPBTRF03VFXSTWX9JZ9902YK
 *   /notepad/01KPBTRF03VFXSTWX9JZ9902YK
 */
function extractTranscriptId(url: string): string | null {
  // Format: ...-id<ID> or ...::< ID> or ...id<ID> at end of path
  const idMatch = url.match(/(?:-id|::)([A-Z0-9]{20,})(?:[?#]|$)/i) || url.match(/id([A-Z0-9]{20,})$/i);
  if (idMatch) return idMatch[1];

  // Format: .../view/<ID> or .../notepad/<ID> (bare ID as last path segment)
  const pathMatch = url.match(/(?:view|notepad)\/([A-Z0-9]{20,})(?:[?#]|$)/i);
  if (pathMatch) return pathMatch[1];

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { firefliesUrl } = await request.json();

    if (!firefliesUrl || !firefliesUrl.includes('fireflies.ai')) {
      return NextResponse.json(
        { error: 'Invalid Fireflies URL' },
        { status: 400 }
      );
    }

    if (!FIREFLIES_API_KEY) {
      return NextResponse.json(
        { error: 'Fireflies API key not configured' },
        { status: 500 }
      );
    }

    const transcriptId = extractTranscriptId(firefliesUrl);
    if (!transcriptId) {
      return NextResponse.json(
        { error: 'Could not extract transcript ID from URL. Please check the link format.' },
        { status: 400 }
      );
    }

    // Fetch transcript via Fireflies GraphQL API
    const gqlRes = await fetch(FIREFLIES_GRAPHQL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIREFLIES_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `query Transcript($id: String!) {
          transcript(id: $id) {
            title
            date
            duration
            organizer_email
            summary {
              gist
              overview
              shorthand_bullet
              action_items
              outline
              keywords
            }
            sentences {
              text
              speaker_name
            }
          }
        }`,
        variables: { id: transcriptId },
      }),
    });

    if (!gqlRes.ok) {
      return NextResponse.json(
        { error: 'Fireflies API request failed' },
        { status: 502 }
      );
    }

    const gqlData = await gqlRes.json();
    const transcript = gqlData?.data?.transcript;

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript not found. It may not exist or may still be processing.' },
        { status: 404 }
      );
    }

    const aiNotes = transcript.summary || {};

    // Check if we have any content at all
    if (!aiNotes.shorthand_bullet && !aiNotes.overview && !aiNotes.gist && (!transcript.sentences || transcript.sentences.length === 0)) {
      return NextResponse.json(
        { error: 'No transcript content found. The meeting may still be processing.' },
        { status: 404 }
      );
    }

    // Build structured sections (same format the create page expects)
    const structuredSections: string[] = [];
    if (aiNotes.shorthand_bullet) structuredSections.push(`## Key Points\n${aiNotes.shorthand_bullet}`);
    if (aiNotes.action_items) structuredSections.push(`## Action Items\n${aiNotes.action_items}`);
    if (aiNotes.outline) structuredSections.push(`## Meeting Outline\n${aiNotes.outline}`);
    if (aiNotes.overview) structuredSections.push(`## Overview\n${aiNotes.overview}`);
    if (aiNotes.keywords) {
      const kw = Array.isArray(aiNotes.keywords) ? aiNotes.keywords.join(', ') : aiNotes.keywords;
      structuredSections.push(`## Keywords\n${kw}`);
    }

    // If no AI summary yet, fall back to raw sentences
    if (structuredSections.length === 0 && transcript.sentences?.length > 0) {
      const rawText = transcript.sentences
        .map((s: { text: string; speaker_name?: string }) =>
          s.speaker_name ? `${s.speaker_name}: ${s.text}` : s.text
        )
        .join('\n');
      structuredSections.push(`## Transcript\n${rawText}`);
    }

    const gist = aiNotes.gist || '';
    const combinedSummary = [
      gist ? `## Gist\n${gist}` : '',
      ...structuredSections,
    ].filter(Boolean).join('\n\n');

    return NextResponse.json({
      title: transcript.title || 'Unknown Meeting',
      date: transcript.date || null,
      duration: transcript.duration || null,
      gist,
      summary: combinedSummary,
      owner: transcript.organizer_email || null,
    });

  } catch (error) {
    console.error('Fetch transcript error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcript' },
      { status: 500 }
    );
  }
}
