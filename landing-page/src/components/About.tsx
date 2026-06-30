import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StaggerContainer, StaggerItem } from './Animations'
import './About.css'

export default function About({ activeAgent, setActiveAgent }: { activeAgent: string | null; setActiveAgent: (val: string | null) => void }) {
    const ref = useRef<HTMLDivElement>(null)
    const placeholderRef = useRef<HTMLDivElement>(null)
    const imageRef = useRef<HTMLImageElement>(null)
    const [showMore, setShowMore] = useState(false)

    // Scroll listener to update activeAgent
    useEffect(() => {
        const handleScroll = () => {
            if (!ref.current) return;
            const rect = ref.current.getBoundingClientRect();
            const elCenterY = rect.top + rect.height / 2;
            const centerY = window.innerHeight / 2;
            const dist = Math.abs(elCenterY - centerY);

            // Active threshold: must be within middle 70% of viewport (35% half-height)
            if (dist < window.innerHeight * 0.35) {
                if (activeAgent !== 'Registration') {
                    setActiveAgent('Registration');
                }
            } else {
                if (activeAgent === 'Registration') {
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

    // requestAnimationFrame loop for scroll-driven fly-in tracking the sidebar slot
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

            const slug = 'registration';
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

        if (activeAgent === 'Registration') {
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
    }, [activeAgent]);

    return (
        <section className="about section" id="about" ref={ref}>
            <div className="about-inner-layout">
                {/* Left Column: Registration Agent Zoom-in Image */}
                <div className="about-agent-image-col">
                    <div ref={placeholderRef} className="about-agent-image-placeholder" />
                    <img 
                        ref={imageRef}
                        src="https://res.cloudinary.com/dx08fagcf/image/upload/v1781798362/WhatsApp_Image_2026-06-18_at_9.15.17_PM_swpbum.jpg"
                        alt="Registration Agent"
                        className="about-agent-zoom-img"
                        style={{ position: 'absolute', opacity: 0, display: 'none' }}
                    />
                </div>

                {/* Right Column: Registration Agent Details */}
                <div className="about-text-col">
                    <StaggerContainer>
                        <StaggerItem>
                            <p className="section-label about-label">Core Concept</p>
                        </StaggerItem>
                        <StaggerItem>
                            <h2 className="about-heading">Autonomous Patient Registration</h2>
                        </StaggerItem>
                        <StaggerItem>
                            <p className="about-text">
                                The <strong>Registration Agent</strong> (RA) is the operational core of M.A.S.H's queue management system. 
                                Upon receiving structured symptom data from the intake mesh, the RA executes advanced triage 
                                algorithms to calculate patient priority score. It dynamically queries doctor availability, 
                                validates insurance metadata, and matches the patient to the optimal clinical specialist.
                            </p>
                        </StaggerItem>
                        <AnimatePresence>
                            {showMore && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    style={{ overflow: 'hidden' }}
                                >
                                    <StaggerItem>
                                        <p className="about-text">
                                            By automatically managing the StateGraph queue, the Registration Agent coordinates smooth, 
                                            P2P operational flow and reallocates resources instantly for high-priority emergency cases 
                                            without requiring manual intervention. Doctors receive pre-triaged summaries before the 
                                            patient even walks through the clinic door.
                                        </p>
                                    </StaggerItem>
                                    <StaggerItem>
                                        <div className="founder-note">
                                            <p className="founder-label">Architecture Paradigm</p>
                                            <p className="founder-name">StateGraph Prioritized Queue Allocation</p>
                                        </div>
                                    </StaggerItem>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <StaggerItem>
                            <button 
                                className="btn btn-outline" 
                                style={{ marginTop: '1rem', borderColor: 'var(--border)' }} 
                                onClick={() => setShowMore(!showMore)}
                            >
                                {showMore ? 'View Less' : 'View Architecture'}
                            </button>
                        </StaggerItem>
                    </StaggerContainer>
                </div>
            </div>
        </section>
    )
}
