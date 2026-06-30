import os
import requests
import uuid

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

patients = [
    {
        "id": "fcab6a69-9538-416c-bac5-01308b0910ad", # The ID from the backend logs
        "full_name": "Yash",
        "role": "patient",
        "contact_number": "(555) 000-1111"
    },
    {
        "id": str(uuid.uuid4()),
        "full_name": "jeevan",
        "role": "patient",
        "contact_number": "(555) 222-3333"
    }
]

print("Seeding patients...")

for pat in patients:
    profile_data = {
        "id": pat["id"],
        "full_name": pat["full_name"],
        "role": pat["role"],
        "contact_number": pat["contact_number"]
    }
    r = requests.post(f"{SUPABASE_URL}/rest/v1/profiles", json=profile_data, headers=headers)
    if r.status_code >= 300:
        print(f"Error inserting profile {pat['full_name']}: {r.text}")
    else:
        print(f"Successfully seeded patient {pat['full_name']}")

print("Done seeding patients!")
