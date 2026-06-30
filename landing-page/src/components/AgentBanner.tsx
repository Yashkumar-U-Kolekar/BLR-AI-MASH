import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import './AgentBanner.css';

const leftAgents = [
    { name: "Patient Management", image: "https://res.cloudinary.com/dx08fagcf/image/upload/v1781798362/WhatsApp_Image_2026-06-18_at_9.15.17_PM_1_ques1v.jpg" },
    { name: "Registration", image: "https://res.cloudinary.com/dx08fagcf/image/upload/v1781798362/WhatsApp_Image_2026-06-18_at_9.15.17_PM_swpbum.jpg" },
    { name: "Patient Navigation", image: "https://res.cloudinary.com/dx08fagcf/image/upload/v1781798361/WhatsApp_Image_2026-06-18_at_9.15.16_PM_zylo91.jpg" },
    { name: "Patient Summary", image: "https://res.cloudinary.com/dx08fagcf/image/upload/v1781798362/WhatsApp_Image_2026-06-18_at_9.15.17_PM_2_cvpfhf.jpg" }
];

const rightAgents = [
    { name: "Doctor Assistant", image: "https://res.cloudinary.com/dx08fagcf/image/upload/v1781798361/WhatsApp_Image_2026-06-18_at_9.15.09_PM_hjxemc.jpg" },
    { name: "Medicine & Rx", image: "https://res.cloudinary.com/dx08fagcf/image/upload/v1781798361/WhatsApp_Image_2026-06-18_at_9.15.15_PM_uwy2c8.jpg" },
    { name: "Stock Management", image: "https://res.cloudinary.com/dx08fagcf/image/upload/v1781798362/WhatsApp_Image_2026-06-18_at_9.15.18_PM_zkjszj.jpg" },
    { name: "Telemetry & Audit", image: "/telemetry-agent.png" }
];

const allAgents = [...leftAgents, ...rightAgents];

function scrollToAgent(agentName: string) {
    const slug = agentName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const target = document.querySelector(`.target-showcase-${slug}`);
    if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

export default function AgentBanner({ activeAgent }: { activeAgent: string | null }) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1200);
        window.addEventListener('resize', checkMobile);
        checkMobile();
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        const desktopTrackLeft = document.querySelector('.agent-sidebar-track.scroll-down') as HTMLElement;
        const desktopTrackRight = document.querySelector('.agent-sidebar-track.scroll-up') as HTMLElement;
        const mobileTrack = document.querySelector('.agent-banner-track-mobile') as HTMLElement;

        const isLeftAgent = activeAgent && leftAgents.some(a => a.name === activeAgent);
        const isRightAgent = activeAgent && rightAgents.some(a => a.name === activeAgent);

        const updatePosition = () => {
            if (!activeAgent) return;

            const slug = activeAgent.toLowerCase().replace(/[^a-z0-9]/g, '-');

            if (isLeftAgent) {
                // Desktop left track centering: align target item vertically in viewport center
                const desktopPlaceholder = document.querySelector(`.target-${slug}-desktop`) as HTMLElement;
                if (desktopPlaceholder && desktopTrackLeft) {
                    const center = desktopPlaceholder.offsetTop + desktopPlaceholder.offsetHeight / 2;
                    desktopTrackLeft.style.transform = `translate(-50%, ${-center}px)`;
                }
            } else if (isRightAgent) {
                // Desktop right track centering: align target item vertically in viewport center
                const desktopPlaceholder = document.querySelector(`.target-${slug}-desktop`) as HTMLElement;
                if (desktopPlaceholder && desktopTrackRight) {
                    const center = desktopPlaceholder.offsetTop + desktopPlaceholder.offsetHeight / 2;
                    desktopTrackRight.style.transform = `translate(-50%, ${-center}px)`;
                }
            }

            // Mobile track centering: align target item horizontally in viewport center
            const mobilePlaceholder = document.querySelector(`.target-${slug}-mobile`) as HTMLElement;
            if (mobilePlaceholder && mobileTrack) {
                const center = mobilePlaceholder.offsetLeft + mobilePlaceholder.offsetWidth / 2;
                const targetX = window.innerWidth / 2 - center;
                mobileTrack.style.transform = `translateX(${targetX}px)`;
            }
        };

        if (activeAgent) {
            // 1. Freeze current animated transforms instantly to prevent snapping
            if (isLeftAgent && desktopTrackLeft) {
                let currentDesktopY = -1475;
                const computed = window.getComputedStyle(desktopTrackLeft);
                const matrix = computed.transform;
                if (matrix && matrix !== 'none') {
                    const parts = matrix.split('(')[1].split(')')[0].split(',');
                    currentDesktopY = parseFloat(parts[5]);
                }
                desktopTrackLeft.style.animation = 'none';
                desktopTrackLeft.style.transition = 'none';
                desktopTrackLeft.style.transform = `translate(-50%, ${currentDesktopY}px)`;
            }

            if (isRightAgent && desktopTrackRight) {
                let currentDesktopY = -1200;
                const computed = window.getComputedStyle(desktopTrackRight);
                const matrix = computed.transform;
                if (matrix && matrix !== 'none') {
                    const parts = matrix.split('(')[1].split(')')[0].split(',');
                    currentDesktopY = parseFloat(parts[5]);
                }
                desktopTrackRight.style.animation = 'none';
                desktopTrackRight.style.transition = 'none';
                desktopTrackRight.style.transform = `translate(-50%, ${currentDesktopY}px)`;
            }

            if (mobileTrack) {
                let currentMobileX = -1436;
                const computed = window.getComputedStyle(mobileTrack);
                const matrix = computed.transform;
                if (matrix && matrix !== 'none') {
                    const parts = matrix.split('(')[1].split(')')[0].split(',');
                    currentMobileX = parseFloat(parts[4]);
                }
                mobileTrack.style.animation = 'none';
                mobileTrack.style.transition = 'none';
                mobileTrack.style.transform = `translateX(${currentMobileX}px)`;
            }

            // 2. Animate to target in the next frame
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (isLeftAgent && desktopTrackLeft) {
                        desktopTrackLeft.style.transition = 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
                    }
                    if (isRightAgent && desktopTrackRight) {
                        desktopTrackRight.style.transition = 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
                    }
                    if (mobileTrack) {
                        mobileTrack.style.transition = 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
                    }
                    updatePosition();
                });
            });

            // 3. Keep centered dynamically on window resize
            window.addEventListener('resize', updatePosition);
            return () => {
                window.removeEventListener('resize', updatePosition);
            };
        } else {
            // Delay resumption of marquee scrolling to allow the fly-back animation to finish landing in the static slot
            const timeoutId = setTimeout(() => {
                if (desktopTrackLeft) {
                    desktopTrackLeft.style.animation = '';
                    desktopTrackLeft.style.transition = '';
                    desktopTrackLeft.style.transform = '';
                }
                if (desktopTrackRight) {
                    desktopTrackRight.style.animation = '';
                    desktopTrackRight.style.transition = '';
                    desktopTrackRight.style.transform = '';
                }
                if (mobileTrack) {
                    mobileTrack.style.animation = '';
                    mobileTrack.style.transition = '';
                    mobileTrack.style.transform = '';
                }
            }, 800); // 800ms matches the spring transition duration

            return () => clearTimeout(timeoutId);
        }
    }, [activeAgent]);

    // Duplicate arrays for infinite loops
    const doubleLeft = [...leftAgents, ...leftAgents, ...leftAgents];
    const doubleRight = [...rightAgents, ...rightAgents, ...rightAgents];
    const doubleAll = [...allAgents, ...allAgents, ...allAgents];

    const isLeftActive = activeAgent && leftAgents.some(a => a.name === activeAgent);
    const isRightActive = activeAgent && rightAgents.some(a => a.name === activeAgent);

    return (
        <>
            {/* Desktop Side Marquees (Visible on screens >= 1200px) */}
            <div className={`agent-side-marquee-desktop left ${isLeftActive ? 'shifted' : ''}`}>
                <div className="agent-sidebar-track-container">
                    <div className="agent-sidebar-track scroll-down">
                        {doubleLeft.map((agent, index) => {
                            const baseIndex = leftAgents.findIndex(a => a.name === agent.name);
                            const isTargetAgent = baseIndex !== -1 && index === (baseIndex + 4);
                            const hasLayoutId = isTargetAgent && !isMobile;
                            const slug = agent.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
                            const isSelfActive = activeAgent === agent.name;

                            return (
                                <div 
                                    key={agent.name + '-left-' + index} 
                                    className={`agent-sidebar-item ${isTargetAgent ? `target-${slug}-desktop` : ''}`}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`Jump to ${agent.name} section`}
                                    onClick={() => scrollToAgent(agent.name)}
                                    onKeyDown={(e) => e.key === 'Enter' && scrollToAgent(agent.name)}
                                    style={{ 
                                        animationDelay: `${(index % leftAgents.length) * 0.4}s`,
                                        opacity: isSelfActive ? 0 : 1,
                                        visibility: isSelfActive ? 'hidden' : 'visible',
                                        transition: 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.4s'
                                    }}
                                >
                                    {!isSelfActive ? (
                                        <motion.img 
                                            layoutId={hasLayoutId ? `${slug}-image` : undefined}
                                            src={agent.image} 
                                            alt={agent.name} 
                                            className="agent-sidebar-img" 
                                            transition={{ type: "spring", stiffness: 80, damping: 18 }}
                                        />
                                    ) : (
                                        <div className="agent-sidebar-img-placeholder" style={{ height: '116px' }} />
                                    )}
                                    <span className="agent-sidebar-name">{agent.name}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className={`agent-side-marquee-desktop right ${isRightActive ? 'shifted' : ''}`}>
                <div className="agent-sidebar-track-container">
                    <div className="agent-sidebar-track scroll-up">
                        {doubleRight.map((agent, index) => {
                            const baseIndex = rightAgents.findIndex(a => a.name === agent.name);
                            const isTargetAgent = baseIndex !== -1 && index === (baseIndex + 4);
                            const hasLayoutId = isTargetAgent && !isMobile;
                            const slug = agent.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
                            const isSelfActive = activeAgent === agent.name;

                            return (
                                <div 
                                    key={agent.name + '-right-' + index} 
                                    className={`agent-sidebar-item ${isTargetAgent ? `target-${slug}-desktop` : ''}`}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`Jump to ${agent.name} section`}
                                    onClick={() => scrollToAgent(agent.name)}
                                    onKeyDown={(e) => e.key === 'Enter' && scrollToAgent(agent.name)}
                                    style={{ 
                                        animationDelay: `${(index % rightAgents.length) * 0.4}s`,
                                        opacity: isSelfActive ? 0 : 1,
                                        visibility: isSelfActive ? 'hidden' : 'visible',
                                        transition: 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.4s'
                                    }}
                                >
                                    {!isSelfActive ? (
                                        <motion.img 
                                            layoutId={hasLayoutId ? `${slug}-image` : undefined}
                                            src={agent.image} 
                                            alt={agent.name} 
                                            className="agent-sidebar-img" 
                                            transition={{ type: "spring", stiffness: 80, damping: 18 }}
                                        />
                                    ) : (
                                        <div className="agent-sidebar-img-placeholder" style={{ height: '116px' }} />
                                    )}
                                    <span className="agent-sidebar-name">{agent.name}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Marquee (Visible on screens < 1200px) */}
            <div className="agent-banner-overlay-mobile">
                <div className="agent-banner-track-container-mobile">
                    <div className="agent-banner-track-mobile">
                        {doubleAll.map((agent, index) => {
                            const baseIndex = allAgents.findIndex(a => a.name === agent.name);
                            const isTargetAgentMobile = baseIndex !== -1 && index === (baseIndex + 8);
                            const hasLayoutId = isTargetAgentMobile && isMobile;
                            const slug = agent.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
                            const isSelfActive = activeAgent === agent.name;

                            return (
                                <div 
                                    key={agent.name + '-mobile-' + index} 
                                    className={`agent-banner-item-mobile ${isTargetAgentMobile ? `target-${slug}-mobile` : ''}`}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`Jump to ${agent.name} section`}
                                    onClick={() => scrollToAgent(agent.name)}
                                    onKeyDown={(e) => e.key === 'Enter' && scrollToAgent(agent.name)}
                                    style={{ 
                                        animationDelay: `${(index % allAgents.length) * 0.4}s`,
                                        opacity: isSelfActive ? 0 : 1,
                                        visibility: isSelfActive ? 'hidden' : 'visible',
                                        transition: 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.4s'
                                    }}
                                >
                                    {!isSelfActive ? (
                                        <motion.img 
                                            layoutId={hasLayoutId ? `${slug}-image` : undefined}
                                            src={agent.image} 
                                            alt={agent.name} 
                                            className="agent-banner-img-mobile" 
                                            transition={{ type: "spring", stiffness: 80, damping: 18 }}
                                        />
                                    ) : (
                                        <div className="agent-banner-img-placeholder-mobile" style={{ height: '80px', width: '80px' }} />
                                    )}
                                    <span className="agent-banner-name-mobile">{agent.name}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
}
