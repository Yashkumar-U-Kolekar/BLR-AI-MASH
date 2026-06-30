import { useState, useRef, useEffect, useCallback } from 'react'
import { StaggerContainer, StaggerItem } from './Animations'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import './Services.css'

const showcaseAgents = [
    { name: "Doctor Assistant", image: "https://res.cloudinary.com/dx08fagcf/image/upload/v1781798361/WhatsApp_Image_2026-06-18_at_9.15.09_PM_hjxemc.jpg", desc: "Real-time transcription summarization and automated diagnostic code recommendation.", paradigm: "Ambient Transcription & Diagnostic Recommendation", isLeft: false },
    { name: "Patient Management", image: "https://res.cloudinary.com/dx08fagcf/image/upload/v1781798362/WhatsApp_Image_2026-06-18_at_9.15.17_PM_1_ques1v.jpg", desc: "Asynchronous conversational front-end intake, symptom extraction, and pre-triage collection.", paradigm: "Intake Conversational Modeling & Pre-Triage", isLeft: true },
    { name: "Medicine & Rx", image: "https://res.cloudinary.com/dx08fagcf/image/upload/v1781798361/WhatsApp_Image_2026-06-18_at_9.15.15_PM_uwy2c8.jpg", desc: "Automated safety check cross-referencing patient allergies against prescribed drugs.", paradigm: "Allergy Cross-Referencing & Safety Compliance", isLeft: false },
    { name: "Patient Navigation", image: "https://res.cloudinary.com/dx08fagcf/image/upload/v1781798361/WhatsApp_Image_2026-06-18_at_9.15.16_PM_zylo91.jpg", desc: "Real-time wayfinding guidance, tracking physical patient arrival and directing to consultation rooms.", paradigm: "Wayfinding Navigation & Spatial Tracking", isLeft: true },
    { name: "Stock Management", image: "https://res.cloudinary.com/dx08fagcf/image/upload/v1781798362/WhatsApp_Image_2026-06-18_at_9.15.18_PM_zkjszj.jpg", desc: "Tracks medication inventory, flags supply levels, and forecasts stock demand based on consult trends.", paradigm: "Inventory Tracking & Surges Forecasting", isLeft: false },
    { name: "Patient Summary", image: "https://res.cloudinary.com/dx08fagcf/image/upload/v1781798362/WhatsApp_Image_2026-06-18_at_9.15.17_PM_2_cvpfhf.jpg", desc: "EHR records aggregator, generating pre-consultation reports and clinical synthesis for doctors.", paradigm: "Clinical Records Aggregation & Synthesis", isLeft: true },
    { name: "Telemetry & Audit", image: "/telemetry-agent.png", desc: "Cryptographically registers room events, verifying protocol compliance and HIPAA compliance logs.", paradigm: "HIPAA Event Cryptographic Ledger Logging", isLeft: false }
];

const workflows = [
    {
        title: "Patient Intake & Registration",
        video: "/patient workflow.mp4",
        desc: "Watch the Patient Management and Registration agents ingest patient symptoms, run prioritizing triage, and dynamically allocate consult rooms."
    },
    {
        title: "Clinical Consultation",
        video: "/doctor-workflow.mp4",
        desc: "Observe the Doctor Assistant and Patient Summary agents compile EHR summaries, transcribe ambient consultation audio, and recommend diagnostic codes."
    },
    {
        title: "Pharmacy & Stock Logistics",
        video: "/Medice-workflow.mp4",
        desc: "See the Medicine and Stock agents validate drug interaction safety, check allergy files, and automatically forecast and request medication restocks."
    }
];

function AgentShowcaseItem({ 
    agent, 
    activeAgent
}: { 
    agent: typeof showcaseAgents[0]; 
    activeAgent: string | null; 
}) {
    const placeholderRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        let animationFrameId: number;

        const updateImagePosition = () => {
            if (!placeholderRef.current || !imageRef.current) return;

            const rect = placeholderRef.current.getBoundingClientRect();
            const X_layout = rect.left + rect.width / 2;
            const Y_layout = rect.top + rect.height / 2;

            const viewportHeight = window.innerHeight;
            const centerY = viewportHeight / 2;
            const dist = Math.abs(Y_layout - centerY);
            const maxDist = centerY * 0.7; // Transition starts when within middle 70% of screen

            let t = 0;
            if (dist < maxDist) {
                t = 1 - dist / maxDist;
                // Cubic easing
                t = t * t * (3 - 2 * t);
            }

            const slug = agent.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const sidebarEl = document.querySelector(`.target-${slug}-desktop`) || document.querySelector(`.target-${slug}-mobile`);

            if (sidebarEl && t > 0) {
                const sidebarRect = sidebarEl.getBoundingClientRect();
                const X_sidebar = sidebarRect.left + sidebarRect.width / 2;
                const Y_sidebar = sidebarRect.top + sidebarRect.height / 2;

                const deltaX = X_sidebar - X_layout;
                const deltaY = Y_sidebar - Y_layout;

                const currentTranslateX = deltaX * (1 - t);
                const currentTranslateY = deltaY * (1 - t);

                const isMobile = window.innerWidth < 1200;
                const sidebarImgHeight = isMobile ? 104 : 180;
                const targetImgHeight = rect.height || 380;
                const startScale = sidebarImgHeight / targetImgHeight;
                const currentScale = startScale + (1 - startScale) * t;

                imageRef.current.style.transform = `translate3d(${currentTranslateX}px, ${currentTranslateY}px, 0) scale(${currentScale})`;
                imageRef.current.style.opacity = `${t}`;
                imageRef.current.style.display = 'block';
            } else {
                imageRef.current.style.transform = '';
                imageRef.current.style.opacity = '0';
                imageRef.current.style.display = 'none';
            }
        };

        if (activeAgent === agent.name) {
            updateImagePosition();
            const tick = () => {
                updateImagePosition();
                animationFrameId = requestAnimationFrame(tick);
            };
            animationFrameId = requestAnimationFrame(tick);
        } else {
            if (imageRef.current) {
                imageRef.current.style.transform = '';
                imageRef.current.style.opacity = '0';
                imageRef.current.style.display = 'none';
            }
        }

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [activeAgent, agent.name]);

    const slug = agent.name.toLowerCase().replace(/[^a-z0-9]/g, '-');

    return (
        <div className={`services-showcase-layout ${agent.isLeft ? 'layout-left' : 'layout-right'} target-showcase-${slug}`}>
            {agent.isLeft ? (
                <>
                    {/* Left Column: Image */}
                    <div className="services-agent-image-col">
                        <div ref={placeholderRef} className="services-agent-image-placeholder" />
                        <img 
                            ref={imageRef}
                            src={agent.image} 
                            alt={agent.name} 
                            className="services-agent-zoom-img" 
                            style={{ position: 'absolute', opacity: 0, display: 'none' }}
                        />
                    </div>
                    {/* Right Column: Text */}
                    <div className="services-text-col">
                        <StaggerContainer>
                            <StaggerItem>
                                <p className="section-label showcase-label">Agent Ecosystem</p>
                            </StaggerItem>
                            <StaggerItem>
                                <h2 className="services-showcase-heading">{agent.name} Agent</h2>
                            </StaggerItem>
                            <StaggerItem>
                                <p className="services-showcase-text">{agent.desc}</p>
                            </StaggerItem>
                            <StaggerItem>
                                <div className="services-paradigm-note">
                                    <p className="founder-label">Operational Paradigm</p>
                                    <p className="founder-name">{agent.paradigm}</p>
                                </div>
                            </StaggerItem>
                        </StaggerContainer>
                    </div>
                </>
            ) : (
                <>
                    {/* Left Column: Text */}
                    <div className="services-text-col">
                        <StaggerContainer>
                            <StaggerItem>
                                <p className="section-label showcase-label">Agent Ecosystem</p>
                            </StaggerItem>
                            <StaggerItem>
                                <h2 className="services-showcase-heading">{agent.name} Agent</h2>
                            </StaggerItem>
                            <StaggerItem>
                                <p className="services-showcase-text">{agent.desc}</p>
                            </StaggerItem>
                            <StaggerItem>
                                <div className="services-paradigm-note">
                                    <p className="founder-label">Operational Paradigm</p>
                                    <p className="founder-name">{agent.paradigm}</p>
                                </div>
                            </StaggerItem>
                        </StaggerContainer>
                    </div>
                    {/* Right Column: Image */}
                    <div className="services-agent-image-col">
                        <div ref={placeholderRef} className="services-agent-image-placeholder" />
                        <img 
                            ref={imageRef}
                            src={agent.image} 
                            alt={agent.name} 
                            className="services-agent-zoom-img" 
                            style={{ position: 'absolute', opacity: 0, display: 'none' }}
                        />
                    </div>
                </>
            )}
        </div>
    );
}

export default function Services({ 
    activeAgent, 
    setActiveAgent 
}: { 
    activeAgent: string | null; 
    setActiveAgent: (val: string | null) => void 
}) {
    const [currentSlide, setCurrentSlide] = useState(0);
    const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

    // Scroll listener to update activeAgent dynamically based on the showcase item closest to center
    useEffect(() => {
        const handleScroll = () => {
            const centerY = window.innerHeight / 2;
            let closestAgent: string | null = null;
            let minDistance = Infinity;

            showcaseAgents.forEach(agent => {
                const slug = agent.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
                const el = document.querySelector(`.target-showcase-${slug}`);
                if (el) {
                    const rect = el.getBoundingClientRect();
                    const elCenterY = rect.top + rect.height / 2;
                    const dist = Math.abs(elCenterY - centerY);
                    if (dist < minDistance) {
                        minDistance = dist;
                        closestAgent = agent.name;
                    }
                }
            });

            // Active threshold: must be within middle 70% of viewport (35% half-height)
            if (minDistance < window.innerHeight * 0.35) {
                if (closestAgent !== activeAgent) {
                    setActiveAgent(closestAgent);
                }
            } else {
                // Out of range, clear activeAgent if it is currently one of ours
                if (activeAgent && showcaseAgents.some(sa => sa.name === activeAgent)) {
                    setActiveAgent(null);
                }
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleScroll);
        handleScroll();

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
        };
    }, [activeAgent, setActiveAgent]);

    // Handle auto-playing active video slide
    useEffect(() => {
        videoRefs.current.forEach((video, index) => {
            if (video) {
                if (index === currentSlide) {
                    video.play().catch(() => {});
                } else {
                    video.pause();
                    video.currentTime = 0;
                }
            }
        });
    }, [currentSlide]);

    const prevSlide = () => {
        if (currentSlide > 0) {
            setCurrentSlide(currentSlide - 1);
        }
    };

    const nextSlide = () => {
        if (currentSlide < workflows.length - 1) {
            setCurrentSlide(currentSlide + 1);
        }
    };

    return (
        <section className="services section" id="services">
            <div className="container">
                {/* Dynamic Showcase for all 7 agents */}
                <div className="services-showcase-list" style={{ display: 'flex', flexDirection: 'column', gap: '96px', marginBottom: '96px' }}>
                    {showcaseAgents.map((agent) => (
                        <AgentShowcaseItem 
                            key={agent.name} 
                            agent={agent} 
                            activeAgent={activeAgent} 
                        />
                    ))}
                </div>

                {/* Operational Workflows Video Showcase */}
                <div className="services-workflows-section">
                    <StaggerContainer className="services-header">
                        <StaggerItem>
                            <p className="section-label">Real-time Operations</p>
                        </StaggerItem>
                        <StaggerItem>
                            <h2 className="services-heading">Operational Workflows</h2>
                        </StaggerItem>
                        <StaggerItem>
                            <p className="services-subtitle">
                                Watch M.A.S.H agents orchestrate live clinical events across the hospital mesh.
                            </p>
                        </StaggerItem>
                    </StaggerContainer>

                    <div className="workflows-carousel-container">
                        <button 
                            className={`carousel-arrow arrow-left ${currentSlide === 0 ? 'disabled' : ''}`} 
                            onClick={prevSlide}
                            aria-label="Previous slide"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <button 
                            className={`carousel-arrow arrow-right ${currentSlide === workflows.length - 1 ? 'disabled' : ''}`} 
                            onClick={nextSlide}
                            aria-label="Next slide"
                        >
                            <ChevronRight size={24} />
                        </button>

                        <div className="workflows-carousel-outer">
                            <div 
                                className="workflows-carousel-track" 
                                style={{ transform: `translate3d(-${currentSlide * 100}%, 0, 0)` }}
                            >
                                {workflows.map((wf, idx) => (
                                    <div key={wf.title} className="workflows-carousel-slide">
                                        <div className="workflow-video-container">
                                            <video 
                                                ref={el => { videoRefs.current[idx] = el }}
                                                src={wf.video} 
                                                controls 
                                                muted 
                                                loop 
                                                playsInline 
                                                className="workflow-video" 
                                            />
                                        </div>
                                        <div className="workflow-info">
                                            <h3 className="workflow-title">{wf.title}</h3>
                                            <p className="workflow-desc">{wf.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="carousel-dots">
                            {workflows.map((_, idx) => (
                                <button
                                    key={idx}
                                    className={`carousel-dot ${idx === currentSlide ? 'active' : ''}`}
                                    onClick={() => setCurrentSlide(idx)}
                                    aria-label={`Go to slide ${idx + 1}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
