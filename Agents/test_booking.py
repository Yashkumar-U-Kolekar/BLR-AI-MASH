import asyncio
from src.supabase_tools import book_appointment_in_supabase

async def main():
    print("Testing book_appointment_in_supabase...")
    res = await book_appointment_in_supabase(
        patient_name="Ganesh",
        doctor_id="dr-emily-roberts",
        slot_time="10:00",
        date="today",
        reason="skin problem"
    )
    print("Result:", res)

asyncio.run(main())
