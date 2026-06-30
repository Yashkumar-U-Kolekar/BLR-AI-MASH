from typing import Dict, Any, TypedDict
from langgraph.graph import StateGraph, START, END
from src.band_config import PatientManagementRoom, PharmacyInventoryRoom, PharmacistDashboardRoom, TelemetryAuditRoom, BandSDK
from src.telemetry import Telemetry
from src.supabase_tools import fetch_medicine_stock_from_supabase, update_medicine_stock_in_supabase
from src.armoriq import ArmorIQ, BlockedException, ACTIVE_IAPS

class StockManagementState(TypedDict):
    event_name: str
    payload: Dict[str, Any]
    stock_usage: Dict[str, int]

class StockManagementAgent:
    def __init__(self):
        self.agent = BandSDK.create_agent("StockManagementAgent")
        PharmacyInventoryRoom.join(self.agent)
        PharmacistDashboardRoom.join(self.agent)
        self.stock_usage: Dict[str, int] = {}
        self.REORDER_THRESHOLD = 2
        self.graph = self._build_graph()
        self.setup_listeners()

    def _build_graph(self):
        builder = StateGraph(StockManagementState)

        async def route_to_pharma_node(state: StockManagementState) -> Dict[str, Any]:
            payload = state["payload"]
            stock_usage = dict(state["stock_usage"])
            medicine = payload["prescription"]["medicine"]
            stock_usage[medicine] = stock_usage.get(medicine, 0) + 1

            Telemetry.track_event(self.agent.name, "STOCK_USAGE_INCREMENTED", {"medicine": medicine, "count": stock_usage[medicine]})

            # Deduct stock level in Supabase database
            try:
                med_info = await fetch_medicine_stock_from_supabase(medicine)
                if med_info:
                    current_stock = med_info.get("current_stock", 0)
                    new_stock = max(0, current_stock - 1)
                    await update_medicine_stock_in_supabase(medicine, new_stock)
                    print(f"[Stock Agent Info] Deducted stock for '{medicine}' in Supabase. New Stock: {new_stock}")
            except Exception as e:
                print(f"[Stock Agent Warning] Failed to update stock in Supabase: {e}")

            if stock_usage[medicine] >= self.REORDER_THRESHOLD:
                Telemetry.track_event(self.agent.name, "SUGGEST_STOCK_REORDER", {"medicine": medicine, "count": stock_usage[medicine]})
                PatientManagementRoom.broadcast("REORDER_SUGGESTION", {
                    "medicine": medicine,
                    "reason": f"Medicine '{medicine}' is repeatedly used ({stock_usage[medicine]} times). Suggest restocking.",
                    "currentUsage": stock_usage[medicine]
                })
                # Alert the pharmacist dashboard about rise in demand
                PharmacistDashboardRoom.broadcast("STOCK_DEMAND_ALERT", {
                    "medicine": medicine,
                    "currentUsage": stock_usage[medicine],
                    "reason": f"Demand Alert: Rise in demand for '{medicine}' ({stock_usage[medicine]} prescriptions requested recently). Suggest preparing extra stock."
                })
            return {"stock_usage": stock_usage}

        def get_stock_stats_node(state: StockManagementState) -> StockManagementState:
            PatientManagementRoom.broadcast("STOCK_STATS_RESPONSE", {"stats": state["stock_usage"]})
            return state

        async def route_to_pharmacy_node(state: StockManagementState) -> Dict[str, Any]:
            payload = state["payload"]
            stock_usage = dict(state["stock_usage"])
            medicine = payload["prescription"]["medicine"]
            stock_usage[medicine] = stock_usage.get(medicine, 0) + 1

            Telemetry.track_event(self.agent.name, "PHARMACY_STOCK_USAGE_INCREMENTED", {
                "medicine": medicine,
                "count": stock_usage[medicine]
            })

            # Deduct stock level in Supabase database
            try:
                med_info = await fetch_medicine_stock_from_supabase(medicine)
                if med_info:
                    current_stock = med_info.get("current_stock", 0)
                    new_stock = max(0, current_stock - 1)
                    await update_medicine_stock_in_supabase(medicine, new_stock)
                    print(f"[Stock Agent Info] Deducted stock for '{medicine}' in Supabase. New Stock: {new_stock}")
            except Exception as e:
                print(f"[Stock Agent Warning] Failed to update stock in Supabase: {e}")

            if stock_usage[medicine] >= self.REORDER_THRESHOLD:
                Telemetry.track_event(self.agent.name, "AUTOMATED_SUGGEST_STOCK_REORDER", {
                    "medicine": medicine,
                    "count": stock_usage[medicine]
                })

                PharmacyInventoryRoom.broadcast("TRIGGER_REORDER", {
                    "medicine": medicine,
                    "currentUsage": stock_usage[medicine],
                    "reason": f"Automated Alert: Medicine '{medicine}' usage is high ({stock_usage[medicine]} requests). Reorder suggested."
                })

                # Alert the pharmacist dashboard about rise in demand
                PharmacistDashboardRoom.broadcast("STOCK_DEMAND_ALERT", {
                    "medicine": medicine,
                    "currentUsage": stock_usage[medicine],
                    "reason": f"Demand Alert: Rise in demand for '{medicine}' ({stock_usage[medicine]} prescriptions requested recently). Suggest preparing extra stock."
                })
            return {"stock_usage": stock_usage}

        async def delete_all_low_stock_node(state: StockManagementState) -> StockManagementState:
            payload = state["payload"]
            
            # Standard agent setup: gets a signed delegation token for decrementing stock
            # but then attempts to call delete_all_low_stock which OPA rules block!
            pid = payload.get("patientId", "current-patient")
            plan = ACTIVE_IAPS.get(pid)
            if not plan:
                plan = ArmorIQ.capture_plan(pid, "Consultation prescription check")
                ACTIVE_IAPS[pid] = plan
                
            # Delegate decrement stock permission
            token = ArmorIQ.delegate("StockManagementAgent", ["inventory.stock.decrement"], plan)
            
            try:
                # OPA check triggers BlockedException because delete_all_low_stock is not decrement
                ArmorIQ.invoke("StockManagementAgent", "delete_all_low_stock", token)
                
                # Should not reach here
                TelemetryAuditRoom.broadcast("SECURITY_ALLOWED", {
                    "agent": self.agent.name,
                    "action": "delete_all_low_stock",
                    "details": "CRITICAL: StockManagementAgent was allowed to delete all low stock!",
                    "iap_id": token["iap_id"]
                })
            except BlockedException as e:
                # Log security block
                TelemetryAuditRoom.broadcast("SECURITY_BLOCKED", {
                    "agent": self.agent.name,
                    "action": "delete_all_low_stock",
                    "details": f"Blocked unauthorized call 'delete_all_low_stock' from StockManagementAgent: {str(e)}",
                    "iap_id": token["iap_id"]
                })
                print(f"[ARMORIQ BLOCKED] Halted delete_all_low_stock: {e}")
                
            return state

        def route_event(state: StockManagementState) -> str:
            event_name = state.get("event_name")
            if event_name == "ROUTE_TO_PHARMA":
                return "route_to_pharma"
            elif event_name == "GET_STOCK_STATS":
                return "get_stock_stats"
            elif event_name == "ROUTE_TO_PHARMACY":
                return "route_to_pharmacy"
            elif event_name == "DELETE_ALL_LOW_STOCK":
                return "delete_all_low_stock"
            return END

        builder.add_node("route_to_pharma", route_to_pharma_node)
        builder.add_node("get_stock_stats", get_stock_stats_node)
        builder.add_node("route_to_pharmacy", route_to_pharmacy_node)
        builder.add_node("delete_all_low_stock", delete_all_low_stock_node)

        builder.add_conditional_edges(
            START,
            route_event,
            {
                "route_to_pharma": "route_to_pharma",
                "get_stock_stats": "get_stock_stats",
                "route_to_pharmacy": "route_to_pharmacy",
                "delete_all_low_stock": "delete_all_low_stock",
                END: END
            }
        )
        builder.add_edge("route_to_pharma", END)
        builder.add_edge("get_stock_stats", END)
        builder.add_edge("route_to_pharmacy", END)
        builder.add_edge("delete_all_low_stock", END)

        return builder.compile()

    def setup_listeners(self):
        async def on_route_to_pharma(payload: Dict[str, Any]):
            res = await self.graph.ainvoke({
                "event_name": "ROUTE_TO_PHARMA",
                "payload": payload,
                "stock_usage": self.stock_usage
            })
            self.stock_usage = res.get("stock_usage", self.stock_usage)

        def on_get_stock_stats(payload: Dict[str, Any]):
            res = self.graph.invoke({
                "event_name": "GET_STOCK_STATS",
                "payload": payload,
                "stock_usage": self.stock_usage
            })
            self.stock_usage = res.get("stock_usage", self.stock_usage)

        async def on_route_to_pharmacy(payload: Dict[str, Any]):
            res = await self.graph.ainvoke({
                "event_name": "ROUTE_TO_PHARMACY",
                "payload": payload,
                "stock_usage": self.stock_usage
            })
            self.stock_usage = res.get("stock_usage", self.stock_usage)

        async def on_delete_all_low_stock(payload: Dict[str, Any]):
            await self.graph.ainvoke({
                "event_name": "DELETE_ALL_LOW_STOCK",
                "payload": payload,
                "stock_usage": self.stock_usage
            })

        self.agent.on_event("ROUTE_TO_PHARMA", on_route_to_pharma)
        self.agent.on_event("GET_STOCK_STATS", on_get_stock_stats)
        self.agent.on_event("ROUTE_TO_PHARMACY", on_route_to_pharmacy)
        self.agent.on_event("DELETE_ALL_LOW_STOCK", on_delete_all_low_stock)

