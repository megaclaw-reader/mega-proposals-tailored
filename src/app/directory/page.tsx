import { list } from '@vercel/blob';
import DirectoryClient, { ProposalEntry } from './DirectoryClient';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const metadata = {
  title: 'Proposal Directory | MEGA',
};

export default async function DirectoryPage() {
  const proposals: ProposalEntry[] = [];

  try {
    // Paginate through all blobs
    let cursor: string | undefined;
    const allBlobs: any[] = [];
    
    do {
      const result = await list({ prefix: 'proposals/', limit: 1000, cursor });
      allBlobs.push(...result.blobs);
      cursor = result.cursor || undefined;
    } while (cursor);

    const jsonBlobs = allBlobs.filter((b) => b.pathname.endsWith('.json') && b.pathname !== 'proposals/.json');

    // Fetch blobs in parallel batches of 50 to avoid timeout
    const BATCH_SIZE = 50;
    for (let i = 0; i < jsonBlobs.length; i += BATCH_SIZE) {
      const batch = jsonBlobs.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (blob) => {
          try {
            const res = await fetch(blob.url, {
              headers: {
                Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
              },
            });
            if (!res.ok) return null;
            const data = await res.json();

            const encoded = data.encodedProposal as string;
            if (!encoded) return null;

            const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
            let json: string;
            try {
              json = Buffer.from(base64, 'base64').toString('utf-8');
            } catch {
              return null;
            }
            
            let payload: any;
            try {
              payload = JSON.parse(json);
            } catch {
              return null;
            }

            const slug = blob.pathname.replace('proposals/', '').replace('.json', '');

            return {
              slug,
              companyName: payload.co || data.companyName || 'Unknown',
              customerName: payload.cn || 'Unknown',
              salesRepName: payload.sr || 'Unknown',
              salesRepEmail: payload.se || '',
              selectedAgents: payload.a || [],
              createdAt: data.createdAt || new Date(payload.ts || 0).toISOString(),
            } satisfies ProposalEntry;
          } catch {
            return null;
          }
        })
      );
      for (const r of results) {
        if (r) proposals.push(r);
      }
    }
  } catch (error) {
    console.error('Directory fetch error:', error);
  }

  return <DirectoryClient proposals={proposals} />;
}
