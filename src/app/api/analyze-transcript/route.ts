import { NextRequest, NextResponse } from 'next/server';
import { FirefliesInsights } from '@/lib/types';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

interface AnalyzeRequest {
  transcriptText: string;
}

export async function POST(request: NextRequest) {
  try {
    const { transcriptText }: AnalyzeRequest = await request.json();

    if (!transcriptText || transcriptText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Transcript text is required' },
        { status: 400 }
      );
    }

    if (!ANTHROPIC_API_KEY) {
      console.warn('ANTHROPIC_API_KEY not configured, using fallback analysis');
      // Fallback analysis without AI
      const insights: FirefliesInsights = {
        painPoints: ['Manual analysis required - please review the transcript'],
        discussionTopics: ['Transcript analysis needs to be configured'],
        megaSolutions: ['Custom proposal based on conversation'],
        summary: 'This proposal has been customized based on your sales conversation. Please review the transcript details to ensure accuracy.'
      };
      return NextResponse.json({ insights });
    }

    // Call Anthropic API to analyze the transcript
    const analysisPrompt = `
Analyze this sales call transcript and extract insights for a tailored marketing agency proposal. Focus on identifying:

1. PAIN POINTS: Specific challenges, frustrations, or gaps the prospect mentioned
2. DISCUSSION TOPICS: Key areas discussed (budget, channels, goals, timeline, etc.)
3. MEGA SOLUTIONS: How MEGA's services (SEO, Paid Ads, Website optimization) can address their needs
4. SUMMARY: A brief executive summary for the proposal

Transcript:
${transcriptText}

Please respond with a JSON object in this exact format:
{
  "painPoints": ["specific pain point 1", "specific pain point 2", ...],
  "discussionTopics": ["topic 1", "topic 2", ...],
  "megaSolutions": ["how MEGA helps with X", "how MEGA addresses Y", ...],
  "summary": "A concise 2-3 sentence summary of their situation and how MEGA can help"
}

Keep each array item concise but specific. Focus on actionable insights that will make the proposal feel personalized.
`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: analysisPrompt
        }]
      })
    });

    if (!response.ok) {
      console.error('Anthropic API error:', response.status, await response.text());
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const analysisText = data.content?.[0]?.text;

    if (!analysisText) {
      throw new Error('No analysis content received from Anthropic');
    }

    // Parse the JSON response from Claude
    let insights: FirefliesInsights;
    try {
      // Extract JSON from the response (in case Claude adds extra text)
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in analysis response');
      }
      insights = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse AI analysis:', parseError);
      // Fallback to basic analysis
      insights = {
        painPoints: ['Custom analysis based on sales conversation'],
        discussionTopics: ['Requirements discussed in sales call'],
        megaSolutions: ['Tailored MEGA solution to address specific needs'],
        summary: 'This proposal has been customized based on your sales conversation with specific insights from the call.'
      };
    }

    return NextResponse.json({ insights });

  } catch (error) {
    console.error('Transcript analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze transcript' },
      { status: 500 }
    );
  }
}