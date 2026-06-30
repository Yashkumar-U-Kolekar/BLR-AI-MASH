# Symptom Triage & Clinician Matching Workflow

This document describes the event-driven workflow for symptom parsing, triage classification, and clinical matching inside the M.A.S.H ecosystem.

## Overview

When a new patient registers or describes their symptoms via the patient-facing mobile application, the **Registration Agent** coordinates the triage mapping process asynchronously in the background. It maps natural language symptom lists to specialized clinical domains, checks matching doctor availability in the database, and schedules the appointment.

## Rooms and Agents Involved

- **Patient-Management-Room**: Serves as the channel for processing doctor queries, check-in statuses, and scheduling slot validations.
- **Reception-Navigation-Room**: Serves as the front-desk channel for routing patients and assigning staff.
- **RegistrationAgent**: Runs a LangGraph state graph in the background to handle symptom matching and schedule database operations in Supabase.

## Detailed Event Sequence

```mermaid
sequenceDiagram
    actor Patient
    participant PMA as PatientManagementAgent
    participant PMRoom as Patient-Management-Room
    participant RA as RegistrationAgent
    participant RNRoom as Reception-Navigation-Room
    participant DB as Supabase DB

    Patient->>PMA: "I have had severe chest pain and palpitations"
    Note over PMA: Triggers symptom match request
    PMA->>RNRoom: Broadcast `REQUEST_DOCTOR_MATCH` {patientId, symptoms, requestedSlot}
    
    RNRoom->>RA: Triggers `on_request_doctor_match`
    activate RA
    Note over RA: Parse symptoms to map specialty:<br/>- "chest pain"/"heart" -> Cardiology<br/>- "fever"/"child" -> Pediatrics<br/>- Else -> General Practice
    
    RA->>DB: Query active doctors and schedules
    DB-->>RA: Return doctor records
    
    Note over RA: Find doctor matching specialty & slots
    
    RA->>RNRoom: Broadcast `DOCTOR_ASSIGNED`<br/>{patientId, doctorId, doctorName, specialty, slot}
    deactivate RA
    
    Note over PMA: Handles doctor assignment to trigger booking
    PMA->>PMRoom: Broadcast `BOOKING_REQUESTED`<br/>{requestId, patientName, doctorId, slotTime, reason}
    
    PMRoom->>RA: Triggers `on_booking_requested`
    activate RA
    RA->>DB: Write new appointment record
    DB-->>RA: Success status
    RA->>PMRoom: Broadcast `BOOKING_CONFIRMED`<br/>{requestId, message, doctorId, patientName, slotTime}
    deactivate RA
```

## Symptom Classification Rules

The Registration Agent parses symptoms in a rule-based triage node inside its `LangGraph` pipeline:

| Keywords | Target Specialty |
| :--- | :--- |
| `"chest pain"`, `"heart"`, `"cardio"` | **Cardiology** |
| `"fever"`, `"child"`, `"pediatric"` | **Pediatrics** |
| *All other inputs* | **General Practice** |

## Key Events Schema

### `REQUEST_DOCTOR_MATCH` (Incoming)
Sent by the client interface or triage coordinator to request matching:
```json
{
  "patientId": "3b29c9df-4aa1-4da2-9b2f-3b7c8df81512",
  "symptoms": "chest pain and shortness of breath",
  "requestedSlot": "10:30 AM"
}
```

### `DOCTOR_ASSIGNED` (Outgoing)
Broadcast to the `Reception-Navigation-Room` to communicate triage match outcome:
```json
{
  "patientId": "3b29c9df-4aa1-4da2-9b2f-3b7c8df81512",
  "doctorId": "a6bb7c5b-ef00-4ea7-8b01-b66b8df815bd",
  "doctorName": "Dr. Desai",
  "specialty": "Cardiology",
  "slot": "10:30 AM"
}
```
