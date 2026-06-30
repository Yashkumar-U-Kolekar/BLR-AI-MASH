import asyncio
from dotenv import load_dotenv

load_dotenv()

from src.summary_agent import SummaryAgent
from src.doctor_agent import DoctorAssistantAgent

DOCTOR_ID = "a6bb7c5b-ef00-4ea7-8b01-b66b8df815bd"
DOCTOR_NAME = "Dr. Smith"

def extract_text(content) -> str:
    """Robustly extract plain text from LangChain message content."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, dict):
                parts.append(part.get("text", ""))
            elif isinstance(part, str):
                parts.append(part)
        return "".join(parts)
    return str(content)

async def main():
    print("Initializing Doctor Agent...")
    try:
        # SummaryAgent must be in the room to respond to PATIENT_SUMMARY_REQUESTED
        summary_agent = SummaryAgent()
        agent = DoctorAssistantAgent(DOCTOR_ID, DOCTOR_NAME)
        # Pre-load the schedule into the patient name→UUID map
        await agent.load_schedule_to_patient_map()
    except Exception as e:
        print(f"Failed to initialize agent: {e}")
        import traceback; traceback.print_exc()
        return

    print("\n" + "="*50)
    print(f"Welcome to M.A.S.H Doctor Dashboard - {DOCTOR_NAME}")
    print("Type 'exit' or 'quit' to stop.")
    print("="*50 + "\n")
    
    messages = []
    
    print("Agent is preparing your daily summary...")
    messages.append({"role": "user", "content": f"Good morning. Please welcome me to my dashboard and give me a brief summary of my appointments and duties for today. My doctor_id is {DOCTOR_ID}."})
    
    updated_messages = await agent.process_doctor_query(messages)
    ai_msg = updated_messages[-1]
    print(f"\nAssistant: {extract_text(ai_msg.content)}\n")
    messages = updated_messages
    
    while True:
        try:
            if agent.pending_notifications:
                print(f"[System: {len(agent.pending_notifications)} new notification(s) pending]")
                
            user_input = input("Doctor: ")
            if not user_input.strip():
                continue
            if user_input.lower() in ['exit', 'quit']:
                break
                
            messages.append({"role": "user", "content": user_input})
            print("Assistant is thinking...")
            
            updated_messages = await agent.process_doctor_query(messages)
            
            ai_msg = updated_messages[-1]
            print(f"\nAssistant: {extract_text(ai_msg.content)}\n")
            messages = updated_messages
            
        except KeyboardInterrupt:
            print("\nExiting...")
            break
        except Exception as e:
            print(f"\n[Error] {e}")
            import traceback; traceback.print_exc()
            break

if __name__ == "__main__":
    asyncio.run(main())
