import { type View, Router } from '../router';
import { getIcon } from '../assets/icons';

interface TelemetryEvent {
  id: string;
  type: 'AGENT_JOINED' | 'STATE_UPDATED' | 'HUMAN_INTERVENTION_REQUESTED' | 'RESOLVED' | 'SECURITY_ALLOWED' | 'SECURITY_BLOCKED';
  timestamp: string;
  details: string;
  agent?: string;
  room?: string;
  merkle_root?: string;
  merkle_proof?: string[];
}

interface TelemetryRoom {
  id: string;
  name: string;
  agents: { id: string; name: string; role: string; status: 'active' | 'idle' }[];
  events: TelemetryEvent[];
}

// Global exposure for the Merkle proof button action
(window as any).verifyMerkleProof = async (eventId: string, details: string, root: string, proofJson: string) => {
  const proof = JSON.parse(proofJson);
  const row = document.getElementById(`event-row-${eventId}`);
  if (row) {
    const detailsDiv = row.querySelector('.telemetry-details');
    if (detailsDiv) {
      // Prevent double triggers
      if (detailsDiv.querySelector(`.verifying-indicator`)) return;
      
      const anim = document.createElement('div');
      anim.className = 'verifying-indicator';
      anim.style.color = '#3b82f6';
      anim.style.marginTop = '6px';
      anim.style.fontSize = '12px';
      anim.style.fontFamily = 'monospace';
      anim.innerHTML = '🔄 Requesting verification from Express server...';
      detailsDiv.appendChild(anim);
      
      try {
        const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
          ? 'http://localhost:3000'
          : '';
          
        const res = await fetch(`${baseUrl}/api/security/verify-proof`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leaf: details, proof, root })
        });
        
        if (res.ok) {
          const result = await res.json();
          setTimeout(() => {
            anim.innerHTML = `✅ <strong>Proof Verified!</strong> Merkle path resolved to expected root: <span style="color:#e2e8f0; font-size:11px;">${result.computedRoot.substring(0, 16)}...</span>`;
            anim.style.color = '#10b981';
            // Slow fade out
            setTimeout(() => anim.remove(), 6000);
          }, 1200);
        } else {
          anim.innerHTML = '❌ Merkle path mismatch!';
          anim.style.color = '#ef4444';
          setTimeout(() => anim.remove(), 4000);
        }
      } catch (e: any) {
        anim.innerHTML = `❌ Error connecting to audit API: ${e.message}`;
        anim.style.color = '#ef4444';
        setTimeout(() => anim.remove(), 4000);
      }
    }
  }
};

export class TelemetryView implements View {
  private rooms: TelemetryRoom[] = [];
  private ws: WebSocket | null = null;
  private eventCounter = 0;

  async render(_params?: any): Promise<string> {
    return `
      <div class="page-header" style="padding: 32px 40px 16px 40px;">
        <div class="header-title-block">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(16, 185, 129, 0.1); color: #10b981; display: flex; align-items: center; justify-content: center;">
              ${getIcon('activity')}
            </div>
            <h1 class="page-title">Live Telemetry</h1>
          </div>
          <p class="page-subtitle">Real-time audit log of multi-agent activities and state changes</p>
        </div>
      </div>

      <div id="telemetry-dashboard-container" class="telemetry-dashboard" style="padding: 0 40px 40px 40px; display: flex; flex-direction: column; gap: 32px;">
        <div style="text-align: center; color: #94a3b8; padding: 40px;">
          <div class="pulse-indicator" style="width: 12px; height: 12px; background-color: #3b82f6; border-radius: 50%; display: inline-block; margin-bottom: 16px;"></div>
          <div>Connecting to Band SDK Telemetry Stream...</div>
        </div>
      </div>
      
      <style>
        .telemetry-event-row {
          padding: 16px 24px;
          border-bottom: 1px solid #334155;
          display: flex;
          gap: 16px;
          transition: background-color 0.2s;
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .telemetry-event-row:hover {
          background-color: #0f172a;
        }
        .telemetry-event-row:last-child {
          border-bottom: none;
        }
        .telemetry-time {
          color: #64748b;
          min-width: 140px;
        }
        .telemetry-type {
          font-weight: 600;
          min-width: 180px;
        }
        .type-AGENT_JOINED { color: #3b82f6; }
        .type-STATE_UPDATED { color: #8b5cf6; }
        .type-HUMAN_INTERVENTION_REQUESTED { color: #f59e0b; }
        .type-RESOLVED { color: #10b981; }
        .type-SECURITY_ALLOWED { color: #10b981; font-weight: 600; }
        .type-SECURITY_BLOCKED { color: #f87171; font-weight: 800; border-left: 2px solid #ef4444; padding-left: 8px; }
        .telemetry-details {
          color: #cbd5e1;
          flex-grow: 1;
        }
        @media (max-width: 1024px) {
          .room-layout {
            flex-direction: column !important;
          }
          .room-agents-panel {
            border-right: none !important;
            border-bottom: 1px solid #334155;
          }
        }
      </style>
    `;
  }

  private renderRoom(room: TelemetryRoom): string {
    return `
      <div id="room-${room.id}" class="card" style="background: #1e293b; color: #f8fafc; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
        <div class="card-header" style="border-bottom: 1px solid #334155; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; background: #0f172a;">
          <h3 style="font-size: 18px; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 8px;">
            <span class="pulse-indicator" style="width: 8px; height: 8px; background-color: #10b981; border-radius: 50%; display: inline-block;"></span>
            ${room.name}
          </h3>
          <span style="font-size: 12px; color: #94a3b8; font-family: monospace;">ROOM ID: ${room.id.toUpperCase()}</span>
        </div>
        
        <div class="room-layout" style="display: flex; flex-direction: row;">
          <div class="room-agents-panel" style="flex: 1; min-width: 320px; padding: 24px; border-right: 1px solid #334155; background: #1e293b;">
            <h4 style="font-size: 13px; font-weight: 700; color: #94a3b8; margin-top: 0; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.05em;">Active Agents in Room</h4>
            <div id="agents-list-${room.id}" style="display: flex; flex-direction: column; gap: 12px;">
              ${room.agents.map(agent => this.renderAgent(agent)).join('')}
              ${room.agents.length === 0 ? '<div style="color: #64748b; font-size: 13px; font-style: italic;">No agents currently active in this room.</div>' : ''}
            </div>
          </div>
          
          <div style="flex: 2.5; padding: 0;">
            <div class="card-body" id="scroll-${room.id}" style="padding: 0; max-height: 400px; overflow-y: auto; background: #1e293b; display: flex; flex-direction: column-reverse;">
              <ul id="events-list-${room.id}" style="list-style: none; padding: 0; margin: 0; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 13px;">
                ${room.events.map(event => this.renderEvent(event)).join('')}
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderAgent(agent: any): string {
    return `
      <div id="agent-row-${agent.name}" style="background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 14px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-weight: 600; font-size: 14px; color: #f1f5f9;">${agent.name}</div>
          <div style="font-size: 12px; color: #94a3b8; font-family: monospace; margin-top: 6px;">ID: ${agent.id}</div>
          <div style="font-size: 12px; color: #cbd5e1; margin-top: 2px;">Role: ${agent.role}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 6px; padding-left: 12px;">
          <span style="width: 6px; height: 6px; border-radius: 50%; background-color: ${agent.status === 'active' ? '#10b981' : '#f59e0b'};"></span>
          <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: ${agent.status === 'active' ? '#10b981' : '#f59e0b'};">${agent.status}</span>
        </div>
      </div>
    `;
  }

  private renderEvent(event: TelemetryEvent): string {
    const time = new Date(event.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const date = new Date(event.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
    
    let proofHtml = '';
    if ((event.type === 'SECURITY_ALLOWED' || event.type === 'SECURITY_BLOCKED') && event.merkle_root) {
      const shield = event.type === 'SECURITY_BLOCKED' ? '🛑' : '🛡️';
      const proofStr = JSON.stringify(event.merkle_proof || []);
      proofHtml = `
        <div style="margin-top: 8px; padding: 8px 12px; border-radius: 6px; background: rgba(15, 23, 42, 0.6); font-family: monospace; font-size: 11px; display: flex; align-items: center; justify-content: space-between; border: 1px solid rgba(255,255,255,0.05);">
          <span style="color: #94a3b8;">${shield} Merkle Root: <strong style="color: #cbd5e1; word-break: break-all;">${event.merkle_root.substring(0, 16)}...</strong></span>
          <button onclick="verifyMerkleProof('${event.id}', '${event.details.replace(/'/g, "\\'")}', '${event.merkle_root}', '${proofStr.replace(/"/g, '&quot;')}')" 
                  style="background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); cursor: pointer; font-weight: 600; padding: 4px 8px; border-radius: 4px; transition: all 0.2s; font-family: sans-serif;"
                  onmouseover="this.style.background='rgba(16,185,129,0.2)'"
                  onmouseout="this.style.background='rgba(16, 185, 129, 0.1)'">
            Verify Proof
          </button>
        </div>
      `;
    }
    
    return `
      <li class="telemetry-event-row" id="event-row-${event.id}">
        <div class="telemetry-time">[${date} ${time}]</div>
        <div class="telemetry-type type-${event.type}">[${event.type.replace('_', ' ')}]</div>
        <div class="telemetry-details">
          <div>${event.details}</div>
          ${proofHtml}
        </div>
      </li>
    `;
  }

  private async fetchInitialState() {
    try {
      const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:8000'
        : 'https://m-a-s-h-backend.onrender.com';
        
      const res = await fetch(`${baseUrl}/api/telemetry/state`);
      if (res.ok) {
        this.rooms = await res.json();
        this.updateDashboardUI();
      }
    } catch (e) {
      console.error("Failed to fetch telemetry state:", e);
      const dashboard = document.getElementById('telemetry-dashboard-container');
      if (dashboard) {
        dashboard.innerHTML = '<div style="color: #ef4444; padding: 40px; text-align: center;">Failed to connect to Telemetry API. Make sure the backend server is running.</div>';
      }
    }
  }

  private updateDashboardUI() {
    const dashboard = document.getElementById('telemetry-dashboard-container');
    if (dashboard && this.rooms) {
      dashboard.innerHTML = this.rooms.map(room => this.renderRoom(room)).join('');
    }
  }

  private connectWebSocket() {
    const wsBaseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'ws://localhost:8000'
      : 'wss://m-a-s-h-backend.onrender.com';

    this.ws = new WebSocket(`${wsBaseUrl}/api/telemetry-stream`);
    
    this.ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        this.handleStreamEvent(data);
      } catch (e) {
        console.error("Failed to parse telemetry event", e);
      }
    };

    this.ws.onerror = (e) => {
      console.error("Telemetry WebSocket error", e);
    };
    
    this.ws.onclose = () => {
      console.log("Telemetry WebSocket closed");
    }
  }

  private handleStreamEvent(data: any) {
    this.eventCounter++;
    const payload = data.payload || {};
    let roomName = payload.room || 'Telemetry-Audit-Room';
    
    // Some events might only be broadcasted to the Audit Room without a room tag, 
    // but in BandSDK we added room name to AGENT_JOINED and STATE_UPDATED.
    // If it's HUMAN_INTERVENTION or RESOLVED, we'll map it to Pharmacy-Inventory-Room by default for demo 
    // unless the payload specifies otherwise.
    if (data.type === 'HUMAN_INTERVENTION_REQUESTED' || data.type === 'RESOLVED') {
      if (!payload.room) {
        // Find which room this agent is in
        const agentName = payload.agent;
        for (const r of this.rooms) {
          if (r.agents.some(a => a.name === agentName)) {
            roomName = r.name;
            break;
          }
        }
      }
    }

    const room = this.rooms.find(r => r.name === roomName);
    if (!room) return; // Ignore events for unknown rooms

    let details = '';
    if (data.type === 'AGENT_JOINED') {
      details = `Agent '${payload.agent}' joined room '${roomName}'`;
      // Check if agent is already in the list to avoid duplicates
      if (!room.agents.some(a => a.name === payload.agent)) {
        room.agents.push({
          id: `agent-${payload.agent}-${this.eventCounter}`,
          name: payload.agent,
          role: 'Agent',
          status: 'active'
        });
        
        // Update agents UI
        const agentsList = document.getElementById(`agents-list-${room.id}`);
        if (agentsList) {
          // Remove "No agents" placeholder if it exists
          if (agentsList.innerHTML.includes('No agents currently active')) {
            agentsList.innerHTML = '';
          }
          const agentHtml = this.renderAgent(room.agents[room.agents.length - 1]);
          agentsList.insertAdjacentHTML('beforeend', agentHtml);
        }
      }
    } else if (data.type === 'STATE_UPDATED') {
      const valStr = typeof payload.value === 'object' ? JSON.stringify(payload.value) : payload.value;
      details = `key '${payload.key}' updated to '${valStr}'`;
    } else if (data.type === 'HUMAN_INTERVENTION_REQUESTED') {
      details = payload.reason || "Human intervention required.";
    } else if (data.type === 'RESOLVED') {
      const res = payload.resolution || {};
      details = `${res.status || 'resolved'} - Comments: ${res.comments || ''}`;
    } else if (data.type === 'SECURITY_ALLOWED') {
      details = payload.details || "Security validation allowed.";
    } else if (data.type === 'SECURITY_BLOCKED') {
      details = payload.details || "Security policy violation blocked.";
    }

    const newEvent: TelemetryEvent = {
      id: `live-${this.eventCounter}`,
      type: data.type,
      timestamp: data.timestamp,
      details: details,
      agent: payload.agent,
      merkle_root: payload.merkle_root,
      merkle_proof: payload.merkle_proof
    };

    // Prepend event to UI
    const eventsList = document.getElementById(`events-list-${room.id}`);
    if (eventsList) {
      eventsList.insertAdjacentHTML('beforeend', this.renderEvent(newEvent));
      // Auto-scroll
      const scrollContainer = document.getElementById(`scroll-${room.id}`);
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }

  onMount(_container: HTMLElement, _router: Router): void {
    
    // Add pulsing animation styles dynamically
    if (!document.getElementById('pulse-style')) {
      const style = document.createElement('style');
      style.id = 'pulse-style';
      style.innerHTML = `
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .pulse-indicator {
          animation: pulse 2s infinite;
        }
      `;
      document.head.appendChild(style);
    }

    // Fetch initial state and connect WS
    this.fetchInitialState().then(() => {
      this.connectWebSocket();
    });
  }

  // Cleanup when view is destroyed
  onUnmount(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
