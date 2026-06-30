import { MapPin, Clock, ShieldCheck, ExternalLink, Activity, Globe } from 'lucide-react'
import { StaggerContainer, StaggerItem } from './Animations'
import './Branches.css'

const branches = [
    {
        name: 'City General Clinic Network',
        city: 'Downtown Hub (Active)',
        address: '500 Medical Center Plaza, Suite 10, Metro City',
        rooms: 'Active Rooms: Reception Room, Clinical Consult Room',
        status: 'Telemetry Status: OPERATIONAL',
    },
    {
        name: 'Metropolitan Medical Center',
        city: 'Metropolis Hub (Active)',
        address: '88 Healthcare Blvd, Tower B, West End',
        rooms: 'Active Rooms: Reception, Consult, Pharmacy, Audit Rooms',
        status: 'Telemetry Status: OPERATIONAL',
    },
]

const comingSoonBranches = [
    { name: 'Valley Children\'s Hospital', city: 'California Hub' },
    { name: 'St. Jude Specialist Clinic', city: 'London Hub' },
    { name: 'Apex General Medical', city: 'Singapore Hub' },
    { name: 'Al-Jalila Pediatrics', city: 'Dubai Hub' },
]

export default function Branches() {
    return (
        <section className="branches section" id="branches">
            <div className="container">
                <StaggerContainer className="branches-header">
                    <StaggerItem>
                        <p className="section-label">Deployments</p>
                    </StaggerItem>
                    <StaggerItem>
                        <h2 className="branches-heading">Clinic Networks</h2>
                    </StaggerItem>
                    <StaggerItem>
                        <p className="branches-sub">M.A.S.H orchestrators deployed and running in production clinic networks</p>
                    </StaggerItem>
                </StaggerContainer>

                <StaggerContainer className="branches-grid">
                    {branches.map((branch) => (
                        <div key={branch.name} className="branch-card-wrapper">
                            <div className="branch-card">
                                <div className="branch-card-body">
                                    <div className="branch-name">{branch.name}</div>
                                    <div className="branch-city">{branch.city}</div>

                                    <div className="branch-detail">
                                        <MapPin size={16} className="branch-detail-icon" />
                                        <span>{branch.address}</span>
                                    </div>
                                    <div className="branch-detail">
                                        <Clock size={16} className="branch-detail-icon" />
                                        <span>{branch.rooms}</span>
                                    </div>
                                    <div className="branch-detail">
                                        <ShieldCheck size={16} className="branch-detail-icon" style={{ color: '#22C55E' }} />
                                        <span style={{ color: '#22C55E' }}>{branch.status}</span>
                                    </div>

                                    <div className="branch-actions">
                                        <a href="#contact" className="branch-link" onClick={(e) => { e.preventDefault(); document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' }) }}>
                                            <ExternalLink size={14} />
                                            Request Integration
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Coming Soon Branches */}
                    {comingSoonBranches.map((branch) => (
                        <div key={branch.name} className="branch-card-wrapper">
                            <div className="branch-card branch-card-coming-soon">
                                <div className="branch-card-body" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ marginBottom: '24px' }}>
                                        <div className="coming-soon-badge">
                                            <span className="coming-soon-pulse" />
                                            Integration Pending
                                        </div>
                                    </div>
                                    <div className="branch-name">{branch.name}</div>
                                    <div className="branch-city">{branch.city}</div>

                                    <div className="branch-detail">
                                        <Globe size={16} className="branch-detail-icon" />
                                        <span>Configuration validation stage</span>
                                    </div>
                                    <div className="branch-detail">
                                        <Activity size={16} className="branch-detail-icon" />
                                        <span>Scheduled: Q4 2026</span>
                                    </div>

                                    <div className="coming-soon-text">
                                        Currently validating security sandbox models and patient records mapping schemas for local deployment.
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </StaggerContainer>
            </div>
        </section>
    )
}
