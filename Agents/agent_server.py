import os
import asyncio
from contextlib import asynccontextmanager
from typing import List
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from typing import Optional
from src.summary_agent import SummaryAgent
from src.doctor_agent import DoctorAssistantAgent
from src.pharmacist_agent import PharmacistAssistantAgent
from src.patient_agent import PatientManagementAgent
from src.registration_agent import RegistrationAgent
from src.stock_agent import StockManagementAgent
from src.navigation_agent import PatientNavigationAgent

summary_agent = None
doctor_agents = {}
pharmacist_agent = None
patient_agent = None
registration_agent = None
stock_agent = None
navigation_agent = None

async def get_or_create_doctor_agent(doctor_id: str, doctor_name: str):
    if doctor_id not in doctor_agents:
        try:
            print(f"Initializing DoctorAgent for {doctor_name} ({doctor_id})...")
            agent = DoctorAssistantAgent(doctor_id, doctor_name)
            await agent.load_schedule_to_patient_map()
            doctor_agents[doctor_id] = agent
            print(f"DoctorAgent for {doctor_name} ({doctor_id}) initialized successfully.")
        except Exception as e:
            print(f"Failed to initialize DoctorAgent for {doctor_name}: {e}")
            import traceback
            traceback.print_exc()
    return doctor_agents.get(doctor_id)

@asynccontextmanager
async def lifespan(app: FastAPI):
    global summary_agent, pharmacist_agent, patient_agent, registration_agent, stock_agent, navigation_agent
    use_real_band = os.getenv("USE_REAL_BAND", "false").lower() == "true"
    if use_real_band:
        from src.band_config import BandSDK
        print("Connecting to real Band platform...")
        await BandSDK.init_real_band()
    
    print("Initializing Agents...")
    try:
        summary_agent = SummaryAgent()
        # Pre-initialize Dr. Smith agent
        await get_or_create_doctor_agent("a6bb7c5b-ef00-4ea7-8b01-b66b8df815bd", "Dr. Smith")
        pharmacist_agent = PharmacistAssistantAgent()
        patient_agent = PatientManagementAgent()
        registration_agent = RegistrationAgent()
        navigation_agent = PatientNavigationAgent()
        print("Agents initialized successfully (Doctor + Pharmacist + Patient + Registration + Navigation).")
        stock_agent = StockManagementAgent()
        print("Agents initialized successfully (Doctor + Pharmacist + Stock).")
    except Exception as e:
        print(f"Failed to initialize agents: {e}")
        import traceback
        traceback.print_exc()
    
    yield
    
    if use_real_band:
        from src.band_config import BandSDK
        await BandSDK.stop_real_band()

app = FastAPI(lifespan=lifespan)

ALLOWED_ORIGINS = [
    "https://m-a-s-h-frontend.onrender.com",
    "http://localhost:5173",
    "http://localhost:3000",
]
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url and frontend_url not in ALLOWED_ORIGINS:
    ALLOWED_ORIGINS.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatMessage(BaseModel):
    role: str
    text: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage]
    doctorId: Optional[str] = "a6bb7c5b-ef00-4ea7-8b01-b66b8df815bd"
    doctorName: Optional[str] = "Dr. Smith"
    patientId: Optional[str] = None
    patientName: Optional[str] = None

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

@app.post("/api/doctor-chat")
async def doctor_chat(req: ChatRequest):
    print(f"[DEBUG] Incoming doctor-chat message: '{req.message}' for {req.doctorName} ({req.doctorId})")
    
    agent = await get_or_create_doctor_agent(req.doctorId, req.doctorName)
    if not agent:
        raise HTTPException(status_code=503, detail="Doctor Agent is not initialized yet.")
    
    # Map input history to LangGraph format
    langgraph_messages = []
    for h in req.history:
        role = "user" if h.role == "user" else "assistant"
        langgraph_messages.append({"role": role, "content": h.text})
    
    langgraph_messages.append({"role": "user", "content": req.message})
    
    from src.band_config import send_display_message
    try:
        from src.band_config import MOCK_ROOMS
        doc_room = next((r for name, r in MOCK_ROOMS.items() if name == "Doctor-Dashboard-Room"), None)
        doc_room_id = doc_room.id if doc_room else None
        if doc_room_id:
            await send_display_message(doc_room_id, f"**DOCTOR:** {req.message}")

        # Clear actions before query (handled in process_doctor_query as well)
        agent.pending_actions = []

        updated_messages = await agent.process_doctor_query(langgraph_messages)
        last_msg = updated_messages[-1]
        reply = extract_text(last_msg.content)

        if doc_room_id:
            await send_display_message(doc_room_id, f"**Doctor:** {reply}")
            
        # Get the first pending action if any was triggered by a tool
        action = agent.pending_actions[0] if agent.pending_actions else None
        
        return {"reply": reply, "action": action}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/pharmacist-chat")
async def pharmacist_chat(req: ChatRequest):
    print(f"[DEBUG] Incoming pharmacist-chat message: '{req.message}'")
    if not pharmacist_agent:
        raise HTTPException(status_code=503, detail="Pharmacist Agent is not initialized yet.")
    
    # Map input history to LangGraph format
    langgraph_messages = []
    for h in req.history:
        role = "user" if h.role == "user" else "assistant"
        langgraph_messages.append({"role": role, "content": h.text})
    
    langgraph_messages.append({"role": "user", "content": req.message})
    
    try:
        pharmacist_agent.pending_actions = []
        
        updated_messages = await pharmacist_agent.process_pharmacist_query(langgraph_messages)
        last_msg = updated_messages[-1]
        reply = extract_text(last_msg.content)
        
        action = pharmacist_agent.pending_actions[0] if pharmacist_agent.pending_actions else None
        
        return {"reply": reply, "action": action}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/patient-chat")
async def patient_chat(req: ChatRequest):
    print(f"[DEBUG] Incoming patient-chat message: '{req.message}' patientId='{req.patientId}' patientName='{req.patientName}'")
    if not patient_agent:
        raise HTTPException(status_code=503, detail="Patient Agent is not initialized yet.")
    if not req.patientId or not req.patientName:
        return {"reply": "Please log in to use the patient assistant. Your identity is required to book or manage appointments.", "action": None}

    # Map input history to LangGraph format
    langgraph_messages = []
    for h in req.history:
        role = "user" if h.role == "user" else "assistant"
        langgraph_messages.append({"role": role, "content": h.text})
    
    langgraph_messages.append({"role": "user", "content": req.message})
    
    from src.band_config import send_display_message
    try:
        from src.band_config import MOCK_ROOMS
        room = next((r for name, r in MOCK_ROOMS.items() if name == "Patient-Management-Room"), None)
        room_id = room.id if room else None
        if room_id:
            await send_display_message(room_id, f"**PATIENT:** {req.message}")

        updated_messages = await patient_agent.process_patient_query(
            langgraph_messages,
            patient_id=req.patientId,
            patient_name=req.patientName
        )
        last_msg = updated_messages[-1]
        reply = extract_text(last_msg.content)

        if room_id:
            await send_display_message(room_id, f"**CarePulse:** {reply}")
        
        from src.patient_agent import PENDING_ACTIONS
        action = PENDING_ACTIONS[0] if PENDING_ACTIONS else None
        
        return {"reply": reply, "action": action}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
@app.post("/api/prescription-event")
async def prescription_event(req: dict = Body(...)):
    """Called by the backend when a prescription is sent to pharmacy.
    Triggers the StockManagementAgent to deduct Supabase stock and raise demand alerts."""
    if not stock_agent:
        return {"status": "agent_not_ready"}
    
    patient_id = req.get("patient_id", "unknown")
    items = req.get("items", [])
    
    # Fire ROUTE_TO_PHARMACY for each prescription item so the stock agent tracks usage
    from src.band_config import PharmacyInventoryRoom
    for item in items:
        medicine_name = item.get("name", item.get("medicine_name", ""))
        if medicine_name:
            payload = {
                "patientId": patient_id,
                "prescription": {"medicine": medicine_name},
            }
            PharmacyInventoryRoom.broadcast_local("ROUTE_TO_PHARMACY", payload)
    
    return {"status": "ok", "items_triggered": len(items)}


@app.get("/api/telemetry/state")
async def get_telemetry_state(doctorId: Optional[str] = None, doctorName: Optional[str] = None):
    if doctorId and doctorName:
        await get_or_create_doctor_agent(doctorId, doctorName)
        
    from src.band_config import MOCK_ROOMS
    rooms_data = []
    
    agent_roles = {
        "DoctorAssistantAgent": "Clinical AI",
        "SummaryAgent": "Data Summarization",
        "PharmacistAssistantAgent": "Pharmacy AI",
        "MedicineManagementAgent": "Inventory Sync",
        "ReceptionAgent": "Navigation AI"
    }

    for room_name, room_obj in MOCK_ROOMS.items():
        agents = []
        for agent in room_obj.agents:
            if agent.name.startswith("UI-Listener-"):
                continue
            role = "Clinical AI" if agent.name.startswith("DoctorAgent_") else agent_roles.get(agent.name, "Agent")
            agents.append({
                "id": agent.id,
                "name": agent.name,
                "role": role,
                "status": "active"
            })
        rooms_data.append({
            "id": room_obj.id,
            "name": room_name,
            "agents": agents,
            "events": []
        })
    return rooms_data

@app.websocket("/api/telemetry-stream")
async def websocket_telemetry(websocket: WebSocket, doctorId: Optional[str] = None, doctorName: Optional[str] = None):
    await websocket.accept()
    from src.band_config import BandSDK, TelemetryAuditRoom
    import datetime
    
    if doctorId and doctorName:
        await get_or_create_doctor_agent(doctorId, doctorName)
        
    q = asyncio.Queue()
    
    listener_agent = BandSDK.create_agent(f"UI-Listener-{id(websocket)}")
    
    def on_agent_joined(payload):
        q.put_nowait({"type": "AGENT_JOINED", "payload": payload, "timestamp": datetime.datetime.utcnow().isoformat() + "Z"})
    def on_state_updated(payload):
        q.put_nowait({"type": "STATE_UPDATED", "payload": payload, "timestamp": datetime.datetime.utcnow().isoformat() + "Z"})
    def on_human_intervention(payload):
        q.put_nowait({"type": "HUMAN_INTERVENTION_REQUESTED", "payload": payload, "timestamp": datetime.datetime.utcnow().isoformat() + "Z"})
    def on_resolved(payload):
        q.put_nowait({"type": "RESOLVED", "payload": payload, "timestamp": datetime.datetime.utcnow().isoformat() + "Z"})
    def on_security_allowed(payload):
        q.put_nowait({"type": "SECURITY_ALLOWED", "payload": payload, "timestamp": datetime.datetime.utcnow().isoformat() + "Z"})
    def on_security_blocked(payload):
        q.put_nowait({"type": "SECURITY_BLOCKED", "payload": payload, "timestamp": datetime.datetime.utcnow().isoformat() + "Z"})
        
    listener_agent.on_event("AGENT_JOINED", on_agent_joined)
    listener_agent.on_event("STATE_UPDATED", on_state_updated)
    listener_agent.on_event("HUMAN_INTERVENTION_REQUESTED", on_human_intervention)
    listener_agent.on_event("RESOLVED", on_resolved)
    listener_agent.on_event("SECURITY_ALLOWED", on_security_allowed)
    listener_agent.on_event("SECURITY_BLOCKED", on_security_blocked)
    
    TelemetryAuditRoom.join(listener_agent)
    
    try:
        while True:
            event = await q.get()
            await websocket.send_json(event)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        if listener_agent in TelemetryAuditRoom.agents:
            TelemetryAuditRoom.agents.remove(listener_agent)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("agent_server:app", host="0.0.0.0", port=port, reload=False)

