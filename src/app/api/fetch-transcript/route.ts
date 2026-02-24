import { NextRequest, NextResponse } from 'next/server';

/**
 * Fetches Fireflies transcript data from a shared meeting link.
 * Works for meetings with "anyone with link" privacy setting.
 * Extracts the AI summary and notes from the __NEXT_DATA__ JSON embedded in the page.
 */
export async function POST(request: NextRequest) {
  try {
    const { firefliesUrl } = await request.json();

    if (!firefliesUrl || !firefliesUrl.includes('fireflies.ai')) {
      return NextResponse.json(
        { error: 'Invalid Fireflies URL' },
        { status: 400 }
      );
    }

    // Fetch the Fireflies page HTML
    const response = await fetch(firefliesUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch Fireflies page: ${response.status}` },
        { status: 502 }
      );
    }

    const html = await response.text();

    // Extract __NEXT_DATA__ from the page
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/);
    if (!nextDataMatch) {
      return NextResponse.json(
        { error: 'Could not find transcript data on the page. The link may require authentication.' },
        { status: 404 }
      );
    }

    const nextData = JSON.parse(nextDataMatch[1]);
    const pageProps = nextData?.props?.pageProps || {};
    const meetingNote = pageProps.initialMeetingNote || {};
    const summaryComment = pageProps.summaryMeetingNoteComment?.comment || '';
    const gist = meetingNote.summary?.gist || '';

    if (!summaryComment && !gist) {
      return NextResponse.json(
        { error: 'No transcript summary found. The meeting may require authentication to view.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      title: meetingNote.title || 'Unknown Meeting',
      date: meetingNote.date || null,
      duration: meetingNote.durationMins || null,
      gist,
      summary: summaryComment,
      owner: meetingNote.ownerProfile?.name || null,
    });

  } catch (error) {
    console.error('Fetch transcript error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcript' },
      { status: 500 }
    );
  }
}
