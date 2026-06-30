import asyncio
from src.supabase_tools import fetch_doctors_from_supabase
import httpx
import os
from dotenv import load_dotenv

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

async def test():
    appts_url = f"{SUPABASE_URL}/rest/v1/appointments?select=doctor_id,scheduled_time,status"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
    }
    async with httpx.AsyncClient() as client:
        res = await client.get(appts_url, headers=headers)
        print("Appointments in DB:")
        print(res.json())

    doctors = await fetch_doctors_from_supabase("tomorrow")
    print("\nDoctors availability parsed for TOMORROW:")
    import json
    print(json.dumps(doctors, indent=2))

asyncio.run(test())
