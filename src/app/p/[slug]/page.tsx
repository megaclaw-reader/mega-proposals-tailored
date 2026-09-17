import { notFound } from 'next/navigation';
import { list, head } from '@vercel/blob';
import ProposalClient from './ProposalClient';

export const dynamic = 'force-dynamic';

/**
 * Fetch proposal blob data — tries head() first (consistent reads for newly created blobs),
 * falls back to list() if head() fails. This fixes the issue where list() has eventual
 * consistency and newly created proposals would 404 for a few seconds after creation.
 */
async function fetchProposalBlob(slug: string): Promise<Record<string, unknown> | null> {
  const blobPath = `proposals/${slug}.json`;
  const token = process.env.BLOB_READ_WRITE_TOKEN || '';

  // Try head() first — gives us the URL directly, no eventual consistency issue
  let blobUrl: string | null = null;
  try {
    const meta = await head(blobPath);
    if (meta?.url) {
      blobUrl = meta.url;
    }
  } catch {
    // head() throws if blob doesn't exist — fall back to list()
  }

  // Fallback: list() with exact prefix
  if (!blobUrl) {
    try {
      const { blobs } = await list({ prefix: blobPath });
      const blob = blobs.find(b => b.pathname === blobPath);
      if (blob) blobUrl = blob.url;
    } catch {
      // list() failed too
    }
  }

  if (!blobUrl) return null;

  // Fetch the actual blob data
  const response = await fetch(`${blobUrl}?t=${Date.now()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!response.ok) return null;
  return response.json();
}

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
  let guaranteePlans: string[] | undefined;
  let customNotes: string[] = [];
  let customNotesTitle: string | undefined;
  let currency: 'USD' | 'CAD' = 'USD';
  let currencyRate = 1;
  let customStripeLinks: Record<string, string> | undefined;
  let customAddendum: Array<{ title: string; body: string }> | undefined;
  let customAddendumTitle: string | undefined;
  let customAddendumSubtitle: string | undefined;
  let monthlyBilling = false;
  let discountExpiresAt: string | undefined;
  let signedAgreement: { signedAt: string; signatureRequestId: string; minimumTermMonths?: number } | undefined;
  let isSigned = false;

  try {
    const data = await fetchProposalBlob(slug);

    if (data) {
      encodedProposal = (data.encodedProposal as string) || null;
      showTerms = data.showTerms === true;
      guaranteeDays = (data.guaranteeDays as number) || 30;
      midpointGuarantee = data.midpointGuarantee === true;
      guaranteePlans = (data.guaranteePlans as string[]) || undefined;
      customNotes = (data.customNotes as string[]) || [];
      customNotesTitle = (data.customNotesTitle as string) || undefined;
      currency = (data.currency as 'USD' | 'CAD') || 'USD';
      currencyRate = (data.currencyRate as number) || 1;
      customStripeLinks = (data.customStripeLinks as Record<string, string>) || undefined;
      customAddendum = (data.customAddendum as Array<{ title: string; body: string }>) || undefined;
      customAddendumTitle = (data.customAddendumTitle as string) || undefined;
      customAddendumSubtitle = (data.customAddendumSubtitle as string) || undefined;
      monthlyBilling = data.monthlyBilling === true;
      discountExpiresAt = (data.discountExpiresAt as string) || undefined;
      signedAgreement = (data.signedAgreement as { signedAt: string; signatureRequestId: string; minimumTermMonths?: number }) || (data.signed ? { signedAt: (data.signedAt as string) || new Date().toISOString(), signatureRequestId: 'onespan' } : undefined);
      isSigned = !!(data.signed || data.signedAgreement);
    }
  } catch (error) {
    console.error('Slug lookup error:', error);
  }

  if (!encodedProposal) {
    notFound();
  }

  return <ProposalClient encodedId={encodedProposal} showTerms={showTerms} guaranteeDays={guaranteeDays} midpointGuarantee={midpointGuarantee} guaranteePlans={guaranteePlans} customNotes={customNotes} customNotesTitle={customNotesTitle} currency={currency} currencyRate={currencyRate} customStripeLinks={customStripeLinks} customAddendum={customAddendum} customAddendumTitle={customAddendumTitle} customAddendumSubtitle={customAddendumSubtitle} monthlyBilling={monthlyBilling} discountExpiresAt={discountExpiresAt} signedAgreement={signedAgreement} isSigned={isSigned} proposalSlug={slug} />;
}
