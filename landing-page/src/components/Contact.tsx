import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, Send, Building2, Layers, ShieldCheck } from 'lucide-react'
import { StaggerItem } from './Animations'
import './Contact.css'

export default function Contact() {
    const formRef = useRef<HTMLFormElement>(null)
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formRef.current) return

        setSending(true)
        // Simulate local form submission
        setTimeout(() => {
            setSent(true)
            setSending(false)
        }, 1200)
    }

    return (
        <section className="contact section" id="contact">
            <div className="container">
                <StaggerItem className="contact-split">
                    {/* Form Side */}
                    <div className="contact-form-side">
                        {sent ? (
                            <motion.div
                                className="contact-success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5 }}
                            >
                                <CheckCircle size={48} className="contact-success-icon" style={{ color: 'var(--accent)' }} />
                                <h3>Integration Request Received!</h3>
                                <p>Our onboarding team will contact you to configure your BandSDK secure rooms event bus.</p>
                            </motion.div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                                    <h2 className="contact-heading" style={{ margin: 0 }}>Request Integration</h2>
                                </div>
                                <p className="contact-sub">
                                    Ready to deploy M.A.S.H in your clinic? Fill out the onboarding request form below and our integration team will set up your secure rooms sandbox.
                                </p>

                                <form ref={formRef} className="contact-form" onSubmit={handleSubmit}>
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="contact-name">Hospital / Clinic Name</label>
                                        <input
                                            id="contact-name"
                                            name="clinic_name"
                                            type="text"
                                            className="form-input"
                                            placeholder="City General Clinic"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label" htmlFor="contact-email">Contact Email</label>
                                        <input
                                            id="contact-email"
                                            name="user_email"
                                            type="email"
                                            className="form-input"
                                            placeholder="admin@citygeneral.org"
                                            required
                                        />
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label" htmlFor="contact-type">
                                                <Building2 size={14} style={{ marginRight: 6, display: 'inline', verticalAlign: 'middle' }} />
                                                Clinic Type
                                            </label>
                                            <select
                                                id="contact-type"
                                                name="clinic_type"
                                                className="form-select"
                                                defaultValue=""
                                                required
                                            >
                                                <option value="" disabled>Select Clinic Type</option>
                                                <option value="primary">Primary Care Clinic</option>
                                                <option value="specialist">Specialist Hospital</option>
                                                <option value="pharmacy">Pharmacy Network</option>
                                                <option value="other">Other Healthcare Facility</option>
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label" htmlFor="contact-deployment">
                                                <Layers size={14} style={{ marginRight: 6, display: 'inline', verticalAlign: 'middle' }} />
                                                Deployment Model
                                            </label>
                                            <select
                                                id="contact-deployment"
                                                name="deployment_model"
                                                className="form-select"
                                                defaultValue="cloud"
                                                required
                                            >
                                                <option value="cloud">M.A.S.H Cloud (Hosted)</option>
                                                <option value="onpremise">On-Premises Sandbox</option>
                                                <option value="hybrid">Hybrid Event Bus</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">
                                            <ShieldCheck size={14} style={{ marginRight: 6, display: 'inline', verticalAlign: 'middle' }} />
                                            Requested Virtual Rooms
                                        </label>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                                <input type="checkbox" defaultChecked /> Reception &amp; Navigation
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                                <input type="checkbox" defaultChecked /> Clinical Consult
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                                <input type="checkbox" /> Pharmacy &amp; Stock
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                                <input type="checkbox" /> Telemetry &amp; Compliance
                                            </label>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label" htmlFor="contact-note">
                                            Special Onboarding Requirements
                                        </label>
                                        <textarea
                                            id="contact-note"
                                            name="note"
                                            className="form-textarea"
                                            placeholder="Integrations with existing EMR/EHR system, custom prompt instructions, etc..."
                                            rows={3}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="contact-submit"
                                        disabled={sending}
                                    >
                                        {sending ? 'Sending...' : (
                                            <>
                                                Request Integration
                                                <Send size={16} style={{ marginLeft: 8, display: 'inline' }} />
                                            </>
                                        )}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </StaggerItem>
            </div>
        </section>
    )
}
