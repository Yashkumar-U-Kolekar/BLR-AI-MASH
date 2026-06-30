import asyncio
import time
import os
import json
import re
from typing import Callable, Any, Dict, List, Set
from dotenv import load_dotenv
from src.telemetry import Telemetry

def clean_mentions(content: str) -> str:
    if not content:
        return content
    while True:
        stripped = content.strip()
        match = re.match(r'^@\[\[[^\]]+\]\]', stripped)
        if match:
            content = stripped[match.end():]
        else:
            break
    return content.strip()

# Load environment variables
load_dotenv()

USE_REAL_BAND = os.getenv("USE_REAL_BAND", "false").lower() == "true"

ROOM_ID_TO_NAME: Dict[str, str] = {}
ROOM_NAME_TO_ID: Dict[str, str] = {}

# Global registry for active real WebSocket clients and local agents
ACTIVE_REAL_AGENTS: Dict[str, Any] = {}
LOCAL_AGENTS_BY_CONFIG_KEY: Dict[str, List['BandAgent']] = {}
STARTED_REAL_AGENTS: Set[str] = set()

def get_config_key_for_agent(agent_name: str) -> str:
    name = agent_name.lower()
    if name.startswith("doctoragent_"):
        return "doctor_agent"
    if "telemetry" in name:
        return "telemetry_agent"
    if "summary" in name:
        return "summary_agent"
    if "medicine" in name:
        return "medicine_management_agent"
    if "stock" in name:
        return "stock_management_agent"
    if "registration" in name:
        return "registration_agent"
    if "patientmanagement" in name:
        return "patient_management_agent"
    if "patientnavigation" in name:
        return "patient_navigation_agent"
    if "pharmacist" in name:
        return "pharmacist_agent"
    return None

class BandAgent:
    def __init__(self, name: str):
        self.id = f"agent-{name}-{int(time.time() * 1000)}"
        self.name = name
        self.room = None
        self.handlers: Dict[str, List[Callable[[Any], Any]]] = {}
        self.real_agent = None
        self.real_agent_started = False

        if USE_REAL_BAND and not name.startswith("UI-Listener-"):
            config_key = get_config_key_for_agent(name)
            if config_key:
                # Register in local agents list
                if config_key not in LOCAL_AGENTS_BY_CONFIG_KEY:
                    LOCAL_AGENTS_BY_CONFIG_KEY[config_key] = []
                LOCAL_AGENTS_BY_CONFIG_KEY[config_key].append(self)
                
                # Create real agent connection if it doesn't exist yet
                if config_key not in ACTIVE_REAL_AGENTS:
                    try:
                        from band import Agent
                        from band.config import load_agent_config
                        agent_id, api_key = load_agent_config(config_key, config_path="agent_config.yaml")
                        if agent_id and agent_id.startswith("Y"):
                            agent_id = agent_id[1:]
                        rest_url = os.getenv("BAND_REST_URL") or os.getenv("THENVOI_REST_URL") or "https://app.band.ai"
                        ws_url = os.getenv("BAND_WS_URL") or os.getenv("THENVOI_WS_URL") or "wss://app.band.ai/api/v1/socket/websocket"
                        
                        adapter = BandAgentAdapter(config_key)
                        real_agent = Agent.create(
                            adapter=adapter,
                            agent_id=agent_id,
                            api_key=api_key,
                            ws_url=ws_url,
                            rest_url=rest_url,
                            preprocessor=BandPreprocessor(),
                        )
                        ACTIVE_REAL_AGENTS[config_key] = real_agent
                        print(f"[BandSDK] Configured real agent client for '{name}' using config key '{config_key}'")
                    except Exception as e:
                        print(f"[BandSDK] Warning: Failed to load config/create real agent for '{name}': {e}")
                
                self.real_agent = ACTIVE_REAL_AGENTS.get(config_key)

    def on_event(self, event: str, handler: Callable[[Any], Any]):
        if event not in self.handlers:
            self.handlers[event] = []
        self.handlers[event].append(handler)

    def emit(self, event: str, payload: Any):
        if event in self.handlers:
            for handler in self.handlers[event]:
                if asyncio.iscoroutinefunction(handler):
                    asyncio.create_task(handler(payload))
                else:
                    handler(payload)

    async def request_human_intervention(self, reason: str, context: Any) -> Any:
        Telemetry.track_event(self.name, "HUMAN_INTERVENTION_REQUESTED", {"reason": reason, "context": context})
        
        # Broadcast request to TelemetryAuditRoom
        TelemetryAuditRoom.broadcast("HUMAN_INTERVENTION_REQUESTED", {
            "agent": self.name,
            "reason": reason,
            "context": context
        })

        # Format printing to match TS console.log exactly
        print(f"[Band API] Pause for Human Intervention: {reason}", json.dumps(context, separators=(',', ':')))
        await asyncio.sleep(3)
        
        response = {"status": "approved", "comments": "Doctor reviewed and approved."}
        
        # Broadcast resolution to TelemetryAuditRoom
        TelemetryAuditRoom.broadcast("RESOLVED", {
            "agent": self.name,
            "resolution": response
        })

        return response

class BandRoom:
    def __init__(self, name: str):
        self.id = f"room-{int(time.time() * 1000)}"
        self.name = name
        self.agents: List[BandAgent] = []
        self.state: Dict[str, Any] = {}

    def join(self, agent: BandAgent):
        self.agents.append(agent)
        agent.room = self
        Telemetry.track_event("BandSDK", "AGENT_JOINED", {"room": self.name, "agent": agent.name})
        if self.name != "Telemetry-Audit-Room":
            TelemetryAuditRoom.broadcast("AGENT_JOINED", {"room": self.name, "agent": agent.name})
        
        if USE_REAL_BAND and agent.real_agent:
            config_key = get_config_key_for_agent(agent.name)
            if config_key and config_key not in STARTED_REAL_AGENTS:
                STARTED_REAL_AGENTS.add(config_key)
                print(f"[BandSDK] Starting WebSocket client connection for real agent '{agent.name}' (shared)...")
                asyncio.create_task(agent.real_agent.start())

    def broadcast(self, event: str, payload: Any):
        if USE_REAL_BAND:
            asyncio.create_task(send_platform_event(self.id, event, payload))
            # Broadcast locally ONLY to agents that do NOT have a real platform client (like UI-Listener)
            for agent in self.agents:
                if not agent.real_agent:
                    agent.emit(event, payload)
        else:
            self.broadcast_local(event, payload)

    def broadcast_local(self, event: str, payload: Any):
        for agent in self.agents:
            agent.emit(event, payload)

    def update_state(self, key: str, value: Any):
        self.state[key] = value
        Telemetry.track_event("BandRoom", "STATE_UPDATED", {"key": key, "value": value})
        if self.name != "Telemetry-Audit-Room":
            TelemetryAuditRoom.broadcast("STATE_UPDATED", {"room": self.name, "key": key, "value": value})

async def _load_rooms_from_supabase() -> Dict[str, str]:
    """Load room name → ID mappings from Supabase (fallback when .env.rooms is absent)."""
    import aiohttp
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_ANON_KEY")
    if not supabase_url or not supabase_key:
        return {}
    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{supabase_url}/rest/v1/band_room_mappings?select=room_name,room_id",
                headers=headers
            ) as resp:
                if resp.status == 200:
                    rows = await resp.json()
                    return {row["room_name"]: row["room_id"] for row in rows}
                # 404 / 400 means the table doesn't exist yet — not an error
    except Exception as e:
        print(f"[BandSDK] Could not load rooms from Supabase: {e}")
    return {}


async def _save_rooms_to_supabase(room_name_to_id: Dict[str, str]) -> None:
    """Upsert room name → ID mappings to Supabase so they survive Render deploys."""
    import aiohttp
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_ANON_KEY")
    if not supabase_url or not supabase_key:
        return
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }
    rows = [{"room_name": n, "room_id": r} for n, r in room_name_to_id.items()]
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{supabase_url}/rest/v1/band_room_mappings",
                json=rows,
                headers=headers
            ) as resp:
                if resp.status not in (200, 201):
                    body = await resp.text()
                    print(f"[BandSDK] Could not save rooms to Supabase (status {resp.status}): {body}")
    except Exception as e:
        print(f"[BandSDK] Could not save rooms to Supabase: {e}")


async def send_platform_event(room_id: str, event: str, payload: Any):
    if not BandSDK.rest_client:
        return

    # Display-only lifecycle events: post as Band events (visible in UI, not routed to agents)
    if event in ("AGENT_JOINED", "STATE_UPDATED"):
        from band.client.rest import ChatEventRequest, DEFAULT_REQUEST_OPTIONS
        try:
            await BandSDK.rest_client.agent_api_events.create_agent_chat_event(
                chat_id=room_id,
                event=ChatEventRequest(
                    content=event,
                    message_type="task",
                    metadata=payload if isinstance(payload, dict) else {}
                ),
                request_options=DEFAULT_REQUEST_OPTIONS
            )
        except Exception as e:
            import logging
            logging.getLogger("band_config").exception(f"Failed to send display event {event} to room {room_id}: {e}")
        return

    # All other events: use messages API so agents receive them via WebSocket
    # Band docs: "Events don't route to other agents" — messages do.
    from band.client.rest import ChatMessageRequest, DEFAULT_REQUEST_OPTIONS
    from thenvoi_rest.types import ChatMessageRequestMentionsItem
    try:
        # Resolve which agents should receive this specific event.
        # Only @mention agents that (a) are in this room AND (b) handle this event.
        room_agent_id_set = set(BandSDK.room_agent_ids.get(room_id, []))
        handler_keys = EVENT_AGENT_ROUTING.get(event)
        if handler_keys:
            agent_ids = [
                BandSDK.agent_config_ids[key]
                for key in handler_keys
                if key in BandSDK.agent_config_ids and BandSDK.agent_config_ids[key] in room_agent_id_set
            ]
        else:
            # Unknown event: fall back to all agents in the room
            agent_ids = list(room_agent_id_set)
        mentions = [ChatMessageRequestMentionsItem(id=aid) for aid in agent_ids]
        safe_payload = payload if isinstance(payload, dict) else ({"data": str(payload)} if payload is not None else {})
        content = json.dumps({"event": event, "payload": safe_payload})
        await BandSDK.rest_client.agent_api_messages.create_agent_chat_message(
            chat_id=room_id,
            message=ChatMessageRequest(
                content=content,
                mentions=mentions,
            ),
            request_options=DEFAULT_REQUEST_OPTIONS
        )
    except Exception as e:
        import logging
        _log = logging.getLogger("band_config")
        body = getattr(e, 'body', None) or {}
        details = body.get('error', {}).get('details', {}) if isinstance(body, dict) else {}
        if isinstance(details.get('chat_room_id'), list) and 'room is deleted' in details['chat_room_id']:
            _log.warning(f"Skipped event {event} to deleted room {room_id}")
        else:
            _log.exception(f"Failed to send event {event} to room {room_id}: {e}")

async def send_display_message(room_id: str, content: str):
    """Send a display-only message to a Band room (visible in UI, not routed to agents)."""
    if not BandSDK.rest_client:
        return
    from band.client.rest import ChatEventRequest, DEFAULT_REQUEST_OPTIONS
    try:
        await BandSDK.rest_client.agent_api_events.create_agent_chat_event(
            chat_id=room_id,
            event=ChatEventRequest(
                content=content,
                message_type="task",
                metadata={}
            ),
            request_options=DEFAULT_REQUEST_OPTIONS
        )
    except Exception as e:
        import logging
        _log = logging.getLogger("band_config")
        body = getattr(e, 'body', None) or {}
        details = body.get('error', {}).get('details', {}) if isinstance(body, dict) else {}
        if isinstance(details.get('chat_room_id'), list) and 'room is deleted' in details['chat_room_id']:
            _log.warning(f"Skipped display message to deleted room {room_id}")
        else:
            _log.exception(f"Failed to send display message to room {room_id}: {e}")

async def send_platform_message(room_id: str, message: str, agent_id: str = None):
    if not BandSDK.rest_client:
        return
    from band.client.rest import ChatMessageRequest, DEFAULT_REQUEST_OPTIONS
    from thenvoi_rest.types import ChatMessageRequestMentionsItem
    try:
        # We need at least one mention to satisfy the platform validation (minItems: 1)
        room_agent_ids = BandSDK.room_agent_ids.get(room_id, [])
        if agent_id:
            room_agent_ids = [agent_id]
        elif not room_agent_ids and BandSDK.gateway_agent_id:
            room_agent_ids = [BandSDK.gateway_agent_id]
            
        # Fallback to current config agent id if still empty
        if not room_agent_ids:
            try:
                from band.config import load_agent_config
                aid, _ = load_agent_config("my_agent", config_path="agent_config.yaml")
                if aid:
                    if aid.startswith("Y"):
                        aid = aid[1:]
                    room_agent_ids = [aid]
            except Exception:
                pass
                
        mentions = [ChatMessageRequestMentionsItem(id=aid) for aid in room_agent_ids] if room_agent_ids else []
        await BandSDK.rest_client.agent_api_messages.create_agent_chat_message(
            chat_id=room_id,
            message=ChatMessageRequest(
                content=message,
                mentions=mentions,
            ),
            request_options=DEFAULT_REQUEST_OPTIONS
        )
    except Exception as e:
        import logging
        logging.getLogger("band_config").exception(f"Failed to send message to room {room_id}: {e}")

try:
    from band.core.simple_adapter import SimpleAdapter
    from band.core.types import PlatformMessage
    from band.core.protocols import AgentToolsProtocol
    from band.preprocessing.default import DefaultPreprocessor

    class BandSimpleAdapter(SimpleAdapter[Any]):
        async def on_message(
            self,
            msg: PlatformMessage,
            tools: AgentToolsProtocol,
            history: Any,
            participants_msg: str | None,
            contacts_msg: str | None,
            *,
            is_session_bootstrap: bool,
            room_id: str,
        ) -> None:
            room_name = ROOM_ID_TO_NAME.get(room_id)
            if not room_name:
                return

            room = MOCK_ROOMS.get(room_name)
            if not room:
                return

            try:
                cleaned_content = clean_mentions(msg.content)
                parsed = json.loads(cleaned_content)
                event_name = parsed.get("event", cleaned_content)
                payload = parsed.get("payload", {})
            except (json.JSONDecodeError, TypeError):
                event_name = msg.content
                payload = msg.metadata or {}

            room.broadcast_local(event_name, payload)

    class BandAgentAdapter(SimpleAdapter[Any]):
        def __init__(self, config_key: str):
            super().__init__()
            self.config_key = config_key

        async def on_message(
            self,
            msg: PlatformMessage,
            tools: AgentToolsProtocol,
            history: Any,
            participants_msg: str | None,
            contacts_msg: str | None,
            *,
            is_session_bootstrap: bool,
            room_id: str,
        ) -> None:
            # Only dispatch events from rooms that belong to this session.
            # Messages from unknown room IDs are backlog replays from old sessions — skip them.
            if room_id not in ROOM_ID_TO_NAME:
                return

            try:
                cleaned_content = clean_mentions(msg.content)
                parsed = json.loads(cleaned_content)
                event_name = parsed.get("event", cleaned_content)
                payload = parsed.get("payload", {})
            except (json.JSONDecodeError, TypeError):
                event_name = msg.content
                payload = msg.metadata or {}

            print(f"[BandSDK] Real Agent client for '{self.config_key}' received event '{event_name}' in room {room_id}")
            local_agents = LOCAL_AGENTS_BY_CONFIG_KEY.get(self.config_key, [])
            for agent in local_agents:
                agent.emit(event_name, payload)

    class BandPreprocessor(DefaultPreprocessor):
        async def process(self, ctx, event, agent_id):
            # Pass dummy-agent-id to super so it doesn't filter out messages/events from self
            return await super().process(ctx, event, "dummy-agent-id")
except ImportError:
    class BandSimpleAdapter:
        pass
    class BandAgentAdapter:
        def __init__(self, config_key: str):
            pass
    class BandPreprocessor:
        pass

# Maps each event name to the config keys of agents that handle it.
# send_platform_event uses this to @mention only the relevant agent(s).
EVENT_AGENT_ROUTING: Dict[str, List[str]] = {
    # Registration agent handles all booking / scheduling events
    "QUERY_DOCTORS":             ["registration_agent"],
    "BOOKING_REQUESTED":         ["registration_agent"],
    "RESCHEDULE_REQUESTED":      ["registration_agent"],
    "CHECK_DOCTOR_AVAILABILITY": ["registration_agent"],
    "REQUEST_DOCTOR_MATCH":      ["registration_agent"],
    # Navigation agent handles wayfinding events
    "REQUEST_NAVIGATION":        ["patient_navigation_agent"],
    "NAVIGATE_TO_ROOM":          ["patient_navigation_agent"],
    "DOCTOR_ROOM_CHANGE":        ["patient_navigation_agent"],
    # Patient management agent receives all responses from other agents
    "DOCTORS_LIST_RESPONSE":     ["patient_management_agent"],
    "BOOKING_FAILED":            ["patient_management_agent"],
    "RESCHEDULE_CONFIRMED":      ["patient_management_agent"],
    "RESCHEDULE_FAILED":         ["patient_management_agent"],
    "NAVIGATION_DIRECTIONS":     ["patient_management_agent"],
    "DOCTOR_AVAILABILITY_STATUS":["patient_management_agent"],
    "DOCTOR_ASSIGNED":           ["patient_management_agent"],
    "RESCHEDULE_APPOINTMENT":    ["patient_management_agent"],
    "PATIENT_CHECK_IN":          ["patient_management_agent"],
    # BOOKING_CONFIRMED goes to both patient agent (PatientManagementRoom) and doctor agent (DoctorDashboardRoom)
    "BOOKING_CONFIRMED":         ["patient_management_agent", "doctor_agent"],
    # Summary agent generates patient summaries
    "PATIENT_SUMMARY_REQUESTED": ["summary_agent"],
    "GENERATE_SUMMARY":          ["summary_agent"],
    "SUMMARIZE_PATIENT_HISTORY": ["summary_agent"],
    # Doctor agent receives results from summary agent and pharmacy alerts
    "PATIENT_SUMMARY_RESPONSE":  ["doctor_agent"],
    "ALTERNATIVE_MEDICINE_REQUESTED": ["doctor_agent"],
    # Medicine agent processes prescriptions
    "PRESCRIPTION_WRITTEN":      ["medicine_management_agent"],
    "PROCESS_PRESCRIPTION":      ["medicine_management_agent"],
    "CHECK_MEDICINE_AVAILABILITY":["medicine_management_agent"],
    # Stock / pharmacy events
    "ROUTE_TO_PHARMA":           ["pharmacist_agent", "stock_management_agent"],
    "ROUTE_TO_PHARMACY":         ["stock_management_agent"],
    "GET_STOCK_STATS":           ["stock_management_agent"],
    "STOCK_DEMAND_ALERT":        ["pharmacist_agent"],
    "PREPARE_MEDICINE":          ["pharmacist_agent"],
}

class BandSDK:
    gateway_agent_id = None
    rest_client = None
    room_agent_ids: Dict[str, List[str]] = {}    # room_id → [all agent UUIDs in room]
    agent_config_ids: Dict[str, str] = {}         # config_key → agent UUID

    @staticmethod
    def create_room(name: str) -> BandRoom:
        return BandRoom(name)

    @staticmethod
    def create_agent(name: str) -> BandAgent:
        return BandAgent(name)

    @staticmethod
    async def init_real_band():
        global ROOM_ID_TO_NAME, ROOM_NAME_TO_ID
        from band import Agent
        from band.config import load_agent_config
        from band.client.rest import AsyncRestClient, ChatRoomRequest, ChatEventRequest, DEFAULT_REQUEST_OPTIONS
        from thenvoi_rest.types.participant_request import ParticipantRequest
        import yaml

        try:
            agent_id, api_key = load_agent_config("my_agent", config_path="agent_config.yaml")
            if agent_id and agent_id.startswith("Y"):
                agent_id = agent_id[1:]
        except Exception as e:
            raise RuntimeError(f"Failed to load agent configuration: {e}")

        rest_url = os.getenv("BAND_REST_URL") or os.getenv("THENVOI_REST_URL") or "https://app.band.ai"
        ws_url = os.getenv("BAND_WS_URL") or os.getenv("THENVOI_WS_URL") or "wss://app.band.ai/api/v1/socket/websocket"

        client = AsyncRestClient(api_key=api_key, base_url=rest_url)
        BandSDK.rest_client = client

        # 1. Load room mappings (.env.rooms first, then Supabase as fallback)
        rooms_file = ".env.rooms"
        if os.path.exists(rooms_file):
            with open(rooms_file, "r") as f:
                for line in f:
                    line = line.strip()
                    if line and "=" in line:
                        name, rid = line.split("=", 1)
                        ROOM_NAME_TO_ID[name] = rid
                        ROOM_ID_TO_NAME[rid] = name

        # 2. Check and create any missing rooms
        required_rooms = [
            "Patient-Management-Room",
            "Doctor-Dashboard-Room",
            "Reception-Navigation-Room",
            "Clinical-Consult-Room",
            "Pharmacy-Inventory-Room",
            "Telemetry-Audit-Room",
            "Pharmacist-Dashboard-Room"
        ]

        # If .env.rooms didn't cover all rooms (ephemeral Render filesystem), try Supabase
        if not all(r in ROOM_NAME_TO_ID for r in required_rooms):
            supabase_rooms = await _load_rooms_from_supabase()
            for name, rid in supabase_rooms.items():
                if name not in ROOM_NAME_TO_ID:
                    ROOM_NAME_TO_ID[name] = rid
                    ROOM_ID_TO_NAME[rid] = name
            if supabase_rooms:
                print(f"[BandSDK] Loaded {len(supabase_rooms)} room mappings from Supabase.")

        # Fetch existing chats from the platform to reuse them if needed
        existing_rooms = []
        try:
            rooms_list_res = await client.agent_api_chats.list_agent_chats(page_size=100)
            if rooms_list_res and hasattr(rooms_list_res, 'data') and rooms_list_res.data:
                existing_rooms = rooms_list_res.data
                print(f"[BandSDK] Found {len(existing_rooms)} existing rooms on the platform.")
        except Exception as e:
            print(f"[BandSDK] Warning: Could not list existing rooms: {e}")

        # Validate mapped rooms by probing each one with the SYSTEM label event.
        # The Band API has no deleted_at field, so a 422 "room is deleted" is the only
        # reliable signal that a stored room ID is stale. Cleared rooms fall through to
        # the creation loop below which recreates them with fresh IDs.
        rooms_labeled = set()
        for name, rid in list(ROOM_NAME_TO_ID.items()):
            try:
                await client.agent_api_events.create_agent_chat_event(
                    chat_id=rid,
                    event=ChatEventRequest(
                        content=f"**[SYSTEM]** You are viewing the **{name}** session.",
                        message_type="task",
                        metadata={}
                    ),
                    request_options=DEFAULT_REQUEST_OPTIONS
                )
                rooms_labeled.add(name)
            except Exception as e:
                body = getattr(e, 'body', None) or {}
                details = body.get('error', {}).get('details', {}) if isinstance(body, dict) else {}
                if isinstance(details.get('chat_room_id'), list) and 'room is deleted' in details['chat_room_id']:
                    ROOM_NAME_TO_ID.pop(name)
                    ROOM_ID_TO_NAME.pop(rid, None)
                    print(f"[BandSDK] Room '{name}' (id={rid}) is deleted, will recreate.")
                else:
                    import logging
                    logging.getLogger("band_config").warning(f"Probe failed for room '{name}' (id={rid}): {e}")

        # Get set of all currently mapped IDs
        mapped_ids = set(ROOM_NAME_TO_ID.values())
        # Find unused existing room IDs from the platform list
        available_ids = [room.id for room in existing_rooms if room.id not in mapped_ids]

        updated_rooms_file = False
        for room_name in required_rooms:
            if room_name not in ROOM_NAME_TO_ID:
                print(f"[BandSDK] Creating platform room for '{room_name}'...")
                room_res = await client.agent_api_chats.create_agent_chat(chat=ChatRoomRequest(task_id=None))
                rid = room_res.data.id
                ROOM_NAME_TO_ID[room_name] = rid
                ROOM_ID_TO_NAME[rid] = room_name
                updated_rooms_file = True
                try:
                    await client.agent_api_events.create_agent_chat_event(
                        chat_id=rid,
                        event=ChatEventRequest(
                            content=f"**[SYSTEM]** You are viewing the **{room_name}** session.",
                            message_type="task",
                            metadata={}
                        ),
                        request_options=DEFAULT_REQUEST_OPTIONS
                    )
                    rooms_labeled.add(room_name)
                except Exception:
                    pass

        if updated_rooms_file:
            with open(rooms_file, "w") as f:
                for name, rid in ROOM_NAME_TO_ID.items():
                    f.write(f"{name}={rid}\n")

        # Persist to Supabase so room IDs survive Render deploys (ephemeral filesystem)
        await _save_rooms_to_supabase(ROOM_NAME_TO_ID)

        # 3. Update mock room IDs with real room IDs
        for name, rid in ROOM_NAME_TO_ID.items():
            if name in MOCK_ROOMS:
                MOCK_ROOMS[name].id = rid

        # 4. Sync room participants dynamically to prevent 403 websocket rejections
        room_participants = {
            "Patient-Management-Room": ["patient_management_agent", "registration_agent", "summary_agent", "patient_navigation_agent"],
            "Doctor-Dashboard-Room": ["doctor_agent", "summary_agent", "medicine_management_agent"],
            "Reception-Navigation-Room": ["patient_navigation_agent", "registration_agent"],
            "Clinical-Consult-Room": ["summary_agent", "doctor_agent"],
            "Pharmacy-Inventory-Room": ["medicine_management_agent", "pharmacist_agent", "stock_management_agent"],
            "Telemetry-Audit-Room": ["telemetry_agent"],
            "Pharmacist-Dashboard-Room": ["pharmacist_agent", "stock_management_agent"]
        }

        agent_config = {}
        try:
            with open("agent_config.yaml", "r") as f:
                agent_config = yaml.safe_load(f) or {}
        except Exception as e:
            print(f"[BandSDK] Warning: Could not load agent_config.yaml for participant sync: {e}")

        for room_name, keys in room_participants.items():
            rid = ROOM_NAME_TO_ID.get(room_name)
            if not rid:
                continue
            try:
                participants_res = await client.agent_api_participants.list_agent_chat_participants(chat_id=rid)
                current_ids = {p.id for p in participants_res.data} if participants_res and participants_res.data else set()
                for key in keys:
                    p_conf = agent_config.get(key)
                    if p_conf:
                        p_id = p_conf.get("agent_id")
                        if p_id:
                            if p_id.startswith("Y"):
                                p_id = p_id[1:]
                            if p_id not in current_ids:
                                print(f"[BandSDK] Adding participant '{key}' ({p_id}) to room '{room_name}'...")
                                await client.agent_api_participants.add_agent_chat_participant(
                                    chat_id=rid,
                                    participant=ParticipantRequest(participant_id=p_id, role="member")
                                )
            except Exception as e:
                print(f"[BandSDK] Warning: Failed to sync participants for '{room_name}': {e}")

        # 5. Build room_agent_ids and agent_config_ids for @mention routing
        BandSDK.room_agent_ids = {}
        BandSDK.agent_config_ids = {}
        for room_name, keys in room_participants.items():
            rid = ROOM_NAME_TO_ID.get(room_name)
            if not rid:
                continue
            ids = []
            for key in keys:
                p_conf = agent_config.get(key)
                if p_conf:
                    p_id = p_conf.get("agent_id", "")
                    if p_id and p_id.startswith("Y"):
                        p_id = p_id[1:]
                    if p_id:
                        ids.append(p_id)
                        BandSDK.agent_config_ids[key] = p_id
            if ids:
                BandSDK.room_agent_ids[rid] = ids

        # 6. Store gateway agent_id so send_platform_message can use it as a fallback mention.
        # No WebSocket connection is opened for the gateway — individual BandAgentAdapter
        # agents handle all message routing via their own connections.
        BandSDK.gateway_agent_id = agent_id
        print("[BandSDK] Connected to Band Platform (REST only)")

        # Room labels were already sent during the probe/creation steps above.

    @staticmethod
    async def stop_real_band():
        for config_key, real_agent in ACTIVE_REAL_AGENTS.items():
            try:
                print(f"[BandSDK] Stopping WebSocket connection for real agent role '{config_key}'...")
                await real_agent.stop()
            except Exception as e:
                print(f"[BandSDK] Error stopping real agent '{config_key}': {e}")
        ACTIVE_REAL_AGENTS.clear()
        STARTED_REAL_AGENTS.clear()

PatientManagementRoom = BandSDK.create_room("Patient-Management-Room")
DoctorDashboardRoom = BandSDK.create_room("Doctor-Dashboard-Room")
ReceptionNavigationRoom = BandSDK.create_room("Reception-Navigation-Room")
ClinicalConsultRoom = BandSDK.create_room("Clinical-Consult-Room")
PharmacyInventoryRoom = BandSDK.create_room("Pharmacy-Inventory-Room")
TelemetryAuditRoom = BandSDK.create_room("Telemetry-Audit-Room")
PharmacistDashboardRoom = BandSDK.create_room("Pharmacist-Dashboard-Room")

MOCK_ROOMS = {
    "Patient-Management-Room": PatientManagementRoom,
    "Doctor-Dashboard-Room": DoctorDashboardRoom,
    "Reception-Navigation-Room": ReceptionNavigationRoom,
    "Clinical-Consult-Room": ClinicalConsultRoom,
    "Pharmacy-Inventory-Room": PharmacyInventoryRoom,
    "Telemetry-Audit-Room": TelemetryAuditRoom,
    "Pharmacist-Dashboard-Room": PharmacistDashboardRoom
}

