import { useState } from 'react';
import type { ForecastRegion } from '../../types';
import { CloudRain, Droplets, ArrowUp, RefreshCw, Sparkles, Loader2, Sliders } from 'lucide-react';
import { useIncidentsStore } from '../../store/incidentsStore';

interface ForecastViewProps {
  regions: ForecastRegion[];
  backendUrl: string;
}

export default function ForecastView({ regions, backendUrl }: ForecastViewProps) {
  const fetchRegions = useIncidentsStore((state) => state.fetchRegions);
  const showToast = useIncidentsStore((state) => state.showToast);

  // Track which region is currently being edited/recomputed
  const [editingRegionId, setEditingRegionId] = useState<string | null>(null);
  
  // Track parameters of the region being edited
  const [rainfall, setRainfall] = useState(0);
  const [riverLevel, setRiverLevel] = useState(0);
  const [humidity, setHumidity] = useState(0);
  const [loadingRegionId, setLoadingRegionId] = useState<string | null>(null);

  const startRecompute = (region: ForecastRegion) => {
    setEditingRegionId(region.id);
    setRainfall(region.rainfall_mm);
    setRiverLevel(region.river_level_m);
    setHumidity(region.humidity_pct);
  };

  const cancelRecompute = () => {
    setEditingRegionId(null);
  };

  const handleRecompute = async (regionId: string) => {
    setLoadingRegionId(regionId);
    try {
      const response = await fetch(`${backendUrl}/api/forecast/regions/${regionId}/recompute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rainfall_mm: rainfall,
          river_level_m: riverLevel,
          humidity_pct: humidity
        })
      });

      if (!response.ok) throw new Error('Recompute failed');
      
      // Refresh list
      await fetchRegions(backendUrl);
      
      showToast('Regional forecast recomputed successfully using XGBoost Models.', 'success');
      setEditingRegionId(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to run forecast recomputation', 'error');
    } finally {
      setLoadingRegionId(null);
    }
  };

  const getRiskColor = (prob: number) => {
    if (prob >= 0.8) return 'text-status-critical bg-status-critical/10 border-status-critical/20';
    if (prob >= 0.6) return 'text-status-high bg-status-high/10 border-status-high/20';
    if (prob >= 0.35) return 'text-status-moderate bg-status-moderate/10 border-status-moderate/20';
    return 'text-status-low bg-status-low/10 border-status-low/20';
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-background">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <CloudRain className="text-primary h-6 w-6" />
          <h1 className="text-xl font-bold text-text-primary">Regional Risk Forecasting Deck</h1>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-mono font-semibold">
          <Sparkles size={12} /> XGBoost Predictive Engine
        </div>
      </div>

      <p className="text-text-secondary text-sm max-w-3xl">
        Adjust rainfall models and river gauge levels on the control sliders to recompute real-time flooding criticality risks across Jaipur zones over 1h, 3h, 6h, and 24h horizons.
      </p>

      {/* Regions Cards Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {regions.map((region) => {
          const isEditing = editingRegionId === region.id;
          const isLoading = loadingRegionId === region.id;

          return (
            <div key={region.id} className="bg-surface border border-border p-6 rounded-card space-y-5 flex flex-col justify-between transition-all duration-300">
              
              {/* Region Info */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-border pb-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-[10px] text-text-muted font-bold tracking-wider">ZONE DISTRICT</span>
                    <h3 className="font-bold text-text-primary text-lg">{region.name}</h3>
                  </div>
                  <span className="text-[10px] text-text-muted font-mono uppercase">Elev: {region.elevation_m}m</span>
                </div>

                {isEditing ? (
                  /* Slide deck adjustment dashboard */
                  <div className="bg-background border border-border p-4 rounded-btn space-y-4">
                    <span className="text-[10px] text-primary font-mono font-bold tracking-wider flex items-center gap-1"><Sliders size={12} /> FORECAST MODEL PARAMETERS</span>
                    
                    {/* Rainfall Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-mono text-text-secondary">
                        <span>Expected Rainfall:</span>
                        <span className="font-bold text-text-primary">{rainfall.toFixed(1)} mm</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="350" 
                        step="5"
                        value={rainfall} 
                        onChange={(e) => setRainfall(parseFloat(e.target.value))}
                        className="w-full accent-primary h-1.5 bg-border rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* River level Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-mono text-text-secondary">
                        <span>River Water Level:</span>
                        <span className="font-bold text-text-primary">{riverLevel.toFixed(2)} m</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.5" 
                        max="12.0" 
                        step="0.1"
                        value={riverLevel} 
                        onChange={(e) => setRiverLevel(parseFloat(e.target.value))}
                        className="w-full accent-primary h-1.5 bg-border rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* Humidity Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-mono text-text-secondary">
                        <span>Rel. Humidity:</span>
                        <span className="font-bold text-text-primary">{humidity.toFixed(0)} %</span>
                      </div>
                      <input 
                        type="range" 
                        min="30" 
                        max="100" 
                        value={humidity} 
                        onChange={(e) => setHumidity(parseInt(e.target.value))}
                        className="w-full accent-primary h-1.5 bg-border rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                ) : (
                  /* Standard Parameters Display */
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-background border border-border p-3 rounded-btn text-center">
                      <span className="text-[9px] font-mono text-text-muted block uppercase mb-1">RAIN TODAY</span>
                      <span className="font-mono font-bold text-sm text-text-primary flex items-center justify-center gap-1">
                        <CloudRain size={14} className="text-primary" /> {region.rainfall_mm}mm
                      </span>
                    </div>
                    <div className="bg-background border border-border p-3 rounded-btn text-center">
                      <span className="text-[9px] font-mono text-text-muted block uppercase mb-1">RIVER GAUGE</span>
                      <span className="font-mono font-bold text-sm text-text-primary flex items-center justify-center gap-1">
                        <ArrowUp size={14} className="text-status-high" /> {region.river_level_m}m
                      </span>
                    </div>
                    <div className="bg-background border border-border p-3 rounded-btn text-center">
                      <span className="text-[9px] font-mono text-text-muted block uppercase mb-1">HUMIDITY</span>
                      <span className="font-mono font-bold text-sm text-text-primary flex items-center justify-center gap-1">
                        <Droplets size={14} className="text-status-low" /> {region.humidity_pct}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Predict horizons timeline grid */}
                <div className="space-y-2">
                  <span className="text-[10px] text-text-muted font-mono uppercase tracking-wider block">CRITICALITY RISK TIMELINE</span>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: '1 Hour', value: region.risk_1h },
                      { label: '3 Hours', value: region.risk_3h },
                      { label: '6 Hours', value: region.risk_6h },
                      { label: '24 Hours', value: region.risk_24h }
                    ].map((horizon, i) => (
                      <div 
                        key={i} 
                        className={`border rounded-btn p-2 text-center flex flex-col items-center justify-center ${getRiskColor(horizon.value)}`}
                      >
                        <span className="text-[8px] font-mono font-bold uppercase tracking-wider block opacity-75 mb-0.5">{horizon.label}</span>
                        <span className="font-mono text-sm font-extrabold">{(horizon.value * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="border-t border-border/50 pt-4 flex gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={cancelRecompute}
                      disabled={isLoading}
                      className="flex-1 bg-surface-elevated border border-border hover:bg-border text-text-primary font-semibold py-2.5 rounded-btn text-xs transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleRecompute(region.id)}
                      disabled={isLoading}
                      className="flex-1 bg-primary hover:bg-primary-hover text-white font-bold py-2.5 rounded-btn text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Recomputing...
                        </>
                      ) : (
                        <>
                          <RefreshCw size={14} />
                          Run Risk Forecast
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => startRecompute(region)}
                    className="w-full bg-surface-elevated border border-border hover:border-text-secondary text-text-primary font-semibold py-2.5 rounded-btn text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <Sliders size={14} className="text-primary" />
                    Configure Risk Parameters
                  </button>
                )}
              </div>

            </div>
          );
        })}
      </div>
      
      {/* Risk classification notification */}
      <div className="bg-surface border border-border p-5 rounded-card text-xs text-text-secondary">
        <span className="font-mono text-[10px] text-text-muted font-bold block mb-1 uppercase tracking-wider">Note on predictive algorithms</span>
        This simulation implements 4 separate trained XGBoost classifiers trained on synthetic regional time-series-ish metrics (rainfall vs river gauge height vs elevation). Predict probability indices are computed dynamically on the server.
      </div>
    </div>
  );
}
