'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Agent, Template, ContractTerm, TermOption, FirefliesInsights } from '@/lib/types';
import { calculatePricing, formatPrice, getTermDisplayName, getTermMonths } from '@/lib/pricing';
import { encodeProposal } from '@/lib/encode';

const AVAILABLE_TERMS: ContractTerm[] = ['annual', 'bi_annual', 'quarterly', 'monthly'];

export default function CreateProposal() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    customerName: '',
    companyName: '',
    template: 'leads' as Template,
    selectedAgents: [] as Agent[],
    salesRepName: '',
    salesRepEmail: '',
    firefliesUrl: '',
  });
  const [termOptions, setTermOptions] = useState<Record<ContractTerm, { selected: boolean; discount: string }>>({
    annual: { selected: true, discount: '' },
    bi_annual: { selected: false, discount: '' },
    quarterly: { selected: false, discount: '' },
    monthly: { selected: false, discount: '' },
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transcriptStatus, setTranscriptStatus] = useState<'idle' | 'fetching' | 'fetched' | 'analyzing' | 'done' | 'error'>('idle');
  const [transcriptData, setTranscriptData] = useState<{ title: string; summary: string } | null>(null);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);

  const fetchTranscript = useCallback(async (url: string) => {
    if (!url.includes('fireflies.ai')) return;
    setTranscriptStatus('fetching');
    setTranscriptError(null);
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
      setTranscriptData(data);
      setTranscriptStatus('fetched');
    } catch (err) {
      setTranscriptError(err instanceof Error ? err.message : 'Failed to fetch transcript');
      setTranscriptStatus('error');
    }
  }, []);

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

      // If we have a Fireflies URL, fetch and analyze the transcript
      if (formData.firefliesUrl && formData.firefliesUrl.includes('fireflies.ai')) {
        try {
          // Step 1: Fetch transcript if not already fetched
          let summary = transcriptData?.summary;
          if (!summary) {
            setTranscriptStatus('fetching');
            const fetchRes = await fetch('/api/fetch-transcript', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ firefliesUrl: formData.firefliesUrl }),
            });
            if (fetchRes.ok) {
              const data = await fetchRes.json();
              summary = data.summary;
              setTranscriptData(data);
            }
          }

          // Step 2: Analyze the transcript
          if (summary) {
            setTranscriptStatus('analyzing');
            const analyzeRes = await fetch('/api/analyze-transcript', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                transcriptSummary: summary,
                meetingTitle: transcriptData?.title,
                companyName: formData.companyName,
              }),
            });
            if (analyzeRes.ok) {
              const { insights } = await analyzeRes.json();
              firefliesInsights = insights;
              setTranscriptStatus('done');
            }
          }
        } catch (err) {
          console.warn('Transcript analysis error:', err);
          // Continue without insights
        }
      }

      const encoded = encodeProposal({
        customerName: formData.customerName,
        companyName: formData.companyName,
        template: formData.template,
        selectedAgents: formData.selectedAgents,
        salesRepName: formData.salesRepName,
        salesRepEmail: formData.salesRepEmail,
        contractTerm: selectedTerms[0]?.term || 'annual',
        selectedTerms,
        firefliesUrl: formData.firefliesUrl || undefined,
        firefliesInsights,
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
          router.push(`/p/${slug}`);
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

            {/* Fireflies Meeting Link */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fireflies Meeting Link
                <span className="text-gray-400 font-normal ml-1">(optional — paste to generate a tailored proposal)</span>
              </label>
              <input type="url" value={formData.firefliesUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, firefliesUrl: e.target.value }))}
                onBlur={(e) => { if (e.target.value.includes('fireflies.ai')) fetchTranscript(e.target.value); }}
                placeholder="https://app.fireflies.ai/view/..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {transcriptStatus === 'fetching' && (
                <p className="mt-2 text-sm text-blue-600 flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Fetching meeting transcript...
                </p>
              )}
              {transcriptStatus === 'fetched' && transcriptData && (
                <div className="mt-2 bg-green-50 border border-green-200 rounded-md p-3">
                  <p className="text-sm text-green-700 font-medium">✓ Transcript loaded: {transcriptData.title}</p>
                  <p className="text-xs text-green-600 mt-1">Meeting notes will be analyzed to personalize your proposal when you submit.</p>
                </div>
              )}
              {transcriptStatus === 'error' && (
                <p className="mt-2 text-sm text-red-600">
                  ⚠ {transcriptError || 'Could not fetch transcript. Make sure the meeting link has public sharing enabled.'}
                </p>
              )}
              {!formData.firefliesUrl && (
                <p className="mt-1 text-xs text-gray-500">
                  Paste a Fireflies meeting link to automatically pull the transcript and tailor the proposal.
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
                          <span>Due Upfront ({pricing.termMonths} mo)</span>
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
                  ? (transcriptStatus === 'fetching' ? 'Fetching transcript...'
                    : transcriptStatus === 'analyzing' ? 'Analyzing call insights...'
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
