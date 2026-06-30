import os
from dotenv import load_dotenv
load_dotenv()
import requests

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

res_meds = requests.get(f"{SUPABASE_URL}/rest/v1/medicine_inventory?limit=2", headers=headers)
meds = res_meds.json()

p_id = "a39f21c0-af01-4e62-8172-d2026ffcd51b"

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
