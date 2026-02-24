import { redirect } from 'next/navigation';
import { list } from '@vercel/blob';

export default async function ProposalSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    // List blobs with the exact prefix to find our proposal
    const { blobs } = await list({ prefix: `proposals/${slug}.json` });
    const blob = blobs.find(b => b.pathname === `proposals/${slug}.json`);

    if (!blob) {
      redirect('/');
    }

    // Fetch the blob content
    const response = await fetch(blob.url, {
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
      },
    });

    if (!response.ok) {
      redirect('/');
    }

    const data = await response.json();
    const { encodedProposal } = data;

    if (!encodedProposal) {
      redirect('/');
    }

    // Redirect to the actual proposal page with the encoded data
    redirect(`/proposal/${encodedProposal}`);
  } catch (error) {
    console.error('Slug lookup error:', error);
    redirect('/');
  }
}
