# Room Reorganization Plan

## Problem

`HealthcareOrchestrationRoom` currently handles EVERYTHING — patient booking, doctor schedule queries, patient summaries, medicine events, and more. This makes debugging hard and doesn't scale as new agents are added.

## Proposed Room Structure

| Room | Purpose | Agents |
|------|---------|--------|
| `Patient-Management-Room` | Patient ↔ Registration flow (booking, rescheduling, doctor availability) | `PatientManagementAgent`, `RegistrationAgent` |
| `Doctor-Dashboard-Room` | Doctor ↔ Assistant flow (schedule, patient summaries, notifications) | `DoctorAssistantAgent`, `SummaryAgent` |
| `Clinical-Consult-Room` | Prescription safety, patient history compilation | `MedicineManagementAgent`, `SummaryAgent` |
| `Pharmacy-Inventory-Room` | Medicine availability, stock routing | `MedicineManagementAgent`, `StockManagementAgent` |
| `Reception-Navigation-Room` | Patient wayfinding, doctor matching at reception | `PatientNavigationAgent`, `RegistrationAgent` |
| `Telemetry-Audit-Room` | Cross-cutting audit log (unchanged) | `TelemetryAgent`, all |

## Event Routing After Reorganization

```
Patient-Management-Room:
  QUERY_DOCTORS          → RegistrationAgent
  DOCTORS_LIST_RESPONSE  → PatientManagementAgent
  BOOKING_REQUESTED      → RegistrationAgent
  BOOKING_CONFIRMED      → PatientManagementAgent + DoctorAgent*
  BOOKING_FAILED         → PatientManagementAgent
  RESCHEDULE_REQUESTED   → RegistrationAgent
  RESCHEDULE_CONFIRMED   → PatientManagementAgent

Doctor-Dashboard-Room:
  PATIENT_SUMMARY_REQUESTED → SummaryAgent
  PATIENT_SUMMARY_RESPONSE  → DoctorAssistantAgent
  BOOKING_CONFIRMED*         → DoctorAssistantAgent (cross-room relay from Patient-Management-Room)
```

> *Note: `BOOKING_CONFIRMED` needs to be relayed from `Patient-Management-Room` → `Doctor-Dashboard-Room` so the doctor gets notified. This is done by having `RegistrationAgent` broadcast to both rooms when a booking is confirmed.

## Files to Change

- `Agents/src/band_config.py` — Add `PatientManagementRoom` and `DoctorDashboardRoom`, remove (or keep for legacy) `HealthcareOrchestrationRoom`
- `Agents/src/patient_agent.py` — Switch to `PatientManagementRoom`
- `Agents/src/registration_agent.py` — Switch to `PatientManagementRoom`, broadcast `BOOKING_CONFIRMED` to both rooms
- `Agents/src/doctor_agent.py` — Switch to `DoctorDashboardRoom`
- `Agents/src/summary_agent.py` — Join both `DoctorDashboardRoom` and `ClinicalConsultRoom`
- `Agents/main.py` — Update imports and room wrapping

## Open Questions

> [!IMPORTANT]
> Should we keep `HealthcareOrchestrationRoom` alive as a **legacy/catch-all room** for backward compatibility with the existing `main.py` simulation, or fully remove it?
> 
> **Option A**: Rename it and keep it for the simulation scripts only.
> **Option B**: Fully remove it. Update `main.py` simulation to use the new rooms.
> 
> Recommendation: **Option B** — clean break now before more agents are added.
