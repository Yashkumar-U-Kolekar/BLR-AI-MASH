import React, { useState, useEffect } from 'react';
import { Search, MapPin, Star, Clock, ChevronRight, Heart, Stethoscope, Brain, Eye, Bone, Baby, Pill, Activity, Zap } from 'lucide-react';
import './Explore.css';

const SPECIALTIES = [
  { id: 'general', name: 'General', icon: <Stethoscope size={20} />, color: '#4ad2c1' },
  { id: 'cardiology', name: 'Cardiology', icon: <Heart size={20} />, color: '#f43f5e' },
  { id: 'neurology', name: 'Neurology', icon: <Brain size={20} />, color: '#a78bfa' },
  { id: 'ophthalmology', name: 'Eye Care', icon: <Eye size={20} />, color: '#38bdf8' },
  { id: 'orthopedics', name: 'Ortho', icon: <Bone size={20} />, color: '#fb923c' },
  { id: 'pediatrics', name: 'Pediatrics', icon: <Baby size={20} />, color: '#f9a8d4' },
  { id: 'dermatology', name: 'Skin Care', icon: <Pill size={20} />, color: '#fbbf24' },
  { id: 'emergency', name: 'Urgent', icon: <Zap size={20} />, color: '#ef4444' },
];

const FEATURED_DOCTORS = [
  {
    id: 1,
    name: 'Dr. Sarah Chen',
    specialty: 'Cardiologist',
    rating: 4.9,
    reviews: 234,
    nextAvailable: 'Today, 3:00 PM',
    location: 'Heart & Vascular Center',
    avatar: 'SC',
    accentColor: '#f43f5e',
  },
  {
    id: 2,
    name: 'Dr. James Wilson',
    specialty: 'Neurologist',
    rating: 4.8,
    reviews: 189,
    nextAvailable: 'Tomorrow, 10:00 AM',
    location: 'Brain & Spine Institute',
    avatar: 'JW',
    accentColor: '#a78bfa',
  },
  {
    id: 3,
    name: 'Dr. Priya Patel',
    specialty: 'Pediatrician',
    rating: 4.9,
    reviews: 312,
    nextAvailable: 'Today, 5:30 PM',
    location: 'Children\'s Wellness Clinic',
    avatar: 'PP',
    accentColor: '#f9a8d4',
  },
];

const HEALTH_TIPS = [
  {
    id: 1,
    title: 'Stay Hydrated',
    desc: 'Drink at least 8 glasses of water daily for optimal health.',
    icon: <Activity size={18} />,
    gradient: 'linear-gradient(135deg, #0d4040 0%, #0a2e2e 100%)',
  },
  {
    id: 2,
    title: 'Regular Check-ups',
    desc: 'Schedule annual physicals to catch issues early.',
    icon: <Stethoscope size={18} />,
    gradient: 'linear-gradient(135deg, #1a1040 0%, #0e0a2e 100%)',
  },
  {
    id: 3,
    title: 'Mental Wellness',
    desc: 'Practice mindfulness and take breaks when you need them.',
    icon: <Brain size={18} />,
    gradient: 'linear-gradient(135deg, #401a10 0%, #2e0e0a 100%)',
  },
];

const Explore = ({ onNavigateHome }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSpecialty, setActiveSpecialty] = useState(null);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setAnimateIn(true));
  }, []);

  const filteredDoctors = FEATURED_DOCTORS.filter(doc => {
    const matchesSearch = !searchQuery ||
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialty.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpecialty = !activeSpecialty ||
      doc.specialty.toLowerCase().includes(activeSpecialty);
    return matchesSearch && matchesSpecialty;
  });

  return (
    <div className={`explore-page ${animateIn ? 'animate-in' : ''}`}>
      {/* Search Bar */}
      <div className="explore-search-container">
        <div className="explore-search-bar">
          <Search size={18} className="explore-search-icon" />
          <input
            type="text"
            placeholder="Search doctors, specialties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="explore-search-input"
          />
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="explore-scroll-area">

        {/* Specialties Row */}
        <section className="explore-section">
          <h3 className="explore-section-title">Specialties</h3>
          <div className="explore-specialties-scroll">
            {SPECIALTIES.map((spec) => (
              <button
                key={spec.id}
                className={`explore-specialty-chip ${activeSpecialty === spec.id ? 'active' : ''}`}
                onClick={() => setActiveSpecialty(activeSpecialty === spec.id ? null : spec.id)}
                style={{
                  '--chip-accent': spec.color,
                }}
              >
                <span className="explore-specialty-icon">{spec.icon}</span>
                <span className="explore-specialty-name">{spec.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Featured Doctors */}
        <section className="explore-section">
          <div className="explore-section-header">
            <h3 className="explore-section-title">Top Doctors</h3>
            <button className="explore-see-all">See all <ChevronRight size={14} /></button>
          </div>
          <div className="explore-doctors-list">
            {filteredDoctors.length > 0 ? (
              filteredDoctors.map((doc, i) => (
                <div
                  key={doc.id}
                  className="explore-doctor-card"
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <div
                    className="explore-doctor-avatar"
                    style={{ background: doc.accentColor }}
                  >
                    {doc.avatar}
                  </div>
                  <div className="explore-doctor-info">
                    <h4 className="explore-doctor-name">{doc.name}</h4>
                    <p className="explore-doctor-specialty">{doc.specialty}</p>
                    <div className="explore-doctor-meta">
                      <span className="explore-doctor-rating">
                        <Star size={12} fill="#fbbf24" stroke="#fbbf24" />
                        {doc.rating} <span className="explore-review-count">({doc.reviews})</span>
                      </span>
                      <span className="explore-doctor-location">
                        <MapPin size={12} />
                        {doc.location}
                      </span>
                    </div>
                  </div>
                  <div className="explore-doctor-action">
                    <div className="explore-availability">
                      <Clock size={12} />
                      <span>{doc.nextAvailable}</span>
                    </div>
                    <button className="explore-book-btn">Book</button>
                  </div>
                </div>
              ))
            ) : (
              <div className="explore-empty-state">
                <p>No doctors found matching your criteria.</p>
              </div>
            )}
          </div>
        </section>

        {/* Health Tips */}
        <section className="explore-section explore-tips-section">
          <h3 className="explore-section-title">Health Tips</h3>
          <div className="explore-tips-grid">
            {HEALTH_TIPS.map((tip, i) => (
              <div
                key={tip.id}
                className="explore-tip-card"
                style={{ background: tip.gradient, animationDelay: `${i * 0.1}s` }}
              >
                <div className="explore-tip-icon">{tip.icon}</div>
                <h4 className="explore-tip-title">{tip.title}</h4>
                <p className="explore-tip-desc">{tip.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="explore-section explore-quick-actions">
          <h3 className="explore-section-title">Quick Actions</h3>
          <div className="explore-actions-grid">
            <button className="explore-action-card" onClick={() => onNavigateHome?.("I'd like to book an appointment")}>
              <div className="explore-action-icon-wrap" style={{ background: 'rgba(74, 210, 193, 0.15)' }}>
                <Clock size={20} color="#4ad2c1" />
              </div>
              <span>Book Appointment</span>
              <ChevronRight size={16} className="explore-action-arrow" />
            </button>
            <button className="explore-action-card" onClick={() => onNavigateHome?.("Help me find a doctor")}>
              <div className="explore-action-icon-wrap" style={{ background: 'rgba(164, 139, 250, 0.15)' }}>
                <Search size={20} color="#a78bfa" />
              </div>
              <span>Find a Doctor</span>
              <ChevronRight size={16} className="explore-action-arrow" />
            </button>
            <button className="explore-action-card" onClick={() => onNavigateHome?.("I need to refill my prescription")}>
              <div className="explore-action-icon-wrap" style={{ background: 'rgba(251, 191, 36, 0.15)' }}>
                <Pill size={20} color="#fbbf24" />
              </div>
              <span>Refill Prescription</span>
              <ChevronRight size={16} className="explore-action-arrow" />
            </button>
          </div>
        </section>

      </div>
    </div>
  );
};

export default Explore;
