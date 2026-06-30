import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StaggerContainer, StaggerItem } from './Animations'
import { Shield, Users, Radio, Terminal, Play } from 'lucide-react'
import './Gallery.css'

interface RoomDetails {
    id: string
    name: string
    status: 'ACTIVE' | 'ARCHIVED' | 'MONITORED'
    description: string
    agents: string[]
    events: string[]
    logs: string[]
}

const initialRooms: RoomDetails[] = [
    {
        id: 'management',
        name: 'Reception-Navigation-Room',
        status: 'ACTIVE',
        description: 'Handles patient check-in, initial symptom parsing, and clinic wayfinding guidance.',
        agents: ['PatientManagementAgent', 'RegistrationAgent', 'PatientNavigationAgent'],
        events: ['QUERY_DOCTORS', 'BOOKING_REQUESTED', 'RESCHEDULE_REQUESTED', 'DOCTOR_ASSIGNED', 'NAVIGATION_DIRECTIONS'],
        logs: [
            'PatientManagementAgent: Initiated symptom conversation with Patient #1024',
            'PatientManagementAgent: Extracted symptoms: "persistent dry cough, mild fever for 2 days"',
            'RegistrationAgent: Assigned Doctor: Dr. Elizabeth Vance (Specialty: Pulmonology)',
            'PatientNavigationAgent: Guided Patient #1024 to Clinical Room 3A'
        ]
    },
    {
        id: 'consult',
        name: 'Clinical-Consult-Room',
        status: 'ACTIVE',
        description: 'Secure consultation space where patient summaries are delivered to doctors and clinical notes transcribed.',
        agents: ['SummaryAgent', 'DoctorAssistantAgent'],
        events: ['GENERATE_SUMMARY', 'SUMMARY_AVAILABLE', 'PATIENT_HISTORY_COMPILED', 'PRESCRIPTION_SAFETY_PASSED'],
        logs: [
            'SummaryAgent: Synthesized pre-triage summary for Dr. Vance',
            'DoctorAssistantAgent: Active transcription stream started in consultation room 3A',
            'DoctorAssistantAgent: Transcribed diagnosis: "Mild Bronchitis"',
            'DoctorAssistantAgent: Recommended ICD-10 Code: J40 (Bronchitis)'
        ]
    },
    {
        id: 'pharmacy',
        name: 'Pharmacy-Inventory-Room',
        status: 'ACTIVE',
        description: 'Audits patient prescriptions, verifies stock levels, and flags potential contraindications.',
        agents: ['MedicineManagementAgent', 'StockManagementAgent', 'PharmacistAgent'],
        events: ['CHECK_MEDICINE_AVAILABILITY', 'MEDICINE_AVAILABILITY_STATUS', 'ROUTE_TO_PHARMACY', 'TRIGGER_REORDER'],
        logs: [
            'MedicineManagementAgent: Received prescription request for J40: "Albuterol 90mcg inhaler"',
            'MedicineManagementAgent: Contraindication Check: PASSED (No patient allergy matches)',
            'StockManagementAgent: Deducted 1 inhaler from Stock Category B. Remaining count: 14',
            'StockManagementAgent: Suggesting warning: "Albuterol demand has risen by 25% this week. Restocking recommended."'
        ]
    },
    {
        id: 'audit',
        name: 'Telemetry-Audit-Room',
        status: 'MONITORED',
        description: 'Decentralized compliance hub recording all cryptographic state changes to a secure ledger.',
        agents: ['TelemetryAgent'],
        events: ['AGENT_JOINED', 'STATE_UPDATED', 'HUMAN_INTERVENTION_REQUESTED', 'RESOLVED'],
        logs: [
            'TelemetryAgent: Signed state checkpoint [TX_09384] for Patient #1024 check-in',
            'TelemetryAgent: Verified end-to-end HIPAA isolation for Room 3A session',
            'TelemetryAgent: Logged signed diagnosis transaction with SHA-256 fingerprint',
            'TelemetryAgent: Completed room archive for Patient #1024 consultation event'
        ]
    }
]

const extraLogs: Record<string, string[]> = {
    management: [
        'RegistrationAgent: Reallocated queue due to high priority case',
        'PatientManagementAgent: Initiated translation stream to Spanish for Patient #1025',
        'PatientNavigationAgent: Detected patient detour; updated navigation coordinates'
    ],
    consult: [
        'SummaryAgent: Loaded history profile for Patient #1025',
        'DoctorAssistantAgent: Diagnostic code suggested: J01 (Acute sinusitis)',
        'DoctorAssistantAgent: Uploaded consultation voice transcript hash'
    ],
    pharmacy: [
        'MedicineManagementAgent: Flagged potential allergy conflict: Penicillin',
        'StockManagementAgent: Reordered 50 packs of Amoxicillin due to pediatric demand alerts',
        'StockManagementAgent: Inventory balance check: OK'
    ],
    audit: [
        'TelemetryAgent: Cryptographic audit check passed: 100% telemetry verified',
        'TelemetryAgent: SOC2 event trace backup synchronized to AWS region east-1',
        'TelemetryAgent: Purged transient memory frames for completed session #1024'
    ]
}

export default function Gallery() {
    const [rooms, setRooms] = useState<RoomDetails[]>(initialRooms)
    const [activeRoomId, setActiveRoomId] = useState<string>('management')
    const [simulationIndex, setSimulationIndex] = useState<Record<string, number>>({
        management: 0,
        consult: 0,
        pharmacy: 0,
        audit: 0
    })

    const activeRoom = rooms.find(r => r.id === activeRoomId) || rooms[0]

    const simulateEvent = () => {
        const pool = extraLogs[activeRoomId]
        const index = simulationIndex[activeRoomId]
        if (!pool || index >= pool.length) return

        const newEventText = pool[index]
        
        // Add log
        setRooms(prevRooms => prevRooms.map(r => {
            if (r.id === activeRoomId) {
                return {
                    ...r,
                    logs: [...r.logs, newEventText]
                }
            }
            return r;
        }))

        // Increment index
        setSimulationIndex(prev => ({
            ...prev,
            [activeRoomId]: prev[activeRoomId] + 1
        }))
    }

    return (
        <section className="gallery section" id="gallery" style={{ background: 'var(--bg-primary)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
            <div className="container">
                <StaggerContainer className="gallery-header">
                    <StaggerItem>
                        <p className="section-label">Live Operation Rooms</p>
                    </StaggerItem>
                    <StaggerItem>
                        <h2 className="gallery-heading">Virtual Rooms Dashboard</h2>
                    </StaggerItem>
                    <StaggerItem>
                        <p className="gallery-sub">
                            Observe state logs, telemetry audits, and real-time events triggered across partitioned room environments.
                        </p>
                    </StaggerItem>
                </StaggerContainer>

                {/* Rooms Selection Tabs */}
                <div className="services-tabs" style={{ marginBottom: 40, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
                    {rooms.map(room => (
                        <button 
                            key={room.id}
                            className={`services-tab ${activeRoomId === room.id ? 'active' : ''}`} 
                            onClick={() => setActiveRoomId(room.id)}
                            style={{ position: 'relative' }}
                        >
                            {room.name}
                            <span 
                                className="room-status-dot" 
                                style={{ 
                                    display: 'inline-block',
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    marginLeft: '8px',
                                    backgroundColor: room.status === 'ACTIVE' ? '#22C55E' : '#38BDF8',
                                    boxShadow: room.status === 'ACTIVE' ? '0 0 8px #22C55E' : 'none'
                                }} 
                            />
                        </button>
                    ))}
                </div>

                {/* Dashboard grid panel */}
                <div className="dashboard-panel">
                    {/* Left: Info card */}
                    <div className="dashboard-info-side">
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <Shield size={18} style={{ color: 'var(--accent)' }} />
                                <span style={{ textTransform: 'uppercase', fontSize: 'var(--text-xs)', letterSpacing: '2px', fontWeight: 600, color: 'var(--accent)' }}>
                                    Room Status: {activeRoom.status}
                                </span>
                            </div>
                            <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: '12px', fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
                                {activeRoom.name}
                            </h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-base)', lineHeight: 1.6, marginBottom: '24px' }}>
                                {activeRoom.description}
                            </p>

                            {/* Connected Agents */}
                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: 500, fontSize: 'var(--text-sm)' }}>
                                    <Users size={16} />
                                    <span>Joined AI Agents</span>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {activeRoom.agents.map(agent => (
                                        <span key={agent} style={{
                                            fontSize: 'var(--text-xs)',
                                            background: 'var(--accent-subtle)',
                                            border: '1px solid var(--border)',
                                            padding: '4px 10px',
                                            borderRadius: 'var(--radius-pill)',
                                            color: 'var(--text-primary)'
                                        }}>
                                            {agent}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Supported Events */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: 500, fontSize: 'var(--text-sm)' }}>
                                    <Radio size={16} />
                                    <span>Listened Event Payloads</span>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {activeRoom.events.map(event => (
                                        <span key={event} style={{
                                            fontSize: '11px',
                                            fontFamily: 'monospace',
                                            background: 'rgba(255,255,255,0.04)',
                                            border: '1px solid rgba(255,255,255,0.06)',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            color: 'var(--text-secondary)'
                                        }}>
                                            {event}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Interactive Simulator Button */}
                        <div style={{ marginTop: '24px' }}>
                            <button
                                className="btn btn-primary"
                                onClick={simulateEvent}
                                disabled={simulationIndex[activeRoomId] >= (extraLogs[activeRoomId]?.length || 0)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    opacity: simulationIndex[activeRoomId] >= (extraLogs[activeRoomId]?.length || 0) ? 0.5 : 1,
                                    cursor: simulationIndex[activeRoomId] >= (extraLogs[activeRoomId]?.length || 0) ? 'not-allowed' : 'pointer'
                                }}
                            >
                                <Play size={14} fill="currentColor" />
                                {simulationIndex[activeRoomId] >= (extraLogs[activeRoomId]?.length || 0) 
                                    ? 'All Events Simulated' 
                                    : 'Simulate Room Event'
                                }
                            </button>
                        </div>
                    </div>

                    {/* Right: Terminal Console logs */}
                    <div className="dashboard-console">
                        <div>
                            <div className="console-header">
                                <Terminal size={14} style={{ color: 'var(--accent)' }} />
                                <span className="console-title">Event telemetry Console</span>
                            </div>
                            <div className="console-logs-container">
                                <AnimatePresence initial={false}>
                                    {activeRoom.logs.map((log, idx) => {
                                        const parts = log.split(': ')
                                        const sender = parts[0]
                                        const msg = parts[1] || ''
                                        return (
                                            <motion.div
                                                key={log + idx}
                                                initial={{ opacity: 0, x: -5 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="console-log-line"
                                            >
                                                <span style={{ color: 'var(--text-muted)' }}>[16:30:{20 + idx}] </span>
                                                <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{sender}: </span>
                                                <span style={{ color: '#E2E8F0' }}>{msg}</span>
                                            </motion.div>
                                        )
                                    })}
                                </AnimatePresence>
                            </div>
                        </div>
                        <div className="console-footer">
                            Connection: SECURE Event Bus (P2P)
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
