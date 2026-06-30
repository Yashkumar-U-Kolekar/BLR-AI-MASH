import asyncio
import json
import os
from typing import Dict, Any, List, Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from dotenv import load_dotenv

load_dotenv()

from src.band_config import PharmacistDashboardRoom, PharmacyInventoryRoom, BandSDK
from src.telemetry import Telemetry
from src.supabase_tools import SUPABASE_URL, get_headers

# Backend URL — overrideable via env (needed when running inside Docker)
BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:3000")


class PharmacistAssistantAgent:
    def __init__(self):
        self.agent = BandSDK.create_agent("PharmacistAgent")
        PharmacistDashboardRoom.join(self.agent)
        PharmacyInventoryRoom.join(self.agent)
        self.setup_listeners()

        self.llm = ChatGoogleGenerativeAI(model="gemini-3.1-flash-lite", temperature=0)

        self.pending_notifications: List[str] = []
        self.pending_actions: List[Dict[str, Any]] = []

        # Build pharmacy-specific tools bound to this instance
        agent_self = self

        @tool
        async def get_inventory_status(medicine_name: Optional[str] = None) -> str:
            """Fetch current medicine inventory from the pharmacy database.
            If medicine_name is provided, returns stock info for that specific medicine.
            If not provided, returns a summary of all medicines with low stock alerts.
            Use this when the pharmacist asks about stock levels, inventory, or medicine availability."""
            import httpx
            try:
                if medicine_name:
                    # Search for specific medicine
                    search_term = medicine_name.split()[0] if medicine_name else ""
                    url = f"{SUPABASE_URL}/rest/v1/medicine_inventory?medicine_name=ilike.*{search_term}*"
                    async with httpx.AsyncClient() as client:
                        res = await client.get(url, headers=get_headers())
                        if res.status_code == 200 and res.json():
                            results = res.json()
                            lines = []
                            for med in results:
                                stock = med.get("current_stock", 0)
                                threshold = med.get("reorder_threshold", 0)
                                status = "LOW STOCK" if stock <= threshold else "OK"
                                lines.append(f"- {med['medicine_name']}: {stock} units in stock (reorder at {threshold}) [{status}]")
                            return "\n".join(lines)
                        return f"No medicine matching '{medicine_name}' found in inventory."
                else:
                    # Get full inventory with focus on low-stock items
                    url = f"{SUPABASE_URL}/rest/v1/medicine_inventory?select=medicine_name,current_stock,reorder_threshold&order=current_stock.asc"
                    async with httpx.AsyncClient() as client:
                        res = await client.get(url, headers=get_headers())
                        if res.status_code == 200 and res.json():
                            data = res.json()
                            low_stock = [m for m in data if m["current_stock"] <= m["reorder_threshold"]]
                            ok_stock = [m for m in data if m["current_stock"] > m["reorder_threshold"]]

                            parts = []
                            if low_stock:
                                parts.append(f"⚠️ {len(low_stock)} medicine(s) LOW on stock:")
                                for m in low_stock:
                                    parts.append(f"  - {m['medicine_name']}: {m['current_stock']} units (reorder at {m['reorder_threshold']})")
                            parts.append(f"\n✅ {len(ok_stock)} medicine(s) adequately stocked.")
                            if ok_stock[:5]:
                                for m in ok_stock[:5]:
                                    parts.append(f"  - {m['medicine_name']}: {m['current_stock']} units")
                                if len(ok_stock) > 5:
                                    parts.append(f"  ... and {len(ok_stock) - 5} more.")
                            return "\n".join(parts)
                        return "Could not fetch inventory data."
            except Exception as e:
                return f"Error fetching inventory: {e}"

        @tool
        async def get_pending_prescriptions() -> str:
            """Fetch incoming/pending prescription orders from the pharmacy database.
            Returns a list of prescriptions that need to be fulfilled.
            Use this when the pharmacist asks about incoming orders, pending prescriptions, or what needs to be prepared."""
            import httpx
            try:
                backend_url = f"{BACKEND_URL}/api/pharmacy"
                async with httpx.AsyncClient(timeout=10.0) as client:
                    res = await client.get(backend_url)
                    if res.status_code == 200:
                        data = res.json()
                        prescriptions = data.get("prescriptions", [])
                        if not prescriptions:
                            return "No pending prescriptions at the moment."

                        lines = []
                        for rx in prescriptions:
                            status = rx.get("status", "unknown")
                            patient = rx.get("patient_name", "Unknown")
                            doctor = rx.get("doctor_name", "Unknown")
                            items = rx.get("items", [])
                            item_names = ", ".join(i.get("medicine_name", "?") for i in items)
                            all_in_stock = rx.get("allInStock", False)
                            stock_note = "All in stock" if all_in_stock else "Some items out of stock"

                            lines.append(f"- [{status.upper()}] {patient} (Dr. {doctor}): {item_names} — {stock_note}")
                        return "\n".join(lines)
                    return "Could not fetch prescription data from backend."
            except Exception as e:
                return f"Error fetching prescriptions: {e}"

        @tool
        async def fulfill_prescription_order(patient_name: str) -> str:
            """Fulfill a prescription order for a specific patient.
            This marks the prescription as fulfilled and deducts stock from inventory.
            Use this when the pharmacist says to fulfill, complete, or process an order for a patient."""
            import httpx
            try:
                # First get pharmacy data to find the prescription ID
                backend_url = f"{BACKEND_URL}/api/pharmacy"
                async with httpx.AsyncClient(timeout=10.0) as client:
                    res = await client.get(backend_url)
                    if res.status_code != 200:
                        return "Could not fetch pharmacy data."

                    data = res.json()
                    prescriptions = data.get("prescriptions", [])

                    # Find matching prescription by patient name
                    search = patient_name.strip().lower()
                    match = None
                    for rx in prescriptions:
                        if rx.get("status") == "fulfilled":
                            continue
                        rx_patient = rx.get("patient_name", "").lower()
                        if search in rx_patient or rx_patient in search:
                            match = rx
                            break

                    if not match:
                        # Try partial first-name match
                        first_word = search.split()[0] if search else ""
                        for rx in prescriptions:
                            if rx.get("status") == "fulfilled":
                                continue
                            if first_word and first_word in rx.get("patient_name", "").lower():
                                match = rx
                                break

                    if not match:
                        return f"No pending prescription found for '{patient_name}'."

                    if not match.get("allInStock"):
                        return f"Cannot fulfill prescription for {match['patient_name']} — some items are out of stock. Consider restocking first or requesting an alternative."

                    rx_id = match["id"]
                    fulfill_url = f"{BACKEND_URL}/api/prescriptions/{rx_id}/fulfill"
                    fulfill_res = await client.patch(fulfill_url, headers={"Content-Type": "application/json"})

                    if fulfill_res.status_code == 200:
                        # Trigger a UI refresh action
                        agent_self.pending_actions.append({"type": "refresh_pharmacy"})
                        return f"Successfully fulfilled prescription for {match['patient_name']}. Stock has been deducted."
                    return f"Failed to fulfill prescription: {fulfill_res.text}"
            except Exception as e:
                return f"Error fulfilling prescription: {e}"

        @tool
        async def restock_medicine(medicine_name: str, amount: int = 100) -> str:
            """Restock a medicine in the pharmacy inventory.
            Adds the specified amount (default 100 units) to the current stock.
            Use this when the pharmacist asks to restock, replenish, or add stock for a medicine."""
            import httpx
            try:
                # Find the medicine ID
                search_term = medicine_name.split()[0] if medicine_name else ""
                url = f"{SUPABASE_URL}/rest/v1/medicine_inventory?medicine_name=ilike.*{search_term}*"
                async with httpx.AsyncClient(timeout=10.0) as client:
                    res = await client.get(url, headers=get_headers())
                    if res.status_code != 200 or not res.json():
                        return f"Could not find medicine matching '{medicine_name}' in inventory."

                    med = res.json()[0]
                    med_id = med["id"]
                    med_full_name = med["medicine_name"]

                    restock_url = f"{BACKEND_URL}/api/medicine_inventory/{med_id}/restock"
                    restock_res = await client.patch(
                        restock_url,
                        headers={"Content-Type": "application/json"},
                        json={"amount": amount}
                    )

                    if restock_res.status_code == 200:
                        new_data = restock_res.json()
                        new_stock = new_data.get("current_stock", "?")
                        agent_self.pending_actions.append({"type": "refresh_pharmacy"})
                        return f"Successfully restocked {med_full_name}. New stock level: {new_stock} units."
                    return f"Failed to restock: {restock_res.text}"
            except Exception as e:
                return f"Error restocking medicine: {e}"

        @tool
        async def request_alternative_medicine(patient_name: str, reason: str = "Stock constraints") -> str:
            """Request an alternative medicine from the doctor for a patient's prescription.
            Use this when the pharmacist needs to ask the doctor for an alternative due to stock issues."""
            import httpx
            try:
                backend_url = f"{BACKEND_URL}/api/pharmacy"
                async with httpx.AsyncClient(timeout=10.0) as client:
                    res = await client.get(backend_url)
                    if res.status_code != 200:
                        return "Could not fetch pharmacy data."

                    data = res.json()
                    prescriptions = data.get("prescriptions", [])

                    search = patient_name.strip().lower()
                    match = None
                    for rx in prescriptions:
                        if rx.get("status") in ("fulfilled", "alternative_requested"):
                            continue
                        rx_patient = rx.get("patient_name", "").lower()
                        if search in rx_patient or rx_patient in search:
                            match = rx
                            break

                    if not match:
                        first_word = search.split()[0] if search else ""
                        for rx in prescriptions:
                            if rx.get("status") in ("fulfilled", "alternative_requested"):
                                continue
                            if first_word and first_word in rx.get("patient_name", "").lower():
                                match = rx
                                break

                    if not match:
                        return f"No active prescription found for '{patient_name}' to request alternative."

                    rx_id = match["id"]
                    alt_url = f"{BACKEND_URL}/api/prescriptions/{rx_id}/alternative"
                    alt_res = await client.patch(
                        alt_url,
                        headers={"Content-Type": "application/json"},
                        json={"comments": reason}
                    )

                    if alt_res.status_code == 200:
                        agent_self.pending_actions.append({"type": "refresh_pharmacy"})
                        return f"Alternative medicine request sent to the doctor for {match['patient_name']}."
                    return f"Failed to request alternative: {alt_res.text}"
            except Exception as e:
                return f"Error requesting alternative: {e}"

        @tool
        async def navigate_to_view(view_name: str) -> str:
            """Navigate the pharmacist's dashboard to a specific view or page.
            Supported view_names:
            - 'inventory': Go to the main inventory/stock view.
            - 'prescriptions': Go to the pending prescriptions queue.
            
            Use this whenever the pharmacist asks to 'go to', 'open', 'show', or 'navigate' to a page or view.
            """
            agent_self.pending_actions.append({"type": "navigate_to_view", "view_name": view_name.strip().lower()})
            return f"Navigated to {view_name} view."

        @tool
        async def get_waiting_patients_count(medicine_name: Optional[str] = None) -> str:
            """Get the number of patients waiting for medications in the pharmacy.
            If medicine_name is provided, returns the number of patients waiting for that specific medicine.
            If medicine_name is not provided, returns the total number of unique patients waiting for any medicine.
            Use this when the pharmacist asks 'how many patients are waiting' or 'how many patients are waiting for [medicine]'."""
            import httpx
            try:
                backend_url = f"{BACKEND_URL}/api/pharmacy"
                async with httpx.AsyncClient(timeout=10.0) as client:
                    res = await client.get(backend_url)
                    if res.status_code == 200:
                        data = res.json()
                        prescriptions = data.get("prescriptions", [])
                        pending_rx = [rx for rx in prescriptions if rx.get("status") != "fulfilled"]
                        
                        if medicine_name:
                            med_search = medicine_name.strip().lower()
                            matching_patients = set()
                            for rx in pending_rx:
                                items = rx.get("items", [])
                                for item in items:
                                    if med_search in item.get("medicine_name", "").lower():
                                        matching_patients.add(rx.get("patient_name", "Unknown"))
                                        break
                            count = len(matching_patients)
                            return f"There are {count} patient(s) waiting for '{medicine_name}'."
                        else:
                            unique_patients = {rx.get("patient_name", "Unknown") for rx in pending_rx}
                            count = len(unique_patients)
                            return f"There are a total of {count} unique patient(s) waiting for medications."
                    return "Could not fetch pharmacy data from backend."
            except Exception as e:
                return f"Error counting waiting patients: {e}"

        self.react_agent = create_react_agent(
            self.llm,
            tools=[
                get_inventory_status,
                get_pending_prescriptions,
                fulfill_prescription_order,
                restock_medicine,
                request_alternative_medicine,
                navigate_to_view,
                get_waiting_patients_count,
            ]
        )

    def setup_listeners(self):
        def on_prepare_medicine(payload: Dict[str, Any]):
            patient_id = payload.get("patientId")
            prescription = payload.get("prescription", {})
            medicine = prescription.get("medicine", "unknown medicine")

            Telemetry.track_event(self.agent.name, "INCOMING_ORDER_PREPARATION", payload)

            msg = f"New prescription order arrived for patient '{patient_id}': {medicine}."
            self.pending_notifications.append(msg)
            print(f"[Pharmacist Agent] {msg}")

        def on_stock_demand_alert(payload: Dict[str, Any]):
            medicine = payload.get("medicine", "unknown medicine")
            count = payload.get("currentUsage", 0)

            Telemetry.track_event(self.agent.name, "STOCK_DEMAND_ALERT_RECEIVED", payload)

            msg = f"High demand alert: '{medicine}' has been prescribed {count} times. Consider restocking."
            self.pending_notifications.append(msg)
            print(f"[Pharmacist Agent] {msg}")

        self.agent.on_event("PREPARE_MEDICINE", on_prepare_medicine)
        self.agent.on_event("ROUTE_TO_PHARMA", on_prepare_medicine)
        self.agent.on_event("STOCK_DEMAND_ALERT", on_stock_demand_alert)

    async def process_pharmacist_query(self, messages: list) -> list:
        """Process an interactive conversation with the pharmacist."""
        self.pending_actions = []

        system_content = (
            "You are the AI assistant for the hospital pharmacist. "
            "You help manage the pharmacy — checking inventory, fulfilling prescription orders, "
            "restocking medicines, and flagging stock issues. "
            "You speak like a friendly, efficient pharmacy colleague — brief, helpful, and action-oriented. "
            "When the pharmacist asks about stock levels, use the get_inventory_status tool. "
            "When they ask about pending or incoming orders, use the get_pending_prescriptions tool. "
            "When they want to fulfill/complete a prescription, use fulfill_prescription_order with the patient's name. "
            "When they want to restock a medicine, use restock_medicine with the medicine name. "
            "When they want to request an alternative from the doctor, use request_alternative_medicine. "
            "When they ask to navigate or switch pages, use navigate_to_view. "
            "When they ask how many patients are waiting in total or for a specific medicine, use get_waiting_patients_count. "
            "Always be concise and conversational. No markdown dumps or long lists unless asked."
        )

        # Inject pending notifications
        if self.pending_notifications:
            notifications_str = " ".join(self.pending_notifications)
            system_content += f"\n\n[SYSTEM NOTIFICATION]: {notifications_str}"
            self.pending_notifications.clear()

        system_msg = {"role": "system", "content": system_content}

        has_system = any(
            (isinstance(m, dict) and m.get("role") == "system") or
            getattr(m, "type", None) == "system"
            for m in messages[:1]
        )

        inputs = {"messages": messages if has_system else [system_msg] + messages}
        result = await self.react_agent.ainvoke(inputs)
        return result["messages"]


# Keep backward compat alias
PharmacistAgent = PharmacistAssistantAgent
