import os
import json
import httpx
from typing import Dict, Any, List
from datetime import datetime
from langchain_core.tools import tool
from dotenv import load_dotenv

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

def get_headers() -> Dict[str, str]:
    return {
        "apikey": SUPABASE_ANON_KEY or "",
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}" if SUPABASE_ANON_KEY else ""
    }

def resolve_target_date(date_str: str = None) -> str:
    from datetime import timedelta
    # Offset UTC time to user's local timezone (+05:30)
    local_now = datetime.utcnow() + timedelta(hours=5, minutes=30)
    
    if not date_str:
        return local_now.strftime("%Y-%m-%d")
        
    date_str = str(date_str).strip().lower()
    if date_str in ("today", "today's", "now", "current"):
        return local_now.strftime("%Y-%m-%d")
    elif date_str in ("tomorrow", "tomorrow's", "tom"):
        return (local_now + timedelta(days=1)).strftime("%Y-%m-%d")
    elif date_str in ("day after tomorrow", "day after tom"):
        return (local_now + timedelta(days=2)).strftime("%Y-%m-%d")
    elif date_str in ("yesterday", "yesterday's"):
        return (local_now - timedelta(days=1)).strftime("%Y-%m-%d")
        
    import re
    match = re.search(r'\d{4}-\d{2}-\d{2}', date_str)
    if match:
        return match.group(0)
        
    return local_now.strftime("%Y-%m-%d")

async def fetch_doctors_from_supabase(date_str: str = None) -> List[Dict[str, Any]]:
    """Fetch active doctors and their details from Supabase."""
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        return []
    
    target_date = resolve_target_date(date_str)
        
    url = f"{SUPABASE_URL}/rest/v1/doctor_details?select=doctor_id,specialty,room_number,is_available,profiles(full_name)"
    appts_url = f"{SUPABASE_URL}/rest/v1/appointments?select=doctor_id,scheduled_time&status=in.(scheduled,rescheduled,in_progress)&scheduled_time=gte.{target_date}T00:00:00Z&scheduled_time=lte.{target_date}T23:59:59Z"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=get_headers())
            appts_response = await client.get(appts_url, headers=get_headers())
            
            if response.status_code == 200:
                data = response.json()
                appts_data = []
                if appts_response.status_code == 200:
                    appts_data = appts_response.json()
                    
                doctors = []
                for item in data:
                    doc_id = item.get("doctor_id")
                    
                    booked_times = []
                    for appt in appts_data:
                        if appt.get("doctor_id") == doc_id:
                            st = appt.get("scheduled_time")
                            if st:
                                time_part = st.split("T")[1][:5] if "T" in st else st
                                booked_times.append(time_part)
                                
                    base_slots = ["09:00", "10:00", "14:00", "15:00", "16:00"]
                    available_slots = [slot for slot in base_slots if slot not in booked_times] if item.get("is_available") else []
                    
                    # Filter out past slots if target_date is today in GMT+5:30
                    from datetime import timedelta
                    local_now = datetime.utcnow() + timedelta(hours=5, minutes=30)
                    today_str = local_now.strftime("%Y-%m-%d")
                    if target_date == today_str:
                        current_time_str = local_now.strftime("%H:%M")
                        available_slots = [slot for slot in available_slots if slot > current_time_str]
                    
                    profile = item.get("profiles") or {}
                    doctors.append({
                        "id": doc_id,
                        "name": profile.get("full_name") or "Unknown Doctor",
                        "specialty": item.get("specialty"),
                        "room": item.get("room_number") or "Unknown Room",
                        "availableSlots": available_slots
                    })
                if doctors:
                    return doctors
    except Exception as e:
        print(f"[Supabase Tool Warning] Failed to fetch doctors: {e}")
    
    return [
        {"id": "doc-1", "name": "Dr. James Wilson", "specialty": "Cardiology", "room": "301", "availableSlots": ["14:00", "15:00", "16:00"]},
        {"id": "doc-2", "name": "Dr. Sarah Chen", "specialty": "Neurology", "room": "302", "availableSlots": ["10:00", "14:00"]},
        {"id": "doc-3", "name": "Dr. Michael Torres", "specialty": "General Practice", "room": "105", "availableSlots": ["09:00", "11:00", "15:00"]}
    ]

async def fetch_medical_records_from_supabase(patient_id: str) -> List[Dict[str, Any]]:
    """Fetch medical records for a patient from Supabase."""
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        return []
    
    url = f"{SUPABASE_URL}/rest/v1/medical_records?patient_id=eq.{patient_id}"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=get_headers())
            if response.status_code == 200:
                return response.json()
    except Exception as e:
        print(f"[Supabase Tool Warning] Failed to fetch medical records: {e}")
    return []

async def fetch_medicine_stock_from_supabase(medicine_name: str) -> Dict[str, Any]:
    """Fetch inventory and stock details for a medicine from Supabase."""
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        return {}
    
    # Check for exact match first, or fallback to partial match
    url = f"{SUPABASE_URL}/rest/v1/medicine_inventory?medicine_name=ilike.*{medicine_name.split()[0]}*"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=get_headers())
            if response.status_code == 200:
                data = response.json()
                if data:
                    return data[0]
    except Exception as e:
        print(f"[Supabase Tool Warning] Failed to fetch stock: {e}")
    return {}

async def update_medicine_stock_in_supabase(medicine_name: str, current_stock: int) -> bool:
    """Update stock details for a medicine in Supabase."""
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        return False
    
    # Find the matching medicine ID first
    med_info = await fetch_medicine_stock_from_supabase(medicine_name)
    if not med_info:
        return False
    
    med_id = med_info.get("id")
    url = f"{SUPABASE_URL}/rest/v1/medicine_inventory?id=eq.{med_id}"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.patch(url, headers=get_headers(), json={
                "current_stock": current_stock,
                "last_updated": "now()"
            })
            return response.status_code in (200, 204)
    except Exception as e:
        print(f"[Supabase Tool Warning] Failed to update stock: {e}")
    return False

async def save_patient_summary_to_supabase(patient_id: str, summary: str) -> bool:
    """Save or update the compiled clinical summary in the medical_records table."""
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        return False
    
    # Check if an AI summary already exists for this patient
    check_url = f"{SUPABASE_URL}/rest/v1/medical_records?patient_id=eq.{patient_id}&record_type=eq.ai_summary"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(check_url, headers=get_headers())
            if response.status_code == 200:
                data = response.json()
                if data:
                    # Update existing summary record
                    record_id = data[0].get("id")
                    update_url = f"{SUPABASE_URL}/rest/v1/medical_records?id=eq.{record_id}"
                    update_response = await client.patch(update_url, headers=get_headers(), json={
                        "description": summary,
                        "record_date": "now()"
                    })
                    return update_response.status_code in (200, 204)
                else:
                    # Insert new summary record
                    insert_url = f"{SUPABASE_URL}/rest/v1/medical_records"
                    insert_response = await client.post(insert_url, headers=get_headers(), json={
                        "patient_id": patient_id,
                        "record_type": "ai_summary",
                        "description": summary,
                        "record_date": "now()",
                        "doctor_id": "22222222-2222-2222-2222-222222222222" # Default to Dr. Anita Desai
                    })
                    return insert_response.status_code in (200, 201)
    except Exception as e:
        print(f"[Supabase Tool Warning] Failed to save clinical summary: {e}")
    return False

class PatientNotFoundError(ValueError):
    pass

async def book_appointment_in_supabase(patient_name: str, doctor_id: str, slot_time: str, date: str = None, reason: str = "") -> bool:
    """Book a new appointment in Supabase."""
    import requests
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        print("[Supabase Tool Error] Missing URL or Key")
        return False
        
    print(f"[Supabase Tool] Booking appointment for patient='{patient_name}', doctor_id='{doctor_id}', slot='{slot_time}'")
    
    # Ensure doctor_id is a UUID. If it's a name, look it up.
    import re
    if not re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', doctor_id.lower()):
        # It's a name, clean it up
        clean_name = doctor_id.lower().replace("dr.", "").replace("dr-", "").replace("dr ", "").replace("-", " ").strip()
        search_name = clean_name.split()[0] if clean_name else doctor_id
        print(f"[Supabase Tool] Resolving doctor name '{doctor_id}' -> search_name '{search_name}'")
        try:
            url = f"{SUPABASE_URL}/rest/v1/profiles?full_name=ilike.*{search_name}*&role=eq.doctor"
            res = requests.get(url, headers=get_headers(), timeout=10)
            if res.status_code == 200:
                data = res.json()
                if data:
                    doctor_id = data[0]["id"]
                    print(f"[Supabase Tool] Resolved doctor to UUID {doctor_id}")
                else:
                    print(f"[Supabase Tool Warning] Doctor search returned empty list")
            else:
                print(f"[Supabase Tool Warning] Doctor search failed with status {res.status_code}: {res.text}")
        except Exception as e:
            print(f"[Supabase Tool Warning] Error resolving doctor: {repr(e)}")
    
    # First, lookup patient_id by name (case insensitive)
    patient_id = None
    try:
        search_name = patient_name.split()[0] if patient_name else ""
        if not search_name:
            raise PatientNotFoundError("Patient name cannot be empty.")
        print(f"[Supabase Tool] Resolving patient name '{patient_name}' -> search_name '{search_name}'")
        
        url = f"{SUPABASE_URL}/rest/v1/profiles?full_name=ilike.*{search_name}*&role=eq.patient"
        res = requests.get(url, headers=get_headers(), timeout=10)
        
        if res.status_code == 200:
            data = res.json()
            if data:
                patient_id = data[0]["id"]
                print(f"[Supabase Tool] Resolved patient to UUID {patient_id}")
            else:
                raise PatientNotFoundError(f"Patient '{patient_name}' is not in the database.")
        else:
            print(f"[Supabase Tool Warning] Patient search failed with status {res.status_code}: {res.text}")
            raise PatientNotFoundError(f"Patient '{patient_name}' lookup failed.")
    except PatientNotFoundError:
        raise
    except Exception as e:
        print(f"[Supabase Tool Warning] Error resolving patient: {repr(e)}")
        
    if not patient_id:
        raise PatientNotFoundError(f"Patient '{patient_name}' is not in the database.")
    
    # Format slot_time into a proper timestamp if it is just HH:MM
    if len(slot_time) == 5 and ":" in slot_time:
        target_date = resolve_target_date(date)
        slot_time = f"{target_date}T{slot_time}:00Z"
    
    url = f"{SUPABASE_URL}/rest/v1/appointments"
    try:
        appt_data = {
            "patient_id": patient_id,
            "doctor_id": doctor_id,
            "scheduled_time": slot_time,
            "status": "scheduled"
        }
        print(f"[Supabase Tool] Posting appointment: {appt_data}")
        response = requests.post(url, headers=get_headers(), json=appt_data, timeout=10)
        if response.status_code not in (200, 201):
            print(f"Supabase Booking Error: {response.text}")
        else:
            print("[Supabase Tool] Successfully booked appointment")
        return response.status_code in (200, 201)
    except Exception as e:
        print(f"[Supabase Tool Warning] Failed to book appointment: {repr(e)}")
    return False

async def reschedule_appointment_in_supabase(patient_name: str, new_slot_time: str, date: str = None) -> bool:
    """Reschedule an existing appointment in Supabase."""
    import requests
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        return False
        
    patient_id = None
    try:
        search_name = patient_name.split()[0] if patient_name else ""
        if not search_name:
            raise PatientNotFoundError("Patient name cannot be empty.")
        url = f"{SUPABASE_URL}/rest/v1/profiles?full_name=ilike.*{search_name}*&role=eq.patient"
        res = requests.get(url, headers=get_headers(), timeout=10)
        if res.status_code == 200:
            data = res.json()
            if data:
                patient_id = data[0]["id"]
            else:
                raise PatientNotFoundError(f"Patient '{patient_name}' is not in the database.")
        else:
            raise PatientNotFoundError(f"Patient '{patient_name}' is not in the database.")
    except PatientNotFoundError:
        raise
    except Exception as e:
        print(f"[Supabase Tool Warning] Error resolving patient: {repr(e)}")
        
    if not patient_id:
        raise PatientNotFoundError(f"Patient '{patient_name}' is not in the database.")
        
    if len(new_slot_time) == 5 and ":" in new_slot_time:
        target_date = resolve_target_date(date)
        new_slot_time = f"{target_date}T{new_slot_time}:00Z"
        
    url = f"{SUPABASE_URL}/rest/v1/appointments?patient_id=eq.{patient_id}"
    try:
        response = requests.patch(url, headers=get_headers(), json={
            "scheduled_time": new_slot_time,
            "status": "rescheduled"
        }, timeout=10)
        return response.status_code in (200, 204)
    except Exception as e:
        print(f"[Supabase Tool Warning] Failed to reschedule: {repr(e)}")
    return False

@tool
async def get_doctors(date: str = None) -> list:
    """Fetch a list of available doctors and their schedules. Pass the date in YYYY-MM-DD or relative format (e.g. 'tomorrow')."""
    db_docs = await fetch_doctors_from_supabase(date_str=date)
    docs = db_docs if db_docs else []
    return docs

@tool
async def book_appointment(patient_name: str, doctor_id: str, slot_time: str, date: str = None, reason: str = "") -> str:
    """Book a new appointment for the patient. Pass the doctor's UUID, the time slot (e.g. 10:00), the patient's name, and optionally the date (YYYY-MM-DD or 'tomorrow')."""
    try:
        success = await book_appointment_in_supabase(patient_name, doctor_id, slot_time, date, reason)
        if success:
            return f"Successfully booked appointment for {patient_name} at {slot_time}."
        return "Failed to book appointment. Please try again."
    except PatientNotFoundError as e:
        return str(e)

@tool
async def reschedule_appointment(patient_name: str, new_slot_time: str, date: str = None) -> str:
    """Reschedules an existing appointment for the patient. Pass the patient's name, the new time slot (e.g. 10:00), and optionally the date."""
    try:
        success = await reschedule_appointment_in_supabase(patient_name, new_slot_time, date)
        if success:
            return f"Successfully rescheduled the appointment for {patient_name} to {new_slot_time}."
        else:
            return f"Failed to reschedule the appointment for {patient_name}. Could not find an existing appointment."
    except PatientNotFoundError as e:
        return str(e)

def resolve_doctor_id(doctor_id_or_name: str) -> str:
    if not doctor_id_or_name:
        return "a6bb7c5b-ef00-4ea7-8b01-b66b8df815bd"
    
    val = str(doctor_id_or_name).strip().lower()
    
    # If it looks like a valid UUID, return it
    try:
        import uuid
        uuid.UUID(val)
        return doctor_id_or_name
    except ValueError:
        pass
        
    # If it's a name, map it to the respective doctor's ID
    if "smith" in val or "anita" in val or "desai" in val or "me" in val or "my" in val:
        return "a6bb7c5b-ef00-4ea7-8b01-b66b8df815bd"
    elif "mithun" in val or "nair" in val:
        return "13a4db1b-c1dd-43b2-b1c1-71aa36b5574f"
    elif "kirran" in val or "kumar" in val:
        return "f85362c8-5935-4b2e-bff1-e2779d9d78ae"
    elif "quorum" in val:
        return "edb25638-f9b3-40c9-98dd-1799b17a3561"
        
    return doctor_id_or_name

async def fetch_doctor_schedule_from_supabase(doctor_id: str, date_str: str = None) -> List[Dict[str, Any]]:
    """Fetch the given doctor's appointments and patient details."""
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        return []
    
    doctor_id = resolve_doctor_id(doctor_id)
    
    target_date = resolve_target_date(date_str)
        
    start_time = f"{target_date}T00:00:00Z"
    end_time = f"{target_date}T23:59:59Z"
    
    # Step 1: Fetch appointments (no join - keep it simple)
    url = f"{SUPABASE_URL}/rest/v1/appointments?doctor_id=eq.{doctor_id}&status=in.(scheduled,in_progress)&scheduled_time=gte.{start_time}&scheduled_time=lte.{end_time}&select=scheduled_time,status,patient_id&order=scheduled_time.asc"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=get_headers())
            print(f"[DEBUG schedule] status={response.status_code} body={response.text[:300]}")
            if response.status_code != 200:
                return []
            appointments = response.json()
            if not appointments:
                return []

            # Step 2: Fetch patient names for those patient_ids
            patient_ids = list({a["patient_id"] for a in appointments if a.get("patient_id")})
            patient_map: Dict[str, str] = {}
            if patient_ids:
                ids_filter = ",".join(patient_ids)
                profiles_url = f"{SUPABASE_URL}/rest/v1/profiles?id=in.({ids_filter})&select=id,full_name"
                pr = await client.get(profiles_url, headers=get_headers())
                if pr.status_code == 200:
                    for p in pr.json():
                        patient_map[p["id"]] = p.get("full_name", "Unknown Patient")

            parsed_schedule = []
            for item in appointments:
                st = item.get("scheduled_time")
                time_str = st.replace("+00", "").replace("+05:30", "") if st else "Unknown"
                parsed_schedule.append({
                    "time": time_str,
                    "status": item.get("status"),
                    "patientName": patient_map.get(item.get("patient_id", ""), "Unknown Patient"),
                    "patientId": item.get("patient_id", ""),
                })
            return parsed_schedule
    except Exception as e:
        print(f"[Supabase Tool Warning] Failed to fetch schedule: {e}")
    return []

@tool
async def get_doctor_schedule(doctor_id: str, date: str = None) -> str:
    """Fetch the schedule and appointments for a specific doctor. Pass the doctor's UUID. Optionally pass a date string in YYYY-MM-DD format (defaults to today)."""
    print(f"[DEBUG TOOL get_doctor_schedule] doctor_id={doctor_id}, date={date}")
    schedule = await fetch_doctor_schedule_from_supabase(doctor_id, date)
    if not schedule:
        target_date = date if date else datetime.utcnow().strftime("%Y-%m-%d")
        return f"No appointments found for {target_date}."
    return json.dumps(schedule, indent=2)

async def create_prescription_in_supabase(patient_name: str, items: List[Dict[str, Any]], doctor_comments: str = None, doctor_id: str = None) -> bool:
    """Helper to create prescription by calling the backend api."""
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        print("[Prescription] ERROR: SUPABASE_URL or SUPABASE_ANON_KEY not set")
        return False
        
    patient_id = None
    try:
        async with httpx.AsyncClient() as client:
            search_name = patient_name.strip()
            print(f"[Prescription] Resolving patient name: '{search_name}'")
            res = await client.get(
                f"{SUPABASE_URL}/rest/v1/profiles?full_name=ilike.*{search_name}*&role=eq.patient", 
                headers=get_headers()
            )
            if res.status_code == 200 and res.json():
                patient_id = res.json()[0]["id"]
                matched_name = res.json()[0].get("full_name", "?")
                print(f"[Prescription] Resolved patient: '{matched_name}' → ID: {patient_id}")
            else:
                first_word = search_name.split()[0]
                print(f"[Prescription] Full name not found, trying first word: '{first_word}'")
                res = await client.get(
                    f"{SUPABASE_URL}/rest/v1/profiles?full_name=ilike.*{first_word}*&role=eq.patient", 
                    headers=get_headers()
                )
                if res.status_code == 200 and res.json():
                    patient_id = res.json()[0]["id"]
                    matched_name = res.json()[0].get("full_name", "?")
                    print(f"[Prescription] Resolved patient (partial): '{matched_name}' → ID: {patient_id}")
    except Exception as e:
        print(f"[Prescription] ERROR resolving patient by name: {e}")
        
    if not patient_id:
        print(f"[Prescription] FAILED: Could not resolve patient_id for '{patient_name}'")
        return False
 
    backend_url = "http://127.0.0.1:3000/api/prescriptions/send-to-pharmacy"
    payload = {
        "patient_id": patient_id,
        "doctor_id": doctor_id or "a6bb7c5b-ef00-4ea7-8b01-b66b8df815bd",
        "items": items,
        "doctor_comments": doctor_comments
    }
    
    print(f"[Prescription] Sending to backend: {json.dumps(payload, indent=2)}")
    
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(backend_url, json=payload)
            print(f"[Prescription] Backend response: status={res.status_code} body={res.text[:500]}")
            if res.status_code in (200, 201):
                print(f"[Prescription] SUCCESS: Prescription pushed to Supabase for {patient_name}")
                return True
            else:
                print(f"[Prescription] FAILED: Backend returned {res.status_code}")
                return False
    except Exception as e:
        print(f"[Prescription] ERROR sending to backend: {e}")
    return False

@tool
async def create_prescription(patient_name: str, items: List[Dict[str, Any]], doctor_comments: str = None) -> str:
    """Create a new prescription for a patient and send it to the pharmacy database.
    Use this when the doctor confirms the prescription is ready to be written, processed, or sent.
    Args:
        patient_name: The name of the patient (e.g. "Bob Smith")
        items: A list of prescription items, where each item has keys:
            - "name": The exact name of the medicine (e.g. "Amoxicillin 500mg Capsule" or "Albuterol HFA")
            - "dosage": The dosage string (e.g. "500mg" or "1 inhalation")
            - "frequency": The frequency string (e.g. "twice daily" or "before food")
            - "duration": The duration in days as an integer (e.g. 3)
            - "quantity": The total quantity to dispense as an integer (e.g. 6)
        doctor_comments: Optional additional instructions or comments from the doctor.
    """
    success = await create_prescription_in_supabase(patient_name, items, doctor_comments)
    if success:
        return f"Successfully created prescription for {patient_name} in Supabase and pushed it to the pharmacy."
    return f"Failed to create prescription for {patient_name}. Ensure the patient exists and the backend is running."

