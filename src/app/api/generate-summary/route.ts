import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { businessContext, companyName, template, agents } = await request.json();

    if (!businessContext || !companyName || !ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Missing required fields or API key' }, { status: 400 });
    }

    const agentNames = (agents as string[]).map(a => {
      if (a === 'seo') return 'SEO/GEO';
      if (a === 'paid_ads') return 'Paid Ads';
      if (a === 'website') return 'Website';
      return a;
    });

    const prompt = `Write a concise executive summary (2-3 sentences) for a digital marketing proposal from MEGA AI to "${companyName}".

Business context from the sales rep: "${businessContext}"

Services included: ${agentNames.join(', ')}
Template type: ${template === 'ecom' ? 'eCommerce/online sales' : 'lead generation'}

Rules:
- Write in third person about MEGA's approach
- Be specific to THIS business — reference what they actually do based on the context
- Don't use generic marketing buzzwords
- Don't mention MEGA by name — use "our approach" or "this proposal"
- Keep it professional but not stuffy
- 2-3 sentences max
- Start with "This proposal outlines..." or similar
- Only mention the services that are included (don't mention SEO if it's not selected, etc.)

Return ONLY the summary text, nothing else.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      console.error('Anthropic API error:', await res.text());
      return NextResponse.json({ error: 'AI generation failed' }, { status: 500 });
    }

    const data = await res.json();
    const summary = data.content?.[0]?.text?.trim() || '';

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Generate summary error:', error);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}
