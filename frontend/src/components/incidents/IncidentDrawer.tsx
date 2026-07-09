import { useState } from 'react';
import { X, Shield, Phone, Users, AlertTriangle, UserCheck, CheckCircle2, ChevronRight, Activity } from 'lucide-react';
import type { IncidentReport, RescueTeam } from '../../types';
import { useIncidentsStore } from '../../store/incidentsStore';

interface IncidentDrawerProps {
  incident: IncidentReport | null;
  onClose: () => void;
  teams: RescueTeam[];
  backendUrl: string;
}

export default function IncidentDrawer({ incident, onClose, teams, backendUrl }: IncidentDrawerProps) {
  const assignTeam = useIncidentsStore((state) => state.assignTeam);
  const resolveIncident = useIncidentsStore((state) => state.resolveIncident);
  
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [resolving, setResolving] = useState(false);

  if (!incident) return null;

  const isDuplicate = incident.duplicate_of !== null;
  
  // Format priority colors
  let priorityBg = 'bg-status-low/10 text-status-low border-status-low/20';
  let priorityBarColor = '#22C55E';
  if (incident.priority_score >= 80) {
    priorityBg = 'bg-status-critical/10 text-status-critical border-status-critical/20';
    priorityBarColor = '#EF4444';
  } else if (incident.priority_score >= 60) {
    priorityBg = 'bg-status-high/10 text-status-high border-status-high/20';
    priorityBarColor = '#F97316';
  } else if (incident.priority_score >= 35) {
    priorityBg = 'bg-status-moderate/10 text-status-moderate border-status-moderate/20';
    priorityBarColor = '#EAB308';
  }

  // Filter available teams that match required resources
  const availableTeams = teams.filter(t => t.status === 'available');

  const handleAssign = async () => {
    if (!selectedTeamId) return;
    setDispatching(true);
    await assignTeam(backendUrl, incident.id, selectedTeamId);
    setDispatching(false);
    setSelectedTeamId('');
  };

  const handleResolve = async () => {
    setResolving(true);
    await resolveIncident(backendUrl, incident.id);
    setResolving(false);
  };

  const getAssignedTeamName = () => {
    if (!incident.assigned_team_id) return null;
    const team = teams.find(t => t.id === incident.assigned_team_id);
    return team ? team.name : `Team ID: ${incident.assigned_team_id.substring(0, 6)}`;
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-surface border-l border-border shadow-2xl z-[1000] flex flex-col justify-between font-sans animate-in slide-in-from-right duration-250">
      
      {/* Header */}
      <div className="p-5 border-b border-border flex justify-between items-center bg-surface-elevated">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] text-text-muted font-bold tracking-wider">INCIDENT OVERVIEW</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm text-text-primary">#{incident.id.substring(0, 8)}...</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 border rounded uppercase font-bold ${priorityBg}`}>
              PRIORITY {incident.priority_score}
            </span>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="text-text-secondary hover:text-text-primary p-1.5 rounded-btn hover:bg-background transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        
        {/* Duplicate Banner */}
        {isDuplicate && (
          <div className="bg-status-high/15 border border-status-high/30 p-3 rounded-btn flex gap-2 text-xs">
            <AlertTriangle className="text-status-high shrink-0" size={16} />
            <div className="space-y-1">
              <span className="font-bold text-status-high block">🔗 DUPLICATE ALIGNMENT</span>
              <p className="text-text-secondary">
                This report has been identified as a duplicate of parent incident <span className="font-mono font-bold text-text-primary">#{incident.duplicate_of?.substring(0, 8)}...</span>. Resources should be coordinated at the parent level.
              </p>
            </div>
          </div>
        )}

        {/* Core Metadata Grid */}
        <div className="grid grid-cols-2 gap-3 bg-background border border-border p-4 rounded-btn font-mono text-xs">
          <div>
            <span className="text-text-muted block mb-0.5">DISASTER TYPE</span>
            <span className="font-bold text-text-primary capitalize flex items-center gap-1.5 text-sm">
              <span>{incident.disaster_type === 'flood' ? '🌊' : incident.disaster_type === 'fire' ? '🔥' : incident.disaster_type === 'earthquake' ? '🫨' : '⚠️'}</span>
              <span>{incident.disaster_type}</span>
            </span>
          </div>
          <div>
            <span className="text-text-muted block mb-0.5">STATUS</span>
            <span className="font-bold text-sm uppercase" style={{
              color: 
                incident.status === 'pending' ? '#EF4444' : 
                incident.status === 'assigned' ? '#3B82F6' : '#22C55E'
            }}>{incident.status}</span>
          </div>
          <div className="col-span-2 border-t border-border/50 pt-2 mt-1">
            <span className="text-text-muted block mb-0.5">LOCATION</span>
            <span className="font-bold text-text-primary text-xs leading-normal">{incident.location.address || `${incident.location.lat.toFixed(4)}, ${incident.location.lng.toFixed(4)}`}</span>
          </div>
        </div>

        {/* Citizen Intake Description */}
        <div>
          <span className="block text-xs font-mono text-text-muted mb-2 uppercase">Raw Citizen Statement</span>
          <div className="bg-background border-l-2 border-primary/50 p-4 rounded-r-btn italic text-sm text-text-secondary leading-relaxed bg-opacity-40">
            "{incident.raw_description}"
          </div>
          
          <div className="flex gap-4 text-xs font-mono text-text-muted mt-3">
            {incident.citizen_name && (
              <span className="flex items-center gap-1">
                <Shield size={12} /> {incident.citizen_name}
              </span>
            )}
            {incident.phone && (
              <span className="flex items-center gap-1">
                <Phone size={12} /> {incident.phone}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users size={12} /> {incident.num_people} stuck
            </span>
          </div>
        </div>

        {/* AI Explainable Priority Score Reasons */}
        <div className="border-t border-border/50 pt-5">
          <span className="block text-xs font-mono text-text-muted mb-2 uppercase flex items-center gap-1.5">
            <Activity size={14} className="text-status-critical" /> AI Priority Reasons (SHAP Contributions)
          </span>
          <ul className="space-y-2 text-xs">
            {incident.priority_reasons.map((reason, idx) => (
              <li key={idx} className="flex items-center gap-2 bg-background border border-border px-3 py-2 rounded-btn">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: priorityBarColor }}></span>
                <span className="font-semibold text-text-primary">{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* NLP Extraction Details */}
        <div className="border-t border-border/50 pt-5">
          <span className="block text-xs font-mono text-text-muted mb-3 uppercase">NLP Extraction details</span>
          
          {incident.nlp_extraction ? (
            <div className="space-y-4">
              {/* Keywords Tagging */}
              <div>
                <span className="text-[10px] text-text-muted font-mono block mb-1.5">URGENCY KEYWORDS IDENTIFIED</span>
                <div className="flex flex-wrap gap-1.5">
                  {incident.nlp_extraction.urgency_keywords.map((kw, i) => (
                    <span key={i} className="bg-surface-elevated border border-border px-2 py-0.5 rounded text-[10px] font-mono text-text-secondary capitalize">{kw}</span>
                  ))}
                  {incident.nlp_extraction.urgency_keywords.length === 0 && (
                    <span className="text-xs text-text-muted italic">None identified</span>
                  )}
                </div>
              </div>

              {/* Vulnerable Groups Checklist */}
              <div>
                <span className="text-[10px] text-text-muted font-mono block mb-2">VULNERABILITY FLAGS</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(incident.nlp_extraction.people_breakdown).map(([group, val]) => (
                    <div key={group} className="flex justify-between items-center bg-background border border-border px-2.5 py-1.5 rounded-btn">
                      <span className="capitalize font-semibold text-text-secondary">{group}</span>
                      <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        val > 0 ? 'bg-status-critical/10 text-status-critical' : 'bg-surface-elevated text-text-muted'
                      }`}>
                        {val > 0 ? 'DETECTED' : 'ABSENT'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Requirements & Info */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-text-muted font-mono block mb-1">WATER LEVEL</span>
                  <span className="font-mono font-bold text-text-primary text-sm bg-background border border-border px-2.5 py-1.5 rounded-btn block">
                    {incident.nlp_extraction.water_level_cm || 0} cm
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted font-mono block mb-1">MEDICAL EMERGENCY</span>
                  <span className={`font-mono font-bold text-sm border px-2.5 py-1.5 rounded-btn block ${
                    incident.nlp_extraction.medical_emergency 
                      ? 'border-status-critical/20 bg-status-critical/10 text-status-critical' 
                      : 'border-border bg-background text-text-muted'
                  }`}>
                    {incident.nlp_extraction.medical_emergency ? 'YES' : 'NO'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <span className="text-xs text-text-muted italic">No NLP summary data available</span>
          )}
        </div>

        {/* CV Detection Details */}
        <div className="border-t border-border/50 pt-5">
          <span className="block text-xs font-mono text-text-muted mb-3 uppercase">Computer Vision Analysis</span>
          
          {incident.cv_analysis ? (
            <div className="space-y-4">
              {/* Display Images */}
              {incident.images.length > 0 ? (
                <div>
                  <span className="text-[10px] text-text-muted font-mono block mb-2">VERIFICATION IMAGE ATTACHED</span>
                  <div className="grid grid-cols-2 gap-2">
                    {incident.images.map((img, i) => (
                      <div key={i} className="border border-border rounded-btn aspect-video overflow-hidden">
                        <img 
                          src={img.startsWith('http') ? img : `${backendUrl}${img}`} 
                          alt="Incident Photo" 
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-zoom-in"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-background border border-border border-dashed p-4 rounded-btn text-center text-xs text-text-muted italic">
                  No images uploaded by citizen.
                </div>
              )}

              {incident.images.length > 0 && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-text-muted font-mono block mb-1.5">OBJECTS DETECTED</span>
                    <div className="flex flex-wrap gap-1">
                      {incident.cv_analysis.detections.map((d, idx) => (
                        <span key={idx} className="bg-background border border-border px-2 py-0.5 rounded text-[10px] font-mono text-text-primary">
                          {d.class} ({(d.confidence * 100).toFixed(0)}%)
                        </span>
                      ))}
                      {incident.cv_analysis.detections.length === 0 && (
                        <span className="text-xs text-text-muted italic">None</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted font-mono block mb-1">VISUAL SEVERITY</span>
                    <span className="font-semibold text-text-primary capitalize flex items-center gap-1.5 mt-1">
                      <span className={`h-2.5 w-2.5 rounded-full ${
                        incident.cv_analysis.severity_estimate === 'high' ? 'bg-status-critical animate-pulse' :
                        incident.cv_analysis.severity_estimate === 'medium' ? 'bg-status-high' : 'bg-status-low'
                      }`}></span>
                      <span>{incident.cv_analysis.severity_estimate} Visual Risk</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <span className="text-xs text-text-muted italic">No CV summary data available</span>
          )}
        </div>

      </div>

      {/* Footer Operations Action Bar */}
      <div className="p-5 border-t border-border bg-surface-elevated flex flex-col gap-3">
        {/* Status indicator */}
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-text-muted uppercase">Dispatch Status</span>
          <span className="font-bold text-text-primary capitalize">{incident.status}</span>
        </div>

        {/* Operations Workflow Buttons */}
        {incident.status === 'pending' && (
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-mono text-text-muted mb-2 uppercase">Select Available Team for Dispatch</label>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="w-full bg-background border border-border focus:border-primary px-3 py-2.5 rounded-btn text-text-primary outline-none text-xs"
              >
                <option value="">-- Choose Emergency Team --</option>
                {availableTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.type.toUpperCase()})
                  </option>
                ))}
                {availableTeams.length === 0 && (
                  <option disabled value="">No available teams. Clear other incidents first!</option>
                )}
              </select>
            </div>
            
            <button
              onClick={handleAssign}
              disabled={!selectedTeamId || dispatching}
              className="w-full bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white font-bold py-3 rounded-btn transition-colors text-xs flex items-center justify-center gap-2"
            >
              {dispatching ? 'Dispatching unit...' : 'Assign and Dispatch Team'}
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        {incident.status === 'assigned' && (
          <div className="space-y-3">
            <div className="bg-background border border-border p-3.5 rounded-btn text-xs space-y-1">
              <span className="text-text-muted block text-[10px] font-mono uppercase">En Route Responder</span>
              <span className="font-bold text-text-primary flex items-center gap-1.5">
                <UserCheck className="text-primary" size={14} />
                {getAssignedTeamName()}
              </span>
            </div>
            
            <button
              onClick={handleResolve}
              disabled={resolving}
              className="w-full bg-status-low hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-3 rounded-btn transition-colors text-xs flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 size={14} />
              {resolving ? 'Updating Operations...' : 'Resolve Emergency and Free Team'}
            </button>
          </div>
        )}

        {incident.status === 'resolved' && (
          <div className="bg-status-low/10 border border-status-low/30 text-status-low p-4 rounded-btn text-center text-xs font-semibold flex items-center justify-center gap-2">
            <CheckCircle2 size={16} />
            <span>Emergency operations successfully resolved & closed.</span>
          </div>
        )}
      </div>

    </div>
  );
}
