import { useEffect, useState } from 'react';
import { useIncidentsStore } from '../../store/incidentsStore';
import Sidebar from '../../components/layout/Sidebar';
import Topbar from '../../components/layout/Topbar';
import LeafletMap from '../../components/map/LeafletMap';
import IncidentDrawer from '../../components/incidents/IncidentDrawer';
import AnalyticsView from './AnalyticsView';
import ForecastView from './ForecastView';
import { AlertCircle, ShieldAlert, CheckCircle, Clock, Bell, X } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export default function Dashboard() {
  const {
    incidents,
    teams,
    regions,
    analytics,
    selectedIncidentId,
    filters,
    toast,
    clearToast,
    fetchIncidents,
    fetchTeams,
    fetchRegions,
    fetchAnalytics,
    connectWebSocket,
    setSelectedIncidentId
  } = useIncidentsStore();

  const [currentView, setCurrentView] = useState('dashboard');

  const refreshAll = () => {
    fetchIncidents(API_URL);
    fetchTeams(API_URL);
    fetchRegions(API_URL);
    fetchAnalytics(API_URL);
  };

  // Initial load and WebSocket trigger
  useEffect(() => {
    refreshAll();
    connectWebSocket(API_URL);
  }, []);

  // Filter incidents list based on user selections
  const filteredIncidents = incidents.filter((inc) => {
    // 1. Search filter
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const desc = inc.raw_description.toLowerCase();
      const id = inc.id.toLowerCase();
      const name = (inc.citizen_name || '').toLowerCase();
      const addr = (inc.location.address || '').toLowerCase();
      if (!desc.includes(q) && !id.includes(q) && !name.includes(q) && !addr.includes(q)) {
        return false;
      }
    }
    
    // 2. Disaster Type filter
    if (filters.disasterType !== 'all') {
      if (inc.disaster_type !== filters.disasterType) return false;
    }
    
    // 3. Status filter
    if (filters.status !== 'all') {
      if (inc.status !== filters.status) return false;
    }
    
    // 4. Min Priority filter
    if (inc.priority_score < filters.minPriority) return false;
    
    // 5. Hide duplicates if toggle is off
    if (!filters.showDuplicates && inc.duplicate_of !== null) {
      return false;
    }
    
    return true;
  });

  const getPriorityColor = (score: number) => {
    if (score >= 80) return 'text-status-critical bg-status-critical/10 border-status-critical/20';
    if (score >= 60) return 'text-status-high bg-status-high/10 border-status-high/20';
    if (score >= 35) return 'text-status-moderate bg-status-moderate/10 border-status-moderate/20';
    return 'text-status-low bg-status-low/10 border-status-low/20';
  };

  const getIncidentIcon = (type: string) => {
    switch (type) {
      case 'flood': return '🌊';
      case 'fire': return '🔥';
      case 'earthquake': return '🫨';
      case 'landslide': return '⛰️';
      case 'cyclone': return '🌀';
      default: return '⚠️';
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMin = Math.round((new Date().getTime() - date.getTime()) / 60000);
      if (diffMin < 1) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHrs = Math.round(diffMin / 60);
      if (diffHrs < 24) return `${diffHrs}h ago`;
      return date.toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  const activeIncident = incidents.find(i => i.id === selectedIncidentId) || null;

  return (
    <div className="flex h-screen bg-background text-text-primary overflow-hidden font-sans">
      
      {/* Sidebar Navigation */}
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Filters Top Header */}
        <Topbar onRefresh={refreshAll} />

        {/* View Switcher Container */}
        {currentView === 'dashboard' ? (
          /* Operational view: stats, map and scrolling feed list */
          <div className="flex-1 flex flex-col min-h-0 bg-background p-6 space-y-4">
            
            {/* Top Stat Bar summary indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 select-none shrink-0">
              <div className="bg-surface border border-border p-4 rounded-card flex justify-between items-center">
                <div>
                  <span className="text-[9px] font-mono text-text-muted uppercase block">Total Alerts Logged</span>
                  <span className="font-mono text-2xl font-black text-text-primary mt-1 block">
                    {analytics?.summary.total_reports ?? incidents.length}
                  </span>
                </div>
                <AlertCircle className="text-primary opacity-65" size={20} />
              </div>
              <div className="bg-surface border border-border p-4 rounded-card flex justify-between items-center">
                <div>
                  <span className="text-[9px] font-mono text-text-muted uppercase block">Active Critical Cases</span>
                  <span className="font-mono text-2xl font-black text-status-critical mt-1 block">
                    {analytics?.summary.critical_reports ?? incidents.filter(i => i.priority_score >= 80 && i.status !== 'resolved').length}
                  </span>
                </div>
                <ShieldAlert className="text-status-critical opacity-65 animate-pulse" size={20} />
              </div>
              <div className="bg-surface border border-border p-4 rounded-card flex justify-between items-center">
                <div>
                  <span className="text-[9px] font-mono text-text-muted uppercase block">Pending Dispatch</span>
                  <span className="font-mono text-2xl font-black text-status-high mt-1 block">
                    {analytics?.summary.pending_reports ?? incidents.filter(i => i.status === 'pending').length}
                  </span>
                </div>
                <Clock className="text-status-high opacity-65" size={20} />
              </div>
              <div className="bg-surface border border-border p-4 rounded-card flex justify-between items-center">
                <div>
                  <span className="text-[9px] font-mono text-text-muted uppercase block">Cases Resolved</span>
                  <span className="font-mono text-2xl font-black text-status-low mt-1 block">
                    {analytics?.summary.resolved_reports ?? incidents.filter(i => i.status === 'resolved').length}
                  </span>
                </div>
                <CheckCircle className="text-status-low opacity-65" size={20} />
              </div>
            </div>

            {/* Map vs Feed Layout */}
            <div className="flex-1 flex gap-4 min-h-0">
              
              {/* Map Canvas (2/3 width) */}
              <div className="flex-1 h-full min-w-0">
                <LeafletMap
                  incidents={filteredIncidents}
                  teams={teams}
                  regions={regions}
                  selectedIncidentId={selectedIncidentId}
                  onSelectIncident={setSelectedIncidentId}
                  mapViewMode="incidents"
                />
              </div>

              {/* Feed Panel (1/3 width) */}
              <div className="w-80 shrink-0 h-full flex flex-col min-h-0 bg-surface border border-border rounded-card select-none">
                <div className="p-4 border-b border-border bg-surface-elevated flex justify-between items-center">
                  <span className="font-mono text-[10px] text-text-secondary uppercase font-bold tracking-wider">Live Incident Feed</span>
                  <span className="text-[10px] font-mono bg-background px-2 py-0.5 border border-border rounded text-text-muted font-bold">
                    {filteredIncidents.length} listed
                  </span>
                </div>

                {/* Cards List container */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {filteredIncidents.map((incident) => {
                    const active = selectedIncidentId === incident.id;
                    const isDup = incident.duplicate_of !== null;
                    
                    return (
                      <div
                        key={incident.id}
                        onClick={() => setSelectedIncidentId(incident.id)}
                        className={`p-3.5 border rounded-btn text-left cursor-pointer transition-all duration-200 hover:bg-surface-elevated/40 ${
                          active 
                            ? 'border-primary bg-primary/5 shadow-md shadow-primary/5' 
                            : 'border-border bg-background'
                        }`}
                      >
                        <div className="flex justify-between items-center gap-2 mb-2">
                          <span className={`text-[9px] font-mono px-2 py-0.5 border rounded uppercase font-bold ${getPriorityColor(incident.priority_score)}`}>
                            P-{incident.priority_score}
                          </span>
                          <span className="text-[9px] font-mono text-text-muted">{formatTime(incident.created_at)}</span>
                        </div>

                        <h4 className="font-semibold text-text-primary capitalize text-xs flex items-center gap-1.5 mb-1.5">
                          <span>{getIncidentIcon(incident.disaster_type)}</span>
                          <span>{incident.disaster_type} Incident</span>
                          {isDup && <span className="text-[8px] bg-status-high/10 text-status-high border border-status-high/20 px-1 rounded">DUP</span>}
                        </h4>

                        <p className="text-text-secondary text-[11px] leading-relaxed line-clamp-2 italic mb-2">
                          "{incident.raw_description}"
                        </p>

                        <div className="flex justify-between items-center text-[10px] font-mono text-text-muted pt-2 border-t border-border/50">
                          <span className="uppercase text-[9px]" style={{
                            color: 
                              incident.status === 'pending' ? '#EF4444' : 
                              incident.status === 'assigned' ? '#3B82F6' : '#22C55E'
                          }}>{incident.status}</span>
                          <span>{incident.num_people} stuck</span>
                        </div>
                      </div>
                    );
                  })}

                  {filteredIncidents.length === 0 && (
                    <div className="h-full flex items-center justify-center text-xs text-text-muted italic py-24 text-center px-4">
                      No active incidents match current filter configuration.
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        ) : currentView === 'analytics' ? (
          <AnalyticsView analytics={analytics} />
        ) : (
          <ForecastView regions={regions} backendUrl={API_URL} />
        )}

      </div>

      {/* Incident Details sliding drawer panel */}
      {selectedIncidentId && (
        <IncidentDrawer
          incident={activeIncident}
          onClose={() => setSelectedIncidentId(null)}
          teams={teams}
          backendUrl={API_URL}
        />
      )}

      {/* Floating Global WebSocket Critical Toast Alerts */}
      {toast && (
        <div className="fixed bottom-6 left-6 z-[2000] max-w-sm w-full bg-surface border border-status-critical rounded-card shadow-2xl p-4 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Bell className="text-status-critical shrink-0 mt-0.5 animate-bounce" size={20} />
              <div>
                <span className="font-bold text-xs font-mono text-status-critical block mb-1 uppercase tracking-wide">EMERGENCY OPERATIONS DISPATCH</span>
                <p className="text-text-primary text-xs leading-relaxed">{toast.message}</p>
              </div>
            </div>
            <button 
              onClick={clearToast} 
              className="text-text-muted hover:text-text-primary p-0.5 rounded transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
