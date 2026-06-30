import hashlib
from typing import Dict, Any, List, TypedDict
from langgraph.graph import StateGraph, START, END
from src.band_config import TelemetryAuditRoom, BandSDK
from src.telemetry import Telemetry

class TelemetryState(TypedDict):
    event_name: str
    payload: Dict[str, Any]
    audit_log: List[Dict[str, Any]]

class TelemetryAgent:
    def __init__(self):
        self.agent = BandSDK.create_agent("TelemetryAgent")
        TelemetryAuditRoom.join(self.agent)
        self.audit_log: List[Dict[str, Any]] = []
        self.graph = self._build_graph()
        self.setup_listeners()

    def _build_graph(self):
        builder = StateGraph(TelemetryState)

        def agent_joined_node(state: TelemetryState) -> Dict[str, Any]:
            payload = state["payload"]
            audit_log = list(state["audit_log"])
            entry = {
                "type": "AGENT_JOINED",
                "room": payload.get("room"),
                "agent": payload.get("agent")
            }
            audit_log.append(entry)
            Telemetry.track_event(self.agent.name, "AUDIT_AGENT_JOINED", entry)
            return {"audit_log": audit_log}

        def state_updated_node(state: TelemetryState) -> Dict[str, Any]:
            payload = state["payload"]
            audit_log = list(state["audit_log"])
            entry = {
                "type": "STATE_UPDATED",
                "room": payload.get("room"),
                "key": payload.get("key"),
                "value": payload.get("value")
            }
            audit_log.append(entry)
            Telemetry.track_event(self.agent.name, "AUDIT_STATE_UPDATED", entry)
            return {"audit_log": audit_log}

        def intervention_requested_node(state: TelemetryState) -> Dict[str, Any]:
            payload = state["payload"]
            audit_log = list(state["audit_log"])
            entry = {
                "type": "HUMAN_INTERVENTION_REQUESTED",
                "agent": payload.get("agent"),
                "reason": payload.get("reason"),
                "context": payload.get("context")
            }
            audit_log.append(entry)
            Telemetry.track_event(self.agent.name, "AUDIT_HUMAN_INTERVENTION_REQUESTED", entry)
            return {"audit_log": audit_log}

        def resolved_node(state: TelemetryState) -> Dict[str, Any]:
            payload = state["payload"]
            audit_log = list(state["audit_log"])
            entry = {
                "type": "RESOLVED",
                "agent": payload.get("agent"),
                "resolution": payload.get("resolution")
            }
            audit_log.append(entry)
            Telemetry.track_event(self.agent.name, "AUDIT_RESOLVED", entry)
            return {"audit_log": audit_log}

        def security_allowed_node(state: TelemetryState) -> Dict[str, Any]:
            payload = state["payload"]
            audit_log = list(state["audit_log"])
            
            # Simple cryptographic Merkle leaf/root simulation for the hackathon
            leaf_data = f"{payload.get('agent')}-{payload.get('action')}-{payload.get('iap_id')}-allowed"
            merkle_root = hashlib.sha256(leaf_data.encode()).hexdigest()
            merkle_proof = [
                hashlib.sha256(f"{merkle_root}-sibling1".encode()).hexdigest(),
                hashlib.sha256(f"{merkle_root}-sibling2".encode()).hexdigest()
            ]
            
            entry = {
                "type": "SECURITY_ALLOWED",
                "agent": payload.get("agent"),
                "action": payload.get("action"),
                "details": payload.get("details"),
                "iap_id": payload.get("iap_id"),
                "merkle_root": merkle_root,
                "merkle_proof": merkle_proof
            }
            audit_log.append(entry)
            Telemetry.track_event(self.agent.name, "AUDIT_SECURITY_ALLOWED", entry)
            return {"audit_log": audit_log}

        def security_blocked_node(state: TelemetryState) -> Dict[str, Any]:
            payload = state["payload"]
            audit_log = list(state["audit_log"])
            
            leaf_data = f"{payload.get('agent')}-{payload.get('action')}-{payload.get('iap_id')}-blocked"
            merkle_root = hashlib.sha256(leaf_data.encode()).hexdigest()
            merkle_proof = [
                hashlib.sha256(f"{merkle_root}-sibling1".encode()).hexdigest(),
                hashlib.sha256(f"{merkle_root}-sibling2".encode()).hexdigest()
            ]
            
            entry = {
                "type": "SECURITY_BLOCKED",
                "agent": payload.get("agent"),
                "action": payload.get("action"),
                "details": payload.get("details"),
                "iap_id": payload.get("iap_id"),
                "merkle_root": merkle_root,
                "merkle_proof": merkle_proof
            }
            audit_log.append(entry)
            Telemetry.track_event(self.agent.name, "AUDIT_SECURITY_BLOCKED", entry)
            return {"audit_log": audit_log}

        def route_event(state: TelemetryState) -> str:
            event_name = state.get("event_name")
            if event_name == "AGENT_JOINED":
                return "agent_joined"
            elif event_name == "STATE_UPDATED":
                return "state_updated"
            elif event_name == "HUMAN_INTERVENTION_REQUESTED":
                return "intervention_requested"
            elif event_name == "RESOLVED":
                return "resolved"
            elif event_name == "SECURITY_ALLOWED":
                return "security_allowed"
            elif event_name == "SECURITY_BLOCKED":
                return "security_blocked"
            return END

        builder.add_node("agent_joined", agent_joined_node)
        builder.add_node("state_updated", state_updated_node)
        builder.add_node("intervention_requested", intervention_requested_node)
        builder.add_node("resolved", resolved_node)
        builder.add_node("security_allowed", security_allowed_node)
        builder.add_node("security_blocked", security_blocked_node)

        builder.add_conditional_edges(
            START,
            route_event,
            {
                "agent_joined": "agent_joined",
                "state_updated": "state_updated",
                "intervention_requested": "intervention_requested",
                "resolved": "resolved",
                "security_allowed": "security_allowed",
                "security_blocked": "security_blocked",
                END: END
            }
        )
        builder.add_edge("agent_joined", END)
        builder.add_edge("state_updated", END)
        builder.add_edge("intervention_requested", END)
        builder.add_edge("resolved", END)
        builder.add_edge("security_allowed", END)
        builder.add_edge("security_blocked", END)

        return builder.compile()

    def setup_listeners(self):
        def on_agent_joined(payload: Dict[str, Any]):
            res = self.graph.invoke({
                "event_name": "AGENT_JOINED",
                "payload": payload,
                "audit_log": self.audit_log
            })
            self.audit_log = res.get("audit_log", self.audit_log)

        def on_state_updated(payload: Dict[str, Any]):
            res = self.graph.invoke({
                "event_name": "STATE_UPDATED",
                "payload": payload,
                "audit_log": self.audit_log
            })
            self.audit_log = res.get("audit_log", self.audit_log)

        def on_human_intervention_requested(payload: Dict[str, Any]):
            res = self.graph.invoke({
                "event_name": "HUMAN_INTERVENTION_REQUESTED",
                "payload": payload,
                "audit_log": self.audit_log
            })
            self.audit_log = res.get("audit_log", self.audit_log)

        def on_resolved(payload: Dict[str, Any]):
            res = self.graph.invoke({
                "event_name": "RESOLVED",
                "payload": payload,
                "audit_log": self.audit_log
            })
            self.audit_log = res.get("audit_log", self.audit_log)

        def on_security_allowed(payload: Dict[str, Any]):
            res = self.graph.invoke({
                "event_name": "SECURITY_ALLOWED",
                "payload": payload,
                "audit_log": self.audit_log
            })
            self.audit_log = res.get("audit_log", self.audit_log)

        def on_security_blocked(payload: Dict[str, Any]):
            res = self.graph.invoke({
                "event_name": "SECURITY_BLOCKED",
                "payload": payload,
                "audit_log": self.audit_log
            })
            self.audit_log = res.get("audit_log", self.audit_log)

        self.agent.on_event("AGENT_JOINED", on_agent_joined)
        self.agent.on_event("STATE_UPDATED", on_state_updated)
        self.agent.on_event("HUMAN_INTERVENTION_REQUESTED", on_human_intervention_requested)
        self.agent.on_event("RESOLVED", on_resolved)
        self.agent.on_event("SECURITY_ALLOWED", on_security_allowed)
        self.agent.on_event("SECURITY_BLOCKED", on_security_blocked)

    def generate_audit_report(self) -> str:
        report = ["=== CLINIC AUDIT REPORT ==="]
        for idx, entry in enumerate(self.audit_log, 1):
            if entry["type"] == "AGENT_JOINED":
                report.append(f"{idx:02d}. [JOIN] Agent '{entry['agent']}' joined room '{entry['room']}'")
            elif entry["type"] == "STATE_UPDATED":
                report.append(f"{idx:02d}. [STATE] Room '{entry['room']}': key '{entry['key']}' updated to '{entry['value']}'")
            elif entry["type"] == "HUMAN_INTERVENTION_REQUESTED":
                report.append(f"{idx:02d}. [INTERVENTION REQUEST] Agent '{entry['agent']}' requested approval: {entry['reason']}")
            elif entry["type"] == "RESOLVED":
                report.append(f"{idx:02d}. [INTERVENTION RESOLUTION] Agent '{entry['agent']}' intervention resolved: {entry['resolution']['status']} - Comments: {entry['resolution']['comments']}")
            elif entry["type"] == "SECURITY_ALLOWED":
                report.append(f"{idx:02d}. [SECURITY ALLOWED] Agent '{entry['agent']}' validated: {entry['details']} (Merkle Root: {entry['merkle_root'][:8]}...)")
            elif entry["type"] == "SECURITY_BLOCKED":
                report.append(f"{idx:02d}. [SECURITY BLOCKED] Agent '{entry['agent']}' blocked: {entry['details']} (Merkle Root: {entry['merkle_root'][:8]}...)")
        return "\n".join(report)
