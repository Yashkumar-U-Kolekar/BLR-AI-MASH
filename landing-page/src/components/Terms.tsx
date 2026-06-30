import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTheme } from '../hooks/useTheme'
import Navbar from './Navbar'
import Footer from './Footer'

export default function Terms() {
    const { theme, toggleTheme } = useTheme()

    useEffect(() => {
        window.scrollTo(0, 0)
    }, [])

    return (
        <>
            <Navbar theme={theme} toggleTheme={toggleTheme} />
            <main className="legal-page" style={{ paddingTop: '120px', paddingBottom: '80px', minHeight: '80vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Link to="/" className="btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '2rem', border: '1px solid var(--border)', padding: '8px 16px', borderRadius: 'var(--radius-full)', color: 'var(--text-primary)', textDecoration: 'none', transition: 'all 0.3s ease' }}>
                            <ArrowLeft size={16} /> Back to Home
                        </Link>
                        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-4xl)', marginBottom: '32px' }}>Terms of Service</h1>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>Last updated: June 2026</p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                            <section>
                                <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', fontSize: 'var(--text-2xl)', marginBottom: '16px' }}>1. Agreement to Terms</h2>
                                <p>By accessing or using our services, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the service.</p>
                            </section>

                            <section>
                                <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', fontSize: 'var(--text-2xl)', marginBottom: '16px' }}>2. License &amp; Sandbox Use</h2>
                                <p>M.A.S.H permits healthcare organizations to deploy agent orchestration modules within local network sandboxes. All configured Peer-to-Peer room workspaces must adhere to local healthcare privacy laws.</p>
                            </section>

                            <section>
                                <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', fontSize: 'var(--text-2xl)', marginBottom: '16px' }}>3. Clinical Validation Waiver</h2>
                                <p>AI agent outputs, including pre-triage summaries and diagnostic code recommendations, serve as helper tools only. Licensed clinical practitioners must independently verify all logs and records before approving active patient prescriptions.</p>
                            </section>

                            <section>
                                <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', fontSize: 'var(--text-2xl)', marginBottom: '16px' }}>4. Telemetry &amp; Audits</h2>
                                <p>Active node connections to the virtual event bus emit secure logs. Compliance audits are compiled locally; M.A.S.H does not store patient-identifying data on shared cloud infrastructure without explicit authorization.</p>
                            </section>
                        </div>
                    </motion.div>
                </div>
            </main>
            <Footer />
        </>
    )
}
