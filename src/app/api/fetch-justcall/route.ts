import { NextRequest, NextResponse } from 'next/server';

/**
 * Fetches JustCall call transcript from a shared voice link.
 * Extracts the token from the URL and calls the JustCall transcript API.
 * No auth required for shared links.
 */
export async function POST(request: NextRequest) {
  try {
    const { justcallUrl } = await request.json();

    if (!justcallUrl || !justcallUrl.includes('justcall.io')) {
      return NextResponse.json(
        { error: 'Invalid JustCall URL' },
        { status: 400 }
      );
    }

    // Extract token from URL like https://iq-app.justcall.io/app/sharedvoice?token=d85043c56fd23e41
    const urlObj = new URL(justcallUrl);
    const token = urlObj.searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Could not extract token from JustCall URL. Expected format: https://iq-app.justcall.io/app/sharedvoice?token=...' },
        { status: 400 }
      );
    }

    // Call JustCall transcript API
    const response = await fetch('https://iq-app.justcall.io/api/gettranscript_shared.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `tokenid=${token}&snippet=0`,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch JustCall transcript: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const transcript = data?.transcript;

    if (!transcript) {
      return NextResponse.json(
        { error: 'No transcript data found. The link may be invalid or expired.' },
        { status: 404 }
      );
    }

    const fullText = transcript.completetranscription;
    if (!fullText) {
      return NextResponse.json(
        { error: 'No transcription text available for this call.' },
        { status: 404 }
      );
    }

    // Build attendee info
    const attendees = transcript.attendeeslist || [];
    const callDuration = transcript.callduration || null;
    const callType = transcript.calltype || null;

    return NextResponse.json({
      title: `JustCall ${callType || 'Call'}${attendees.length > 0 ? ` with ${attendees.map((a: { name?: string }) => a.name || 'Unknown').join(', ')}` : ''}`,
      summary: fullText,
      duration: callDuration,
      callType,
      attendees,
    });

  } catch (error) {
    console.error('Fetch JustCall transcript error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch JustCall transcript' },
      { status: 500 }
    );
  }
}
