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
  paid_ads: 'Paid Ads',
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

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const REP_COLORS = [
  'bg-blue-600',
  'bg-emerald-600',
  'bg-purple-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-cyan-600',
  'bg-indigo-600',
  'bg-teal-600',
  'bg-orange-600',
  'bg-pink-600',
  'bg-lime-600',
  'bg-sky-600',
];

export default function DirectoryClient({ proposals }: { proposals: ProposalEntry[] }) {
  const [selectedRep, setSelectedRep] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Group by sales rep
  const grouped: Record<string, ProposalEntry[]> = {};
  for (const p of proposals) {
    const rep = p.salesRepName || 'Unknown Rep';
    if (!grouped[rep]) grouped[rep] = [];
    grouped[rep].push(p);
  }

  const sortedReps = Object.keys(grouped).sort();

  // Get the proposals for the selected rep, filtered by search
  const repProposals = selectedRep
    ? (grouped[selectedRep] || [])
        .filter((p) => {
          if (!search) return true;
          const q = search.toLowerCase();
          return (
            p.companyName.toLowerCase().includes(q) ||
            p.customerName.toLowerCase().includes(q) ||
            p.selectedAgents.some((a) => formatAgent(a).toLowerCase().includes(q))
          );
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Proposal Directory</h1>
            <p className="text-gray-500 mt-1">
              {proposals.length} proposals · {sortedReps.length} reps
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Generator
          </Link>
        </div>

        {!selectedRep ? (
          /* ========== REP SELECTION GRID ========== */
          <div>
            <p className="text-gray-600 mb-6 text-sm">Select a rep to view their proposals.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {sortedReps.map((rep, i) => (
                <button
                  key={rep}
                  onClick={() => setSelectedRep(rep)}
                  className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col items-center gap-3 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
                >
                  <div
                    className={`w-14 h-14 rounded-full ${REP_COLORS[i % REP_COLORS.length]} text-white flex items-center justify-center text-lg font-bold group-hover:scale-105 transition-transform`}
                  >
                    {getInitials(rep)}
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-gray-900 text-sm">{rep}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {grouped[rep].length} proposal{grouped[rep].length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ========== REP'S PROPOSALS ========== */
          <div>
            {/* Back + rep header */}
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => {
                  setSelectedRep(null);
                  setSearch('');
                }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium shrink-0"
              >
                ← All Reps
              </button>
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full ${REP_COLORS[sortedReps.indexOf(selectedRep) % REP_COLORS.length]} text-white flex items-center justify-center text-sm font-bold`}
                >
                  {getInitials(selectedRep)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedRep}</h2>
                  <p className="text-sm text-gray-500">
                    {grouped[selectedRep].length} proposal{grouped[selectedRep].length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Search within rep */}
            <div className="mb-5">
              <input
                type="text"
                placeholder="Search this rep's proposals..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full max-w-md px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              />
            </div>

            {/* Proposal list */}
            {repProposals.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                {search ? 'No proposals match your search.' : 'No proposals found.'}
              </div>
            ) : (
              <div className="grid gap-3">
                {repProposals.map((p) => (
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}
