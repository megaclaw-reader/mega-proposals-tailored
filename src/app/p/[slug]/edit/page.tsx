import { notFound } from 'next/navigation';
import { list, head } from '@vercel/blob';
import EditClient from './EditClient';

export default async function EditProposalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let encodedProposal: string | null = null;
  let customAddendum: Array<{ title: string; body: string }> | undefined;
  let customAddendumTitle: string | undefined;

  try {
    const blobPath = `proposals/${slug}.json`;
    const token = process.env.BLOB_READ_WRITE_TOKEN || '';

    // Try head() first for consistent reads, fall back to list()
    let blobUrl: string | null = null;
    try {
      const meta = await head(blobPath);
      if (meta?.url) blobUrl = meta.url;
    } catch {
      // head() throws if blob doesn't exist
    }
    if (!blobUrl) {
      const { blobs } = await list({ prefix: blobPath });
      const blob = blobs.find(b => b.pathname === blobPath);
      if (blob) blobUrl = blob.url;
    }

    if (blobUrl) {
      const response = await fetch(`${blobUrl}?t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        encodedProposal = data.encodedProposal || null;
        customAddendum = data.customAddendum || undefined;
        customAddendumTitle = data.customAddendumTitle || undefined;
      }
    }
  } catch (error) {
    console.error('Slug lookup error:', error);
  }

  if (!encodedProposal) {
    notFound();
  }

  return <EditClient encodedId={encodedProposal} slug={slug} customAddendum={customAddendum} customAddendumTitle={customAddendumTitle} />;
}
