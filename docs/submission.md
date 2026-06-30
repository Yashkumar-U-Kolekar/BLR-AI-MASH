# Project Submission Details

## Submission Title
M.A.S.H: Medical Assistant & Services Hub

---

## Short Description
M.A.S.H coordinates 6 specialized AI agents across a secure, multi-room virtual network to automate clinical summaries, doctor matching based on symptoms, and prescription stock checks, eliminating administrative burden with a minimal, jargon-free interface.

---

## Long Description
M.A.S.H (Medical Assistant & Services Hub) is a decentralized healthcare orchestration platform comprising a Desktop Interface for doctors/pharmacists, and a Mobile Interface for patients. The system is designed with a minimal, jargon-free UI to streamline clinical workflows and remove patient administrative friction.

Upon system boot, M.A.S.H spools up 6 specialized AI agents. Using the Band of Agents SDK (BandSDK), these agents are distributed across multiple virtual, secure rooms (Reception & Location Room, Clinical Consultation Room, and Pharmacy & Inventory Room) to coordinate patient visits while protecting event traffic.a

1. **For Patients**: Patients can book appointments from anywhere via the Mobile Interface. During booking, they interact with a chatbot regarding their symptoms. The **Registration Agent** automatically assigns the most suitable doctor by matching the patient's issue with doctors' specialties and availability. On arrival, the **Patient Navigation Agent** guides the patient directly to the doctor's room.
2. **For Doctors**: In the Consultation Room, the **Patient Summary Agent** aggregates medical histories, lab results, and surgeries from Supabase. Written prescriptions trigger the **Medicine/Prescription Management Agent**.
3. **For Pharmacy & Stock**: In the Pharmacy Room, the **Medicine/Prescription Management Agent** audits stock level. If available, it routes the order to the pharmacy. If out-of-stock, it requests human-in-the-loop validation for alternate drug comments. Concurrently, the **Stock Management Agent** tracks usage trends to automate reorders.

This multi-room agent mesh completely automates administrative handoffs in real-time.

---

## Categories & Event Tracks
- Healthcare & Wellness
- AI Agents & Orchestration
- Developer Tools

---

## Technologies Used
- **Agent Framework**: Band of Agents SDK (BandSDK)
- **Database & Security**: Supabase (PostgreSQL, Row Level Security policies)
- **API Server**: Express.js
- **Interface Platforms**: Desktop Interface (Vite, TypeScript), Mobile Interface Concept
