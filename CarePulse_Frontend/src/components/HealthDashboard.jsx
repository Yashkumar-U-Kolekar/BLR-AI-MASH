import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Activity, Calendar, Pill, History, CheckCircle, Clock } from 'lucide-react';
import './HealthDashboard.css';

const HealthDashboard = ({ userProfile }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    summary: null,
    appointments: [],
    prescriptions: [],
    history: []
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRecordType, setNewRecordType] = useState('condition');
  const [newRecordDesc, setNewRecordDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!userProfile?.id) return;
    fetchHealthData();
  }, [userProfile?.id]);

  const fetchHealthData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Medical Records (History & Summary)
      const { data: records, error: recErr } = await supabase
        .from('medical_records')
        .select('*')
        .eq('patient_id', userProfile.id)
        .order('record_date', { ascending: false });
      
      if (recErr) throw recErr;

      const aiSummaries = records.filter(r => r.record_type === 'ai_summary');
      const latestSummary = aiSummaries.length > 0 ? aiSummaries[0] : null;
      const history = records.filter(r => r.record_type !== 'ai_summary' && r.record_type !== 'demographics');

      // 2. Fetch Appointments
      const { data: appointments, error: apptErr } = await supabase
        .from('appointments')
        .select('*, doctor:profiles!appointments_doctor_id_fkey(full_name)')
        .eq('patient_id', userProfile.id)
        .order('scheduled_time', { ascending: true });
        
      if (apptErr) throw apptErr;

      // 3. Fetch Prescriptions & Items
      const { data: prescriptions, error: prescErr } = await supabase
        .from('prescriptions')
        .select(`
          id, status, notes, date,
          prescription_items (
            medicine_id, dosage, quantity,
            medicine_inventory (medicine_name)
          ),
          doctor:profiles!prescriptions_doctor_id_fkey(full_name)
        `)
        .eq('patient_id', userProfile.id)
        .order('date', { ascending: false });

      if (prescErr) throw prescErr;

      setData({
        summary: latestSummary,
        appointments: appointments || [],
        prescriptions: prescriptions || [],
        history: history || []
      });

    } catch (error) {
      console.error('Error fetching health data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="health-dashboard" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="thinking-dots"><span /><span /><span /></div>
      </div>
    );
  }

  const formatRecordType = (type) => {
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const handleAddRecord = async (e) => {
    e.preventDefault();
    if (!newRecordDesc.trim()) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('medical_records').insert({
        patient_id: userProfile.id,
        record_type: newRecordType,
        description: newRecordDesc,
        record_date: new Date().toISOString()
      });
      if (error) throw error;
      
      setShowAddForm(false);
      setNewRecordDesc('');
      fetchHealthData();
    } catch (err) {
      console.error('Error adding record:', err);
      alert('Failed to add record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="health-dashboard animate-in">
      <header className="health-header">
        <h2 className="health-title">My Health Data</h2>
        <p className="health-subtitle">A secure overview of your medical records and appointments.</p>
      </header>

      {/* AI Clinical Summary */}
      {data.summary && (
        <section className="health-card ai-summary-card">
          <div className="health-card-header">
            <div className="health-card-icon"><Activity size={18} /></div>
            <h3 className="health-card-title">AI Clinical Summary</h3>
            <span className="health-card-badge">M.A.S.H Generated</span>
          </div>
          <p className="ai-summary-text">{data.summary.description}</p>
        </section>
      )}

      <div className="health-grid">
        
        {/* Appointments Column */}
        <section className="health-card appointments-card">
          <div className="health-card-header">
            <div className="health-card-icon"><Calendar size={18} /></div>
            <h3 className="health-card-title">Appointments</h3>
          </div>
          
          {data.appointments.length > 0 ? (
            <div className="health-list">
              {data.appointments.map(appt => (
                <div key={appt.id} className="health-list-item">
                  <div className="item-content">
                    <h4 className="item-title">{appt.doctor?.full_name || 'Doctor Appointment'}</h4>
                    <p className="item-desc">{new Date(appt.scheduled_time).toLocaleString(undefined, { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                  </div>
                  <div className="item-meta">
                    <span className={`item-status status-${appt.status.toLowerCase()}`}>{appt.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="health-empty">No upcoming appointments</div>
          )}
        </section>

        {/* Prescriptions Column */}
        <section className="health-card prescriptions-card">
          <div className="health-card-header">
            <div className="health-card-icon"><Pill size={18} /></div>
            <h3 className="health-card-title">Prescriptions</h3>
          </div>
          
          {data.prescriptions.length > 0 ? (
            <div className="health-list">
              {data.prescriptions.map(presc => (
                <div key={presc.id} className="health-list-item" style={{ flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="item-date">{new Date(presc.date).toLocaleDateString()} by {presc.doctor?.full_name}</span>
                    <span className={`item-status status-${presc.status.toLowerCase()}`}>{presc.status}</span>
                  </div>
                  
                  {presc.prescription_items?.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginTop: '0.25rem' }}>
                      <div className="item-icon" style={{ width: 24, height: 24, borderRadius: 6 }}><Pill size={12} /></div>
                      <div>
                        <h4 className="item-title" style={{ fontSize: '0.9rem' }}>{item.medicine_inventory?.medicine_name || 'Unknown Medication'}</h4>
                        <p className="item-desc" style={{ fontSize: '0.8rem' }}>{item.dosage} (Qty: {item.quantity})</p>
                      </div>
                    </div>
                  ))}
                  
                  {presc.notes && <p className="item-desc" style={{ marginTop: '0.25rem', fontStyle: 'italic' }}>Notes: {presc.notes}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="health-empty">No active prescriptions</div>
          )}
        </section>

      </div>

      {/* History Timeline */}
      <section className="health-card history-card" style={{ marginTop: '1.5rem' }}>
        <div className="health-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="health-card-icon"><History size={18} /></div>
            <h3 className="health-card-title">Medical History</h3>
          </div>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            {showAddForm ? 'Cancel' : '+ Add Record'}
          </button>
        </div>
        
        {showAddForm && (
          <form onSubmit={handleAddRecord} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <select 
                value={newRecordType} 
                onChange={e => setNewRecordType(e.target.value)}
                style={{ padding: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', flex: 1 }}
              >
                <option value="condition" style={{color:'#000'}}>Condition</option>
                <option value="allergy" style={{color:'#000'}}>Allergy</option>
                <option value="surgery" style={{color:'#000'}}>Surgery</option>
                <option value="family_history" style={{color:'#000'}}>Family History</option>
              </select>
            </div>
            <textarea 
              placeholder="Describe the medical condition, allergy, etc..."
              value={newRecordDesc}
              onChange={e => setNewRecordDesc(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', minHeight: '60px' }}
              required
            />
            <button 
              type="submit" 
              disabled={isSubmitting}
              style={{ alignSelf: 'flex-end', padding: '6px 16px', background: '#f43f5e', color: '#fff', border: 'none', borderRadius: '4px', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 600 }}
            >
              {isSubmitting ? 'Saving...' : 'Save Record'}
            </button>
          </form>
        )}
        
        {data.history.length > 0 ? (
          <div className="health-list">
            {data.history.map(record => (
              <div key={record.id} className="health-list-item">
                <div className="item-icon">
                  <CheckCircle size={18} />
                </div>
                <div className="item-content">
                  <h4 className="item-title">{formatRecordType(record.record_type)}</h4>
                  <p className="item-desc">{record.description}</p>
                </div>
                <div className="item-meta">
                  <span className="item-date">{new Date(record.record_date).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="health-empty">No medical history found</div>
        )}
      </section>

    </div>
  );
};

export default HealthDashboard;
