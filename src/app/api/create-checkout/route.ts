import { NextRequest, NextResponse } from 'next/server';

// Map our agent IDs to gomega.ai agent IDs
const AGENT_MAP: Record<string, string> = {
  seo: 'seo',
  paid_ads: 'ads',
  crm: 'crm',
  website: 'website',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const agentIds = body.agentIds;
    const cycle = body.cycle || body.term || 'monthly';

    if (!agentIds || !Array.isArray(agentIds) || agentIds.length === 0) {
      return NextResponse.json({ error: 'agentIds required' }, { status: 400 });
    }

    // Map to gomega.ai agent IDs
    const mappedIds = agentIds.map((id: string) => AGENT_MAP[id] || id).filter(Boolean);

    const res = await fetch('https://www.gomega.ai/api/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentIds: mappedIds, cycle }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('gomega.ai checkout error:', res.status, err);
      return NextResponse.json({ error: 'Checkout creation failed' }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Create checkout error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
