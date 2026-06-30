import React, { useState, useEffect } from 'react';
import { Pill, Bed, Info, ArrowRight, Activity, User, Volume2, VolumeX, MapPin, Sparkles } from 'lucide-react';
import './Navigation.css';

const DEFAULT_DESTINATIONS = {
  'pharmacy': {
    name: 'Pharmacy',
    room: 'Pharmacy Area',
    cells: ['reception', 'pharmacy-bottom'],
    directions: 'The Pharmacy is located immediately to your right as you enter the main clinic lobby.'
  },
  'reception': {
    name: 'Reception & Waiting',
    room: 'Reception Counter',
    cells: ['reception'],
    directions: 'You are currently at the reception and waiting desk.'
  }
};

const mapCells = [
  { id: 'pharmacy-top', label: 'Pharmacy', type: 'pharmacy', gridArea: '1 / 2 / 2 / 3', icon: 'Pills' },
  { id: 'patient-1', label: 'Consultation Wing A', type: 'doctor-room', gridArea: '1 / 3 / 2 / 4', icon: 'Activity' },
  { id: 'patient-2', label: 'Consultation Wing B', type: 'doctor-room', gridArea: '1 / 4 / 2 / 5', icon: 'Activity' },
  { id: 'patient-3', label: 'Consultation Wing C', type: 'doctor-room', gridArea: '1 / 5 / 2 / 6', icon: 'Activity' },
  { id: 'patient-4', label: 'Consultation Wing D', type: 'doctor-room', gridArea: '1 / 6 / 2 / 7', icon: 'Activity' },
  
  { id: 'reception', label: 'Reception & Waiting', type: 'reception', gridArea: '2 / 1 / 4 / 2', icon: 'Info' },
  
  { id: 'corridor', label: 'Corridor', type: 'corridor', gridArea: '2 / 2 / 3 / 7', icon: 'ArrowRight' },
  
  { id: 'pharmacy-bottom', label: 'Pharmacy', type: 'pharmacy', gridArea: '3 / 2 / 4 / 3', icon: 'Pills' },
  { id: 'doc-room-1', label: 'General Medicine', type: 'doctor-room', gridArea: '3 / 3 / 4 / 4', icon: 'Activity' },
  { id: 'doc-room-2', label: 'Specialist Rooms', type: 'doctor-room', gridArea: '3 / 4 / 4 / 5', icon: 'Activity' },
  { id: 'staff-area', label: 'Staff Area', type: 'staff', gridArea: '3 / 5 / 4 / 6', icon: 'User' },
  { id: 'patient-5', label: 'Emergency (ER)', type: 'doctor-room', gridArea: '3 / 6 / 4 / 7', icon: 'Activity' }
];

export default function Navigation({ selectedDestination, setSelectedDestination, isSpeaking, onToggleSpeak, onDirectionsUpdate }) {
  const [destinations, setDestinations] = useState(DEFAULT_DESTINATIONS);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const response = await fetch('https://fgsuxckvntubncqflqiz.supabase.co/rest/v1/profiles?role=eq.doctor&select=id,full_name,doctor_details(room_number,specialty)', {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`
          }
        });
        const data = await response.json();
        
        const newDestinations = { ...DEFAULT_DESTINATIONS };
        if (Array.isArray(data)) {
          data.forEach(profile => {
            if (profile.doctor_details && profile.doctor_details.length > 0) {
              const details = profile.doctor_details[0];
              const room = details.room_number || '';
              const specialty = details.specialty || 'Doctor';
              
              let targetCell = 'patient-1'; // Default
              if (room.includes('401') || room.includes('402')) targetCell = 'patient-1';
              else if (room.includes('403') || room.includes('404')) targetCell = 'patient-2';
              else if (room.includes('405') || room.includes('406')) targetCell = 'patient-3';
              else if (room.includes('407') || room.includes('408')) targetCell = 'patient-4';
              else if (room.includes('ER')) targetCell = 'patient-5';
              else if (room.includes('1')) targetCell = 'doc-room-1';
              else if (room.includes('2')) targetCell = 'doc-room-2';
              
              let directionText = `Exit reception and proceed to ${targetCell.replace('-', ' ')}.`;
              
              newDestinations[profile.id] = {
                name: `${profile.full_name} (${specialty})`,
                room: `Room ${room.replace('Room ', '')}`,
                cells: ['reception', 'corridor', targetCell],
                directions: directionText
              };
            }
          });
        }
        setDestinations(newDestinations);
      } catch (err) {
        console.error('Error fetching doctors for navigation', err);
      }
    };
    fetchDoctors();
  }, []);

  const activePath = destinations[selectedDestination]?.cells || [];
  const directionsText = destinations[selectedDestination]?.directions || 'Select a destination to display directions.';
  const roomName = destinations[selectedDestination]?.room || '';

  const getIcon = (name) => {
    switch (name) {
      case 'Pills': return <Pill size={18} />;
      case 'Bed': return <Bed size={18} />;
      case 'Info': return <Info size={18} />;
      case 'ArrowRight': return <ArrowRight size={18} />;
      case 'Activity': return <Activity size={18} />;
      case 'User': return <User size={18} />;
      default: return <Info size={18} />;
    }
  };

  const isCellInPath = (cellId) => {
    if (selectedDestination === 'pharmacy') {
      if (cellId === 'pharmacy-bottom') return true;
    }
    return activePath.includes(cellId);
  };

  const isCellDestination = (cellId) => {
    if (!selectedDestination) return false;
    const dest = destinations[selectedDestination];
    if (!dest) return false;
    
    if (selectedDestination === 'reception' && cellId === 'reception') return true;
    if (selectedDestination === 'pharmacy' && (cellId === 'pharmacy-bottom' || cellId === 'pharmacy-top')) return true;
    
    const cells = dest.cells || [];
    return cells.length > 0 && cells[cells.length - 1] === cellId;
  };

  return (
    <div className="navigation-container">
      <div className="navigation-header">
        <h2 className="navigation-title">Hospital Navigation Map</h2>
        <p className="navigation-subtitle">
          Find consultation offices, pharmacy counters, and general patient rooms.
        </p>
      </div>

      <div className="navigation-selector-panel">
        <label htmlFor="destination-select" className="selector-label">
          <Sparkles size={16} color="var(--accent-teal)" style={{ marginRight: '8px' }} />
          Choose Destination
        </label>
        <select
          id="destination-select"
          className="destination-select"
          value={selectedDestination || 'placeholder'}
          onChange={(e) => setSelectedDestination(e.target.value)}
        >
          <option value="placeholder" disabled>-- Select Doctor or Room --</option>
          {Object.entries(destinations).map(([id, dest]) => (
            <option key={id} value={id}>{dest.name} ({dest.room})</option>
          ))}
        </select>
      </div>

      <div className="map-view-wrapper">
        <div className="map-grid">
          {mapCells.map((cell) => {
            const inPath = isCellInPath(cell.id);
            const isDest = isCellDestination(cell.id);
            const isStart = cell.id === 'reception';

            return (
              <div
                key={cell.id}
                className={`map-cell cell-type-${cell.type} ${inPath ? 'active-path' : ''} ${isDest ? 'destination-cell' : ''}`}
                style={{ gridArea: cell.gridArea }}
              >
                <div className="cell-content">
                  <span className="cell-icon">{getIcon(cell.icon)}</span>
                  <span className="cell-label">{cell.label}</span>
                </div>
                {isStart && !isDest && (
                  <div className="you-are-here-indicator">
                    <span className="pulsing-dot" />
                    <span className="indicator-text">You are here</span>
                  </div>
                )}
                {isDest && (
                  <div className="destination-marker">
                    <MapPin size={16} color="#ef4444" fill="#ef4444" className="bounce-marker" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="directions-panel">
        <div className="directions-card-header">
          <h4 className="directions-card-title">
            {selectedDestination && destinations[selectedDestination] ? destinations[selectedDestination].name : 'Directions'}
          </h4>
          {selectedDestination && (
            <button
              className={`audio-btn ${isSpeaking ? 'speaking' : ''}`}
              onClick={onToggleSpeak}
              title={isSpeaking ? 'Mute Directions' : 'Read Directions Aloud'}
            >
              {isSpeaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
              <span>{isSpeaking ? 'Mute' : 'Play Audio'}</span>
            </button>
          )}
        </div>
        <p className="directions-text">{directionsText}</p>
        {roomName && (
          <div className="room-badge">
            <span className="badge-dot" />
            Target: <strong>{roomName}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
