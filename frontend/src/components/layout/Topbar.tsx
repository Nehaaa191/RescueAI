import { Search, RefreshCw } from 'lucide-react';
import { useIncidentsStore } from '../../store/incidentsStore';

interface TopbarProps {
  onRefresh: () => void;
}

export default function Topbar({ onRefresh }: TopbarProps) {
  const filters = useIncidentsStore((state) => state.filters);
  const setFilter = useIncidentsStore((state) => state.setFilter);
  const wsConnected = useIncidentsStore((state) => state.wsConnected);

  return (
    <header className="border-b border-border bg-surface px-6 py-4 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 select-none shrink-0">
      
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
        <input
          type="text"
          value={filters.searchQuery}
          onChange={(e) => setFilter('searchQuery', e.target.value)}
          placeholder="Search by ID, citizen name, address or description..."
          className="w-full bg-background border border-border focus:border-primary pl-10 pr-4 py-2 rounded-btn text-xs text-text-primary outline-none transition-colors"
        />
      </div>

      {/* Filter Options */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Disaster Type Filter */}
        <select
          value={filters.disasterType}
          onChange={(e) => setFilter('disasterType', e.target.value)}
          className="bg-background border border-border px-3 py-2 rounded-btn text-xs text-text-primary outline-none hover:bg-surface-elevated cursor-pointer"
        >
          <option value="all">All Incidents</option>
          <option value="flood">Flood 🌊</option>
          <option value="fire">Fire 🔥</option>
          <option value="earthquake">Earthquake 🫨</option>
          <option value="landslide">Landslide ⛰️</option>
          <option value="cyclone">Cyclone 🌀</option>
          <option value="other">Other ⚠️</option>
        </select>

        {/* Status Filter */}
        <select
          value={filters.status}
          onChange={(e) => setFilter('status', e.target.value)}
          className="bg-background border border-border px-3 py-2 rounded-btn text-xs text-text-primary outline-none hover:bg-surface-elevated cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending 🔴</option>
          <option value="assigned">Assigned 🔵</option>
          <option value="resolved">Resolved 🟢</option>
        </select>

        {/* Minimum Priority slider input/dropdown */}
        <div className="flex items-center gap-2 bg-background border border-border px-3 py-1.5 rounded-btn text-xs">
          <span className="text-[10px] text-text-muted font-mono uppercase">Min Priority:</span>
          <select
            value={filters.minPriority}
            onChange={(e) => setFilter('minPriority', parseInt(e.target.value))}
            className="bg-transparent border-none text-xs font-bold text-text-primary outline-none cursor-pointer"
          >
            <option value={0}>0+</option>
            <option value={35}>35+ (Mod)</option>
            <option value={60}>60+ (High)</option>
            <option value={80}>80+ (Critical)</option>
          </select>
        </div>

        {/* Duplicate reports toggle */}
        <label className="flex items-center gap-2 bg-background border border-border px-3 py-2 rounded-btn text-xs cursor-pointer hover:bg-surface-elevated">
          <input
            type="checkbox"
            checked={filters.showDuplicates}
            onChange={(e) => setFilter('showDuplicates', e.target.checked)}
            className="accent-primary h-3.5 w-3.5 rounded border-border"
          />
          <span className="text-[10px] uppercase font-mono text-text-secondary select-none">Show Duplicates</span>
        </label>

        {/* Refresh & WS Status Indicator */}
        <div className="flex items-center gap-2 border-l border-border pl-3">
          {/* WS status */}
          <div className="flex items-center gap-1.5" title={wsConnected ? 'Connected to live feed' : 'Disconnected from live feed'}>
            <span className={`h-2.5 w-2.5 rounded-full ${wsConnected ? 'bg-status-low animate-pulse' : 'bg-status-critical'}`} />
            <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider hidden md:inline">{wsConnected ? 'Live' : 'Offline'}</span>
          </div>

          <button
            onClick={onRefresh}
            className="p-2 rounded-btn hover:bg-surface-elevated text-text-secondary hover:text-text-primary border border-border bg-background transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}
