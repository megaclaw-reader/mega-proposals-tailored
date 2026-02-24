import { redirect, notFound } from 'next/navigation';
import { list } from '@vercel/blob';

export default async function ProposalSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Look up the proposal blob
  let encodedProposal: string | null = null;

  try {
    const { blobs } = await list({ prefix: `proposals/${slug}.json` });
    const blob = blobs.find(b => b.pathname === `proposals/${slug}.json`);

    if (blob) {
      const response = await fetch(blob.url, {
        headers: {
          Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        encodedProposal = data.encodedProposal || null;
      }
    }
  } catch (error) {
    console.error('Slug lookup error:', error);
  }

  // Redirect OUTSIDE the try/catch (redirect throws internally)
  if (encodedProposal) {
    redirect(`/proposal/${encodedProposal}`);
  }

  notFound();
}
