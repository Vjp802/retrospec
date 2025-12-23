import React, { useState } from 'react';
import { Search, Sparkles, Smartphone, Calendar, ExternalLink, Globe, Download } from 'lucide-react';
import { analyzeDeviceReviews } from './services/geminiService';
import { ReviewData, SearchState } from './types';
import { SentimentChart } from './components/SentimentChart';
import { ScoreCard } from './components/ScoreCard';
import { ProsCons } from './components/ProsCons';
import { Spinner } from './components/Spinner';

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [searchState, setSearchState] = useState<SearchState>({
    isLoading: false,
    error: null,
    data: null,
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearchState({ isLoading: true, error: null, data: null });

    try {
      const data = await analyzeDeviceReviews(query);
      setSearchState({ isLoading: false, error: null, data });
    } catch (err: any) {
      console.error(err);
      setSearchState({
        isLoading: false,
        error: err.message || "Failed to analyze reviews. Please try again later.",
        data: null,
      });
    }
  };

  const exportToCSV = () => {
    if (!searchState.data) return;
    const data = searchState.data;

    const headers = "Device,Launch Date,Verdict,Score,Confidence,Review Count,Pros,Cons\n";
    // Sanitize strings to escape double quotes
    const safe = (str: string) => str.replace(/"/g, '""');

    const row = `"${safe(data.deviceName)}","${data.launchDate}","${safe(data.currentVerdict)}",${data.aggregateScore},${data.confidenceScore},${data.reviewCount},"${safe(data.pros.join('; '))}", "${safe(data.cons.join('; '))}"`;

    const blob = new Blob([headers + row], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `RetroSpec-${data.deviceName.replace(/[^a-z0-9]/gi, '_')}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 flex flex-col">
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-12 text-center pt-8 w-full">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            RetroSpec
          </h1>
        </div>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg">
          See how device reviews age. We aggregate launch day hype vs. long-term reality to give you the true score.
        </p>
      </header>

      {/* Search Section */}
      <div className="max-w-2xl mx-auto mb-16 relative z-10 w-full">
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter device name (e.g., Pixel 8 Pro, iPhone 15, Galaxy S24)..."
            className="w-full bg-slate-800 border border-slate-700 text-white pl-12 pr-4 py-4 rounded-2xl shadow-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-500 text-lg"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-6 h-6" />
          <button
            type="submit"
            disabled={searchState.isLoading || !query}
            className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {searchState.isLoading ? <Spinner /> : 'Analyze'}
          </button>
        </form>
      </div>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto w-full flex-grow">
        {searchState.error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-6 rounded-xl text-center shadow-lg">
            <p className="font-bold text-lg mb-2">Error during analysis</p>
            <p className="mb-4">{searchState.error}</p>
            <p className="text-sm text-red-400">
              Check the browser console (Aspect &gt; Console or F12) for technical details and verify your API key in .env.local
            </p>
          </div>
        )}

        {searchState.data && (
          <div className="animate-fade-in-up space-y-6">

            {/* Device Header Info */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">{searchState.data.deviceName}</h2>
                <div className="flex items-center gap-4 text-slate-400 text-sm">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" /> Released: {searchState.data.launchDate}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4" /> Review Timeline Analysis
                  </span>
                </div>
              </div>

              <button
                onClick={exportToCSV}
                className="mt-4 md:mt-0 flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition-colors border border-slate-600"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Left Column: Score & Verdict */}
              <div className="lg:col-span-1">
                <ScoreCard
                  score={searchState.data.aggregateScore}
                  verdict={searchState.data.currentVerdict}
                  reviewCount={searchState.data.reviewCount}
                  confidenceScore={searchState.data.confidenceScore}
                />
              </div>

              {/* Right Column: Chart */}
              <div className="lg:col-span-2">
                <SentimentChart data={searchState.data.timePoints} />
              </div>
            </div>

            {/* Pros & Cons */}
            <ProsCons pros={searchState.data.pros} cons={searchState.data.cons} />

            {/* Sources */}
            <div className="mt-8 pt-8 border-t border-slate-800">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">Data Sources</h3>
                  <p className="text-xs text-slate-500">Domains used for analysis</p>
                </div>

                {/* Data Sources Badges */}
                <div className="flex flex-wrap gap-2">
                  {searchState.data.dataSourcesFound.map((domain, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-xs text-blue-300">
                      <Globe className="w-3 h-3" />
                      {domain}
                    </span>
                  ))}
                </div>
              </div>

              {searchState.data.sources.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {searchState.data.sources.map((source, idx) => (
                    <a
                      key={idx}
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 bg-slate-800/30 hover:bg-slate-800 border border-slate-700/50 rounded-lg text-xs text-slate-300 transition-colors group"
                    >
                      <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-blue-400 shrink-0" />
                      <span className="truncate">{source.title}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State / Welcome */}
        {!searchState.data && !searchState.isLoading && !searchState.error && (
          <div className="text-center py-20 text-slate-500">
            <div className="max-w-md mx-auto border-2 border-dashed border-slate-800 rounded-3xl p-8">
              <Smartphone className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Enter a phone or device name above to generate a retrospective review analysis.</p>
            </div>
          </div>
        )}
      </main>

      <footer className="max-w-6xl mx-auto w-full mt-12 p-4 bg-blue-900/20 border-l-4 border-blue-500 text-sm text-blue-200 rounded-r-lg">
        <strong>Architect’s Note:</strong> This Proof-of-Concept runs Gemini 3 Flash client-side for rapid prototyping.
        In a production environment, I would migrate the API calls to a secure Node.js backend using
        Google Cloud Functions to protect API credentials and implement rate limiting.
      </footer>
    </div>
  );
};

export default App;