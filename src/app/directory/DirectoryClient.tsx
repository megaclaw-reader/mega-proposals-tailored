'use client';

import { useState } from 'react';
import Link from 'next/link';

export interface ProposalEntry {
  slug: string;
  companyName: string;
  customerName: string;
  salesRepName: string;
  salesRepEmail: string;
  selectedAgents: string[];
  createdAt: string;
}

const AGENT_LABELS: Record<string, string> = {
  seo: 'SEO',
  ads: 'Ads',
  website: 'Website',
  social: 'Social',
  email: 'Email',
  content: 'Content',
  analytics: 'Analytics',
  reputation: 'Reputation',
};

function formatAgent(agent: string) {
  return AGENT_LABELS[agent] || agent.charAt(0).toUpperCase() + agent.slice(1);
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function DirectoryClient({ proposals }: { proposals: ProposalEntry[] }) {
  const [search, setSearch] = useState('');

  const filtered = proposals.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.companyName.toLowerCase().includes(q) ||
      p.customerName.toLowerCase().includes(q) ||
      p.salesRepName.toLowerCase().includes(q) ||
      p.selectedAgents.some((a) => formatAgent(a).toLowerCase().includes(q))
    );
  });

  // Group by sales rep
  const grouped: Record<string, ProposalEntry[]> = {};
  for (const p of filtered) {
    const rep = p.salesRepName || 'Unknown Rep';
    if (!grouped[rep]) grouped[rep] = [];
    grouped[rep].push(p);
  }

  const sortedReps = Object.keys(grouped).sort();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Proposal Directory</h1>
            <p className="text-gray-500 mt-1">{proposals.length} proposals total</p>
          </div>
          <Link
            href="/"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Generator
          </Link>
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by company, customer, rep, or agent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
          />
        </div>

        {sortedReps.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            {search ? 'No proposals match your search.' : 'No proposals found.'}
          </div>
        ) : (
          <div className="space-y-8">
            {sortedReps.map((rep) => (
              <div key={rep}>
                <h2 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">
                  {rep}
                  <span className="text-sm font-normal text-gray-400 ml-2">
                    ({grouped[rep].length})
                  </span>
                </h2>
                <div className="grid gap-3">
                  {grouped[rep]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((p) => (
                      <div
                        key={p.slug}
                        className="bg-white rounded-lg border border-gray-200 px-5 py-4 flex items-center justify-between hover:shadow-sm transition-shadow"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-900">{p.companyName}</div>
                          <div className="text-sm text-gray-500 mt-0.5">
                            {p.customerName} · {formatDate(p.createdAt)}
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {p.selectedAgents.map((agent) => (
                              <span
                                key={agent}
                                className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700"
                              >
                                {formatAgent(agent)}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 ml-4 shrink-0">
                          <Link
                            href={`/p/${p.slug}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800"
                          >
                            View
                          </Link>
                          <Link
                            href={`/p/${p.slug}/edit`}
                            className="text-sm font-medium text-gray-600 hover:text-gray-800"
                          >
                            Edit
                          </Link>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
