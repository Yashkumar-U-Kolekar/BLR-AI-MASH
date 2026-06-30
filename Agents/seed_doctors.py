import os
from dotenv import load_dotenv
load_dotenv()
import requests
import uuid

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
HEADERS = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json"
}

NEW_DOCTORS = [
    {"name": "Dr. Emily Roberts", "specialty": "Dermatology", "room": "Room 401"},
    {"name": "Dr. David Kim", "specialty": "Pediatrics", "room": "Room 402"},
    {"name": "Dr. Lisa Wong", "specialty": "Orthopedics", "room": "Room 403"},
    {"name": "Dr. Mark Spencer", "specialty": "Ophthalmology", "room": "Room 404"},
    {"name": "Dr. Anita Desai", "specialty": "Psychiatry", "room": "Room 405"},
    {"name": "Dr. John Clark", "specialty": "Oncology", "room": "Room 406"},
    {"name": "Dr. Sarah Patel", "specialty": "Emergency Medicine", "room": "ER-1"},
    {"name": "Dr. Robert Singh", "specialty": "ENT", "room": "Room 407"},
    {"name": "Dr. William Foster", "specialty": "Urology", "room": "Room 408"}
]

def seed_doctors():
    for doc in NEW_DOCTORS:
        doc_id = str(uuid.uuid4())
        
        # 1. Insert into profiles
        profile_data = {
            "id": doc_id,
            "full_name": doc["name"],
            "role": "doctor",
            "contact_number": "(555) 000-0000"
        }
        res_profile = requests.post(f"{SUPABASE_URL}/rest/v1/profiles", headers=HEADERS, json=profile_data)
        if res_profile.status_code not in (200, 201):
            print(f"Failed to insert profile {doc['name']}: {res_profile.text}")
            continue

        # 2. Insert into doctor_details
        details_data = {
            "doctor_id": doc_id,
            "specialty": doc["specialty"],
            "room_number": doc["room"],
            "is_available": True
        }
        res_details = requests.post(f"{SUPABASE_URL}/rest/v1/doctor_details", headers=HEADERS, json=details_data)
        if res_details.status_code not in (200, 201):
            print(f"Failed to insert details {doc['name']}: {res_details.text}")
            continue
            
        print(f"Successfully added {doc['name']} ({doc['specialty']})")

if __name__ == "__main__":
    print("Seeding new doctors...")
    seed_doctors()
    print("Done!")
