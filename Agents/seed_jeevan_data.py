import os
from dotenv import load_dotenv
load_dotenv()
import requests
import json

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# 1. Get Jeevan's ID
print("Fetching jeevan's profile...")
res = requests.get(f"{SUPABASE_URL}/rest/v1/profiles?full_name=eq.jeevan", headers=headers)
jeevan_id = res.json()[0]["id"]
print(f"Jeevan ID: {jeevan_id}")

# 2. Insert records
records = [
    {
        "patient_id": jeevan_id,
        "record_type": "vitals",
        "description": json.dumps({"bloodPressure": "120/80", "heartRate": "72", "weight": "165 lbs", "temperature": "98.6°F"})
    },
    {
        "patient_id": jeevan_id,
        "record_type": "allergy",
        "description": json.dumps({"allergen": "Penicillin", "reaction": "Hives and swelling", "severity": "High"})
    },
    {
        "patient_id": jeevan_id,
        "record_type": "chronic_condition",
        "description": "Asthma (Mild persistent)"
    },
    {
        "patient_id": jeevan_id,
        "record_type": "chronic_condition",
        "description": "Hypertension"
    },
    {
        "patient_id": jeevan_id,
        "record_type": "test_result",
        "description": json.dumps({"date": "2026-05-10", "testName": "Complete Blood Count (CBC)", "result": "Normal", "action": "None"})
    },
    {
        "patient_id": jeevan_id,
        "record_type": "surgical_history",
        "description": json.dumps({"procedure": "Appendectomy", "date": "2018", "notes": "No complications"})
    }
]

print("Seeding medical records...")
for rec in records:
    r = requests.post(f"{SUPABASE_URL}/rest/v1/medical_records", json=rec, headers=headers)
    if r.status_code >= 300:
        print(f"Failed to insert {rec['record_type']}: {r.text}")
    else:
        print(f"Inserted {rec['record_type']} successfully.")

print("Done seeding jeevan's data!")
