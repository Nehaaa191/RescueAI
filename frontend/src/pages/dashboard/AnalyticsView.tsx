import type { AnalyticsSummary } from '../../types';
import { Shield, AlertTriangle, Users, CheckCircle, BarChart3, Activity } from 'lucide-react';

interface AnalyticsViewProps {
  analytics: AnalyticsSummary | null;
}

export default function AnalyticsView({ analytics }: AnalyticsViewProps) {
  if (!analytics) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background text-text-muted italic">
        Loading operation analytics...
      </div>
    );
  }

  const { summary, disaster_type_distribution, resource_utilization } = analytics;

  // Calculate percentages for custom visual charts
  const totalDisasters = Object.values(disaster_type_distribution).reduce((a, b) => a + b, 0) || 1;

  const disasterColors: Record<string, string> = {
    flood: '#3B82F6',
    fire: '#EF4444',
    earthquake: '#8B5CF6',
    landslide: '#F97316',
    cyclone: '#06B6D4',
    other: '#6B7280'
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-background">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="text-primary h-6 w-6" />
        <h1 className="text-xl font-bold text-text-primary">Operations Analytics Board</h1>
      </div>

      {/* Grid of operational stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-border p-5 rounded-card flex flex-col justify-between">
          <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider block">Total Incidents</span>
          <div className="flex justify-between items-end mt-4">
            <span className="font-mono text-4xl font-extrabold text-text-primary">{summary.total_reports}</span>
            <Shield className="text-primary opacity-60" size={24} />
          </div>
        </div>

        <div className="bg-surface border border-border p-5 rounded-card flex flex-col justify-between">
          <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider block">Critical Active Alerts</span>
          <div className="flex justify-between items-end mt-4">
            <span className="font-mono text-4xl font-extrabold text-status-critical">{summary.critical_reports}</span>
            <AlertTriangle className="text-status-critical opacity-60" size={24} />
          </div>
        </div>

        <div className="bg-surface border border-border p-5 rounded-card flex flex-col justify-between">
          <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider block">Pending Dispatch</span>
          <div className="flex justify-between items-end mt-4">
            <span className="font-mono text-4xl font-extrabold text-status-high">{summary.pending_reports}</span>
            <Users className="text-status-high opacity-60" size={24} />
          </div>
        </div>

        <div className="bg-surface border border-border p-5 rounded-card flex flex-col justify-between">
          <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider block">Resolved Cases</span>
          <div className="flex justify-between items-end mt-4">
            <span className="font-mono text-4xl font-extrabold text-status-low">{summary.resolved_reports}</span>
            <CheckCircle className="text-status-low opacity-60" size={24} />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Disaster Type Distribution Bar Chart */}
        <div className="bg-surface border border-border p-6 rounded-card">
          <h3 className="text-sm font-semibold text-text-primary mb-6 font-mono uppercase tracking-wider border-b border-border pb-3 flex items-center gap-2">
            <Activity size={16} className="text-primary" /> Incident Type Distribution
          </h3>
          
          <div className="space-y-4">
            {Object.entries(disaster_type_distribution).map(([type, count]) => {
              const percentage = (count / totalDisasters) * 100;
              const color = disasterColors[type] || '#6B7280';
              return (
                <div key={type} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="capitalize text-text-secondary font-semibold">{type}</span>
                    <span className="text-text-primary font-bold">{count} cases ({percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-background h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: color 
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resource Utilization Meter */}
        <div className="bg-surface border border-border p-6 rounded-card flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-6 font-mono uppercase tracking-wider border-b border-border pb-3 flex items-center gap-2">
              <Shield size={16} className="text-status-low" /> Responder Team Utilization
            </h3>
            
            <div className="flex items-center gap-6 mb-8">
              {/* Radial-like visual meter using styled div border */}
              <div className="relative h-28 w-28 rounded-full border-4 border-border flex flex-col items-center justify-center shrink-0">
                <span className="font-mono text-2xl font-black text-text-primary">{resource_utilization.utilization_pct}%</span>
                <span className="text-[8px] text-text-muted font-mono uppercase">Utilized</span>
                {/* Visual border arc */}
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-primary pointer-events-none animate-spin-slow"></div>
              </div>
              
              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between gap-4">
                  <span className="text-text-secondary">Total Dispatch Units:</span>
                  <span className="font-bold text-text-primary">{resource_utilization.total_teams}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-text-secondary">Active En Route:</span>
                  <span className="font-bold text-status-high">{resource_utilization.active_dispatched_teams}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-text-secondary">Standby Available:</span>
                  <span className="font-bold text-status-low">{resource_utilization.total_teams - resource_utilization.active_dispatched_teams}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-background border border-border p-4 rounded-btn text-xs text-text-secondary">
            <span className="font-bold block text-text-primary mb-1">🚨 DISPATCH METRIC STATEMENT</span>
            Emergency teams must be pre-positioned at highest-risk forecast zones when regional risk scores exceed 80% to ensure response latencies stay under target (4 mins).
          </div>
        </div>

      </div>

    </div>
  );
}
