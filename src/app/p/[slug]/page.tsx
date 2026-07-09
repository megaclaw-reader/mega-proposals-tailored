import { notFound } from 'next/navigation';
import { list } from '@vercel/blob';
import ProposalClient from './ProposalClient';

export const dynamic = 'force-dynamic';

export default async function ProposalSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let encodedProposal: string | null = null;
  let showTerms = false;
  let guaranteeDays = 30;
  let midpointGuarantee = false;
  let customNotes: string[] = [];
  let customNotesTitle: string | undefined;
  let currency: 'USD' | 'CAD' = 'USD';
  let currencyRate = 1;
  let customStripeLinks: Record<string, string> | undefined;

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
        showTerms = data.showTerms === true;
        guaranteeDays = data.guaranteeDays || 30;
        midpointGuarantee = data.midpointGuarantee === true;
        customNotes = data.customNotes || [];
        customNotesTitle = data.customNotesTitle || undefined;
        currency = data.currency || 'USD';
        currencyRate = data.currencyRate || 1;
        customStripeLinks = data.customStripeLinks || undefined;
      }
    }
  } catch (error) {
    console.error('Slug lookup error:', error);
  }

  if (!encodedProposal) {
    notFound();
  }

  return <ProposalClient encodedId={encodedProposal} showTerms={showTerms} guaranteeDays={guaranteeDays} midpointGuarantee={midpointGuarantee} customNotes={customNotes} customNotesTitle={customNotesTitle} currency={currency} currencyRate={currencyRate} customStripeLinks={customStripeLinks} />;
}
