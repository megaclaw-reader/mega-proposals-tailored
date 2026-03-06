import { list } from '@vercel/blob';
import DirectoryClient, { ProposalEntry } from './DirectoryClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Proposal Directory | MEGA',
};

export default async function DirectoryPage() {
  const proposals: ProposalEntry[] = [];

  try {
    const { blobs } = await list({ prefix: 'proposals/' });

    const fetches = blobs
      .filter((b) => b.pathname.endsWith('.json'))
      .map(async (blob) => {
        try {
          const res = await fetch(blob.url, {
            headers: {
              Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
            },
          });
          if (!res.ok) return null;
          const data = await res.json();

          // Decode the encodedProposal to extract details
          const encoded = data.encodedProposal as string;
          if (!encoded) return null;

          const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
          const json = Buffer.from(base64, 'base64').toString('utf-8');
          const payload = JSON.parse(json);

          // Extract slug from pathname: "proposals/my-slug.json" -> "my-slug"
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
      });

    const results = await Promise.all(fetches);
    for (const r of results) {
      if (r) proposals.push(r);
    }
  } catch (error) {
    console.error('Directory fetch error:', error);
  }

  return <DirectoryClient proposals={proposals} />;
}
