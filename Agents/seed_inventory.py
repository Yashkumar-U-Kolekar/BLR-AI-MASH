import os
from dotenv import load_dotenv
load_dotenv()
import requests
import re
import json

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

with open("../Database/supabase/seed.ts", "r", encoding="utf-8") as f:
    content = f.read()

# Extract MEDICINES array
match = re.search(r"const MEDICINES = (\[.*?\]);", content, re.DOTALL)
if match:
    medicines_json = match.group(1)
    # The JSON in seed.ts might have trailing commas or unquoted keys if it's JS, but looking at the snippet, keys are quoted: "id": "...", "name": "...", "stock": ...
    # Let's clean it up just in case
    # Actually it's standard JSON looking:
    medicines = json.loads(medicines_json)
    
    print(f"Found {len(medicines)} medicines.")
    for med in medicines:
        payload = {
            "id": med["id"],
            "medicine_name": med["name"],
            "current_stock": med["stock"],
            "reorder_threshold": 20
        }
        r = requests.post(f"{SUPABASE_URL}/rest/v1/medicine_inventory", json=payload, headers=headers)
        if r.status_code >= 300:
            print(f"Failed to insert {med['name']}: {r.text}")
        else:
            print(f"Inserted {med['name']} successfully.")
    print("Done seeding inventory!")
else:
    print("Could not find MEDICINES array.")
