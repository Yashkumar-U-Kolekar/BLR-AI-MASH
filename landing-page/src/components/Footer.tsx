import { Github, Mail, ShieldAlert } from 'lucide-react'
import './Footer.css'

import { Link } from 'react-router-dom'

export default function Footer() {
    const currentYear = new Date().getFullYear()

    const scrollTo = (href: string) => {
        const el = document.querySelector(href)
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' })
        } else {
            window.location.href = '/' + href
        }
    }

    return (
        <footer className="footer" id="footer">
            <div className="container">
                <div className="footer-inner">
                    {/* Brand */}
                    <div>
                        <div className="footer-brand-name">M.A.S.H</div>
                        <div className="footer-brand-tagline">Decentralized AI Orchestration</div>
                        <p className="footer-brand-desc">
                            Decoupling Conversational Interfaces from Operations via P2P Agent Mesh.
                            Built using the Band of Agents SDK (BandSDK) for secure multi-room clinical event isolation.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="footer-col-title">Navigate</h4>
                        <ul className="footer-col-list">
                            <li><a href="#about" onClick={(e) => { e.preventDefault(); scrollTo('#about') }}>Core Concept</a></li>
                            <li><a href="#services" onClick={(e) => { e.preventDefault(); scrollTo('#services') }}>Agent Ecosystem</a></li>
                            <li><a href="#gallery" onClick={(e) => { e.preventDefault(); scrollTo('#gallery') }}>Virtual Rooms</a></li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="footer-col-title">Legal &amp; Compliance</h4>
                        <ul className="footer-col-list">
                            <li><Link to="/privacy" onClick={() => window.scrollTo(0,0)}>Privacy Policy</Link></li>
                            <li><Link to="/terms" onClick={() => window.scrollTo(0,0)}>Terms of Service</Link></li>
                            <li><span style={{ fontSize: '12px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}><ShieldAlert size={14} /> HIPAA Compliant</span></li>
                        </ul>
                    </div>

                </div>

                {/* Bottom Bar */}
                <div className="footer-bottom">
                    <span className="footer-copyright">
                        © {currentYear} M.A.S.H Platform. All rights reserved.
                    </span>
                    <div className="footer-social-links">
                        <a href="https://github.com/Blunistark/M.A.S.H" target="_blank" rel="noopener noreferrer" className="footer-social-link" aria-label="GitHub">
                            <Github size={18} />
                        </a>
                        <a href="mailto:support@mash-platform.org" className="footer-social-link" aria-label="Email">
                            <Mail size={18} />
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    )
}
