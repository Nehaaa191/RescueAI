import { Link } from 'react-router-dom';
import { Shield, LayoutDashboard, BarChart3, CloudRain, ExternalLink } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export default function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Operations Map', icon: LayoutDashboard },
    { id: 'analytics', label: 'Analytics Board', icon: BarChart3 },
    { id: 'forecast', label: 'Risk Forecast', icon: CloudRain },
  ];

  return (
    <aside className="w-64 bg-surface border-r border-border flex flex-col justify-between h-screen shrink-0 select-none">
      {/* Brand Logo */}
      <div className="p-6 border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <Shield className="text-primary h-6 w-6" />
          <span className="font-mono text-lg font-bold tracking-wider">RESCUE<span className="text-primary">AI</span></span>
        </Link>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 py-6 px-4 space-y-1.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-btn text-sm font-semibold transition-all ${
                active 
                  ? 'bg-primary text-white shadow-lg shadow-primary/10' 
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
              }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-border space-y-2">
        <Link
          to="/report"
          target="_blank"
          className="w-full flex items-center justify-between px-4 py-3 rounded-btn text-xs font-bold text-text-secondary hover:text-text-primary border border-border bg-background hover:bg-surface-elevated transition-colors"
        >
          <span>Citizen Intake Portal</span>
          <ExternalLink size={12} />
        </Link>
        <div className="text-[10px] text-text-muted text-center pt-2 font-mono">
          OPERATOR SECURITY BLOCK
        </div>
      </div>
    </aside>
  );
}
