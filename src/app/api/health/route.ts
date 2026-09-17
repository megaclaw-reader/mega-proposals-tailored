import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';

/**
 * Health check endpoint — validates all critical dependencies.
 * GET /api/health
 */
export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string; ms?: number }> = {};

  // 1. Blob storage
  try {
    const t0 = Date.now();
    const { blobs } = await list({ prefix: 'proposals/', limit: 1 });
    checks.blob = { ok: true, detail: `reachable, ${blobs.length >= 0 ? 'has data' : 'empty'}`, ms: Date.now() - t0 };
  } catch (err: any) {
    checks.blob = { ok: false, detail: err.message };
  }

  // 2. Anthropic API key configured
  checks.anthropicKey = {
    ok: !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-'),
    detail: process.env.ANTHROPIC_API_KEY ? 'configured' : 'MISSING',
  };

  // 3. Fireflies API key configured
  checks.firefliesKey = {
    ok: !!process.env.FIREFLIES_API_KEY && process.env.FIREFLIES_API_KEY.length > 10,
    detail: process.env.FIREFLIES_API_KEY ? 'configured' : 'MISSING',
  };

  // 4. Fireflies API reachable
  try {
    const t0 = Date.now();
    const res = await fetch('https://api.fireflies.ai/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.FIREFLIES_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: '{ transcripts(limit: 1) { id } }' }),
    });
    const data = await res.json();
    checks.firefliesApi = {
      ok: res.ok && !!data?.data?.transcripts,
      detail: res.ok ? 'reachable' : `HTTP ${res.status}`,
      ms: Date.now() - t0,
    };
  } catch (err: any) {
    checks.firefliesApi = { ok: false, detail: err.message };
  }

  // 5. Anthropic API reachable (cheap ping — 1 token)
  try {
    const t0 = Date.now();
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      }),
    });
    checks.anthropicApi = {
      ok: res.ok,
      detail: res.ok ? 'reachable' : `HTTP ${res.status}`,
      ms: Date.now() - t0,
    };
  } catch (err: any) {
    checks.anthropicApi = { ok: false, detail: err.message };
  }

  const allOk = Object.values(checks).every(c => c.ok);

  return NextResponse.json({
    status: allOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  }, { status: allOk ? 200 : 503 });
}
