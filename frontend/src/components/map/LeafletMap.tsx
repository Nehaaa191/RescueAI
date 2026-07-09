import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { IncidentReport, RescueTeam, ForecastRegion } from '../../types';
import { Shield, Phone, Users } from 'lucide-react';

// Fix for default Leaflet icon paths in React build
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to dynamically update map center
function ChangeMapView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

interface LeafletMapProps {
  incidents: IncidentReport[];
  teams: RescueTeam[];
  regions: ForecastRegion[];
  onSelectIncident: (id: string) => void;
  selectedIncidentId: string | null;
  mapViewMode: 'incidents' | 'forecast';
}

export default function LeafletMap({
  incidents,
  teams,
  regions,
  onSelectIncident,
  selectedIncidentId,
  mapViewMode
}: LeafletMapProps) {
  
  const getMarkerIcon = (priorityScore: number, isDuplicate: boolean, isSelected: boolean) => {
    let colorClass = 'bg-status-low';
    let ringClass = isSelected ? 'ring-4 ring-primary ring-offset-2 ring-offset-background' : 'ring-1 ring-white/30';
    let pingColor = 'bg-status-low';

    if (priorityScore >= 80) {
      colorClass = 'bg-status-critical';
      pingColor = 'bg-status-critical';
    } else if (priorityScore >= 60) {
      colorClass = 'bg-status-high';
      pingColor = 'bg-status-high';
    } else if (priorityScore >= 35) {
      colorClass = 'bg-status-moderate';
      pingColor = 'bg-status-moderate';
    }

    const isCritical = priorityScore >= 80;
    const pulseHtml = (isCritical && !isDuplicate)
      ? `<span class="absolute inline-flex h-full w-full rounded-full ${pingColor} opacity-75 animate-ping"></span>`
      : '';
      
    const size = isSelected ? 'h-6 w-6' : 'h-4.5 w-4.5';
    const innerSize = isSelected ? 'h-4 w-4' : 'h-3 w-3';
    
    // Duplicate visual indicator: half opacity and dashed border
    const opacityClass = isDuplicate ? 'opacity-60' : 'opacity-100';

    return L.divIcon({
      className: `custom-div-icon ${opacityClass}`,
      html: `
        <div class="relative flex items-center justify-center ${size}">
          ${pulseHtml}
          <div class="${innerSize} rounded-full ${colorClass} ${ringClass} shadow-lg transition-all duration-300"></div>
        </div>
      `,
      iconSize: isSelected ? [24, 24] : [18, 18],
      iconAnchor: isSelected ? [12, 12] : [9, 9]
    });
  };

  const getTeamIcon = (_teamType: string, status: string) => {
    // Blue dot for teams
    const colorClass = status === 'available' ? 'bg-primary' : 'bg-status-high';
    return L.divIcon({
      className: 'custom-team-icon',
      html: `
        <div class="relative flex items-center justify-center h-4 w-4">
          <span class="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-40 animate-ping"></span>
          <div class="h-2.5 w-2.5 rounded-full ${colorClass} border border-white shadow-md"></div>
        </div>
      `,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
  };

  // Helper to color fill polygons based on risk values
  const getRegionStyle = (region: ForecastRegion) => {
    const risk = region.risk_24h; // Color by 24h horizon risk
    let color = '#22C55E'; // Low: green

    if (risk >= 0.8) {
      color = '#EF4444'; // Critical: red
    } else if (risk >= 0.6) {
      color = '#F97316'; // High: orange
    } else if (risk >= 0.35) {
      color = '#EAB308'; // Moderate: yellow
    }

    return {
      fillColor: color,
      fillOpacity: mapViewMode === 'forecast' ? 0.35 : 0.05,
      color: color,
      weight: 1.5,
      dashArray: mapViewMode === 'forecast' ? '0' : '3, 5',
      opacity: 0.7
    };
  };

  const centerJaipur: [number, number] = [26.8924, 75.7873];
  
  // Center on selected incident if one is active
  let activeCenter = centerJaipur;
  if (selectedIncidentId) {
    const selected = incidents.find(i => i.id === selectedIncidentId);
    if (selected && selected.location) {
      activeCenter = [selected.location.lat, selected.location.lng];
    }
  }

  return (
    <div className="w-full h-full relative rounded-card overflow-hidden border border-border">
      <MapContainer 
        center={activeCenter} 
        zoom={12} 
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <ChangeMapView center={activeCenter} zoom={selectedIncidentId ? 14 : 12} />
        
        {/* Dark Mode Map Tiles via CartoDB Dark Matter */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        />

        {/* Draw Forecast Regions */}
        {regions.map((region) => {
          // GeoJSON boundary coordinates format: [[[lng, lat], [lng, lat], ...]]
          // Leaflet Polygon coordinates format: [[lat, lng], [lat, lng], ...]
          const coords = region.geojson_boundary.coordinates[0].map(
            (coord: number[]) => [coord[1], coord[0]] as [number, number]
          );

          return (
            <Polygon
              key={region.id}
              positions={coords}
              pathOptions={getRegionStyle(region)}
            >
              <Popup>
                <div className="p-1 font-sans">
                  <h3 className="font-bold text-sm text-text-primary border-b border-border pb-1 mb-2">{region.name}</h3>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between gap-4 text-text-secondary">
                      <span>Rainfall today:</span>
                      <span className="font-bold text-text-primary">{region.rainfall_mm} mm</span>
                    </div>
                    <div className="flex justify-between gap-4 text-text-secondary">
                      <span>River Level:</span>
                      <span className="font-bold text-text-primary">{region.river_level_m} m</span>
                    </div>
                    <div className="flex justify-between gap-4 text-text-secondary pt-1 border-t border-border/50">
                      <span>Risk 1h:</span>
                      <span className="font-bold font-mono" style={{ color: region.risk_1h >= 0.8 ? '#EF4444' : '#9CA3AF' }}>{(region.risk_1h * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between gap-4 text-text-secondary">
                      <span>Risk 6h:</span>
                      <span className="font-bold font-mono" style={{ color: region.risk_6h >= 0.8 ? '#EF4444' : '#9CA3AF' }}>{(region.risk_6h * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between gap-4 text-text-secondary">
                      <span>Risk 24h:</span>
                      <span className="font-bold font-mono text-sm" style={{ 
                        color: 
                          region.risk_24h >= 0.8 ? '#EF4444' : 
                          region.risk_24h >= 0.6 ? '#F97316' : 
                          region.risk_24h >= 0.35 ? '#EAB308' : '#22C55E' 
                      }}>{(region.risk_24h * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Polygon>
          );
        })}

        {/* Draw Incidents (if in incidents view or default) */}
        {mapViewMode === 'incidents' && incidents.map((incident) => {
          if (!incident.location) return null;
          const isSelected = incident.id === selectedIncidentId;
          const isDuplicate = incident.duplicate_of !== null;
          
          return (
            <Marker
              key={incident.id}
              position={[incident.location.lat, incident.location.lng]}
              icon={getMarkerIcon(incident.priority_score, isDuplicate, isSelected)}
              eventHandlers={{
                click: () => {
                  onSelectIncident(incident.id);
                },
              }}
            >
              <Popup>
                <div className="p-1 font-sans text-xs">
                  <div className="flex justify-between items-center gap-2 mb-1.5 pb-1 border-b border-border">
                    <span className="font-mono text-text-muted font-bold">ID: {incident.id.substring(0,6)}</span>
                    <span 
                      className="font-bold font-mono px-1.5 py-0.5 rounded text-[10px]"
                      style={{
                        backgroundColor: 
                          incident.priority_score >= 80 ? 'rgba(239, 68, 68, 0.15)' : 
                          incident.priority_score >= 60 ? 'rgba(249, 115, 22, 0.15)' : 
                          incident.priority_score >= 35 ? 'rgba(234, 179, 8, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                        color: 
                          incident.priority_score >= 80 ? '#EF4444' : 
                          incident.priority_score >= 60 ? '#F97316' : 
                          incident.priority_score >= 35 ? '#EAB308' : '#22C55E'
                      }}
                    >
                      PRIORITY {incident.priority_score}
                    </span>
                  </div>
                  
                  <div className="font-semibold text-text-primary text-sm mb-1 capitalize flex items-center gap-1.5">
                    <span>{incident.disaster_type === 'flood' ? '🌊' : incident.disaster_type === 'fire' ? '🔥' : '⚠️'}</span>
                    <span>{incident.disaster_type} Incident</span>
                  </div>
                  
                  <p className="text-text-secondary line-clamp-2 mb-2 italic">"{incident.raw_description}"</p>
                  
                  <div className="space-y-1 text-text-secondary text-[11px] pt-1.5 border-t border-border/50">
                    {incident.citizen_name && (
                      <div className="flex items-center gap-1.5">
                        <Shield size={12} className="text-text-muted" />
                        <span>{incident.citizen_name}</span>
                      </div>
                    )}
                    {incident.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone size={12} className="text-text-muted" />
                        <span>{incident.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Users size={12} className="text-text-muted" />
                      <span>{incident.num_people} people stuck</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectIncident(incident.id);
                    }}
                    className="w-full bg-primary hover:bg-primary-hover text-white text-center font-semibold py-1 rounded-btn mt-2 transition-colors block text-[10px] uppercase tracking-wider"
                  >
                    Open Ops Details
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Draw Active Rescue Teams */}
        {mapViewMode === 'incidents' && teams.map((team) => {
          if (!team.current_location) return null;
          return (
            <Marker
              key={team.id}
              position={[team.current_location.lat, team.current_location.lng]}
              icon={getTeamIcon(team.type, team.status)}
            >
              <Popup>
                <div className="p-1 font-sans text-xs">
                  <h4 className="font-bold text-text-primary text-sm mb-1">{team.name}</h4>
                  <div className="flex gap-2 items-center mb-1">
                    <span className="text-[10px] bg-blue-500/10 text-primary border border-blue-500/25 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-semibold">{team.type}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                      team.status === 'available' ? 'bg-status-low/10 text-status-low border border-status-low/25' : 'bg-status-high/10 text-status-high border border-status-high/25'
                    }`}>{team.status}</span>
                  </div>
                  <span className="text-text-muted font-mono block text-[10px]">Location: {team.current_location.lat.toFixed(4)}, {team.current_location.lng.toFixed(4)}</span>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 right-4 bg-surface border border-border px-3 py-2.5 rounded-card z-[1000] text-xs font-mono flex flex-col gap-1.5 shadow-2xl backdrop-blur-md bg-opacity-95">
        <span className="text-[10px] text-text-muted uppercase tracking-wider border-b border-border pb-1 font-bold">Priority Legend</span>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-status-critical"></div>
          <span>Critical (80-100)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-status-high"></div>
          <span>High (60-79)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-status-moderate"></div>
          <span>Moderate (35-59)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-status-low"></div>
          <span>Low (0-34)</span>
        </div>
        <div className="flex items-center gap-2 border-t border-border pt-1.5 mt-0.5">
          <div className="h-3 w-3 rounded-full bg-primary"></div>
          <span className="text-[10px] uppercase font-bold text-primary">Rescue Team</span>
        </div>
      </div>
    </div>
  );
}
