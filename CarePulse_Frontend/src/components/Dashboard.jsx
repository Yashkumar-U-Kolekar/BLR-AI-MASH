import React, { useState, useRef, useEffect } from 'react';
import { Bell, MessageSquare, Compass, Search, User as UserIcon, LogOut, Phone, Mail, Calendar, Activity, Info, ShieldCheck } from 'lucide-react';
import Navigation from './Navigation';
import Explore from './Explore';
import ProfileTab from './ProfileTab';

const TypewriterText = ({ text }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    setDisplayedText('');
    let i = 0;
    const timer = setInterval(() => {
      setDisplayedText(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(timer);
    }, 22);
    return () => clearInterval(timer);
  }, [text]);

  return <span>{displayedText}</span>;
};

const ThinkingDots = () => (
  <div className="thinking-dots">
    <span /><span /><span />
  </div>
);

const Dashboard = ({ userProfile, onLogout }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [currentDirections, setCurrentDirections] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakDirections = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleToggleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      if (currentDirections) {
        speakDirections(currentDirections);
      }
    }
  };

  const sendDirectMessage = async (textToSubmit) => {
    setMessages(prev => [...prev, { role: 'user', text: textToSubmit }]);
    setIsLoading(true);

    try {
      const history = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        text: msg.text
      }));

      let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      if (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1);
      const endpoint = apiUrl.endsWith('/api') ? '/patient-chat' : '/api/patient-chat';

      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: textToSubmit, 
          history,
          patientId: userProfile?.id,
          patientName: userProfile?.full_name
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, { role: 'assistant', text: data.reply }]);
        
        // Handle navigation action returned by the agent
        if (data.action && data.action.type === 'navigate' && data.action.route === 'navigation') {
          setActiveTab('navigation');
          const targetDest = data.action.target || data.action.doctorId;
          if (targetDest) {
            setSelectedDestination(targetDest);
            if (data.action.directions) {
              speakDirections(data.action.directions);
            }
          }
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: "Sorry, I couldn't process your request right now." }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', text: "Sorry, I couldn't reach the server." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderAssistantContent = (text) => {
    const match = text.match(/\[(SLOTS|DATES):\s*(.*?)\s*\]/);
    if (!match) return <TypewriterText text={text} />;

    const cleanText = text.replace(/\[(SLOTS|DATES):\s*(.*?)\s*\]/, '');
    const items = match[2].split(',').map(s => s.trim());

    return (
      <>
        <div><TypewriterText text={cleanText} /></div>
        <div className="slot-chips">
          {items.map(item => (
            <button
              key={item}
              className="slot-chip"
              onClick={() => sendDirectMessage(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </>
    );
  };

  const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');

  const handleNavigateHome = (text) => {
    setActiveTab('home');
    sendDirectMessage(text);
  };

  const navItems = [
    { id: 'home', icon: <MessageSquare size={20} />, label: 'Home' },
    { id: 'explore', icon: <Search size={20} />, label: 'Explore' },
    { id: 'navigation', icon: <Compass size={20} />, label: 'Navigation' },
    { id: 'profile', icon: <UserIcon size={20} />, label: 'Profile' }
  ];

  return (
    <div className="dashboard-layout">
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="avatar-container">
            <div className="avatar-placeholder">
              <UserIcon size={24} color="var(--accent-teal)" />
            </div>
          </div>
          <span className="brand-name">CarePulse</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Header */}
        <header className="header">
          <div className="header-left mobile-only">
            <div className="avatar-container">
              <div className="avatar-placeholder">
                <UserIcon size={20} color="var(--accent-teal)" />
              </div>
            </div>
            <span className="brand-name">CarePulse</span>
          </div>
          <div className="desktop-spacer" />
          <button className="notification-btn">
            <Bell size={20} />
          </button>
        </header>

        {activeTab === 'explore' ? (
          <Explore onNavigateHome={handleNavigateHome} />
        ) : activeTab === 'navigation' ? (
          <Navigation
            selectedDestination={selectedDestination}
            setSelectedDestination={setSelectedDestination}
            isSpeaking={isSpeaking}
            onToggleSpeak={handleToggleSpeak}
            onDirectionsUpdate={setCurrentDirections}
          />
        ) : activeTab === 'profile' ? (
          <ProfileTab userProfile={userProfile} onLogout={onLogout} />
        ) : messages.length === 0 ? (
          /* ── IDLE: Greeting + Centre Orb ── */
          <div className="idle-view">
            <section className="greeting-section">
              <h1 className="greeting-title">Hi, how can I help you<br />today?</h1>
              <p className="greeting-subtitle">
                Your personal health assistant is ready to help with appointments or directions.
              </p>
            </section>
 
            <div className="orb-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%', maxWidth: '600px', margin: '0 auto' }}>
              <div style={{ display: 'flex', width: '100%', gap: '10px', marginTop: '1rem' }}>
                <input 
                  type="text" 
                  placeholder="Type your message here..." 
                  style={{ flex: 1, padding: '12px 16px', borderRadius: '24px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      sendDirectMessage(e.target.value);
                      e.target.value = '';
                    }
                  }}
                />
              </div>
            </div>
 
            <div className="actions-section">
              <button className="action-btn" onClick={() => sendDirectMessage("I'd like to book an appointment")}>Book Appointment</button>
              <button className="action-btn" onClick={() => sendDirectMessage("Where is Dr. Smith's room?")}>Navigate to Dr. Smith</button>
            </div>
          </div>
        ) : (
          /* ── ACTIVE: Response above, Orb at bottom ── */
          <div className="active-view" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1rem' }}>
            <div className="response-area" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1, paddingBottom: '2rem' }}>
              {messages.map((msg, i) => (
                <div key={i} style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  backgroundColor: msg.role === 'user' ? 'var(--accent-teal)' : 'var(--bg-card)',
                  color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                  padding: '16px 20px',
                  borderRadius: '16px',
                  borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
                  borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '16px',
                  maxWidth: '80%',
                  fontSize: '1.1rem',
                  lineHeight: '1.5'
                }}>
                  {msg.role === 'user' ? msg.text : renderAssistantContent(msg.text)}
                </div>
              ))}
              {isLoading && (
                <div style={{ alignSelf: 'flex-start', padding: '16px 20px' }}>
                  <ThinkingDots />
                </div>
              )}
            </div>
 
            <div className="active-orb-wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%', maxWidth: '600px', margin: '0 auto' }}>
              <div style={{ display: 'flex', width: '100%', gap: '10px', marginTop: '1rem' }}>
                <input 
                  type="text" 
                  placeholder="Type your message here..." 
                  style={{ flex: 1, padding: '12px 16px', borderRadius: '24px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      sendDirectMessage(e.target.value);
                      e.target.value = '';
                    }
                  }}
                />
                <button 
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling;
                    if (input.value.trim()) {
                      sendDirectMessage(input.value);
                      input.value = '';
                    }
                  }}
                  style={{ padding: '10px 20px', borderRadius: '24px', backgroundColor: 'var(--accent-teal)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
 
      {/* Mobile Bottom Nav */}
      <nav className="bottom-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};
 
export default Dashboard;
