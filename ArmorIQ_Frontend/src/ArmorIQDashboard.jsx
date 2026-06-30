import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle, AlertTriangle, Fingerprint, Lock, Shield } from 'lucide-react';
import './ArmorIQDashboard.css';

export default function ArmorIQDashboard() {
  const [logs, setLogs] = useState([]);
  const [verifying, setVerifying] = useState({});
  const [verified, setVerified] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      if (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1);
      
      const response = await fetch(`${apiUrl}/api/security/audit-logs`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.reverse()); // Show newest first
      }
    } catch (err) {
      console.error('Error fetching ArmorIQ logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // Refresh logs periodically to catch new actions
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleVerify = async (logId, leaf, root, proof) => {
    setVerifying(prev => ({ ...prev, [logId]: true }));
    try {
      let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      if (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1);

      const response = await fetch(`${apiUrl}/api/security/verify-proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaf, root, proof })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.isValid) {
          setVerified(prev => ({ ...prev, [logId]: true }));
        }
      }
    } catch (err) {
      console.error('Error verifying Merkle proof', err);
    } finally {
      setVerifying(prev => ({ ...prev, [logId]: false }));
    }
  };

  const getStatusIcon = (status) => {
    switch(status?.toUpperCase()) {
      case 'ALLOWED': return <CheckCircle size={16} />;
      case 'BLOCKED': return <ShieldAlert size={16} />;
      case 'HOLD': return <AlertTriangle size={16} />;
      default: return <Shield size={16} />;
    }
  };

  const formatDate = (isoString) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString();
    } catch (e) {
      return isoString;
    }
  };

  const allowedCount = logs.filter(l => l.status === 'ALLOWED').length;
  const blockedCount = logs.filter(l => l.status === 'BLOCKED').length;
  const holdCount = logs.filter(l => l.status === 'HOLD').length;

  return (
    <div className="armoriq-container">
      <div className="armoriq-header">
        <h2 className="armoriq-title">
          <Fingerprint size={28} color="var(--accent-teal)" />
          ArmorIQ Security Audit Ledger
        </h2>
        <p className="armoriq-subtitle">
          Cryptographic log of all agent tool calls, plan captures, and zero-trust verification decisions.
        </p>
      </div>

      <div className="armoriq-stats-row">
        <div className="armoriq-stat-card">
          <div className="stat-icon total"><ShieldCheck size={24} /></div>
          <div className="stat-info">
            <h4>Total Events Inspected</h4>
            <p>{logs.length}</p>
          </div>
        </div>
        <div className="armoriq-stat-card">
          <div className="stat-icon allowed"><CheckCircle size={24} /></div>
          <div className="stat-info">
            <h4>Actions Allowed</h4>
            <p>{allowedCount}</p>
          </div>
        </div>
        <div className="armoriq-stat-card">
          <div className="stat-icon blocked"><ShieldAlert size={24} /></div>
          <div className="stat-info">
            <h4>Actions Blocked</h4>
            <p>{blockedCount}</p>
          </div>
        </div>
        <div className="armoriq-stat-card">
          <div className="stat-icon held"><AlertTriangle size={24} /></div>
          <div className="stat-info">
            <h4>Actions on Hold</h4>
            <p>{holdCount}</p>
          </div>
        </div>
      </div>

      <div className="armoriq-table-wrapper">
        <table className="armoriq-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Agent & Action</th>
              <th>Status & Reason</th>
              <th>Cryptographic Verification</th>
            </tr>
          </thead>
          <tbody>
            {loading && logs.length === 0 ? (
              <tr>
                <td colSpan="4" className="empty-state">Loading ledger...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="4" className="empty-state">
                  <ShieldCheck size={48} />
                  <p>No agent actions recorded yet.</p>
                </td>
              </tr>
            ) : (
              logs.map(log => {
                const leafData = `${log.agent_id}-${log.action}-${log.iap_id || 'unknown'}-${log.status?.toLowerCase()}`;
                
                return (
                  <tr key={log.log_id}>
                    <td>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        {formatDate(log.timestamp)}
                      </div>
                    </td>
                    <td>
                      <div className="agent-name">{log.agent_id}</div>
                      <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                        <code>{log.action}</code>
                      </div>
                    </td>
                    <td>
                      <div>
                        <span className={`status-badge ${log.status?.toLowerCase()}`}>
                          <span style={{ marginRight: '6px', display: 'flex' }}>
                            {getStatusIcon(log.status)}
                          </span>
                          {log.status}
                        </span>
                      </div>
                      <div className="log-reason">{log.reason}</div>
                    </td>
                    <td>
                      <div style={{ marginBottom: '8px' }}>
                        <span className="merkle-hash" title={log.merkle_root}>
                          Root: {log.merkle_root?.substring(0, 16)}...
                        </span>
                      </div>
                      <button 
                        className={`verify-btn ${verifying[log.log_id] ? 'verifying' : ''} ${verified[log.log_id] ? 'verified' : ''}`}
                        onClick={() => handleVerify(log.log_id, leafData, log.merkle_root, log.merkle_proof)}
                        disabled={verifying[log.log_id] || verified[log.log_id]}
                      >
                        {verifying[log.log_id] ? (
                          <>Verifying Hash...</>
                        ) : verified[log.log_id] ? (
                          <><CheckCircle size={14} /> Cryptographically Verified</>
                        ) : (
                          <><Lock size={14} /> Verify Proof</>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
