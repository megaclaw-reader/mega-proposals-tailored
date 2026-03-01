'use client';

import { useState, useEffect, useRef } from 'react';
import { Proposal, ContractTerm, TermOption, PricingBreakdown } from '@/lib/types';
import { calculatePricing, formatPrice, getTermDisplayName, getTermMonths } from '@/lib/pricing';
import { getServiceScope, getExecutiveSummary, SERVICE_DESCRIPTIONS } from '@/lib/content';
import { getStripeLink, hasWebsiteAddon, hasAnyDiscount } from '@/lib/stripe-links';
import { decodeProposal } from '@/lib/encode';
import { format } from 'date-fns';

export default function ProposalClient({ encodedId }: { encodedId: string }) {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const proposalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const config = decodeProposal(encodedId);
    if (config) {
      const pricing = calculatePricing(
        config.selectedAgents,
        config.contractTerm,
        config.discountPercentage || 0
      );
      setProposal({ ...config, pricing });
    }
    setLoading(false);
  }, [encodedId]);

  const downloadPDF = async () => {
    if (!proposal) return;
    setGenerating(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { ProposalPDF } = await import('@/components/ProposalPDF');
      const React = await import('react');

      const doc = React.createElement(ProposalPDF, { proposal }) as any;
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${proposal.companyName.replace(/\s+/g, '_')}_MEGA_SOW.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('PDF generation failed: ' + (error as Error).message);
    } finally {
      setGenerating(false);
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
          <p className="text-gray-600">The proposal you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  // Calculate pricing for different terms for the investment summary
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Action Bar - Fixed at top, not included in PDF */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10 print:hidden">
        <div className="max-w-6xl mx-auto px-6 py-3 flex justify-between items-center">
          <div>
            <span className="text-sm text-gray-500">Proposal ID: {proposal.id}</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={downloadPDF}
              disabled={generating}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              {generating ? 'Generating PDF...' : 'Download PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Proposal Content */}
      <div ref={proposalRef} className="max-w-6xl mx-auto bg-white">
        {/* Header */}
        <div data-pdf-block className="bg-white px-8 py-8">
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
          {/* Company Assessment (only if insights available) */}
          {proposal.firefliesInsights && (
            <section data-pdf-block>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Understanding {proposal.companyName}</h2>
              <div className="bg-gray-50 rounded-lg p-6 mb-8">
                <p className="text-gray-700 text-lg mb-6">{proposal.firefliesInsights.summary}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Pain Points */}
                  <div className="bg-white rounded-lg p-5 border border-gray-200">
                    <h3 className="font-semibold text-red-700 mb-3 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Key Challenges
                    </h3>
                    <ul className="space-y-2">
                      {proposal.firefliesInsights.painPoints.map((point, index) => (
                        <li key={index} className="flex items-start text-sm">
                          <span className="text-red-500 mr-2 mt-1">•</span>
                          <span className="text-gray-700">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* MEGA Solutions */}
                  <div className="bg-white rounded-lg p-5 border border-gray-200">
                    <h3 className="font-semibold text-blue-700 mb-3 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      How MEGA Helps
                    </h3>
                    <ul className="space-y-2">
                      {proposal.firefliesInsights.megaSolutions.map((solution, index) => (
                        <li key={index} className="flex items-start text-sm">
                          <span className="text-blue-500 mr-2 mt-1">•</span>
                          <span className="text-gray-700">{solution}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Executive Summary */}
          <section data-pdf-block>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Executive Summary</h2>
            <p className="text-gray-700 leading-relaxed text-lg">
              {proposal.firefliesInsights 
                ? proposal.customExecutiveSummary || `Based on our discussion, we understand ${proposal.companyName} is looking to optimize their marketing approach and address specific challenges. ${getExecutiveSummary(proposal.template, proposal.selectedAgents)}`
                : proposal.customExecutiveSummary || getExecutiveSummary(proposal.template, proposal.selectedAgents)
              }
            </p>
          </section>

          {/* Your Services */}
          <section data-pdf-block>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Services</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {proposal.selectedAgents.map((agent) => (
                <div key={agent} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                  <div className="mb-4">
                    <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700`}>
                      {SERVICE_DESCRIPTIONS[agent].badge}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {SERVICE_DESCRIPTIONS[agent].title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {SERVICE_DESCRIPTIONS[agent].shortDescription}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Service Scope Sections */}
          {proposal.selectedAgents.map((agent) => {
            const serviceContent = getServiceScope(agent, proposal.template);
            const categories = serviceContent.categories || [];
            
            return (
              <section key={`scope-${agent}`} className="space-y-8">
                {/* Intro + Highlights — own block, force page break before agent */}
                <div data-pdf-block className="break-before-page">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    {serviceContent.title}
                  </h2>
                  <p className="text-gray-700 text-lg leading-relaxed mb-6">
                    {serviceContent.description}
                  </p>
                  <div className="bg-blue-50 rounded-lg p-6 space-y-4">
                    {serviceContent.highlights.map((highlight, index) => (
                      <div key={index} className="flex items-start">
                        <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mt-1 mr-3">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-gray-800 font-medium text-sm">
                            {highlight}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Service Categories — each ROW of 2 cards is a separate block with a label */}
                {Array.from({ length: Math.ceil(categories.length / 2) }, (_, rowIndex) => {
                  const rowCats = categories.slice(rowIndex * 2, rowIndex * 2 + 2);
                  return (
                    <div key={`row-${rowIndex}`} data-pdf-block>
                      {rowIndex === 0 ? (
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                          {serviceContent.title.replace(' Services Scope', '')} — Service Deliverables
                        </h3>
                      ) : (
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                          {serviceContent.title.replace(' Services Scope', '')} — Deliverables (continued)
                        </h3>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {rowCats.map((category, index) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                            <h4 className="font-semibold text-gray-900 mb-3">{category.name}</h4>
                            <ul className="space-y-2">
                              {category.items.map((item, itemIndex) => (
                                <li key={itemIndex} className="flex items-start text-sm">
                                  <span className="text-blue-600 mr-2 mt-0.5">•</span>
                                  <span className="text-gray-700">{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Implementation Timeline */}
                {serviceContent.timeline && (
                  <div data-pdf-block>
                    <h3 className="text-xl font-semibold text-gray-900 mb-6">Implementation Timeline</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {serviceContent.timeline.map((phase, index) => (
                        <div key={index} className="bg-white rounded-lg border border-gray-200 p-5">
                          <h4 className="font-semibold text-blue-600 mb-3">{phase.phase}</h4>
                          <ul className="space-y-2">
                            {phase.items.map((item, itemIndex) => (
                              <li key={itemIndex} className="flex items-start text-sm">
                                <span className="text-blue-600 mr-2 mt-0.5">•</span>
                                <span className="text-gray-700">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            );
          })}

          {/* Investment Summary */}
          <section data-pdf-block className="space-y-8 break-before-page">
            <h2 className="text-2xl font-bold text-gray-900">Investment Summary</h2>

            {(() => {
              const terms: TermOption[] = proposal.selectedTerms && proposal.selectedTerms.length > 0
                ? proposal.selectedTerms
                : [{ term: proposal.contractTerm, discountPercentage: proposal.discountPercentage || 0 }];
              
              const termPricings: { option: TermOption; pricing: PricingBreakdown }[] = terms.map(opt => ({
                option: opt,
                pricing: calculatePricing(proposal.selectedAgents, opt.term, opt.discountPercentage, opt.discountDollar || 0),
              }));

              const isSingleTerm = termPricings.length === 1;
              const showWebsiteNote = hasWebsiteAddon(proposal.selectedAgents);
              const showPromoNote = hasAnyDiscount(terms);

              return (
                <>
                  {/* Term comparison cards with Stripe CTAs */}
                  <div className={`grid gap-6 ${termPricings.length === 1 ? 'grid-cols-1 max-w-md mx-auto' : termPricings.length === 2 ? 'grid-cols-1 md:grid-cols-2' : termPricings.length === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
                    {termPricings.map(({ option, pricing }, termIndex) => {
                      const isBestValue = !isSingleTerm && termIndex === 0;
                      const stripeLink = getStripeLink(proposal.selectedAgents, option.term);
                      return (
                        <div key={option.term} className={`rounded-lg border-2 p-6 relative flex flex-col ${
                          isBestValue ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
                        }`}>
                          {isBestValue && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                              <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                                Best Value
                              </span>
                            </div>
                          )}
                          
                          <div className="text-center mb-4 mt-1">
                            <h3 className="text-xl font-bold text-gray-900">{getTermDisplayName(option.term)}</h3>
                            <p className="text-sm text-gray-500">{option.term === 'monthly' ? 'Month-to-month commitment' : `${getTermMonths(option.term)} months`}</p>
                          </div>

                          {/* Per-agent breakdown */}
                          <div className="space-y-3 mb-4">
                            {pricing.agents.map((agent, i) => (
                              <div key={i} className="flex justify-between items-center text-sm">
                                <span className="text-gray-700">{agent.name}</span>
                                <div className="text-right">
                                  {(option.discountPercentage > 0 || (option.discountDollar || 0) > 0) ? (
                                    <>
                                      <span className="text-gray-400 line-through text-xs mr-1">${Math.round(agent.basePrice).toLocaleString()}</span>
                                      <span className="font-semibold text-gray-900">${Math.round(agent.finalPrice).toLocaleString()}/mo</span>
                                    </>
                                  ) : (
                                    <span className="font-semibold text-gray-900">${Math.round(agent.finalPrice).toLocaleString()}/mo</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          <hr className="my-4" />

                          {/* Monthly total */}
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-700 font-medium">Monthly Rate</span>
                            <span className="text-lg font-bold text-gray-900">${Math.round(pricing.total).toLocaleString()}/mo</span>
                          </div>

                          {/* Upfront total */}
                          <div className="bg-gray-100 rounded-lg p-4 text-center mt-4">
                            <p className="text-sm text-gray-500 mb-1">{option.term === 'monthly' ? 'Month-to-Month' : 'Total Due Upfront'}</p>
                            <p className="text-3xl font-bold text-blue-600">${Math.round(pricing.upfrontTotal).toLocaleString()}{option.term === 'monthly' ? '/mo' : ''}</p>
                            {(option.discountPercentage > 0 || (option.discountDollar || 0) > 0) && (
                              <p className="text-green-600 text-sm mt-1 font-medium">
                                {option.discountPercentage > 0 && `${option.discountPercentage}% discount`}
                                {option.discountPercentage > 0 && (option.discountDollar || 0) > 0 && ' + '}
                                {(option.discountDollar || 0) > 0 && `$${option.discountDollar?.toLocaleString()} discount`}
                                {' applied'}
                              </p>
                            )}
                          </div>

                          {/* Stripe CTA Button */}
                          <div className="mt-auto pt-6">
                            {stripeLink ? (
                              <a
                                href={stripeLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`block w-full text-center py-3 px-6 rounded-lg font-semibold text-white transition-colors ${
                                  isBestValue
                                    ? 'bg-blue-600 hover:bg-blue-700'
                                    : 'bg-gray-800 hover:bg-gray-900'
                                }`}
                              >
                                Get Started
                              </a>
                            ) : (
                              <p className="text-center text-sm text-gray-500">
                                Contact {proposal.salesRepName} to get started
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Savings comparison (multi-term only) */}
                  {!isSingleTerm && termPricings.length >= 2 && (() => {
                    const shortestTerm = termPricings[termPricings.length - 1];
                    const longestTerm = termPricings[0];
                    const monthlySavings = Math.round(shortestTerm.pricing.total - longestTerm.pricing.total);
                    if (monthlySavings <= 0) return null;
                    return (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <p className="text-green-800 font-medium">
                          Save <span className="font-bold">${monthlySavings.toLocaleString()}/mo</span> by choosing {getTermDisplayName(longestTerm.option.term)} over {getTermDisplayName(shortestTerm.option.term)}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Website add-on note */}
                  {showWebsiteNote && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-blue-800 text-sm">
                        <span className="font-semibold">Website Agent:</span> The Website Agent will be available as an add-on during checkout. Simply select it when completing your subscription to include it in your plan.
                      </p>
                    </div>
                  )}

                  {/* Promo code note — ONLY when discounts exist */}
                  {showPromoNote && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-amber-800 text-sm">
                        <span className="font-semibold">Promo Code:</span> A promotional discount has been included in this proposal. To apply your discount at checkout, please contact <span className="font-semibold">{proposal.salesRepName}</span> at <a href={`mailto:${proposal.salesRepEmail}`} className="text-blue-600 underline">{proposal.salesRepEmail}</a> to receive your promo code before signing up.
                      </p>
                    </div>
                  )}

                  {/* Next Steps */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Next Steps</h3>
                    <p className="text-gray-700 mb-4">
                      We&apos;re excited to partner with {proposal.companyName} and drive meaningful results. Here&apos;s how to get started:
                    </p>
                    <ol className="space-y-3 text-sm text-gray-700">
                      {(() => {
                        let step = 1;
                        const steps = [];
                        steps.push(
                          <li key="select" className="flex items-start">
                            <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0 mt-0.5">{step++}</span>
                            <span>Select your preferred plan above and click <strong>Get Started</strong></span>
                          </li>
                        );
                        if (showPromoNote) {
                          steps.push(
                            <li key="promo" className="flex items-start">
                              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0 mt-0.5">{step++}</span>
                              <span>Email {proposal.salesRepName} for your promo code before checkout</span>
                            </li>
                          );
                        }
                        if (showWebsiteNote) {
                          steps.push(
                            <li key="website" className="flex items-start">
                              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0 mt-0.5">{step++}</span>
                              <span>Add the Website Agent during checkout</span>
                            </li>
                          );
                        }
                        steps.push(
                          <li key="onboard" className="flex items-start">
                            <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0 mt-0.5">{step++}</span>
                            <span>Complete the onboarding flow after signing up</span>
                          </li>
                        );
                        steps.push(
                          <li key="call" className="flex items-start">
                            <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0 mt-0.5">{step++}</span>
                            <span>Schedule a call with your dedicated account manager to kick things off</span>
                          </li>
                        );
                        return steps;
                      })()}
                    </ol>
                    <p className="text-sm text-gray-600 mt-4">
                      Questions? Contact <span className="font-semibold">{proposal.salesRepName}</span> at{' '}
                      <a href={`mailto:${proposal.salesRepEmail}`} className="text-blue-600 underline">{proposal.salesRepEmail}</a>
                    </p>
                  </div>
                </>
              );
            })()}
          </section>
        </div>
      </div>
    </div>
  );
}