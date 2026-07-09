import { create } from 'zustand';
import type { IncidentReport, RescueTeam, ForecastRegion, AnalyticsSummary } from '../types';

interface Filters {
  status: string;
  disasterType: string;
  minPriority: number;
  searchQuery: string;
  showDuplicates: boolean;
}

interface IncidentsState {
  incidents: IncidentReport[];
  teams: RescueTeam[];
  regions: ForecastRegion[];
  analytics: AnalyticsSummary | null;
  selectedIncidentId: string | null;
  filters: Filters;
  wsConnected: boolean;
  toast: { message: string; type: 'info' | 'error' | 'success'; id: string } | null;
  
  // Actions
  setIncidents: (incidents: IncidentReport[]) => void;
  setTeams: (teams: RescueTeam[]) => void;
  setRegions: (regions: ForecastRegion[]) => void;
  setAnalytics: (analytics: AnalyticsSummary) => void;
  setSelectedIncidentId: (id: string | null) => void;
  setFilter: (key: keyof Filters, value: any) => void;
  resetFilters: () => void;
  
  // Real-time WS handler
  connectWebSocket: (backendUrl: string) => void;
  showToast: (message: string, type: 'info' | 'error' | 'success') => void;
  clearToast: () => void;
  
  // API triggers
  fetchIncidents: (apiUrl: string) => Promise<void>;
  fetchTeams: (apiUrl: string) => Promise<void>;
  fetchRegions: (apiUrl: string) => Promise<void>;
  fetchAnalytics: (apiUrl: string) => Promise<void>;
  assignTeam: (apiUrl: string, incidentId: string, teamId: string) => Promise<void>;
  resolveIncident: (apiUrl: string, incidentId: string) => Promise<void>;
}

const initialFilters: Filters = {
  status: 'all',
  disasterType: 'all',
  minPriority: 0,
  searchQuery: '',
  showDuplicates: false
};

export const useIncidentsStore = create<IncidentsState>((set, get) => {
  let socket: WebSocket | null = null;
  let wsReconnectTimer: any = null;

  return {
    incidents: [],
    teams: [],
    regions: [],
    analytics: null,
    selectedIncidentId: null,
    filters: initialFilters,
    wsConnected: false,
    toast: null,

    setIncidents: (incidents) => set({ incidents }),
    setTeams: (teams) => set({ teams }),
    setRegions: (regions) => set({ regions }),
    setAnalytics: (analytics) => set({ analytics }),
    setSelectedIncidentId: (id) => set({ selectedIncidentId: id }),
    setFilter: (key, value) => set((state) => ({ filters: { ...state.filters, [key]: value } })),
    resetFilters: () => set({ filters: initialFilters }),

    showToast: (message, type) => {
      const id = Math.random().toString(36).substring(7);
      set({ toast: { message, type, id } });
    },
    clearToast: () => set({ toast: null }),

    connectWebSocket: (backendUrl) => {
      if (socket) return;

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Strip http:// or https:// prefix from backendUrl if present
      const wsHost = backendUrl.replace(/^https?:\/\//, '');
      const wsUrl = `${wsProtocol}//${wsHost}/ws/incidents`;

      console.log(`Connecting to WebSocket: ${wsUrl}`);
      
      const connect = () => {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          console.log('WebSocket connected successfully');
          set({ wsConnected: true });
          if (wsReconnectTimer) {
            clearInterval(wsReconnectTimer);
            wsReconnectTimer = null;
          }
        };

        socket.onmessage = (event) => {
          try {
            if (event.data === 'pong') return;
            
            const message = JSON.parse(event.data);
            const { event: evType, data } = message;
            
            if (evType === 'new_report') {
              const report = data as IncidentReport;
              
              // Add to incidents list
              set((state) => {
                // Prevent duplicate insertions
                if (state.incidents.some(i => i.id === report.id)) {
                  return { incidents: state.incidents };
                }
                
                // Show notification for critical incidents
                if (report.priority_score >= 80 && !report.duplicate_of) {
                  get().showToast(
                    `🚨 CRITICAL [Priority ${report.priority_score}] ${report.disaster_type.toUpperCase()} in ${report.location.address || 'Unknown'}: ${report.raw_description.substring(0, 60)}...`,
                    'error'
                  );
                } else if (!report.duplicate_of) {
                  get().showToast(
                    `⚠️ New emergency reported: ${report.disaster_type.toUpperCase()} in ${report.location.address || 'Unknown'}`,
                    'info'
                  );
                }
                
                return { incidents: [report, ...state.incidents] };
              });
              
              // Refresh analytics after new report
              get().fetchAnalytics(backendUrl);
            } 
            else if (evType === 'status_update') {
              const updatedReport = data as IncidentReport;
              set((state) => ({
                incidents: state.incidents.map((inc) => 
                  inc.id === updatedReport.id ? updatedReport : inc
                ),
                // Update selected incident if it's the one that changed
                selectedIncidentId: state.selectedIncidentId === updatedReport.id ? updatedReport.id : state.selectedIncidentId
              }));
              
              // Trigger reload of teams and analytics
              get().fetchTeams(backendUrl);
              get().fetchAnalytics(backendUrl);
              
              get().showToast(
                `Incident status updated to ${updatedReport.status.toUpperCase()}`,
                'success'
              );
            }
          } catch (e) {
            console.error('Error handling WebSocket message:', e);
          }
        };

        socket.onclose = () => {
          console.log('WebSocket connection closed. Attempting reconnect...');
          set({ wsConnected: false });
          socket = null;
          
          if (!wsReconnectTimer) {
            wsReconnectTimer = setInterval(() => {
              connect();
            }, 5000);
          }
        };

        socket.onerror = (err) => {
          console.error('WebSocket error:', err);
          if (socket) socket.close();
        };
      };

      connect();
    },

    fetchIncidents: async (apiUrl) => {
      try {
        const response = await fetch(`${apiUrl}/api/reports`);
        if (!response.ok) throw new Error('Failed to fetch incidents');
        const data = await response.json();
        set({ incidents: data });
      } catch (err) {
        console.error('Error fetching incidents:', err);
      }
    },

    fetchTeams: async (apiUrl) => {
      try {
        const response = await fetch(`${apiUrl}/api/teams`);
        if (!response.ok) throw new Error('Failed to fetch teams');
        const data = await response.json();
        set({ teams: data });
      } catch (err) {
        console.error('Error fetching teams:', err);
      }
    },

    fetchRegions: async (apiUrl) => {
      try {
        const response = await fetch(`${apiUrl}/api/forecast/regions`);
        if (!response.ok) throw new Error('Failed to fetch regions');
        const data = await response.json();
        set({ regions: data });
      } catch (err) {
        console.error('Error fetching regions:', err);
      }
    },

    fetchAnalytics: async (apiUrl) => {
      try {
        const response = await fetch(`${apiUrl}/api/analytics/summary`);
        if (!response.ok) throw new Error('Failed to fetch analytics');
        const data = await response.json();
        set({ analytics: data });
      } catch (err) {
        console.error('Error fetching analytics:', err);
      }
    },

    assignTeam: async (apiUrl, incidentId, teamId) => {
      try {
        const response = await fetch(`${apiUrl}/api/reports/${incidentId}/assign`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assigned_team_id: teamId })
        });
        if (!response.ok) throw new Error('Failed to assign team');
        const updatedReport = await response.json();
        
        // Update local state directly (WebSocket will also broadcast, but this keeps UI ultra snappy)
        set((state) => ({
          incidents: state.incidents.map((inc) => 
            inc.id === updatedReport.id ? updatedReport : inc
          )
        }));
      } catch (err) {
        console.error('Error assigning team:', err);
        get().showToast('Failed to assign team', 'error');
      }
    },

    resolveIncident: async (apiUrl, incidentId) => {
      try {
        const response = await fetch(`${apiUrl}/api/reports/${incidentId}/resolve`, {
          method: 'PATCH'
        });
        if (!response.ok) throw new Error('Failed to resolve incident');
        const updatedReport = await response.json();
        
        set((state) => ({
          incidents: state.incidents.map((inc) => 
            inc.id === updatedReport.id ? updatedReport : inc
          )
        }));
      } catch (err) {
        console.error('Error resolving incident:', err);
        get().showToast('Failed to resolve incident', 'error');
      }
    }
  };
});
