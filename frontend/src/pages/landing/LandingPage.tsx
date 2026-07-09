import { Link } from 'react-router-dom';
import { Shield, AlertTriangle, Activity, Map, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-border py-4 px-6 md:px-12 flex justify-between items-center bg-surface">
        <div className="flex items-center gap-2">
          <Shield className="text-primary h-8 w-8" />
          <span className="font-mono text-xl font-bold tracking-wider">RESCUE<span className="text-primary">AI</span></span>
        </div>
        <Link 
          to="/dashboard" 
          className="text-sm font-semibold text-text-secondary hover:text-text-primary border border-border px-4 py-2 rounded-btn bg-background hover:bg-surface-elevated transition-colors"
        >
          Operator Portal
        </Link>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12 md:py-24 max-w-5xl mx-auto">


        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
          Next-Generation <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">Disaster Intelligence</span>
        </h1>
        
        <p className="text-text-secondary text-lg md:text-xl max-w-3xl mb-12">
          An AI-powered emergency decision support platform. Automates report classification, visual severity verification, duplicate incident clustering, and regional risk forecasting.
        </p>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl mb-16">
          {/* Citizen Reporting Portal */}
          <div className="bg-surface border border-border p-8 rounded-card text-left flex flex-col justify-between hover:border-primary/50 hover:bg-surface-elevated transition-all group duration-300">
            <div>
              <div className="bg-primary/10 text-primary w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                <AlertTriangle size={24} />
              </div>
              <h2 className="text-2xl font-bold mb-3">Citizen Report Portal</h2>
              <p className="text-text-secondary text-sm mb-6">
                Report a flood, fire, or other emergency in under 60 seconds. Auto-capture GPS, upload images, and get instant dispatch status updates.
              </p>
            </div>
            <Link 
              to="/report" 
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-semibold px-5 py-3 rounded-btn transition-colors w-full justify-center group-hover:scale-[1.01]"
            >
              Report Emergency Now <ArrowRight size={18} />
            </Link>
          </div>

          {/* Incident Command Dashboard */}
          <div className="bg-surface border border-border p-8 rounded-card text-left flex flex-col justify-between hover:border-status-high/50 hover:bg-surface-elevated transition-all group duration-300">
            <div>
              <div className="bg-status-high/10 text-status-high w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                <Map size={24} />
              </div>
              <h2 className="text-2xl font-bold mb-3">Incident Command</h2>
              <p className="text-text-secondary text-sm mb-6">
                Access the live operation map, review AI-explainable priority score breakdowns, manage response teams, and monitor time-horizon risk forecasting.
              </p>
            </div>
            <Link 
              to="/dashboard" 
              className="inline-flex items-center gap-2 bg-surface-elevated border border-border hover:border-text-secondary text-text-primary font-semibold px-5 py-3 rounded-btn transition-colors w-full justify-center group-hover:scale-[1.01]"
            >
              Launch Dashboard <Activity size={18} className="text-status-high" />
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full text-left border-t border-border/50 pt-16">
          <div>
            <div className="font-mono text-2xl font-bold text-primary mb-1">01. NLP</div>
            <div className="font-semibold text-sm mb-1">Text Extraction</div>
            <p className="text-text-muted text-xs">Zero-shot classification & keyword-entity parser</p>
          </div>
          <div>
            <div className="font-mono text-2xl font-bold text-status-high mb-1">02. CV</div>
            <div className="font-semibold text-sm mb-1">Image Verification</div>
            <p className="text-text-muted text-xs">YOLOv8 nano detection + pixel color heuristics</p>
          </div>
          <div>
            <div className="font-mono text-2xl font-bold text-status-critical mb-1">03. XGB</div>
            <div className="font-semibold text-sm mb-1">SHAP Priority</div>
            <p className="text-text-muted text-xs">Explainable model-driven incident queues</p>
          </div>
          <div>
            <div className="font-mono text-2xl font-bold text-status-low mb-1">04. DEDUP</div>
            <div className="font-semibold text-sm mb-1">Cluster Detection</div>
            <p className="text-text-muted text-xs">Sentence embedding proximity checks</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-6 text-center text-xs text-text-muted bg-surface">
        <p>© 2026 RescueAI Platform. Codebase is proprietary & sandbox licensed.</p>
      </footer>
    </div>
  );
}
