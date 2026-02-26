import { NextRequest, NextResponse } from 'next/server';
import { FirefliesInsights } from '@/lib/types';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { transcriptSummary, meetingTitle, companyName } = await request.json();

    if (!transcriptSummary || transcriptSummary.trim().length === 0) {
      return NextResponse.json(
        { error: 'Transcript summary is required' },
        { status: 400 }
      );
    }

    if (!ANTHROPIC_API_KEY) {
      console.warn('ANTHROPIC_API_KEY not configured, using fallback');
      return NextResponse.json({
        insights: extractInsightsFallback(transcriptSummary)
      });
    }

    const analysisPrompt = `You are analyzing sales call notes to create a tailored marketing proposal. The prospect's company is "${companyName || 'the prospect'}".

Below are meeting notes from Fireflies.ai. There may be multiple meetings — analyze ALL of them together and synthesize the strongest, most relevant points from across every call.

${transcriptSummary}

Extract the following as a JSON object:

1. "painPoints" - Array of 3-6 specific challenges/frustrations the PROSPECT mentioned across all calls (not what the sales rep said). Be specific to their business. Pull the strongest points from whichever call they came up in. CRITICAL: Only include challenges that MEGA can actually solve. MEGA offers Google Ads, Meta (Facebook/Instagram) Ads, SEO, GEO, and AI-powered content/creative. MEGA does NOT offer Bing/Microsoft Ads, TikTok Ads, LinkedIn Ads, Amazon Ads, programmatic/display networks, email marketing platforms, CRM software, or web development. If the prospect mentions a challenge related to a service MEGA doesn't provide, DO NOT include it as a pain point — it makes us look bad if we highlight a problem we can't fix.
2. "discussionTopics" - Array of 4-8 key business topics discussed across all calls (budget, channels, goals, team size, industry specifics, etc.)
3. "megaSolutions" - Array of 3-6 specific ways MEGA's services address their needs. Map each solution to a pain point. Be concrete, not generic.
4. "summary" - A 2-3 sentence executive summary written FOR the proposal. Address the prospect directly ("your team", "your challenges"). Don't mention MEGA by name — use "our" or "we". This should feel personalized, not templated. Synthesize insights from all calls into one cohesive narrative.

IMPORTANT: Focus on what the PROSPECT said and needs, not what the sales rep pitched. If there are multiple calls, combine the best insights — don't repeat or list per-call.

Respond with ONLY the JSON object, no other text.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: analysisPrompt
        }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', response.status, errText);
      return NextResponse.json({
        insights: extractInsightsFallback(transcriptSummary)
      });
    }

    const data = await response.json();
    const analysisText = data.content?.[0]?.text;

    if (!analysisText) {
      return NextResponse.json({
        insights: extractInsightsFallback(transcriptSummary)
      });
    }

    // Parse JSON from Claude's response
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({
        insights: extractInsightsFallback(transcriptSummary)
      });
    }

    const insights: FirefliesInsights = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ insights });

  } catch (error) {
    console.error('Transcript analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze transcript' },
      { status: 500 }
    );
  }
}

/** Fallback: extract basic insights from the summary text without AI */
function extractInsightsFallback(summary: string): FirefliesInsights {
  const lines = summary.split('\n').filter(l => l.trim());
  const bulletPoints = lines.filter(l => l.match(/^[-•*]/));
  
  return {
    painPoints: bulletPoints.slice(0, 3).map(l => l.replace(/^[-•*]\s*\*?\*?/, '').replace(/\*\*/g, '').trim()).filter(Boolean),
    discussionTopics: bulletPoints.slice(3, 7).map(l => l.replace(/^[-•*]\s*\*?\*?/, '').replace(/\*\*/g, '').trim()).filter(Boolean),
    megaSolutions: [
      'AI-powered marketing optimization tailored to your specific needs',
      'End-to-end management with dedicated account support',
      'Data-driven lead scoring and qualification framework'
    ],
    summary: 'Based on our conversation, we\'ve prepared this proposal to address your specific marketing challenges with a data-driven, AI-powered approach that delivers measurable results.'
  };
}
