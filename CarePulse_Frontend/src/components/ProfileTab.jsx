import React, { useState, useEffect } from 'react';
import { Mail, Phone, Activity, LogOut, Edit2, Save, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

const ProfileTab = ({ userProfile, onLogout }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demographicsRecordId, setDemographicsRecordId] = useState(null);
  
  const [formData, setFormData] = useState({
    email: userProfile?.email || 'patient@carepulse.com',
    phone: userProfile?.contact_number || '',
    bloodType: 'O+'
  });

  useEffect(() => {
    const fetchDemographics = async () => {
      if (!userProfile?.id) return;
      const { data, error } = await supabase
        .from('medical_records')
        .select('*')
        .eq('patient_id', userProfile.id)
        .eq('record_type', 'demographics')
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (data && data.length > 0) {
        setDemographicsRecordId(data[0].id);
        try {
          const parsed = JSON.parse(data[0].description);
          setFormData(prev => ({
            ...prev,
            email: parsed.email || prev.email,
            bloodType: parsed.bloodType || prev.bloodType
          }));
        } catch (e) {
          console.error("Failed to parse demographics", e);
        }
      }
    };
    
    fetchDemographics();
  }, [userProfile?.id]);

  const handleSave = async () => {
    setLoading(true);
    try {
      // 1. Update contact_number in profiles
      await supabase
        .from('profiles')
        .update({ contact_number: formData.phone })
        .eq('id', userProfile.id);
        
      // 2. Update or insert demographics in medical_records
      const demoData = {
        bloodType: formData.bloodType,
        email: formData.email
      };
      
      if (demographicsRecordId) {
        await supabase
          .from('medical_records')
          .update({ description: JSON.stringify(demoData), updated_at: new Date().toISOString() })
          .eq('id', demographicsRecordId);
      } else {
        const { data } = await supabase
          .from('medical_records')
          .insert({
            patient_id: userProfile.id,
            record_type: 'demographics',
            description: JSON.stringify(demoData)
          })
          .select();
        if (data && data.length > 0) {
          setDemographicsRecordId(data[0].id);
        }
      }
      
      // Update local userProfile object for display
      if (userProfile) {
        userProfile.contact_number = formData.phone;
        userProfile.email = formData.email;
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-tab-container animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="navigation-title">My Profile</h2>
          <p className="navigation-subtitle">Manage your account information and preferences.</p>
        </div>
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 16px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <Edit2 size={16} /> Edit
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setIsEditing(false)} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 16px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <X size={16} /> Cancel
            </button>
            <button onClick={handleSave} disabled={loading} style={{ background: 'var(--accent-teal)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              <Save size={16} /> {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>
      
      <div className="profile-card" style={{ marginTop: '20px' }}>
        <div className="profile-avatar-large">
          {userProfile?.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'GP'}
        </div>
        <h3 className="profile-name">{userProfile?.full_name || 'Guest Patient'}</h3>
        <span className="profile-role-badge">{userProfile?.role || 'patient'}</span>
        
        <div className="profile-details-list">
          <div className="profile-detail-item">
            <Mail size={16} color="var(--accent-teal)" />
            <div className="detail-info">
              <span className="detail-label">Email Address</span>
              {isEditing ? (
                <input 
                  type="email" 
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', padding: '6px 12px', borderRadius: '8px', marginTop: '4px', width: '100%' }}
                />
              ) : (
                <span className="detail-val">{formData.email}</span>
              )}
            </div>
          </div>
          
          <div className="profile-detail-item">
            <Phone size={16} color="var(--accent-teal)" />
            <div className="detail-info">
              <span className="detail-label">Phone Number</span>
              {isEditing ? (
                <input 
                  type="tel" 
                  value={formData.phone} 
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', padding: '6px 12px', borderRadius: '8px', marginTop: '4px', width: '100%' }}
                />
              ) : (
                <span className="detail-val">{formData.phone || 'Not provided'}</span>
              )}
            </div>
          </div>

          <div className="profile-detail-item">
            <Activity size={16} color="var(--accent-teal)" />
            <div className="detail-info">
              <span className="detail-label">Blood Type</span>
              {isEditing ? (
                <select 
                  value={formData.bloodType} 
                  onChange={(e) => setFormData({...formData, bloodType: e.target.value})}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', padding: '6px 12px', borderRadius: '8px', marginTop: '4px', width: '100%' }}
                >
                  <option value="A+" style={{color: '#000'}}>A+</option>
                  <option value="A-" style={{color: '#000'}}>A-</option>
                  <option value="B+" style={{color: '#000'}}>B+</option>
                  <option value="B-" style={{color: '#000'}}>B-</option>
                  <option value="AB+" style={{color: '#000'}}>AB+</option>
                  <option value="AB-" style={{color: '#000'}}>AB-</option>
                  <option value="O+" style={{color: '#000'}}>O+</option>
                  <option value="O-" style={{color: '#000'}}>O-</option>
                  <option value="Unknown" style={{color: '#000'}}>Unknown</option>
                </select>
              ) : (
                <span className="detail-val">{formData.bloodType}</span>
              )}
            </div>
          </div>
        </div>
        
        {!isEditing && (
          <button className="logout-btn" onClick={onLogout} style={{ marginTop: '30px' }}>
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ProfileTab;
