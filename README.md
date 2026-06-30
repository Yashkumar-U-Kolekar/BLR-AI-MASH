# M.A.S.H (Medical Assistant and Services Hub)

Welcome to the **M.A.S.H (CarePulse)** repository! This project is a comprehensive, AI-driven healthcare platform designed to streamline operations for patients, doctors, pharmacists, and administrators. It features multi-agent AI chatbots, real-time indoor navigation, seamless appointment booking, live inventory tracking, and cutting-edge security via ArmorIQ.

## 🚀 Features

- **CarePulse Patient Portal (`/CarePulse_Frontend`)**
  - Interactive AI Assistant for booking appointments and answering health queries.
  - Indoor navigation system to guide patients to specific hospital wings/rooms.
  - Personal health dashboard tracking appointments, prescriptions, and medical history.
- **Doctor & Pharmacist Portal (`/Frontend`)**
  - Full-suite interface for doctors to manage appointments and prescribe medications.
  - Built-in medication autocomplete backed by live inventory data.
  - Pharmacist dashboard for fulfilling prescriptions and managing stock levels.
- **ArmorIQ Security Dashboard (`/ArmorIQ_Frontend`)**
  - Real-time AI security monitoring and compliance auditing.
  - Tracks all API requests and agent behaviors for HIPAA compliance.
- **AI Agent Network (`/Agents`)**
  - Specialized AI agents (Patient Agent, Doctor Agent, Pharmacist Agent, Navigation Agent, Security Agent).
  - Agents communicate with each other dynamically to fulfill complex requests.
- **Backend & Database (`/Backend` & `/Database`)**
  - Supabase PostgreSQL database for real-time syncing.
  - Node.js backend acting as the central nervous system.

## 📁 Repository Structure

```
M.A.S.H/
├── Agents/               # Python-based multi-agent AI system and database seed scripts
├── ArmorIQ_Frontend/     # Security and Compliance Dashboard (React/Vite)
├── Backend/              # Node.js backend services and API routes
├── CarePulse_Frontend/   # Patient-facing Web Application (React/Vite)
├── Database/             # Supabase migrations, schemas, and types
├── Frontend/             # Doctor/Pharmacist Management Portal (Vanilla JS/Vite)
├── docs/                 # Product requirements and architecture documentation
└── landing-page/         # Promotional landing page
```

## 🛠️ Tech Stack

- **Frontend:** React, Vanilla JS, Vite, HTML/CSS
- **Backend:** Node.js, Python (LangChain/Agents)
- **Database:** Supabase (PostgreSQL)
- **AI/ML:** OpenAI LLMs

## ⚙️ Setup & Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Yashkumar-U-Kolekar/MASH.git
   cd MASH
   ```
2. **Setup Environment Variables:**
   Ensure you have `.env` files configured in `/Backend`, `/CarePulse_Frontend`, and `/Agents` with your respective Supabase and AI API keys.
3. **Run the applications:**
   Each frontend application (`CarePulse_Frontend`, `Frontend`, `ArmorIQ_Frontend`) can be started locally by navigating into their respective directories and running:
   ```bash
   npm install
   npm run dev
   ```

---
*Built to redefine the future of healthcare management.*
