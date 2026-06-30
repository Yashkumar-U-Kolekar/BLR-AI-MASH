import json
from datetime import datetime, timezone

class Telemetry:
    @staticmethod
    def log(agent_name: str, action: str, data: any):
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "agent": agent_name,
            "action": action,
            "data": data,
        }
        print(f"[TELEMETRY] {json.dumps(log_entry, separators=(',', ':'))}")

    @staticmethod
    def track_handoff(from_agent: str, to_agent: str, context: any):
        Telemetry.log(from_agent, "HANDOFF", {"to": to_agent, "context": context})

    @staticmethod
    def track_event(agent_name: str, event: str, payload: any):
        Telemetry.log(agent_name, "EVENT", {"event": event, "payload": payload})
