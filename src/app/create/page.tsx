'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Agent, Template, ContractTerm, TermOption, FirefliesInsights } from '@/lib/types';
import { calculatePricing, formatPrice, getTermDisplayName, getTermMonths } from '@/lib/pricing';
import { encodeProposal } from '@/lib/encode';

const AVAILABLE_TERMS: ContractTerm[] = ['annual', 'bi_annual', 'quarterly', 'monthly'];

interface TranscriptEntry {
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
  });
  const [firefliesEntries, setFirefliesEntries] = useState<TranscriptEntry[]>([
    { url: '', status: 'idle', data: null, error: null },
  ]);
  const [termOptions, setTermOptions] = useState<Record<ContractTerm, { selected: boolean; discount: string }>>({
    annual: { selected: true, discount: '' },
    bi_annual: { selected: false, discount: '' },
    quarterly: { selected: false, discount: '' },
    monthly: { selected: false, discount: '' },
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'fetching' | 'analyzing' | 'done'>('idle');
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

  const handleAgentToggle = (agent: Agent) => {
    setFormData(prev => ({
      ...prev,
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

  const getSelectedTerms = (): TermOption[] => {
    return AVAILABLE_TERMS
      .filter(term => termOptions[term].selected)
      .map(term => ({
        term,
        discountPercentage: parseFloat(termOptions[term].discount) || 0,
      }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const selectedTerms = getSelectedTerms();
      let firefliesInsights = undefined;

      // Collect all Fireflies URLs that have content
      const validEntries = firefliesEntries.filter(e => e.url.includes('fireflies.ai'));

      if (validEntries.length > 0) {
        try {
          // Step 1: Fetch any transcripts not already fetched
          setAnalysisStatus('fetching');
          const allSummaries: { title: string; summary: string }[] = [];

          for (let i = 0; i < firefliesEntries.length; i++) {
            const entry = firefliesEntries[i];
            if (!entry.url.includes('fireflies.ai')) continue;

            if (entry.data?.summary) {
              allSummaries.push(entry.data);
            } else {
              const fetchRes = await fetch('/api/fetch-transcript', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ firefliesUrl: entry.url }),
              });
              if (fetchRes.ok) {
                const data = await fetchRes.json();
                allSummaries.push(data);
                setFirefliesEntries(prev => prev.map((e, idx) => idx === i ? { ...e, status: 'fetched', data } : e));
              }
            }
          }

          // Step 2: Combine all summaries and analyze
          if (allSummaries.length > 0) {
            setAnalysisStatus('analyzing');
            const combinedSummary = allSummaries.length === 1
              ? allSummaries[0].summary
              : allSummaries.map((s, i) => `--- Meeting ${i + 1}: ${s.title} ---\n${s.summary}`).join('\n\n');
            const combinedTitle = allSummaries.length === 1
              ? allSummaries[0].title
              : `${allSummaries.length} meetings with ${formData.companyName}`;

            const analyzeRes = await fetch('/api/analyze-transcript', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                transcriptSummary: combinedSummary,
                meetingTitle: combinedTitle,
                companyName: formData.companyName,
              }),
            });
            if (analyzeRes.ok) {
              const { insights } = await analyzeRes.json();
              firefliesInsights = insights;
              setAnalysisStatus('done');
            }
          }
        } catch (err) {
          console.warn('Transcript analysis error:', err);
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

      const encoded = encodeProposal({
        customerName: formData.customerName,
        companyName: formData.companyName,
        template: formData.template,
        selectedAgents: formData.selectedAgents,
        salesRepName: formData.salesRepName,
        salesRepEmail: formData.salesRepEmail,
        contractTerm: selectedTerms[0]?.term || 'annual',
        selectedTerms,
        firefliesUrl: firstFirefliesUrl || undefined,
        firefliesInsights,
        businessContext: formData.businessContext || undefined,
        customExecutiveSummary,
      });

      // Save proposal with a clean slug and get the professional URL
      try {
        const saveRes = await fetch('/api/proposals/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            encodedProposal: encoded,
            companyName: formData.companyName,
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
  const hasAgents = formData.selectedAgents.length > 0;
  const hasTerms = selectedTerms.length > 0;
  const fetchedCount = firefliesEntries.filter(e => e.status === 'fetched').length;

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

            {/* Template Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Template Type *</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input type="radio" name="template" value="leads" checked={formData.template === 'leads'}
                    onChange={(e) => setFormData(prev => ({ ...prev, template: e.target.value as Template }))}
                    className="mr-2 text-blue-600" />
                  <span>Leads-based (Optimized for lead generation)</span>
                </label>
                <label className="flex items-center">
                  <input type="radio" name="template" value="ecom" checked={formData.template === 'ecom'}
                    onChange={(e) => setFormData(prev => ({ ...prev, template: e.target.value as Template }))}
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

            {/* Agents Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Select Agents to Include *</label>
              <div className="space-y-2">
                {(['seo', 'paid_ads', 'website'] as Agent[]).map(agent => (
                  <label key={agent} className="flex items-center">
                    <input type="checkbox" checked={formData.selectedAgents.includes(agent)}
                      onChange={() => handleAgentToggle(agent)} className="mr-2 text-blue-600" />
                    <span>{agent === 'seo' ? 'SEO & GEO Agent' : agent === 'paid_ads' ? 'Paid Ads Agent' : 'Website Agent'}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Commitment Options */}
            <div>
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
                          <input type="number" min="0" max="50" step="1"
                            value={termOptions[term].discount}
                            onChange={(e) => handleTermDiscount(term, e.target.value)}
                            placeholder="0"
                            className="w-20 border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          <span className="text-sm text-gray-600">%</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
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
            {hasAgents && hasTerms && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing Preview</h3>
                <div className="space-y-4">
                  {selectedTerms.map(termOpt => {
                    const pricing = calculatePricing(formData.selectedAgents, termOpt.term, termOpt.discountPercentage);
                    return (
                      <div key={termOpt.term} className="border border-gray-200 rounded-lg p-3 bg-white">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-gray-900">{getTermDisplayName(termOpt.term)}</span>
                          {termOpt.discountPercentage > 0 && (
                            <span className="text-green-600 text-sm font-medium">{termOpt.discountPercentage}% off</span>
                          )}
                        </div>
                        {pricing.agents.map((agent, i) => (
                          <div key={i} className="flex justify-between text-sm text-gray-600">
                            <span>{agent.name}</span>
                            <span>${Math.round(agent.finalPrice).toLocaleString()}/mo</span>
                          </div>
                        ))}
                        <hr className="my-2" />
                        <div className="flex justify-between font-bold">
                          <span>{pricing.term === 'monthly' ? 'Monthly Rate' : `Due Upfront (${pricing.termMonths} mo)`}</span>
                          <span className="text-blue-600">${Math.round(pricing.upfrontTotal).toLocaleString()}</span>
                        </div>
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
