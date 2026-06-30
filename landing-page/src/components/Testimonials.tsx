import { Star } from 'lucide-react'
import { StaggerContainer, StaggerItem } from './Animations'
import './Testimonials.css'

const reviews = [
    {
        quote: `M.A.S.H has transformed our consult workflow. Pre-triage summaries are compiled before the patient sits down, cutting check-in overhead in half.`,
        name: 'Dr. Elizabeth Vance',
        initials: 'EV',
        source: 'Lead Clinician, City General Clinic',
        stars: 5,
    },
    {
        quote: `The virtual room security isolation is top-notch. Our patient event logs are cryptographically signed and archived on-demand, ensuring absolute HIPAA compliance.`,
        name: 'Dr. Marcus Thorne',
        initials: 'MT',
        source: 'Chief Medical Officer, Metropolitan Medical',
        stars: 5,
    },
    {
        quote: `The Stock Management Agent's demand warnings have been a lifesaver. It accurately flagged upcoming shortages of key therapeutics by correlating consult room diagnostics.`,
        name: 'Sarah Jenkins',
        initials: 'SJ',
        source: 'Head Pharmacist, Metropolitan Pharmacy',
        stars: 5,
    },
    {
        quote: `We were able to deploy M.A.S.H locally in under 24 hours. The P2P agent model runs completely decoupled from our core server databases, eliminating sync lag.`,
        name: 'David Reynolds',
        initials: 'DR',
        source: 'Clinic Administrator, City General Clinic',
        stars: 5,
    },
    {
        quote: `Checking in and answering symptom questions from my phone was effortless. I was directed straight to the treatment room without waiting in lines.`,
        name: 'Patient #1024',
        initials: 'P',
        source: 'Mobile App User Feedback',
        stars: 5,
    },
]

const marqueeItems = [
    { text: 'DECENTRALIZED ORCHESTRATION', type: 'large' as const },
    { text: 'BandSDK event mesh', type: 'accent' as const },
    { text: 'SECURE VIRTUAL ROOMS', type: 'outline' as const },
    { text: 'hipaa & soc2 compliance', type: 'accent' as const },
    { text: 'P2P AGENT ROUTING', type: 'large' as const },
    { text: 'automated clinic summaries', type: 'accent' as const },
    { text: 'PREDICTIVE STOCK INVENTORY', type: 'outline' as const },
    { text: 'real-time patient navigation', type: 'accent' as const },
]

export default function Testimonials() {
    return (
        <section className="testimonials section" id="testimonials">
            {/* ─── Marquee Banner ─── */}
            <div className="testimonials-marquee">
                <div className="marquee-track">
                    {[...marqueeItems, ...marqueeItems].map((item, i) => (
                        <div className="marquee-item" key={i}>
                            <span className={`marquee-text ${item.type}`}>{item.text}</span>
                            <span className="marquee-dot" />
                        </div>
                    ))}
                </div>
            </div>

            {/* ─── Reviews ─── */}
            <div className="testimonials-content container">
                <div className="testimonials-header">
                    <h2 className="testimonials-heading">What Clinicians Say</h2>
                    <p className="testimonials-sub">Honest words from medical staff and clinic administrators running M.A.S.H</p>
                </div>

                <StaggerContainer className="testimonials-grid">
                    {reviews.map((review, idx) => (
                        <StaggerItem key={idx} className="testimonial-stagger-item">
                            <div className="testimonial-card">
                                <div className="testimonial-stars">
                                    {Array.from({ length: review.stars }).map((_, i) => (
                                        <Star key={i} size={16} fill="currentColor" />
                                    ))}
                                </div>
                                <p className="testimonial-quote">"{review.quote}"</p>
                                <div className="testimonial-author">
                                    <div className="testimonial-avatar">{review.initials}</div>
                                    <div className="testimonial-author-info">
                                        <div className="testimonial-name">{review.name}</div>
                                        <div className="testimonial-source">
                                            {review.source.startsWith('http') ? (
                                                <a href={review.source} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>
                                                    Google Review
                                                </a>
                                            ) : (
                                                review.source
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </StaggerItem>
                    ))}
                </StaggerContainer>
            </div>
        </section>
    )
}
