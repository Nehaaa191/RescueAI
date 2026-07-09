import React, { useState, useEffect } from 'react';
import { Shield, MapPin, Loader2, CheckCircle, Upload, X, Users, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const DISASTER_TYPES = [
  { value: 'flood', label: 'Flood / Water Log', icon: '🌊' },
  { value: 'fire', label: 'Fire / Short Circuit', icon: '🔥' },
  { value: 'earthquake', label: 'Earthquake', icon: '🫨' },
  { value: 'landslide', label: 'Landslide', icon: '⛰️' },
  { value: 'cyclone', label: 'Cyclone / Storm', icon: '🌀' },
  { value: 'other', label: 'Other Hazard', icon: '⚠️' }
];

const SPECIAL_NEEDS = [
  { value: 'children', label: 'Children' },
  { value: 'elderly', label: 'Elderly' },
  { value: 'pregnant', label: 'Pregnant Individual' },
  { value: 'disabled', label: 'Disabled / Special Needs' },
  { value: 'medical', label: 'Medical Attention Required' }
];

const HELPER_PHRASES = [
  "Chest-deep water rising in the living room.",
  "Electrical transformer sparks started fire in building.",
  "Elderly grandparents stuck on first floor, cannot escape.",
  "Landslide blocked main colony exit, roads submerged.",
  "Injured person requires immediate ambulance transport."
];

export default function CitizenPortal() {
  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [disasterType, setDisasterType] = useState('other');
  const [description, setDescription] = useState('');
  const [numPeople, setNumPeople] = useState(1);
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string }>({
    lat: 26.9124,
    lng: 75.7873,
    address: 'Jaipur, Rajasthan, India'
  });
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  // Page states
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<any>(null);
  const [error, setError] = useState('');

  // Clean previews on unmount
  useEffect(() => {
    return () => {
      previews.forEach(p => URL.revokeObjectURL(p));
    };
  }, [previews]);

  const handleLocationCapture = () => {
    setCapturingLocation(true);
    setError('');
    
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setLocation({
        lat: 26.9124 + (Math.random() - 0.5) * 0.05,
        lng: 75.7873 + (Math.random() - 0.5) * 0.05,
        address: 'Jaipur Central (Captured via Simulation)'
      });
      setCapturingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        // Mock reverse geocode for hackathon simplicity
        setLocation({
          lat: latitude,
          lng: longitude,
          address: `GPS Coordinates: ${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E`
        });
        setCapturingLocation(false);
      },
      (err) => {
        console.warn('Geolocation capture failed, using simulated Jaipur coordinate.', err);
        setLocation({
          lat: 26.9124 + (Math.random() - 0.5) * 0.02,
          lng: 75.7873 + (Math.random() - 0.5) * 0.02,
          address: 'Jaipur Area (Manual capture approximation)'
        });
        setCapturingLocation(false);
      },
      { timeout: 8000 }
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files).slice(0, 3 - files.length);
    
    const newFiles = [...files, ...selectedFiles];
    setFiles(newFiles);

    const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
    setPreviews([...previews, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    
    URL.revokeObjectURL(previews[index]);
    const updatedPreviews = previews.filter((_, i) => i !== index);
    setPreviews(updatedPreviews);
  };

  const toggleNeed = (need: string) => {
    if (selectedNeeds.includes(need)) {
      setSelectedNeeds(selectedNeeds.filter(n => n !== need));
    } else {
      setSelectedNeeds([...selectedNeeds, need]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please provide a description of the emergency.');
      return;
    }
    
    setSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      if (name) formData.append('citizen_name', name);
      if (phone) formData.append('phone', phone);
      formData.append('disaster_type', disasterType);
      formData.append('raw_description', description);
      formData.append('num_people', numPeople.toString());
      if (selectedNeeds.length > 0) {
        formData.append('special_needs', selectedNeeds.join(','));
      }
      formData.append('lat', location.lat.toString());
      formData.append('lng', location.lng.toString());
      formData.append('address', location.address);

      files.forEach((file) => {
        formData.append('images', file);
      });

      const response = await fetch(`${API_URL}/api/reports`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData?.detail || 'Submission failed');
      }

      const report = await response.json();
      setSubmittedReport(report);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to submit report. Please check server status.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedReport) {
    const isDuplicate = submittedReport.duplicate_of !== null;
    return (
      <div className="min-h-screen bg-background text-text-primary flex flex-col items-center justify-center p-6 md:p-12">
        <div className="bg-surface border border-border p-8 rounded-card max-w-xl w-full text-center relative overflow-hidden">
          {/* Top colored strip based on priority */}
          <div 
            className="absolute top-0 left-0 right-0 h-2" 
            style={{
              backgroundColor: 
                submittedReport.priority_score >= 80 ? '#EF4444' : 
                submittedReport.priority_score >= 60 ? '#F97316' : 
                submittedReport.priority_score >= 35 ? '#EAB308' : '#22C55E'
            }}
          />

          <CheckCircle className="text-status-low mx-auto h-16 w-16 mb-6" />
          <h1 className="text-3xl font-extrabold mb-2">Report Submitted Successfully</h1>
          
          {isDuplicate ? (
            <div className="bg-surface-elevated border border-border p-4 rounded-btn my-6 text-left">
              <span className="text-status-high text-xs font-mono font-bold block mb-1">🔗 SYSTEM AUTOMATIC CLUSTERING</span>
              <p className="text-text-secondary text-sm">
                Our AI duplicate system identified this as a duplicate report for an ongoing incident in your vicinity. We have grouped your report to prevent communication noise. Rescue teams are already aware!
              </p>
            </div>
          ) : (
            <p className="text-text-secondary mb-6 text-sm">
              Your emergency report has been logged and sent to the dispatch command center.
            </p>
          )}

          <div className="grid grid-cols-2 gap-4 border border-border p-4 rounded-btn bg-background text-left font-mono text-xs mb-6">
            <div>
              <span className="text-text-muted block">REPORT ID</span>
              <span className="font-bold text-text-primary text-sm">{submittedReport.id.substring(0, 8)}...</span>
            </div>
            <div>
              <span className="text-text-muted block">STATUS</span>
              <span className="font-bold text-primary text-sm uppercase">{submittedReport.status}</span>
            </div>
            <div>
              <span className="text-text-muted block">AI PRIORITY SCORE</span>
              <span className="font-bold text-sm" style={{
                color: 
                  submittedReport.priority_score >= 80 ? '#EF4444' : 
                  submittedReport.priority_score >= 60 ? '#F97316' : 
                  submittedReport.priority_score >= 35 ? '#EAB308' : '#22C55E'
              }}>{submittedReport.priority_score}/100</span>
            </div>
            <div>
              <span className="text-text-muted block">DISPATCH RESPONSE</span>
              <span className="font-bold text-text-primary text-sm truncate">
                {submittedReport.recommended_resources.length > 0 
                  ? submittedReport.recommended_resources.map((r: string) => r.toUpperCase()).join(', ') 
                  : 'MONITOR QUEUE'}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button 
              onClick={() => {
                setName('');
                setPhone('');
                setDescription('');
                setNumPeople(1);
                setSelectedNeeds([]);
                setFiles([]);
                setPreviews([]);
                setSubmittedReport(null);
                setError('');
              }}
              className="bg-primary hover:bg-primary-hover text-white py-3 rounded-btn font-semibold transition-colors"
            >
              Submit Another Report
            </button>
            <Link 
              to="/" 
              className="text-text-secondary hover:text-text-primary text-sm underline transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col justify-between py-6 px-4 md:px-12">
      {/* Top Header */}
      <header className="max-w-3xl mx-auto w-full flex justify-between items-center mb-8 border-b border-border/50 pb-4">
        <div className="flex items-center gap-2">
          <Shield className="text-primary h-6 w-6" />
          <span className="font-mono text-lg font-bold">RESCUE<span className="text-primary">AI</span> CITIZEN</span>
        </div>
        <Link to="/" className="text-xs text-text-secondary hover:text-text-primary transition-colors">Cancel</Link>
      </header>

      {/* Main Form */}
      <main className="flex-1 max-w-3xl mx-auto w-full bg-surface border border-border rounded-card p-6 md:p-8">
        <h1 className="text-2xl font-bold mb-2">Emergency Intake Form</h1>
        <p className="text-text-secondary text-sm mb-6">
          Provide accurate details about the disaster situation. AI will verify the report and prioritize resource dispatch.
        </p>

        {error && (
          <div className="bg-status-critical/10 border border-status-critical/30 text-status-critical p-4 rounded-btn text-sm mb-6 flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Row 1: Name and Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-text-muted mb-2 uppercase">Your Name (Optional)</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Amit Sharma" 
                className="w-full bg-background border border-border focus:border-primary px-4 py-3 rounded-btn text-text-primary outline-none text-sm transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-text-muted mb-2 uppercase">Phone Number (Optional)</label>
              <input 
                type="tel" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                placeholder="+91 98765 43210" 
                className="w-full bg-background border border-border focus:border-primary px-4 py-3 rounded-btn text-text-primary outline-none text-sm transition-colors"
              />
            </div>
          </div>

          {/* Row 2: Disaster Type Buttons */}
          <div>
            <label className="block text-xs font-mono text-text-muted mb-2 uppercase">Select Emergency Category</label>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
              {DISASTER_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setDisasterType(type.value)}
                  className={`p-3 rounded-btn border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                    disasterType === type.value 
                      ? 'border-primary bg-primary/10 text-text-primary' 
                      : 'border-border bg-background hover:bg-surface-elevated text-text-secondary'
                  }`}
                >
                  <span className="text-xl">{type.icon}</span>
                  <span className="text-[10px] font-semibold tracking-wide whitespace-nowrap">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Row 3: Description */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-mono text-text-muted uppercase">Description of Situation</label>
              <span className="text-[10px] text-text-muted font-mono">{description.length} chars</span>
            </div>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the situation in detail. Example: Water levels are waist deep inside. There are children trapped on the roof. No medical emergency but elderly grandparents are disabled."
              className="w-full bg-background border border-border focus:border-primary px-4 py-3 rounded-btn text-text-primary outline-none text-sm transition-colors resize-none mb-3"
            />
            
            {/* Helper Quick Phrases */}
            <div className="flex flex-wrap gap-2">
              {HELPER_PHRASES.map((phrase, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setDescription(phrase)}
                  className="text-[10px] border border-border bg-background hover:border-text-muted px-2.5 py-1 rounded-full text-text-secondary transition-colors"
                >
                  + "{phrase.substring(0, 30)}..."
                </button>
              ))}
            </div>
          </div>

          {/* Row 4: People Count and Special Needs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-border/50 pt-6">
            <div>
              <label className="block text-xs font-mono text-text-muted mb-2 uppercase flex items-center gap-1">
                <Users size={14} /> Total People Stuck
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNumPeople(Math.max(1, numPeople - 1))}
                  className="bg-surface-elevated border border-border hover:bg-border w-10 h-10 flex items-center justify-center rounded-btn font-bold text-lg"
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  value={numPeople}
                  onChange={(e) => setNumPeople(Math.max(1, parseInt(e.target.value) || 1))}
                  className="bg-background border border-border text-center w-14 h-10 rounded-btn font-mono text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => setNumPeople(numPeople + 1)}
                  className="bg-surface-elevated border border-border hover:bg-border w-10 h-10 flex items-center justify-center rounded-btn font-bold text-lg"
                >
                  +
                </button>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-mono text-text-muted mb-2 uppercase">Vulnerable Individuals Present</label>
              <div className="flex flex-wrap gap-2">
                {SPECIAL_NEEDS.map((need) => {
                  const active = selectedNeeds.includes(need.value);
                  return (
                    <button
                      key={need.value}
                      type="button"
                      onClick={() => toggleNeed(need.value)}
                      className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                        active 
                          ? 'border-primary bg-primary/10 text-text-primary' 
                          : 'border-border bg-background hover:bg-surface-elevated text-text-secondary'
                      }`}
                    >
                      {need.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Row 5: GPS Location Capture */}
          <div className="border-t border-border/50 pt-6">
            <label className="block text-xs font-mono text-text-muted mb-2 uppercase">Geographic Location</label>
            <div className="flex flex-col md:flex-row gap-3 items-stretch">
              <div className="flex-1 bg-background border border-border px-4 py-3 rounded-btn text-sm flex items-center gap-2">
                <MapPin className="text-primary shrink-0" size={18} />
                <span className="text-text-secondary font-mono truncate">{location.address}</span>
              </div>
              <button
                type="button"
                onClick={handleLocationCapture}
                disabled={capturingLocation}
                className="bg-surface-elevated border border-border hover:bg-border text-text-primary font-semibold px-5 py-3 rounded-btn text-sm transition-colors flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
              >
                {capturingLocation ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Capturing GPS...
                  </>
                ) : (
                  <>
                    <MapPin size={16} />
                    Capture Location
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Row 6: Image Uploads */}
          <div className="border-t border-border/50 pt-6">
            <label className="block text-xs font-mono text-text-muted mb-2 uppercase">Attach Photos (Max 3, optional)</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {previews.map((preview, index) => (
                <div key={index} className="relative aspect-video rounded-btn overflow-hidden border border-border group bg-background">
                  <img src={preview} alt="Upload Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="absolute top-1 right-1 bg-black/60 hover:bg-black/90 p-1 rounded-full text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}

              {files.length < 3 && (
                <label className="border border-dashed border-border hover:border-text-secondary rounded-btn aspect-video flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-background hover:bg-surface-elevated/20 transition-all">
                  <Upload size={20} className="text-text-muted" />
                  <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Upload Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Row 7: Submit Button */}
          <div className="border-t border-border/50 pt-6 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white font-bold py-3.5 px-8 rounded-btn transition-colors w-full md:w-auto flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Analyzing Report with AI...
                </>
              ) : (
                'Submit Emergency Report'
              )}
            </button>
          </div>
        </form>
      </main>

      {/* Footer */}
      <footer className="max-w-3xl mx-auto w-full text-center text-[10px] text-text-muted mt-8">
        By submitting this form, you acknowledge that this is a simulated emergency response system.
      </footer>
    </div>
  );
}
