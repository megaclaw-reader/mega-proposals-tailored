import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = 'https://prezcluiyrnvaushvfjm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByZXpjbHVpeXJudmF1c2h2ZmptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5ODc1OTEsImV4cCI6MjA5MzU2MzU5MX0.Eq9uIl1ItCzCPyHELW48oCyIxmnoJjtsfXJPyP6Rh7o';

// Map our internal agent IDs to what the Supabase edge function expects
const AGENT_ID_MAP: Record<string, string> = {
  crm: 'crm',
  paid_ads: 'ads',
  seo: 'seo',
  website: 'website',
};

// Map our internal term names to Supabase cycle names
const CYCLE_MAP: Record<string, string> = {
  monthly: 'monthly',
  quarterly: 'quarterly',
  bi_annual: 'biannual',
  annual: 'annual',
};

export async function POST(request: NextRequest) {
  try {
    const { agentIds, term } = await request.json();

    if (!agentIds || !Array.isArray(agentIds) || !term) {
      return NextResponse.json({ error: 'Missing agentIds or term' }, { status: 400 });
    }

    const mappedAgentIds = agentIds.map((id: string) => AGENT_ID_MAP[id] || id);
    const cycle = CYCLE_MAP[term] || term;

    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agentIds: mappedAgentIds,
        cycle,
        origin: 'https://mega-proposals-tailored.vercel.app',
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      console.error('Supabase checkout error:', data);
      return NextResponse.json(
        { error: data.error || 'Failed to create checkout session' },
        { status: 502 }
      );
    }

    return NextResponse.json({ url: data.url });
  } catch (error) {
    console.error('Create checkout error:', error);
    return NextResponse.json(
      { error: 'Internal error creating checkout' },
      { status: 500 }
    );
  }
}
