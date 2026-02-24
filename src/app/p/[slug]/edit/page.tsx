import { notFound } from 'next/navigation';
import { list } from '@vercel/blob';
import EditClient from './EditClient';

export default async function EditProposalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
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

  if (!encodedProposal) {
    notFound();
  }

  return <EditClient encodedId={encodedProposal} slug={slug} />;
}
