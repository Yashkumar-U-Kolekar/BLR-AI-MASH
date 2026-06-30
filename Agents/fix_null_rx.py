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

# 1. Get a valid medicine_id
r = requests.get(f"{SUPABASE_URL}/rest/v1/medicine_inventory?limit=1", headers=headers)
if r.status_code == 200 and len(r.json()) > 0:
    med_id = r.json()[0]['id']
    med_name = r.json()[0]['medicine_name']
    
    # 2. Update prescription_items where medicine_id is null
    update_res = requests.patch(f"{SUPABASE_URL}/rest/v1/prescription_items?medicine_id=is.null", headers=headers, json={"medicine_id": med_id})
    print(f"Updated items to {med_name}. Status: {update_res.status_code}")
else:
    print("Could not fetch a valid medicine ID.")
