import asyncio
import os
import logging
from dotenv import load_dotenv

# Configure logging to see band-sdk execution details
logging.basicConfig(level=logging.INFO)
from src import (
    PatientManagementRoom,
    DoctorDashboardRoom,
    ReceptionNavigationRoom,
    ClinicalConsultRoom,
    PharmacyInventoryRoom,
    TelemetryAuditRoom,
    PharmacistDashboardRoom,
    SummaryAgent,
    MedicineManagementAgent,
    StockManagementAgent,
    RegistrationAgent,
    PatientManagementAgent,
    PatientNavigationAgent,
    TelemetryAgent,
    DoctorAssistantAgent,
    PharmacistAgent,
)



def format_js_object(obj):
    if isinstance(obj, dict):
        if not obj:
            return "{}"
        items = [f"{repr(k)}: {format_js_object(v)}" for k, v in obj.items()]
        return f"{{ {', '.join(items)} }}"
    elif isinstance(obj, list):
        if not obj:
            return "[]"
        items = [format_js_object(x) for x in obj]
        return f"[ {', '.join(items)} ]"
    elif isinstance(obj, str):
        return repr(obj)
    return str(obj)

async def main():
    load_dotenv()
    use_real_band = os.getenv("USE_REAL_BAND", "false").lower() == "true"
    if use_real_band:
        from src.band_config import BandSDK
        print("Connecting to real Band platform...")
        await BandSDK.init_real_band()

    print("Initializing Band of Agents mesh...")

    # Instantiate Agents (TelemetryAgent first to capture other agents joining)
    telemetry_agent = TelemetryAgent()
    summary_agent = SummaryAgent()
    medicine_agent = MedicineManagementAgent()
    stock_agent = StockManagementAgent()
    registration_agent = RegistrationAgent()
    patient_management_agent = PatientManagementAgent()
    patient_navigation_agent = PatientNavigationAgent()
    doctor_agent = DoctorAssistantAgent("a6bb7c5b-ef00-4ea7-8b01-b66b8df815bd", "Dr. Smith")
    pharmacist_agent = PharmacistAgent()


    # Log simulation events for visibility
    original_broadcast = PatientManagementRoom.broadcast

    def wrapped_broadcast(event: str, payload: dict):
        if event == 'REORDER_SUGGESTION':
            print(f"[SIMULATION ALERT] Reorder Suggestion Received: {payload['reason']}")
        elif event == 'STOCK_STATS_RESPONSE':
            print(f"[SIMULATION RESPONSE] Current Stock Stats:", format_js_object(payload['stats']))
        elif event == 'SUMMARY_AVAILABLE':
            print(f"[SIMULATION RESPONSE] Generated Summary for {payload['patientId']}:\n{payload['summary']}")
        elif event == 'DOCTORS_LIST_RESPONSE':
            doc_strings = [
                f"{d['name']} ({d['specialty']}) - Slots: [{', '.join(d['availableSlots'])}]" 
                for d in payload['doctors']
            ]
            print(f"[SIMULATION RESPONSE] Available Doctors list:", format_js_object(doc_strings))
        elif event == 'APPOINTMENT_CONFIRMED':
            comments_str = f" - Comments: {payload['comments']}" if payload.get('comments') else ''
            print(f"[SIMULATION ALERT] Appointment Confirmed for {payload['patientId']} with Doctor ID {payload['doctorId']} at slot {payload['slot']} (Status: {payload['status']}){comments_str}")
        elif event == 'NAVIGATION_DIRECTIONS':
            print(f"[SIMULATION RESPONSE] Navigation Directions for {payload['patientId']}:\n{payload['directions']}")
        
        return original_broadcast(event, payload)

    PatientManagementRoom.broadcast = wrapped_broadcast

    # Log simulation events for Reception-Navigation-Room
    original_reception_broadcast = ReceptionNavigationRoom.broadcast

    def wrapped_reception_broadcast(event: str, payload: dict):
        if event == 'DOCTOR_ASSIGNED':
            print(f"[RECEPTION ALERT] Doctor Assigned for {payload['patientId']}: {payload['doctorName']} ({payload['specialty']}) at slot {payload['slot']}")
        elif event == 'NAVIGATION_DIRECTIONS':
            print(f"[RECEPTION RESPONSE] Navigation directions for {payload['patientId']}:\n{payload['directions']}")
        elif event == 'DOCTOR_ROOM_CHANGE':
            print(f"[RECEPTION INFO] Doctor clinic changed: Doctor {payload['doctorId']} moved to {payload['room']} ({payload['floor']})")
        elif event == 'NAVIGATE_TO_ROOM':
            print(f"[RECEPTION INFO] Room navigation triggered for patient {payload['patientId']} to see doctor {payload['doctorId']}")
        return original_reception_broadcast(event, payload)

    ReceptionNavigationRoom.broadcast = wrapped_reception_broadcast

    # Log simulation events for Clinical-Consult-Room
    original_clinical_broadcast = ClinicalConsultRoom.broadcast

    def wrapped_clinical_broadcast(event: str, payload: dict):
        if event == 'PATIENT_HISTORY_COMPILED':
            print(f"[CLINICAL RESPONSE] Compiled History for {payload['patientId']}:\n{payload['compiledHistory']}")
        elif event == 'PRESCRIPTION_SAFETY_PASSED':
            resolution_str = f" (via Intervention - Comments: {payload['resolution']['comments']})" if payload.get('resolution') else ''
            print(f"[CLINICAL ALERT] Prescription Safety Check passed for {payload['patientId']}: {payload['prescription']['medicine']} (Status: {payload['status']}){resolution_str}")
        return original_clinical_broadcast(event, payload)

    ClinicalConsultRoom.broadcast = wrapped_clinical_broadcast

    # Log simulation events for Pharmacy-Inventory-Room
    original_pharmacy_broadcast = PharmacyInventoryRoom.broadcast

    def wrapped_pharmacy_broadcast(event: str, payload: dict):
        if event == 'CHECK_MEDICINE_AVAILABILITY':
            print(f"[PHARMACY INFO] Checking availability for patient {payload['patientId']}: {payload.get('medicine')}")
        elif event == 'MEDICINE_AVAILABILITY_STATUS':
            status = "Available" if payload.get('isAvailable') else "Out of Stock"
            print(f"[PHARMACY RESPONSE] Medicine Availability for patient {payload['patientId']}: {payload.get('medicine')} - Status: {status}")
        elif event == 'ROUTE_TO_PHARMACY':
            print(f"[PHARMACY INFO] Routing order to pharmacy for patient {payload['patientId']}: {payload['prescription']['medicine']}")
        elif event == 'TRIGGER_REORDER':
            print(f"[PHARMACY ALERT] {payload['reason']}")
        return original_pharmacy_broadcast(event, payload)

    PharmacyInventoryRoom.broadcast = wrapped_pharmacy_broadcast

    # Log simulation events for Pharmacist-Dashboard-Room
    original_pharmacist_broadcast = PharmacistDashboardRoom.broadcast

    def wrapped_pharmacist_broadcast(event: str, payload: dict):
        if event == 'PREPARE_MEDICINE':
            print(f"[PHARMACIST DASHBOARD] Notification: New prescription order arrived. Please prepare medicine '{payload['prescription']['medicine']}' for patient '{payload['patientId']}'.")
        elif event == 'STOCK_DEMAND_ALERT':
            print(f"[PHARMACIST DASHBOARD] Alert: {payload['reason']}")
        return original_pharmacist_broadcast(event, payload)

    PharmacistDashboardRoom.broadcast = wrapped_pharmacist_broadcast

    # Log simulation events for Doctor-Dashboard-Room
    original_doctor_broadcast = DoctorDashboardRoom.broadcast

    def wrapped_doctor_broadcast(event: str, payload: dict):
        if event == 'ALTERNATIVE_MEDICINE_REQUESTED':
            print(f"[DOCTOR DASHBOARD] Prescription Alert: Medicine '{payload['medicine']}' is OUT OF STOCK for patient '{payload['patientId']}'. Suggest alternative or comments.")
        return original_doctor_broadcast(event, payload)

    DoctorDashboardRoom.broadcast = wrapped_doctor_broadcast

    # Log simulation events for Telemetry-Audit-Room
    original_audit_broadcast = TelemetryAuditRoom.broadcast

    def wrapped_audit_broadcast(event: str, payload: dict):
        if event == 'AGENT_JOINED':
            print(f"[AUDIT INFO] Audit: Agent '{payload['agent']}' successfully registered to room '{payload['room']}'")
        elif event == 'STATE_UPDATED':
            print(f"[AUDIT INFO] Audit: Room '{payload['room']}' state update detected: {payload['key']} = {payload['value']}")
        elif event == 'HUMAN_INTERVENTION_REQUESTED':
            print(f"[AUDIT ALERT] Audit: Human intervention requested by '{payload['agent']}' - Reason: {payload['reason']}")
        elif event == 'RESOLVED':
            print(f"[AUDIT ALERT] Audit: Human intervention resolved for '{payload['agent']}' - Status: {payload['resolution']['status']}")
        return original_audit_broadcast(event, payload)

    TelemetryAuditRoom.broadcast = wrapped_audit_broadcast



    # Example simulation of orchestration workflow:
    print("--- Simulating Workflow ---")

    # Define dynamic test parameters based on whether we are running in real mode or mock mode
    patient_id_1 = "53129b25-f3c1-46c3-a3d5-3c41feca402f" if use_real_band else "P-12345"
    patient_id_2 = "8e114db7-e409-4511-8f4a-d8dcf9661488" if use_real_band else "P-67890"
    patient_id_3 = "3a1d6743-a49c-40b1-b7d8-09432aaac4f9" if use_real_band else "P-999"
    med_in_stock = "Amoxicillin 500mg Capsule" if use_real_band else "Ibuprofen 400mg"
    med_out_of_stock = "Lisinopril 10mg Tablet" if use_real_band else "Rare-Antibiotic 500mg"
    doctor_id = "22222222-2222-2222-2222-222222222222" if use_real_band else "doc-1"
    HealthcareOrchestrationRoom = PatientManagementRoom  # alias for simulation
    doctor_name = "Dr. Anita Desai" if use_real_band else "Dr. Smith"

    # 1. Patient data arrives, trigger summary
    HealthcareOrchestrationRoom.broadcast('GENERATE_SUMMARY', { 
        'patientId': patient_id_1, 
        'history': ['Checkup 2024', 'Vaccination 2025'],
        'tests': [
            { 'name': 'Blood Panel', 'date': '2025-11-10', 'result': 'Normal' },
            { 'name': 'X-Ray Chest', 'date': '2026-02-14', 'result': 'Clear lungs' }
        ],
        'surgeries': [
            { 'procedure': 'Appendectomy', 'date': '2020-04-12', 'outcome': 'Successful recovery' }
        ]
    })

    # 2. Prescription written for an available medicine (1st usage)
    HealthcareOrchestrationRoom.broadcast('PROCESS_PRESCRIPTION', {
        'patientId': patient_id_1,
        'prescription': { 'medicine': med_in_stock }
    })

    # 3. Prescription written for an out-of-stock medicine (triggers Human-in-the-Loop)
    await asyncio.sleep(1)
    HealthcareOrchestrationRoom.broadcast('PROCESS_PRESCRIPTION', {
        'patientId': patient_id_1,
        'prescription': { 'medicine': med_out_of_stock }
    })

    # 4. Repeated prescription of the same medicine to trigger Stock Reorder Suggestion (2nd usage)
    await asyncio.sleep(1)
    print(f"\n--- Triggering repeated usage of {med_in_stock} to test Stock Management Agent ---")
    HealthcareOrchestrationRoom.broadcast('PROCESS_PRESCRIPTION', {
        'patientId': patient_id_2,
        'prescription': { 'medicine': med_in_stock }
    })

    # 5. Query current stock stats
    await asyncio.sleep(1)
    print("\n--- Querying Stock Stats ---")
    HealthcareOrchestrationRoom.broadcast('GET_STOCK_STATS', {})

    # 6. Registration workflow: Query available doctor directory
    await asyncio.sleep(1)
    print("\n--- Querying Doctors Directory ---")
    HealthcareOrchestrationRoom.broadcast('QUERY_DOCTORS', {})

    # 7. Patient Management workflow: Request scheduling / rescheduling
    await asyncio.sleep(1)
    print("\n--- Requesting Rescheduling (Successful Flow) ---")
    HealthcareOrchestrationRoom.broadcast('RESCHEDULE_APPOINTMENT', {
        'patientId': patient_id_1,
        'doctorId': doctor_id,
        'doctorName': doctor_name,
        'requestedSlot': '10:00'
    })

    # 8. Patient Management workflow: Request scheduling with slot conflict (triggers Human-in-the-Loop)
    await asyncio.sleep(1)
    print("\n--- Requesting Rescheduling with Slot Conflict (Human-in-the-Loop) ---")
    HealthcareOrchestrationRoom.broadcast('RESCHEDULE_APPOINTMENT', {
        'patientId': patient_id_1,
        'doctorId': doctor_id,
        'doctorName': doctor_name,
        'requestedSlot': '11:00'
    })

    # 9. Navigation workflow: Request routing directions to see doctor
    await asyncio.sleep(1)
    print(f"\n--- Requesting Navigation Guidance to see {doctor_name} ---")
    HealthcareOrchestrationRoom.broadcast('REQUEST_NAVIGATION', {
        'patientId': patient_id_1,
        'doctorId': doctor_id,
        'currentLocation': 'Main Entrance Lobby'
    })

    # Wait for human intervention response simulation to fully resolve
    await asyncio.sleep(4)

    # 10. Simulating Reception-Navigation-Room Workflow
    print("\n--- Simulating Reception-Navigation-Room Workflow ---")

    # 10.1 REQUEST_DOCTOR_MATCH
    print(f"\n[Simulation Step] Patient {patient_id_3} describes symptoms: 'chest pain' (expects Cardiology: {doctor_name})")
    ReceptionNavigationRoom.broadcast('REQUEST_DOCTOR_MATCH', {
        'patientId': patient_id_3,
        'symptoms': 'chest pain',
        'requestedSlot': '10:00'
    })

    # 10.2 PATIENT_CHECK_IN
    await asyncio.sleep(1)
    print(f"\n[Simulation Step] Patient {patient_id_3} physically arrives at the facility and checks in")
    ReceptionNavigationRoom.broadcast('PATIENT_CHECK_IN', {
        'patientId': patient_id_3
    })

    # 10.3 DOCTOR_ROOM_CHANGE (Dr. Anita Desai relocates to Room 405 on 4th Floor)
    await asyncio.sleep(1)
    print(f"\n[Simulation Step] {doctor_name} clinic room is updated dynamically")
    ReceptionNavigationRoom.broadcast('DOCTOR_ROOM_CHANGE', {
        'doctorId': doctor_id,
        'room': 'Room 405',
        'floor': '4th Floor'
    })

    # 10.4 Patient checks in again or requests navigation to see doctor again to check dynamic room route update
    await asyncio.sleep(1)
    print(f"\n[Simulation Step] Patient {patient_id_3} requests navigation guidance again after doctor relocation")
    ReceptionNavigationRoom.broadcast('NAVIGATE_TO_ROOM', {
        'patientId': patient_id_3,
        'doctorId': doctor_id,
        'currentLocation': 'Reception Desk'
    })

    # 11. Simulating Clinical-Consult-Room Workflow
    await asyncio.sleep(1)
    print("\n--- Simulating Clinical-Consult-Room Workflow ---")

    # 11.1 SUMMARIZE_PATIENT_HISTORY
    print(f"\n[Simulation Step] Doctor requests compiled history for patient {patient_id_3}")
    ClinicalConsultRoom.broadcast('SUMMARIZE_PATIENT_HISTORY', {
        'patientId': patient_id_3,
        'history': ['Hypertension since 2022', 'Penicillin allergy'],
        'tests': [
            { 'name': 'ECG', 'date': '2025-05-15', 'result': 'Sinus rhythm' }
        ],
        'surgeries': []
    })

    # 11.2 PRESCRIPTION_WRITTEN (Available medicine)
    await asyncio.sleep(1)
    print(f"\n[Simulation Step] Doctor writes prescription for available medicine: {med_in_stock}")
    ClinicalConsultRoom.broadcast('PRESCRIPTION_WRITTEN', {
        'patientId': patient_id_3,
        'prescription': { 'medicine': med_in_stock }
    })

    # 11.3 PRESCRIPTION_WRITTEN (Out-of-stock medicine)
    await asyncio.sleep(1)
    print(f"\n[Simulation Step] Doctor writes prescription for out-of-stock medicine: {med_out_of_stock}")
    ClinicalConsultRoom.broadcast('PRESCRIPTION_WRITTEN', {
        'patientId': patient_id_3,
        'prescription': { 'medicine': med_out_of_stock }
    })

    # Wait for clinical consult async tasks to resolve
    await asyncio.sleep(4)

    # 12. Simulating Pharmacy-Inventory-Room Workflow
    print("\n--- Simulating Pharmacy-Inventory-Room Workflow ---")

    # 12.1 CHECK_MEDICINE_AVAILABILITY (Available medicine)
    print(f"\n[Simulation Step] Check availability for {med_in_stock}")
    PharmacyInventoryRoom.broadcast('CHECK_MEDICINE_AVAILABILITY', {
        'patientId': patient_id_3,
        'medicine': med_in_stock
    })

    # 12.2 CHECK_MEDICINE_AVAILABILITY (Out-of-stock medicine)
    await asyncio.sleep(1)
    print(f"\n[Simulation Step] Check availability for {med_out_of_stock}")
    PharmacyInventoryRoom.broadcast('CHECK_MEDICINE_AVAILABILITY', {
        'patientId': patient_id_3,
        'medicine': med_out_of_stock
    })

    # 12.3 ROUTE_TO_PHARMACY (1st usage in this room)
    await asyncio.sleep(1)
    print(f"\n[Simulation Step] Route {med_in_stock} order to Pharmacy (1st usage)")
    PharmacyInventoryRoom.broadcast('ROUTE_TO_PHARMACY', {
        'patientId': patient_id_3,
        'prescription': { 'medicine': med_in_stock }
    })

    # 12.4 ROUTE_TO_PHARMACY (2nd usage in this room -> triggers warning)
    await asyncio.sleep(1)
    print(f"\n[Simulation Step] Route {med_in_stock} order to Pharmacy again (2nd usage -> triggers warning)")
    PharmacyInventoryRoom.broadcast('ROUTE_TO_PHARMACY', {
        'patientId': patient_id_3,
        'prescription': { 'medicine': med_in_stock }
    })

    # Wait for final async tasks to resolve
    await asyncio.sleep(4)

    # 13. Generate Clinic Audit Report from Telemetry Agent
    print("\n--- Generating Clinic Audit Report ---")
    print(telemetry_agent.generate_audit_report())
    print("--------------------------------------")

    if use_real_band:
        from src.band_config import BandSDK
        await BandSDK.stop_real_band()

if __name__ == "__main__":
    asyncio.run(main())


