import asyncio
from dotenv import load_dotenv

# Load env variables
load_dotenv()

from src.patient_agent import PatientManagementAgent
from src.registration_agent import RegistrationAgent

async def main():
    print("Initializing Multi-Agent System...")
    try:
        # Initialize the backend orchestration agents so they listen to the P2P room events
        registration_agent = RegistrationAgent()
        
        # Initialize the patient interface brain
        agent = PatientManagementAgent()
    except Exception as e:
        print(f"Failed to initialize agents: {e}")
        return

    print("\n" + "="*50)
    print("Welcome to M.A.S.H Patient Interaction CLI")
    print("Type 'exit' or 'quit' to stop.")
    print("="*50 + "\n")
    
    messages = []
    
    while True:
        try:
            user_input = input("Patient: ")
            if not user_input.strip():
                continue
            if user_input.lower() in ['exit', 'quit']:
                break
                
            messages.append({"role": "user", "content": user_input})
            
            print("Agent is thinking (and talking to Registration Agent)...")
            updated_messages = await agent.process_patient_query(messages)
            
            # The last message is the AI response
            ai_msg = updated_messages[-1]
            content = ai_msg.content
            if isinstance(content, list):
                # Gemini sometimes returns a list of dictionaries for text parts
                text_parts = [part.get("text", "") for part in content if isinstance(part, dict) and "text" in part]
                content = "".join(text_parts) if text_parts else str(content)
                
            print(f"\nM.A.S.H Assistant: {content}\n")
            
            messages = updated_messages
            
        except KeyboardInterrupt:
            print("\nExiting...")
            break
        except Exception as e:
            print(f"\n[Error] {e}")
            break

if __name__ == "__main__":
    asyncio.run(main())
