export interface Location {
  lat: float;
  lng: float;
  address: string | null;
}

export type float = number;

export interface NLPBreakdown {
  urgency_keywords: string[];
  people_breakdown: Record<string, number>;
  medical_emergency: boolean;
  resources_required: string[];
  confidence: number;
  water_level_cm?: number;
  road_blocked?: boolean;
}

export interface CVBreakdown {
  detections: Array<{ class: string; confidence: number }>;
  people_visible: number;
  severity_estimate: 'low' | 'medium' | 'high';
}

export interface IncidentReport {
  id: string;
  citizen_name: string | null;
  phone: string | null;
  location: Location;
  disaster_type: 'flood' | 'fire' | 'earthquake' | 'landslide' | 'cyclone' | 'other';
  raw_description: string;
  num_people: number;
  special_needs: string[];
  images: string[];
  nlp_extraction: NLPBreakdown | null;
  cv_analysis: CVBreakdown | null;
  priority_score: number;
  priority_reasons: string[];
  recommended_resources: string[];
  duplicate_of: string | null;
  duplicate_cluster_id: string | null;
  status: 'pending' | 'acknowledged' | 'assigned' | 'resolved';
  assigned_team_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RescueTeam {
  id: string;
  name: string;
  type: 'boat' | 'ambulance' | 'medical' | 'search_rescue' | 'fire';
  status: 'available' | 'dispatched' | 'busy';
  current_location: Location;
}

export interface ForecastRegion {
  id: string;
  name: string;
  geojson_boundary: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  rainfall_mm: number;
  river_level_m: number;
  humidity_pct: number;
  elevation_m: number;
  past_flood_events_count: number;
  risk_1h: number;
  risk_3h: number;
  risk_6h: number;
  risk_24h: number;
  updated_at: string;
}

export interface AnalyticsSummary {
  summary: {
    total_reports: number;
    pending_reports: number;
    active_assigned_reports: number;
    resolved_reports: number;
    critical_reports: number;
  };
  disaster_type_distribution: Record<string, number>;
  resource_utilization: {
    total_teams: number;
    active_dispatched_teams: number;
    utilization_pct: number;
  };
}
