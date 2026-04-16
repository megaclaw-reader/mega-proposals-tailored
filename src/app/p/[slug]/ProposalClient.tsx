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
              <p><span className="font-semibold">Prepared by:</span> {proposal.salesRepName}{proposal.salesRepTitle ? `, ${proposal.salesRepTitle}` : ''}</p>
              {proposal.officeAddress && (
                <p><span className="font-semibold">Office:</span> {proposal.officeAddress}</p>
              )}
            </div>
          </div>
        </div>

        <div className="px-8 pb-8 space-y-12">
          {/* Company Assessment (only if insights available) */}
          {proposal.firefliesInsights && (
            <section data-pdf-block>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Understanding {proposal.companyName}</h2>
              
              {/* Personalized summary */}
              <div className="border-l-4 border-blue-500 pl-6 mb-8">
                <p className="text-gray-700 text-lg leading-relaxed" style={{ fontStyle: 'normal' }}>{proposal.firefliesInsights.summary}</p>
              </div>

              {/* Challenge → Solution pairs */}
              <div className="space-y-6">
                {proposal.firefliesInsights.painPoints.map((point, index) => {
                  const solution = proposal.firefliesInsights!.megaSolutions[index];
                  return (
                    <div key={index} className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2">
                        {/* Challenge */}
                        <div className="p-5 border-b md:border-b-0 md:border-r border-gray-200">
                          <div className="flex items-center mb-2">
                            <span className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                              <svg className="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </span>
                            <span className="text-xs font-semibold text-red-700 uppercase tracking-wider">Challenge</span>
                          </div>
                          <p className="text-gray-800 text-sm leading-relaxed">{point}</p>
                        </div>
                        {/* Solution */}
                        {solution && (
                          <div className="p-5 bg-white">
                            <div className="flex items-center mb-2">
                              <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                                <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              </span>
                              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Our Approach</span>
                            </div>
                            <p className="text-gray-800 text-sm leading-relaxed">{solution}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {/* Show any extra solutions that don't have a paired pain point */}
                {proposal.firefliesInsights.megaSolutions.length > proposal.firefliesInsights.painPoints.length && (
                  <div className="bg-blue-50 rounded-lg p-5 border border-blue-200">
                    <div className="flex items-center mb-3">
                      <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                        <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </span>
                      <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Additional Opportunities</span>
                    </div>
                    <ul className="space-y-2">
                      {proposal.firefliesInsights.megaSolutions.slice(proposal.firefliesInsights.painPoints.length).map((solution, index) => (
                        <li key={index} className="flex items-start text-sm">
                          <span className="text-blue-500 mr-2 mt-1">•</span>
                          <span className="text-gray-800">{solution}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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
                          isBestValue ? 'border-blue-400 bg-white' : 'border-gray-200 bg-white'
                        }`}>
                          {isBestValue && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                              <span className="bg-blue-100 text-blue-700 px-3 py-0.5 rounded-full text-xs font-medium tracking-wide">
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

                  {/* 30-Day Money-Back Guarantee */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-5 flex items-start">
                    <span className="text-2xl mr-3 flex-shrink-0">🛡️</span>
                    <div>
                      <h4 className="font-semibold text-green-900 mb-1">30-Day Money-Back Guarantee</h4>
                      <p className="text-green-800 text-sm leading-relaxed">
                        We are offering a 30-day money-back guarantee on the Quarterly or Biannual plans. If you&apos;re not happy with the performance in the first month, we&apos;re happy to refund the entire quarter&apos;s value. This guarantee supersedes the standard refund policy outlined in our Terms &amp; Conditions below.
                      </p>
                    </div>
                  </div>

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

          {/* Agreement Terms (when present) */}
          {proposal.agreementSections && proposal.agreementSections.length > 0 && (
            <>
              <div className="border-t-2 border-blue-600 pt-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Service Agreement Terms</h2>
                <p className="text-sm text-gray-500 mb-8">The following terms govern this engagement and reflect the commitments discussed between both parties.</p>
                {(proposal as any).startDate && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-8">
                    <p className="text-sm font-semibold text-gray-900">Official Start Date: {(proposal as any).startDate}</p>
                  </div>
                )}
              </div>
              {proposal.agreementSections.map((section, sIdx) => (
                <section key={`agreement-${sIdx}`} data-pdf-block className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900">{section.title}</h3>
                  {section.description && (
                    <p className="text-gray-700 text-sm leading-relaxed">{section.description}</p>
                  )}
                  {section.items && section.items.length > 0 && (
                    <ul className="space-y-2">
                      {section.items.map((item, iIdx) => (
                        <li key={iIdx} className="flex items-start text-sm">
                          <span className="text-blue-600 mr-2 mt-0.5 flex-shrink-0">•</span>
                          <span className="text-gray-700">{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {section.subsections && section.subsections.map((sub, subIdx) => (
                    <div key={subIdx} className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-2 text-sm">{sub.title}</h4>
                      {sub.description && (
                        <p className="text-gray-700 text-sm leading-relaxed mb-2">{sub.description}</p>
                      )}
                      {sub.items && sub.items.length > 0 && (
                        <ul className="space-y-1.5">
                          {sub.items.map((item, iIdx) => (
                            <li key={iIdx} className="flex items-start text-sm">
                              <span className="text-blue-600 mr-2 mt-0.5 flex-shrink-0">•</span>
                              <span className="text-gray-700">{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </section>
              ))}
            </>
          )}
          {/* Full Terms & Conditions */}
          <section data-pdf-block className="border-t-2 border-gray-300 pt-8 mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Terms &amp; Conditions</h2>
            <p className="text-sm text-gray-500 mb-6">
              By engaging MEGA AI services, you agree to be bound by the following Terms of Service. Where this proposal offers specific guarantees (such as the 30-Day Money-Back Guarantee above), those terms take precedence over the standard terms below.
            </p>

            <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">1. Eligibility &amp; Account Responsibility</h3>
                <p>You must be at least 18 years old and capable of entering into a legally binding agreement. If you&apos;re using our services on behalf of an organization, you represent and warrant that you have authority to bind them. You are responsible for maintaining the security of your account credentials. Notify us immediately if you suspect any unauthorized use.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">2. Services Provided</h3>
                <p className="mb-3">We provide access to a web-based platform that uses artificial intelligence and other technologies to assist with marketing such as SEO, Paid Ads, and Website Development. We may offer optional beta features, provided &quot;as is&quot; with no guarantee of stability or accuracy. We reserve the right to modify, suspend, or discontinue services at any time, without liability to you.</p>
                <h4 className="font-semibold text-gray-800 mb-1">2.1 AI-Powered SEO Services</h4>
                <ul className="list-disc ml-5 mb-3 space-y-1">
                  <li>Automated keyword research and clustering based on industry and competitive signals</li>
                  <li>On-page SEO updates</li>
                  <li>Technical SEO audits, monitoring and fixes</li>
                  <li>Local SEO optimization</li>
                  <li>Automated backlink outreach and tracking</li>
                  <li>Competitor SEO analysis and benchmarking</li>
                  <li>Minimum 20 blog posts every month</li>
                  <li>Programmatic SEO</li>
                  <li>SEO strategy work</li>
                  <li>Conversion optimization</li>
                  <li>LLM placement</li>
                </ul>
                <h4 className="font-semibold text-gray-800 mb-1">2.2 Paid Advertising Management</h4>
                <ul className="list-disc ml-5 mb-3 space-y-1">
                  <li>Strategic direction, implementation solutions, creative design, campaign management, performance optimization and weekly reporting</li>
                  <li>Campaign creation, optimization, and budget allocation across Google Ads, Meta Ads, and other major platforms</li>
                  <li>Ad copy and creative variants for A/B testing</li>
                  <li>Audience segmentation and targeting</li>
                  <li>Cross-platform budget management and attribution analysis</li>
                </ul>
                <h4 className="font-semibold text-gray-800 mb-1">2.3 Website Development Services</h4>
                <ul className="list-disc ml-5 mb-3 space-y-1">
                  <li>Project planning and UX/UI design</li>
                  <li>Web development and site deployment</li>
                  <li>Hosting services</li>
                  <li>Content creation (Copywriting and Image Generation)</li>
                  <li>Search and conversion optimization</li>
                  <li>Testing, quality assurance</li>
                  <li>Ongoing site maintenance</li>
                </ul>
                <p><strong>2.3.1 Website Buyout Fee.</strong> The Website Buyout Fee is a one-time fee required to transfer ownership of the Company-created website assets under Section 4.6.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">3. Data Ownership and Usage</h3>
                <p>You retain ownership of all data you upload and all content generated through your authorized use of the services (&quot;User Data&quot;). We do not claim ownership of your data but require a license to use it solely to provide and improve the service. We retain ownership of all intellectual property related to the platform, models, and underlying systems. For Website Management Services, we retain ownership of all underlying code, architecture, and proprietary design/theme elements created and provided by us. Such Company-created IP is licensed to the Customer until the payment of the Website Buyout Fee (Sec. 4.6) or license revocation.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">4. Subscription, Billing &amp; Cancellation</h3>
                <h4 className="font-semibold text-gray-800 mb-1">4.1 General Billing Terms</h4>
                <ul className="list-disc ml-5 mb-3 space-y-1">
                  <li>All fees are listed in U.S. dollars unless otherwise stated.</li>
                  <li>You authorize us to charge your selected payment method for all recurring charges, subscription renewals, and outstanding balances.</li>
                  <li>Canceling your payment method does not cancel your financial obligation.</li>
                  <li>We may use third-party collections services, legal processes, or report delinquencies to credit bureaus to recover unpaid balances.</li>
                </ul>
                <h4 className="font-semibold text-gray-800 mb-1">4.2 Monthly Subscriptions</h4>
                <ul className="list-disc ml-5 mb-3 space-y-1">
                  <li>Monthly subscriptions are month-to-month commitments that auto-renew unless canceled with at least 30 days&apos; prior written notice.</li>
                  <li>If your payment method is declined, you remain fully liable for all unpaid months.</li>
                </ul>
                <h4 className="font-semibold text-gray-800 mb-1">4.3 Annual Subscriptions</h4>
                <ul className="list-disc ml-5 mb-3 space-y-1">
                  <li>Annual subscriptions billed monthly require a 12-month minimum commitment.</li>
                  <li>Annual subscriptions billed upfront require full payment for the entire 12-month period at the start of the term.</li>
                  <li>Canceling your payment method does not cancel your obligation to complete your annual commitment.</li>
                  <li>You may prepay your remaining annual balance at any time.</li>
                </ul>
                <h4 className="font-semibold text-gray-800 mb-1">4.4 Refund &amp; Credit Policy</h4>
                <ul className="list-disc ml-5 mb-3 space-y-1">
                  <li>Refunds are only available if you cancel within 24 hours of your initial payment.</li>
                  <li>After 24 hours, all fees are non-refundable.</li>
                  <li>No credits or prorated refunds are issued for unused time, partial months, or early termination.</li>
                  <li>Prepaid fees (including annual subscriptions) are non-refundable.</li>
                </ul>
                <h4 className="font-semibold text-gray-800 mb-1">4.5 Dispute Policy</h4>
                <p className="mb-3">All billing concerns or cancellation requests must be addressed directly with us in writing at agents@gomega.ai. Filing a chargeback or payment dispute through your bank without first contacting us constitutes a breach of this Agreement. We reserve the right to suspend or terminate your account and/or pursue legal remedies if you initiate a chargeback in violation of this policy.</p>
                <h4 className="font-semibold text-gray-800 mb-1">4.6 Website Buyout Plan &amp; Transfer of Ownership</h4>
                <ul className="list-disc ml-5 space-y-1">
                  <li>Termination/Buyout within Year 1 (Months 1–12): $6,000.00 USD</li>
                  <li>Termination/Buyout within Year 2 (Months 13–24): $3,000.00 USD</li>
                  <li>Termination/Buyout within Year 3 (Months 25–36): $2,000.00 USD</li>
                  <li>Termination/Buyout after Year 4 (Month 48+): $0.00 USD (Ownership Transfer at no extra cost)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">5. Acceptable Use</h3>
                <p>You agree not to use the service for illegal, harmful, or fraudulent activities; violate intellectual property rights; circumvent usage restrictions, rate limits, or access controls; or attempt to reverse engineer or clone the service. We may suspend or terminate your account for violations.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">6. Third-Party Services &amp; Dependencies</h3>
                <p>Some features rely on third-party services (e.g., OpenAI, Google, etc.). We are not responsible for their availability or changes to their APIs, pricing, or terms.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">7. Service Availability &amp; Uptime</h3>
                <p>We strive for 99.9% uptime but do not guarantee uninterrupted service. Downtime for maintenance or outages does not entitle you to compensation.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">8. AI Output &amp; Content Responsibility</h3>
                <p>Content generated by our AI models is not guaranteed to be accurate, legal, or appropriate. You are solely responsible for reviewing and validating generated content before use.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">9. Support</h3>
                <p>We provide standard support via email during business hours. Premium support may be available under a separate agreement.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">10. Disclaimer of Warranties</h3>
                <p>The service is provided &quot;as is&quot; and &quot;as available.&quot; We disclaim all warranties, express or implied, including merchantability and fitness for a particular purpose.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">11. Limitation of Liability</h3>
                <p>To the fullest extent permitted by law, we are not liable for indirect, incidental, special, or consequential damages. Our total liability is capped at the amount you&apos;ve paid us in the 12 months prior to the event.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">12. Indemnification</h3>
                <p>You agree to defend, indemnify, and hold harmless the Company from any claims, liabilities, damages, and expenses arising from your use of the services, User Data, or violation of these Terms.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">13. Termination</h3>
                <p>We may terminate or suspend your access at any time for cause. You may cancel by giving 30 days&apos; written notice to support. Upon termination, all rights granted to you cease. See Section 4.6 for specific terms regarding Website services.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">14. Governing Law and Dispute Resolution</h3>
                <p>These Terms are governed by the laws of New York. All disputes will be resolved by binding individual arbitration, waiving class actions. You may opt out of arbitration by notifying us in writing within 30 days of first accepting these Terms.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">15. Entire Agreement</h3>
                <p>These Terms constitute the full agreement between you and us and supersede any prior agreements. We may assign these Terms without your consent.</p>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-6 text-center">
              Last updated: January 16, 2026 · Full terms also available at{' '}
              <a href="https://www.gomega.ai/legal/terms-of-use" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">gomega.ai/legal/terms-of-use</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}