'use client';

import { useState, useEffect } from 'react';
import { Proposal, ContractTerm, TermOption, PricingBreakdown } from '@/lib/types';
import { calculatePricing, formatPrice, getTermDisplayName, getTermMonths } from '@/lib/pricing';
import { getServiceScope, getExecutiveSummary, SERVICE_DESCRIPTIONS } from '@/lib/content';
import { getStripeLink, hasWebsiteAddon, hasAnyDiscount } from '@/lib/stripe-links';
import { decodeProposal, encodeProposal } from '@/lib/encode';
import { format } from 'date-fns';

export default function EditClient({ encodedId, slug }: { encodedId: string; slug: string }) {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');
  const [editedFirefliesSummary, setEditedFirefliesSummary] = useState('');
  const [editedPainPoints, setEditedPainPoints] = useState<string[]>([]);
  const [editedSolutions, setEditedSolutions] = useState<string[]>([]);

  useEffect(() => {
    const config = decodeProposal(encodedId);
    if (config) {
      const pricing = calculatePricing(
        config.selectedAgents,
        config.contractTerm,
        config.discountPercentage || 0
      );
      const p = { ...config, pricing };
      setProposal(p);
      
      // Initialize editable fields
      const defaultSummary = config.firefliesInsights
        ? config.customExecutiveSummary || `Based on our discussion, we understand ${config.companyName} is looking to optimize their marketing approach and address specific challenges. ${getExecutiveSummary(config.template, config.selectedAgents)}`
        : config.customExecutiveSummary || getExecutiveSummary(config.template, config.selectedAgents);
      setEditedSummary(defaultSummary);
      
      if (config.firefliesInsights) {
        setEditedFirefliesSummary(config.firefliesInsights.summary);
        setEditedPainPoints([...config.firefliesInsights.painPoints]);
        setEditedSolutions([...config.firefliesInsights.megaSolutions]);
      }
    }
    setLoading(false);
  }, [encodedId]);

  const handleSave = async () => {
    if (!proposal) return;
    setSaving(true);
    setSaved(false);

    try {
      // Build updated proposal config
      const updatedInsights = proposal.firefliesInsights ? {
        ...proposal.firefliesInsights,
        summary: editedFirefliesSummary,
        painPoints: editedPainPoints,
        megaSolutions: editedSolutions,
      } : undefined;

      const newEncoded = encodeProposal({
        customerName: proposal.customerName,
        companyName: proposal.companyName,
        template: proposal.template,
        selectedAgents: proposal.selectedAgents,
        salesRepName: proposal.salesRepName,
        salesRepEmail: proposal.salesRepEmail,
        contractTerm: proposal.contractTerm,
        selectedTerms: proposal.selectedTerms,
        firefliesUrl: proposal.firefliesUrl,
        firefliesInsights: updatedInsights,
        businessContext: proposal.businessContext,
        customExecutiveSummary: editedSummary,
      });

      const res = await fetch(`/api/proposals/update/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ encodedProposal: newEncoded }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert('Failed to save changes');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading proposal...</p>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Proposal Not Found</h1>
        </div>
      </div>
    );
  }

  const terms: TermOption[] = proposal.selectedTerms || [{ term: proposal.contractTerm, discountPercentage: proposal.discountPercentage || 0 }];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Edit Toolbar */}
      <div className="bg-amber-50 border-b border-amber-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="bg-amber-200 text-amber-800 px-3 py-1 rounded-full text-sm font-semibold">✏️ Edit Mode</span>
            <span className="text-sm text-amber-700">Click any highlighted field below to edit. Changes save to the shared link.</span>
          </div>
          <div className="flex items-center gap-3">
            {saved && <span className="text-green-600 text-sm font-medium">✓ Saved!</span>}
            <a href={`/p/${slug}`} target="_blank" rel="noopener noreferrer" className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50">Preview</a>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white px-6 py-2 rounded-md font-medium transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Proposal Content with Editable Fields */}
      <div className="max-w-6xl mx-auto bg-white">
        {/* Header (read-only) */}
        <div className="bg-white px-8 py-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <img src="/mega-wordmark.svg" alt="MEGA" className="h-10 mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Proposal</h1>
              <p className="text-xl text-blue-600 font-semibold">
                {proposal.selectedAgents.map(agent => SERVICE_DESCRIPTIONS[agent].title).join(' + ')}
              </p>
            </div>
            <div className="text-right text-sm text-gray-700 space-y-1">
              <p><span className="font-semibold">Prepared for:</span> {proposal.customerName}</p>
              <p><span className="font-semibold">Company:</span> {proposal.companyName}</p>
              <p><span className="font-semibold">Date:</span> {format(new Date(proposal.createdAt), 'MMMM dd, yyyy')}</p>
              <p><span className="font-semibold">Prepared by:</span> {proposal.salesRepName}</p>
            </div>
          </div>
        </div>

        <div className="px-8 pb-8 space-y-12">
          {/* Understanding Company (editable if insights exist) */}
          {proposal.firefliesInsights && (
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Understanding {proposal.companyName}</h2>
              <div className="bg-gray-50 rounded-lg p-6 mb-8">
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-amber-600 mb-1">✏️ Meeting Summary</label>
                  <textarea
                    value={editedFirefliesSummary}
                    onChange={(e) => setEditedFirefliesSummary(e.target.value)}
                    className="w-full text-gray-700 text-lg border-2 border-amber-200 rounded-lg p-3 focus:border-amber-500 focus:outline-none bg-white"
                    rows={4}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg p-5 border border-gray-200">
                    <h3 className="font-semibold text-red-700 mb-3">Key Challenges</h3>
                    {editedPainPoints.map((point, index) => (
                      <div key={index} className="flex items-start mb-2">
                        <span className="text-red-500 mr-2 mt-1">•</span>
                        <input
                          type="text"
                          value={point}
                          onChange={(e) => {
                            const updated = [...editedPainPoints];
                            updated[index] = e.target.value;
                            setEditedPainPoints(updated);
                          }}
                          className="flex-1 text-sm text-gray-700 border-b border-amber-200 focus:border-amber-500 focus:outline-none py-1 bg-transparent"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="bg-white rounded-lg p-5 border border-gray-200">
                    <h3 className="font-semibold text-blue-700 mb-3">How MEGA Helps</h3>
                    {editedSolutions.map((solution, index) => (
                      <div key={index} className="flex items-start mb-2">
                        <span className="text-blue-500 mr-2 mt-1">•</span>
                        <input
                          type="text"
                          value={solution}
                          onChange={(e) => {
                            const updated = [...editedSolutions];
                            updated[index] = e.target.value;
                            setEditedSolutions(updated);
                          }}
                          className="flex-1 text-sm text-gray-700 border-b border-amber-200 focus:border-amber-500 focus:outline-none py-1 bg-transparent"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Executive Summary (editable) */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Executive Summary</h2>
            <div>
              <label className="block text-xs font-semibold text-amber-600 mb-1">✏️ Edit executive summary</label>
              <textarea
                value={editedSummary}
                onChange={(e) => setEditedSummary(e.target.value)}
                className="w-full text-gray-700 leading-relaxed text-lg border-2 border-amber-200 rounded-lg p-4 focus:border-amber-500 focus:outline-none bg-white"
                rows={5}
              />
            </div>
          </section>

          {/* Services (read-only preview) */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Services</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {proposal.selectedAgents.map(agent => (
                <div key={agent} className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">{SERVICE_DESCRIPTIONS[agent].badge}</span>
                  <h3 className="font-bold text-gray-900 mt-2">{SERVICE_DESCRIPTIONS[agent].title}</h3>
                  <p className="text-sm text-gray-600">{SERVICE_DESCRIPTIONS[agent].shortDescription}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-400 mt-2 italic">Service scope sections and timelines are not editable — they use standard templates.</p>
          </section>

          {/* Investment Summary (read-only preview) */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Investment Summary</h2>
            <div className={`grid gap-6 ${terms.length === 1 ? 'grid-cols-1 max-w-md mx-auto' : terms.length === 2 ? 'grid-cols-1 md:grid-cols-2' : terms.length === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
              {terms.map((option, termIndex) => {
                const pricing = calculatePricing(proposal.selectedAgents, option.term, option.discountPercentage);
                const isBestValue = terms.length > 1 && termIndex === 0;
                return (
                  <div key={option.term} className={`rounded-lg border-2 p-6 ${isBestValue ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                    {isBestValue && <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">Best Value</span>}
                    <h3 className="text-xl font-bold text-gray-900 mt-2">{getTermDisplayName(option.term)}</h3>
                    <p className="text-sm text-gray-500">{option.term === 'monthly' ? 'Month-to-month commitment' : `${getTermMonths(option.term)} months`}</p>
                    <p className="text-2xl font-bold text-blue-600 mt-3">${Math.round(pricing.upfrontTotal).toLocaleString()}{option.term === 'monthly' ? '/mo' : ''}</p>
                    <p className="text-xs text-gray-400">{option.term === 'monthly' ? 'Month-to-Month' : 'Total Due Upfront'}</p>
                  </div>
                );
              })}
            </div>
            <p className="text-sm text-gray-400 mt-2 italic">Pricing is not editable — regenerate the proposal to change pricing options.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
