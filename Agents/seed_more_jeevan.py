import os
from dotenv import load_dotenv
load_dotenv()
import requests
import json
import uuid

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# 1. Get Jeevan's ID
res = requests.get(f"{SUPABASE_URL}/rest/v1/profiles?full_name=eq.jeevan", headers=headers)
jeevan_id = res.json()[0]["id"]
print(f"Jeevan ID: {jeevan_id}")

# 2. Get Doctor's ID
res_doc = requests.get(f"{SUPABASE_URL}/rest/v1/profiles?role=eq.doctor", headers=headers)
doc_id = res_doc.json()[0]["id"]

# 3. Get some medicines
res_meds = requests.get(f"{SUPABASE_URL}/rest/v1/medicine_inventory?limit=2", headers=headers)
meds = res_meds.json()

# 4. Insert ai_summary
summary_text = "Patient is a 34-year-old male presenting with well-managed asthma and hypertension. Recent CBC is normal. Maintains a stable blood pressure on current medication, though monitoring is recommended. No recent surgical interventions since an appendectomy in 2018. Known severe allergy to Penicillin."
summary_rec = {
    "patient_id": jeevan_id,
    "record_type": "ai_summary",
    "description": summary_text
}
requests.post(f"{SUPABASE_URL}/rest/v1/medical_records", json=summary_rec, headers=headers)
print("Inserted ai_summary")

# 5. Insert prescriptions
presc = {
    "patient_id": jeevan_id,
    "doctor_id": doc_id,
    "status": "active",
    "notes": "Take with food.",
    "doctor_comments": "Regular refill for asthma."
}
r_p = requests.post(f"{SUPABASE_URL}/rest/v1/prescriptions", json=presc, headers=headers)
p_id = r_p.json()[0]["id"]
print(f"Inserted prescription {p_id}")

# 6. Insert prescription items
items = [
    {
        "prescription_id": p_id,
        "medicine_id": meds[0]["id"],
        "dosage": "500mg - Morning",
        "quantity": 30
    },
    {
        "prescription_id": p_id,
        "medicine_id": meds[1]["id"],
        "dosage": "2 puffs - As needed",
        "quantity": 1
    }
]
for item in items:
    requests.post(f"{SUPABASE_URL}/rest/v1/prescription_items", json=item, headers=headers)
print("Inserted prescription items")
