'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Agent, Bundle, Template, ContractTerm, TermOption, FirefliesInsights, BUNDLE_DEFINITIONS, QuoteOption } from '@/lib/types';
import { calculatePricing, formatPrice, getTermDisplayName, getTermMonths } from '@/lib/pricing';
import { encodeProposal } from '@/lib/encode';

const AVAILABLE_TERMS: ContractTerm[] = ['annual', 'bi_annual', 'quarterly', 'monthly'];

interface TranscriptEntry {
  url: string;
  status: 'idle' | 'fetching' | 'fetched' | 'error';
  data: { title: string; summary: string } | null;
  error: string | null;
}

interface JustCallEntry {
  url: string;
  status: 'idle' | 'fetching' | 'fetched' | 'error';
  data: { title: string; summary: string } | null;
  error: string | null;
}

export default function CreateProposal() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    customerName: '',
    companyName: '',
    template: 'leads' as Template,
    selectedAgents: [] as Agent[],
    salesRepName: '',
    salesRepEmail: '',
    businessContext: '',
    selectedBundle: undefined as Bundle | undefined,
  });
  const [firefliesEntries, setFirefliesEntries] = useState<TranscriptEntry[]>([
    { url: '', status: 'idle', data: null, error: null },
  ]);
  const [justcallEntries, setJustcallEntries] = useState<JustCallEntry[]>([
    { url: '', status: 'idle', data: null, error: null },
  ]);
  const [termOptions, setTermOptions] = useState<Record<ContractTerm, { selected: boolean; discount: string; discountType: 'percent' | 'dollar' }>>({
    annual: { selected: true, discount: '', discountType: 'percent' },
    bi_annual: { selected: false, discount: '', discountType: 'percent' },
    quarterly: { selected: false, discount: '', discountType: 'percent' },
    monthly: { selected: false, discount: '', discountType: 'percent' },
  });
  const [multiOptionMode, setMultiOptionMode] = useState(false);
  const [quoteOptionsList, setQuoteOptionsList] = useState<Array<{
    label: string;
    agents: Agent[];
    bundle?: Bundle;
    recommended: boolean;
    termOptions: Record<ContractTerm, { selected: boolean; discount: string; discountType: 'percent' | 'dollar' }>;
  }>>([
    { label: '', agents: [], bundle: undefined, recommended: false, termOptions: { annual: { selected: true, discount: '', discountType: 'percent' }, bi_annual: { selected: false, discount: '', discountType: 'percent' }, quarterly: { selected: false, discount: '', discountType: 'percent' }, monthly: { selected: false, discount: '', discountType: 'percent' } } },
    { label: '', agents: [], bundle: undefined, recommended: false, termOptions: { annual: { selected: true, discount: '', discountType: 'percent' }, bi_annual: { selected: false, discount: '', discountType: 'percent' }, quarterly: { selected: false, discount: '', discountType: 'percent' }, monthly: { selected: false, discount: '', discountType: 'percent' } } },
  ]);
  const [guarantee, setGuarantee] = useState<'none' | '30' | '60'>('none');
  const [midTermReview, setMidTermReview] = useState(false);
  const [discountExpiresAt, setDiscountExpiresAt] = useState('');
  const [minimumCommitment, setMinimumCommitment] = useState<3 | 6 | 12 | null>(null);
  const [monthlyBillingOption, setMonthlyBillingOption] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'fetching' | 'analyzing' | 'done' | 'error'>('idle');
  const [generatedLinks, setGeneratedLinks] = useState<{ share: string; edit: string } | null>(null);

  const fetchTranscript = useCallback(async (index: number, url: string) => {
    if (!url.includes('fireflies.ai')) return;
    setFirefliesEntries(prev => prev.map((e, i) => i === index ? { ...e, status: 'fetching', error: null } : e));
    try {
      const res = await fetch('/api/fetch-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firefliesUrl: url }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch transcript');
      }
      const data = await res.json();
      setFirefliesEntries(prev => prev.map((e, i) => i === index ? { ...e, status: 'fetched', data } : e));
    } catch (err) {
      setFirefliesEntries(prev => prev.map((e, i) => i === index ? { ...e, status: 'error', error: err instanceof Error ? err.message : 'Failed to fetch transcript' } : e));
    }
  }, []);

  const addFirefliesEntry = () => {
    setFirefliesEntries(prev => [...prev, { url: '', status: 'idle', data: null, error: null }]);
  };

  const removeFirefliesEntry = (index: number) => {
    setFirefliesEntries(prev => prev.filter((_, i) => i !== index));
  };

  const updateFirefliesUrl = (index: number, url: string) => {
    setFirefliesEntries(prev => prev.map((e, i) => i === index ? { ...e, url } : e));
  };

  const fetchJustcallTranscript = useCallback(async (index: number, url: string) => {
    if (!url.includes('justcall.io')) return;
    setJustcallEntries(prev => prev.map((e, i) => i === index ? { ...e, status: 'fetching', error: null } : e));
    try {
      const res = await fetch('/api/fetch-justcall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ justcallUrl: url }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch JustCall transcript');
      }
      const data = await res.json();
      setJustcallEntries(prev => prev.map((e, i) => i === index ? { ...e, status: 'fetched', data } : e));
    } catch (err) {
      setJustcallEntries(prev => prev.map((e, i) => i === index ? { ...e, status: 'error', error: err instanceof Error ? err.message : 'Failed to fetch transcript' } : e));
    }
  }, []);

  const addJustcallEntry = () => {
    setJustcallEntries(prev => [...prev, { url: '', status: 'idle', data: null, error: null }]);
  };

  const removeJustcallEntry = (index: number) => {
    setJustcallEntries(prev => prev.filter((_, i) => i !== index));
  };

  const updateJustcallUrl = (index: number, url: string) => {
    setJustcallEntries(prev => prev.map((e, i) => i === index ? { ...e, url } : e));
  };

  const handleTemplateChange = (template: Template) => {
    setFormData(prev => {
      let newBundle = prev.selectedBundle;
      let newAgents = prev.selectedAgents;
      // Swap grow_faster variants when template changes
      if (template === 'ecom' && prev.selectedBundle === 'grow_faster') {
        newBundle = 'grow_faster_ecom' as Bundle;
        newAgents = [...BUNDLE_DEFINITIONS[newBundle].agents];
      } else if (template === 'leads' && prev.selectedBundle === ('grow_faster_ecom' as Bundle)) {
        newBundle = 'grow_faster';
        newAgents = [...BUNDLE_DEFINITIONS[newBundle].agents];
      }
      return { ...prev, template, selectedBundle: newBundle, selectedAgents: newAgents };
    });
  };

  const handleBundleSelect = (bundle: Bundle | undefined) => {
    if (bundle) {
      const bundleDef = BUNDLE_DEFINITIONS[bundle];
      setFormData(prev => ({
        ...prev,
        selectedBundle: bundle,
        selectedAgents: [...bundleDef.agents],
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        selectedBundle: undefined,
      }));
    }
  };

  const handleAgentToggle = (agent: Agent) => {
    setFormData(prev => ({
      ...prev,
      selectedBundle: undefined, // Clear bundle when manually toggling agents
      selectedAgents: prev.selectedAgents.includes(agent)
        ? prev.selectedAgents.filter(a => a !== agent)
        : [...prev.selectedAgents, agent]
    }));
  };

  const handleTermToggle = (term: ContractTerm) => {
    setTermOptions(prev => ({
      ...prev,
      [term]: { ...prev[term], selected: !prev[term].selected },
    }));
  };

  const handleTermDiscount = (term: ContractTerm, discount: string) => {
    setTermOptions(prev => ({
      ...prev,
      [term]: { ...prev[term], discount },
    }));
  };

  const handleTermDiscountType = (term: ContractTerm, discountType: 'percent' | 'dollar') => {
    setTermOptions(prev => ({
      ...prev,
      [term]: { ...prev[term], discountType, discount: '' },
    }));
  };

  const getSelectedTerms = (): TermOption[] => {
    return AVAILABLE_TERMS
      .filter(term => termOptions[term].selected)
      .map(term => ({
        term,
        discountPercentage: termOptions[term].discountType === 'percent' ? (parseFloat(termOptions[term].discount) || 0) : 0,
        discountDollar: termOptions[term].discountType === 'dollar' ? (parseFloat(termOptions[term].discount) || 0) : 0,
      }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const selectedTerms = getSelectedTerms();
      let firefliesInsights = undefined;

      // Collect all Fireflies URLs that have content
      const validFirefliesEntries = firefliesEntries.filter(e => e.url.includes('fireflies.ai'));
      const validJustcallEntries = justcallEntries.filter(e => e.url.includes('justcall.io'));

      if (validFirefliesEntries.length > 0 || validJustcallEntries.length > 0) {
        try {
          // Step 1: Fetch any transcripts not already fetched
          setAnalysisStatus('fetching');
          const allSummaries: { title: string; summary: string; source: 'fireflies' | 'justcall' }[] = [];

          // Fetch Fireflies transcripts
          for (let i = 0; i < firefliesEntries.length; i++) {
            const entry = firefliesEntries[i];
            if (!entry.url.includes('fireflies.ai')) continue;

            if (entry.data?.summary) {
              allSummaries.push({ ...entry.data, source: 'fireflies' });
            } else {
              const fetchRes = await fetch('/api/fetch-transcript', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ firefliesUrl: entry.url }),
              });
              if (fetchRes.ok) {
                const data = await fetchRes.json();
                allSummaries.push({ ...data, source: 'fireflies' });
                setFirefliesEntries(prev => prev.map((e, idx) => idx === i ? { ...e, status: 'fetched', data } : e));
              }
            }
          }

          // Fetch JustCall transcripts
          for (let i = 0; i < justcallEntries.length; i++) {
            const entry = justcallEntries[i];
            if (!entry.url.includes('justcall.io')) continue;

            if (entry.data?.summary) {
              allSummaries.push({ ...entry.data, source: 'justcall' });
            } else {
              const fetchRes = await fetch('/api/fetch-justcall', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ justcallUrl: entry.url }),
              });
              if (fetchRes.ok) {
                const data = await fetchRes.json();
                allSummaries.push({ ...data, source: 'justcall' });
                setJustcallEntries(prev => prev.map((e, idx) => idx === i ? { ...e, status: 'fetched', data } : e));
              }
            }
          }

          // Step 2: Combine all summaries and analyze
          if (allSummaries.length > 0) {
            setAnalysisStatus('analyzing');
            const combinedSummary = allSummaries.length === 1
              ? allSummaries[0].summary
              : allSummaries.map((s, i) => `--- ${s.source === 'justcall' ? 'Phone Call' : 'Meeting'} ${i + 1}: ${s.title} ---\n${s.summary}`).join('\n\n');
            const combinedTitle = allSummaries.length === 1
              ? allSummaries[0].title
              : `${allSummaries.length} interactions with ${formData.companyName}`;

            // Determine source type for prompt customization
            const hasFireflies = allSummaries.some(s => s.source === 'fireflies');
            const hasJustcall = allSummaries.some(s => s.source === 'justcall');
            const sourceType = hasFireflies && hasJustcall ? 'mixed' : hasJustcall ? 'justcall' : 'fireflies';

            const analyzeRes = await fetch('/api/analyze-transcript', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                transcriptSummary: combinedSummary,
                meetingTitle: combinedTitle,
                companyName: formData.companyName,
                sourceType,
                selectedAgents: formData.selectedAgents,
                template: formData.template,
              }),
            });
            if (analyzeRes.ok) {
              const { insights } = await analyzeRes.json();
              // Only use insights if they actually contain content (not empty fallback)
              if (insights && insights.painPoints?.length > 0 && insights.summary) {
                firefliesInsights = insights;
                setAnalysisStatus('done');
              } else {
                console.warn('Analysis returned empty insights — transcript may not have been processed');
                setAnalysisStatus('error');
                alert('⚠️ The transcript was fetched but the AI analysis returned empty results. The proposal will be created without tailored insights. Try creating it again — this is usually a one-time issue.');
              }
            } else {
              const errData = await analyzeRes.json().catch(() => ({ error: `HTTP ${analyzeRes.status}` }));
              console.error('Analyze transcript failed:', errData);
              setAnalysisStatus('error');
              alert(`⚠️ Transcript analysis returned an error: ${errData.error || analyzeRes.status}. The proposal will be created without tailored insights.`);
            }
          }
        } catch (err) {
          console.error('Transcript analysis error:', err);
          setAnalysisStatus('error');
          alert(`⚠️ Transcript analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}. The proposal will be created without tailored insights. You can try again.`);
        }
      }

      // Generate AI executive summary if business context provided
      let customExecutiveSummary: string | undefined;
      if (formData.businessContext.trim()) {
        try {
          const summaryRes = await fetch('/api/generate-summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              businessContext: formData.businessContext,
              companyName: formData.companyName,
              template: formData.template,
              agents: formData.selectedAgents,
            }),
          });
          if (summaryRes.ok) {
            const { summary } = await summaryRes.json();
            customExecutiveSummary = summary;
          }
        } catch (err) {
          console.warn('Summary generation error:', err);
        }
      }

      // Use first Fireflies URL for backward compatibility
      const firstFirefliesUrl = firefliesEntries.find(e => e.url.includes('fireflies.ai'))?.url;

      // Build quote options if multi-option mode is on
      const quoteOptions: QuoteOption[] | undefined = multiOptionMode && quoteOptionsList.length >= 2
        ? quoteOptionsList.map(qo => ({
            label: qo.label,
            agents: qo.agents,
            bundle: qo.bundle,
            recommended: qo.recommended,
            terms: AVAILABLE_TERMS.filter(t => qo.termOptions[t].selected).map(t => ({
              term: t,
              discountPercentage: qo.termOptions[t].discountType === 'percent' ? (parseFloat(qo.termOptions[t].discount) || 0) : 0,
              discountDollar: qo.termOptions[t].discountType === 'dollar' ? (parseFloat(qo.termOptions[t].discount) || 0) : 0,
            })),
          }))
        : undefined;

      // Determine if monthly requires agreement
      const monthlyMinCommitment = !multiOptionMode && termOptions.monthly.selected && minimumCommitment ? minimumCommitment : undefined;

      const encoded = encodeProposal({
        customerName: formData.customerName,
        companyName: formData.companyName,
        template: formData.template,
        selectedAgents: multiOptionMode ? (quoteOptionsList[0]?.agents || formData.selectedAgents) : formData.selectedAgents,
        selectedBundle: multiOptionMode ? undefined : formData.selectedBundle,
        salesRepName: formData.salesRepName,
        salesRepEmail: formData.salesRepEmail,
        contractTerm: selectedTerms[0]?.term || 'annual',
        selectedTerms: multiOptionMode ? (quoteOptions?.[0]?.terms || selectedTerms) : selectedTerms,
        firefliesUrl: firstFirefliesUrl || undefined,
        firefliesInsights,
        businessContext: formData.businessContext || undefined,
        customExecutiveSummary,
        ...(quoteOptions ? { quoteOptions } : {}),
        ...(monthlyMinCommitment ? { minimumTermMonths: monthlyMinCommitment, requiresAgreement: true } : {}),
      } as any);

      // Save proposal with a clean slug and get the professional URL
      try {
        const saveRes = await fetch('/api/proposals/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            encodedProposal: encoded,
            companyName: formData.companyName,
            ...(guarantee !== 'none' && { guaranteeDays: parseInt(guarantee) }),
            ...(midTermReview && { midpointGuarantee: true }),
            ...(discountExpiresAt && { discountExpiresAt: new Date(discountExpiresAt + 'T23:59:59').toISOString() }),
            ...(monthlyBillingOption && { monthlyBilling: true }),
          }),
        });

        if (saveRes.ok) {
          const { slug } = await saveRes.json();
          const origin = window.location.origin;
          setGeneratedLinks({
            share: `${origin}/p/${slug}`,
            edit: `${origin}/p/${slug}/edit`,
          });
          setIsSubmitting(false);
          return;
        }
      } catch (saveErr) {
        console.warn('Failed to create clean URL, falling back:', saveErr);
      }

      // Fallback to encoded URL if save fails
      router.push(`/proposal/${encoded}`);
    } catch (error) {
      console.error('Error creating proposal:', error);
      alert('Failed to create proposal. Please try again.');
      setIsSubmitting(false);
    }
  };

  const selectedTerms = getSelectedTerms();
  const hasAgents = multiOptionMode
    ? quoteOptionsList.length >= 2 && quoteOptionsList.every(qo => qo.agents.length > 0)
    : formData.selectedAgents.length > 0;
  const hasTerms = multiOptionMode
    ? quoteOptionsList.length >= 2 && quoteOptionsList.every(qo => Object.values(qo.termOptions).some(t => t.selected))
    : selectedTerms.length > 0;
  const fetchedCount = firefliesEntries.filter(e => e.status === 'fetched').length + justcallEntries.filter(e => e.status === 'fetched').length;

  if (generatedLinks) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-lg mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-green-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Proposal Created!</h2>
          <p className="text-gray-600 mb-6">Your proposal for <strong>{formData.companyName}</strong> is ready.</p>
          
          <div className="space-y-4 text-left">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="block text-sm font-semibold text-blue-800 mb-2">📤 Share Link <span className="font-normal text-blue-600">(send to customer)</span></label>
              <div className="flex gap-2">
                <input type="text" readOnly value={generatedLinks.share} className="flex-1 text-sm border border-blue-300 rounded px-3 py-2 bg-white" />
                <button onClick={() => { navigator.clipboard.writeText(generatedLinks.share); }} className="bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700">Copy</button>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <label className="block text-sm font-semibold text-amber-800 mb-2">✏️ Edit Link <span className="font-normal text-amber-600">(tweak before sending)</span></label>
              <div className="flex gap-2">
                <input type="text" readOnly value={generatedLinks.edit} className="flex-1 text-sm border border-amber-300 rounded px-3 py-2 bg-white" />
                <button onClick={() => { navigator.clipboard.writeText(generatedLinks.edit); }} className="bg-amber-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-amber-700">Copy</button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3 justify-center">
            <a href={generatedLinks.share} target="_blank" rel="noopener noreferrer" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700">Preview Proposal</a>
            <a href={generatedLinks.edit} target="_blank" rel="noopener noreferrer" className="bg-amber-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-amber-700">Edit Proposal</a>
            <button onClick={() => { setGeneratedLinks(null); }} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-300">Create Another</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-blue-600 px-6 py-4">
            <h1 className="text-2xl font-bold text-white">MEGA Proposal Generator</h1>
            <p className="text-blue-100 mt-1">Create a branded proposal for your customer</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Customer Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name *</label>
                <input type="text" required value={formData.customerName}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
                <input type="text" required value={formData.companyName}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {/* Fireflies Meeting Links */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fireflies Meeting Links
                <span className="text-gray-400 font-normal ml-1">(optional — paste one or more to generate a tailored proposal)</span>
              </label>
              <div className="space-y-3">
                {firefliesEntries.map((entry, index) => (
                  <div key={index}>
                    <div className="flex gap-2">
                      <input type="url" value={entry.url}
                        onChange={(e) => updateFirefliesUrl(index, e.target.value)}
                        onBlur={(e) => { if (e.target.value.includes('fireflies.ai')) fetchTranscript(index, e.target.value); }}
                        placeholder="https://app.fireflies.ai/view/..."
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      {firefliesEntries.length > 1 && (
                        <button type="button" onClick={() => removeFirefliesEntry(index)}
                          className="text-red-400 hover:text-red-600 px-2 text-lg font-bold" title="Remove">×</button>
                      )}
                    </div>
                    {entry.status === 'fetching' && (
                      <p className="mt-1 text-sm text-blue-600 flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                        Fetching transcript...
                      </p>
                    )}
                    {entry.status === 'fetched' && entry.data && (
                      <p className="mt-1 text-sm text-green-700">✓ {entry.data.title}</p>
                    )}
                    {entry.status === 'error' && (
                      <p className="mt-1 text-sm text-red-600">⚠ {entry.error || 'Could not fetch transcript.'}</p>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={addFirefliesEntry}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                <span className="text-lg leading-none">+</span> Add another meeting
              </button>
              {fetchedCount === 0 && firefliesEntries.every(e => !e.url) && (
                <p className="mt-1 text-xs text-gray-500">
                  Paste Fireflies meeting links to automatically pull transcripts and tailor the proposal.
                </p>
              )}
              {fetchedCount > 1 && (
                <p className="mt-1 text-xs text-green-600">
                  {fetchedCount} transcripts loaded — all will be analyzed together to personalize your proposal.
                </p>
              )}
            </div>

            {/* JustCall Recording Links */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                JustCall Call Recording Links
                <span className="text-gray-400 font-normal ml-1">(optional — paste shared voice links to include phone call insights)</span>
              </label>
              <div className="space-y-3">
                {justcallEntries.map((entry, index) => (
                  <div key={index}>
                    <div className="flex gap-2">
                      <input type="url" value={entry.url}
                        onChange={(e) => updateJustcallUrl(index, e.target.value)}
                        onBlur={(e) => { if (e.target.value.includes('justcall.io')) fetchJustcallTranscript(index, e.target.value); }}
                        placeholder="https://iq-app.justcall.io/app/sharedvoice?token=..."
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      {justcallEntries.length > 1 && (
                        <button type="button" onClick={() => removeJustcallEntry(index)}
                          className="text-red-400 hover:text-red-600 px-2 text-lg font-bold" title="Remove">×</button>
                      )}
                    </div>
                    {entry.status === 'fetching' && (
                      <p className="mt-1 text-sm text-blue-600 flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                        Fetching call transcript...
                      </p>
                    )}
                    {entry.status === 'fetched' && entry.data && (
                      <p className="mt-1 text-sm text-green-700">✓ {entry.data.title}</p>
                    )}
                    {entry.status === 'error' && (
                      <p className="mt-1 text-sm text-red-600">⚠ {entry.error || 'Could not fetch transcript.'}</p>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={addJustcallEntry}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                <span className="text-lg leading-none">+</span> Add another call
              </button>
            </div>

            {/* Template Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Template Type *</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input type="radio" name="template" value="leads" checked={formData.template === 'leads'}
                    onChange={() => handleTemplateChange('leads')}
                    className="mr-2 text-blue-600" />
                  <span>Leads-based (Optimized for lead generation)</span>
                </label>
                <label className="flex items-center">
                  <input type="radio" name="template" value="ecom" checked={formData.template === 'ecom'}
                    onChange={() => handleTemplateChange('ecom')}
                    className="mr-2 text-blue-600" />
                  <span>eCom-based (Optimized for eCommerce)</span>
                </label>
              </div>
            </div>

            {/* Business Context */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Context <span className="text-gray-400 font-normal">(optional — helps tailor the executive summary)</span>
              </label>
              <textarea
                value={formData.businessContext}
                onChange={(e) => setFormData(prev => ({ ...prev, businessContext: e.target.value }))}
                placeholder="e.g. They sell event tickets online, focused on music festivals in the Southeast US. Looking to scale from $50K to $200K monthly revenue."
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">Describe what the customer does so the proposal reads specific to their business.</p>
            </div>

            {/* Bundle Selection — hidden in multi-option mode */}
            {!multiOptionMode && <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Quick Select a Bundle</label>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {((formData.template === 'ecom'
                  ? ['convert', 'grow', 'grow_faster_ecom']
                  : ['convert', 'grow', 'grow_faster']) as Bundle[]).map(bundle => {
                  const def = BUNDLE_DEFINITIONS[bundle];
                  const isSelected = formData.selectedBundle === bundle;
                  return (
                    <button
                      key={bundle}
                      type="button"
                      onClick={() => handleBundleSelect(isSelected ? undefined : bundle)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-semibold text-gray-900">{def.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{def.description}</div>
                    </button>
                  );
                })}
              </div>

              <label className="block text-sm font-medium text-gray-700 mb-3">
                Or Select Individual Agents *
                {formData.selectedBundle && <span className="text-blue-600 font-normal ml-2">(auto-selected by {BUNDLE_DEFINITIONS[formData.selectedBundle].name} bundle)</span>}
              </label>
              <div className="space-y-2">
                {(['seo', 'paid_ads', 'crm', 'website'] as Agent[]).map(agent => {
                  const labels: Record<Agent, string> = { seo: 'SEO & GEO Agent', paid_ads: 'Paid Ads Agent', crm: 'Conversion Agent', website: 'Website Agent' };
                  return (
                    <label key={agent} className="flex items-center">
                      <input type="checkbox" checked={formData.selectedAgents.includes(agent)}
                        onChange={() => handleAgentToggle(agent)} className="mr-2 text-blue-600" />
                      <span>{labels[agent]}</span>
                    </label>
                  );
                })}
              </div>
            </div>}

            {/* Commitment Options — hidden in multi-option mode */}
            {!multiOptionMode && <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Commitment Options * <span className="text-gray-400 font-normal">(select one or more to show as pricing tiers)</span>
              </label>
              <div className="space-y-3">
                {AVAILABLE_TERMS.map(term => (
                  <div key={term} className={`border rounded-lg p-4 transition-colors ${termOptions[term].selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center cursor-pointer">
                        <input type="checkbox" checked={termOptions[term].selected}
                          onChange={() => handleTermToggle(term)} className="mr-3 text-blue-600" />
                        <div>
                          <span className="font-medium text-gray-900">{getTermDisplayName(term)}</span>
                          <span className="text-gray-500 text-sm ml-2">({term === 'monthly' ? 'month-to-month' : `${getTermMonths(term)} months, paid upfront`})</span>
                        </div>
                      </label>
                      {termOptions[term].selected && (
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-600">Discount:</label>
                          <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
                            <button type="button"
                              onClick={() => handleTermDiscountType(term, 'percent')}
                              className={`px-2 py-1 text-sm font-medium transition-colors ${termOptions[term].discountType === 'percent' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >%</button>
                            <button type="button"
                              onClick={() => handleTermDiscountType(term, 'dollar')}
                              className={`px-2 py-1 text-sm font-medium transition-colors ${termOptions[term].discountType === 'dollar' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >$</button>
                          </div>
                          <input type="number" min="0" max={termOptions[term].discountType === 'percent' ? 50 : 99999} step={termOptions[term].discountType === 'percent' ? 1 : 1}
                            value={termOptions[term].discount}
                            onChange={(e) => handleTermDiscount(term, e.target.value)}
                            placeholder="0"
                            className="w-28 border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          <span className="text-sm text-gray-600">{termOptions[term].discountType === 'percent' ? '%' : 'off total'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>}

            {/* Minimum Commitment for Monthly */}
            {!multiOptionMode && termOptions.monthly.selected && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Commitment (Monthly)
                  <span className="text-gray-400 font-normal ml-1">— require a signed agreement before checkout</span>
                </label>
                <select
                  value={minimumCommitment || ''}
                  onChange={(e) => setMinimumCommitment(e.target.value ? parseInt(e.target.value) as 3 | 6 | 12 : null)}
                  className="w-full border border-amber-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                >
                  <option value="">None (month-to-month)</option>
                  <option value="3">3 months</option>
                  <option value="6">6 months</option>
                  <option value="12">12 months</option>
                </select>
                {minimumCommitment && (
                  <p className="text-xs text-amber-700 mt-1">
                    Customers must sign a {minimumCommitment}-month service agreement via HelloSign before they can proceed to payment.
                  </p>
                )}
              </div>
            )}

            {/* Multi-Option Quote Toggle */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={multiOptionMode} onChange={() => setMultiOptionMode(!multiOptionMode)} className="text-blue-600 w-4 h-4" />
                <span className="text-sm font-medium text-gray-700">Multiple quote options</span>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">NEW</span>
                <span className="text-xs text-gray-400">(show side-by-side or tabbed comparison)</span>
              </label>

              {multiOptionMode && (
                <div className="mt-4 space-y-6">
                  {quoteOptionsList.map((qo, qIdx) => (
                    <div key={qIdx} className="border border-gray-200 rounded-lg p-5 bg-gray-50 relative">
                      {quoteOptionsList.length > 2 && (
                        <button type="button" onClick={() => setQuoteOptionsList(prev => prev.filter((_, i) => i !== qIdx))}
                          className="absolute top-3 right-3 text-red-400 hover:text-red-600 text-lg font-bold" title="Remove option">×</button>
                      )}
                      <div className="text-sm font-semibold text-gray-600 mb-3">Option {String.fromCharCode(65 + qIdx)}</div>

                      {/* Label */}
                      <div className="mb-3">
                        <input type="text" value={qo.label} placeholder={`e.g. "SEO + Paid Ads" or "Grow Faster Bundle"`}
                          onChange={(e) => setQuoteOptionsList(prev => prev.map((o, i) => i === qIdx ? { ...o, label: e.target.value } : o))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>

                      {/* Bundle dropdown */}
                      <div className="mb-3">
                        <select value={qo.bundle || ''} onChange={(e) => {
                          const bundle = (e.target.value || undefined) as Bundle | undefined;
                          setQuoteOptionsList(prev => prev.map((o, i) => {
                            if (i !== qIdx) return o;
                            if (bundle) {
                              return { ...o, bundle, agents: [...BUNDLE_DEFINITIONS[bundle].agents] };
                            }
                            return { ...o, bundle: undefined };
                          }));
                        }} className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="">No bundle (à la carte)</option>
                          {(['convert', 'grow', 'grow_faster', 'grow_faster_ecom'] as Bundle[]).map(b => (
                            <option key={b} value={b}>{BUNDLE_DEFINITIONS[b].name} — {BUNDLE_DEFINITIONS[b].description}</option>
                          ))}
                        </select>
                      </div>

                      {/* Agent checkboxes */}
                      <div className="flex flex-wrap gap-4 mb-3">
                        {(['seo', 'paid_ads', 'crm', 'website'] as Agent[]).map(agent => {
                          const labels: Record<Agent, string> = { seo: 'SEO', paid_ads: 'Paid Ads', crm: 'CRM', website: 'Website' };
                          return (
                            <label key={agent} className="flex items-center text-sm gap-1.5">
                              <input type="checkbox" checked={qo.agents.includes(agent)}
                                onChange={() => setQuoteOptionsList(prev => prev.map((o, i) => {
                                  if (i !== qIdx) return o;
                                  const agents = o.agents.includes(agent) ? o.agents.filter(a => a !== agent) : [...o.agents, agent];
                                  return { ...o, agents, bundle: undefined };
                                }))} className="text-blue-600" />
                              {labels[agent]}
                            </label>
                          );
                        })}
                      </div>

                      {/* Recommended */}
                      <label className="flex items-center gap-2 text-sm mb-3">
                        <input type="checkbox" checked={qo.recommended}
                          onChange={() => setQuoteOptionsList(prev => prev.map((o, i) => i === qIdx ? { ...o, recommended: !o.recommended } : { ...o, recommended: false }))}
                          className="text-blue-600" />
                        ★ Recommended
                      </label>

                      {/* Term options */}
                      <div className="space-y-2">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Terms</span>
                        {AVAILABLE_TERMS.map(term => (
                          <div key={term} className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 text-sm w-28">
                              <input type="checkbox" checked={qo.termOptions[term].selected}
                                onChange={() => setQuoteOptionsList(prev => prev.map((o, i) => {
                                  if (i !== qIdx) return o;
                                  return { ...o, termOptions: { ...o.termOptions, [term]: { ...o.termOptions[term], selected: !o.termOptions[term].selected } } };
                                }))} className="text-blue-600" />
                              {getTermDisplayName(term)}
                            </label>
                            {qo.termOptions[term].selected && (
                              <div className="flex items-center gap-1.5">
                                <div className="flex border border-gray-300 rounded overflow-hidden">
                                  <button type="button" onClick={() => setQuoteOptionsList(prev => prev.map((o, i) => i === qIdx ? { ...o, termOptions: { ...o.termOptions, [term]: { ...o.termOptions[term], discountType: 'percent', discount: '' } } } : o))}
                                    className={`px-1.5 py-0.5 text-xs font-medium ${qo.termOptions[term].discountType === 'percent' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>%</button>
                                  <button type="button" onClick={() => setQuoteOptionsList(prev => prev.map((o, i) => i === qIdx ? { ...o, termOptions: { ...o.termOptions, [term]: { ...o.termOptions[term], discountType: 'dollar', discount: '' } } } : o))}
                                    className={`px-1.5 py-0.5 text-xs font-medium ${qo.termOptions[term].discountType === 'dollar' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>$</button>
                                </div>
                                <input type="number" min="0" step="1" value={qo.termOptions[term].discount} placeholder="0"
                                  onChange={(e) => setQuoteOptionsList(prev => prev.map((o, i) => i === qIdx ? { ...o, termOptions: { ...o.termOptions, [term]: { ...o.termOptions[term], discount: e.target.value } } } : o))}
                                  className="w-20 border border-gray-300 rounded px-2 py-1 text-xs" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <button type="button" onClick={() => setQuoteOptionsList(prev => [...prev, { label: '', agents: [], bundle: undefined, recommended: false, termOptions: { annual: { selected: true, discount: '', discountType: 'percent' }, bi_annual: { selected: false, discount: '', discountType: 'percent' }, quarterly: { selected: false, discount: '', discountType: 'percent' }, monthly: { selected: false, discount: '', discountType: 'percent' } } }])}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                    <span className="text-lg leading-none">+</span> Add another option
                  </button>
                </div>
              )}
            </div>

            {/* Money-Back Guarantee */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Money-Back Guarantee</label>
              <div className="flex gap-4">
                {(['none', '30', '60'] as const).map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="guarantee" value={opt} checked={guarantee === opt}
                      onChange={() => setGuarantee(opt)}
                      className="text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm text-gray-700">
                      {opt === 'none' ? 'None' : `${opt}-Day`}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">Adds a money-back guarantee badge and legal addendum to the proposal.</p>
            </div>

            {/* Mid-Term Review */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={midTermReview}
                  onChange={(e) => setMidTermReview(e.target.checked)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Mid-Term Review</span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-7">
                Bi-Annual: performance review at 3 months with option to cancel and receive a refund of half the initial investment. Annual: same at 6 months.
              </p>
            </div>

            {/* Discount Expiration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Discount Expiration Date</label>
              <input type="date" value={discountExpiresAt}
                onChange={(e) => setDiscountExpiresAt(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <p className="text-xs text-gray-500 mt-1">If set, discounted pricing reverts to standard rates after this date. Shows a countdown on the proposal.</p>
            </div>

            {/* Monthly Billing */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={monthlyBillingOption} onChange={() => setMonthlyBillingOption(!monthlyBillingOption)} className="text-blue-600 w-4 h-4" />
                <span className="text-sm font-medium text-gray-700">Monthly Billing (pay monthly instead of upfront for longer terms)</span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-7">Shows monthly rate with commitment period instead of lump-sum upfront total.</p>
            </div>

            {/* Sales Rep Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sales Rep Name *</label>
                <input type="text" required value={formData.salesRepName}
                  onChange={(e) => setFormData(prev => ({ ...prev, salesRepName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sales Rep Email *</label>
                <input type="email" required value={formData.salesRepEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, salesRepEmail: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {/* Pricing Preview */}
            {!multiOptionMode && hasAgents && hasTerms && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing Preview</h3>
                <div className="space-y-4">
                  {selectedTerms.map(termOpt => {
                    const pricing = calculatePricing(formData.selectedAgents, termOpt.term, termOpt.discountPercentage, termOpt.discountDollar || 0, formData.selectedBundle);
                    return (
                      <div key={termOpt.term} className="border border-gray-200 rounded-lg p-3 bg-white">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-gray-900">{getTermDisplayName(termOpt.term)}</span>
                          {termOpt.discountPercentage > 0 && (
                            <span className="text-green-600 text-sm font-medium">{termOpt.discountPercentage}% off</span>
                          )}
                          {(termOpt.discountDollar || 0) > 0 && (
                            <span className="text-green-600 text-sm font-medium">${termOpt.discountDollar?.toLocaleString()} off total</span>
                          )}
                        </div>
                        {formData.selectedBundle ? (
                          <>
                            {pricing.agents.map((agent, i) => (
                              <div key={i} className="text-sm text-gray-600">
                                ✓ {agent.name}
                              </div>
                            ))}
                          </>
                        ) : (
                          pricing.agents.map((agent, i) => (
                            <div key={i} className="flex justify-between text-sm text-gray-600">
                              <span>{agent.name}</span>
                              <span>${Math.round(agent.finalPrice).toLocaleString()}/mo</span>
                            </div>
                          ))
                        )}
                        <hr className="my-2" />
                        <div className="flex justify-between font-bold">
                          <span>Monthly Rate</span>
                          <span className="text-blue-600">${Math.round(pricing.total).toLocaleString()}/mo</span>
                        </div>
                        {pricing.term !== 'monthly' && (
                          <div className="flex justify-between text-sm text-gray-500 mt-1">
                            <span>Due Upfront ({pricing.termMonths} mo)</span>
                            <span>${Math.round(pricing.upfrontTotal).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="flex justify-end">
              <button type="submit"
                disabled={isSubmitting || !hasAgents || !hasTerms}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-semibold transition-colors">
                {isSubmitting
                  ? (analysisStatus === 'fetching' ? 'Fetching transcripts...'
                    : analysisStatus === 'analyzing' ? 'Analyzing call insights...'
                    : 'Generating proposal...')
                  : 'Generate Proposal'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
