import { motion } from 'framer-motion'
import { Activity } from 'lucide-react'
import './LoadingScreen.css'

export default function LoadingScreen() {
    return (
        <div className="loading-screen">
            <motion.div
                className="loading-bg"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
            />
            <motion.div
                className="loading-logo-container"
                layoutId="main-logo"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1.25, opacity: 1 }}
                transition={{
                    type: "spring",
                    stiffness: 70,
                    damping: 24,
                    mass: 1.2
                }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
                <img src="https://res.cloudinary.com/dx08fagcf/image/upload/v1781798361/WhatsApp_Image_2026-06-18_at_9.15.15_PM_1_rlv2mv.jpg" alt="M.A.S.H Logo" style={{ height: '96px', width: 'auto' }} />
            </motion.div>
        </div>
    )
}
