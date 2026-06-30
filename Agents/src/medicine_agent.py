from typing import Dict, Any, TypedDict
from langgraph.graph import StateGraph, START, END
from src.band_config import (
    PatientManagementRoom,
    ClinicalConsultRoom,
    PharmacyInventoryRoom,
    DoctorDashboardRoom,
    PharmacistDashboardRoom,
    BandSDK
)
from src.telemetry import Telemetry
from src.supabase_tools import fetch_medicine_stock_from_supabase

class MedicineManagementState(TypedDict):
    event_name: str
    payload: Dict[str, Any]

class MedicineManagementAgent:
    def __init__(self):
        self.agent = BandSDK.create_agent("MedicineManagementAgent")
        PatientManagementRoom.join(self.agent)
        ClinicalConsultRoom.join(self.agent)
        PharmacyInventoryRoom.join(self.agent)
        DoctorDashboardRoom.join(self.agent)
        PharmacistDashboardRoom.join(self.agent)
        self.graph = self._build_graph()
        self.setup_listeners()

    def _build_graph(self):
        builder = StateGraph(MedicineManagementState)

        async def process_prescription_node(state: MedicineManagementState) -> MedicineManagementState:
            payload = state["payload"]
            patient_id = payload["patientId"]
            prescription = payload["prescription"]
            
            Telemetry.track_event(self.agent.name, "EVALUATE_PRESCRIPTION", {"patientId": patient_id})

            is_stock_available = await self.check_stock(prescription.get("medicine", ""))

            if is_stock_available:
                # Dual-branched handoff: Route directly to Pharma queue
                Telemetry.track_handoff(self.agent.name, "PharmaQueue", {"patientId": patient_id, "prescription": prescription})
                PatientManagementRoom.broadcast("ROUTE_TO_PHARMA", {"patientId": patient_id, "prescription": prescription})
                # Notify pharmacist dashboard
                PharmacistDashboardRoom.broadcast("PREPARE_MEDICINE", {
                    "patientId": patient_id,
                    "prescription": prescription
                })
            else:
                # Ask doctor for alternative medicine or his comments
                DoctorDashboardRoom.broadcast("ALTERNATIVE_MEDICINE_REQUESTED", {
                    "patientId": patient_id,
                    "medicine": prescription.get("medicine"),
                    "doctorId": payload.get("doctorId")
                })

                # Dual-branched handoff: Raise Band event for Human-in-the-Loop
                human_response = await self.agent.request_human_intervention(
                    f"Medicine '{prescription.get('medicine')}' is out of stock. Require Doctor's alternate prescription.",
                    {"patientId": patient_id, "prescription": prescription}
                )

                Telemetry.track_event(self.agent.name, "HUMAN_INTERVENTION_RESOLVED", human_response)

                # Broadcast the resolution
                PatientManagementRoom.broadcast("PRESCRIPTION_UPDATED", {"patientId": patient_id, "resolution": human_response})
            return state

        async def prescription_written_node(state: MedicineManagementState) -> MedicineManagementState:
            payload = state["payload"]
            patient_id = payload["patientId"]
            prescription = payload["prescription"]

            Telemetry.track_event(self.agent.name, "CLINICAL_PRESCRIPTION_WRITTEN", {"patientId": patient_id})

            is_stock_available = await self.check_stock(prescription.get("medicine", ""))

            if is_stock_available:
                ClinicalConsultRoom.broadcast("PRESCRIPTION_SAFETY_PASSED", {
                    "patientId": patient_id,
                    "prescription": prescription,
                    "status": "approved"
                })
                # Notify pharmacist dashboard
                PharmacistDashboardRoom.broadcast("PREPARE_MEDICINE", {
                    "patientId": patient_id,
                    "prescription": prescription
                })
            else:
                # Ask doctor for alternative medicine or his comments
                DoctorDashboardRoom.broadcast("ALTERNATIVE_MEDICINE_REQUESTED", {
                    "patientId": patient_id,
                    "medicine": prescription.get("medicine"),
                    "doctorId": payload.get("doctorId")
                })

                human_response = await self.agent.request_human_intervention(
                    f"Conflict: Medicine '{prescription.get('medicine')}' is out of stock. Alternate prescription required.",
                    {"patientId": patient_id, "prescription": prescription}
                )

                Telemetry.track_event(self.agent.name, "CLINICAL_PRESCRIPTION_RESOLVED", human_response)

                ClinicalConsultRoom.broadcast("PRESCRIPTION_SAFETY_PASSED", {
                    "patientId": patient_id,
                    "prescription": prescription,
                    "status": "approved_via_intervention",
                    "resolution": human_response
                })
            return state

        async def check_availability_node(state: MedicineManagementState) -> MedicineManagementState:
            payload = state["payload"]
            patient_id = payload["patientId"]
            medicine = payload.get("medicine", "")

            Telemetry.track_event(self.agent.name, "CHECK_MEDICINE_AVAILABILITY", {
                "patientId": patient_id,
                "medicine": medicine
            })

            is_available = await self.check_stock(medicine)

            PharmacyInventoryRoom.broadcast("MEDICINE_AVAILABILITY_STATUS", {
                "patientId": patient_id,
                "medicine": medicine,
                "isAvailable": is_available
            })
            return state

        def route_event(state: MedicineManagementState) -> str:
            event_name = state.get("event_name")
            if event_name == "PROCESS_PRESCRIPTION":
                return "process_prescription"
            elif event_name == "PRESCRIPTION_WRITTEN":
                return "prescription_written"
            elif event_name == "CHECK_MEDICINE_AVAILABILITY":
                return "check_availability"
            return END

        builder.add_node("process_prescription", process_prescription_node)
        builder.add_node("prescription_written", prescription_written_node)
        builder.add_node("check_availability", check_availability_node)

        builder.add_conditional_edges(
            START,
            route_event,
            {
                "process_prescription": "process_prescription",
                "prescription_written": "prescription_written",
                "check_availability": "check_availability",
                END: END
            }
        )
        builder.add_edge("process_prescription", END)
        builder.add_edge("prescription_written", END)
        builder.add_edge("check_availability", END)

        return builder.compile()

    def setup_listeners(self):
        async def on_process_prescription(payload: Dict[str, Any]):
            await self.graph.ainvoke({"event_name": "PROCESS_PRESCRIPTION", "payload": payload})

        async def on_prescription_written(payload: Dict[str, Any]):
            await self.graph.ainvoke({"event_name": "PRESCRIPTION_WRITTEN", "payload": payload})

        async def on_check_medicine_availability(payload: Dict[str, Any]):
            await self.graph.ainvoke({"event_name": "CHECK_MEDICINE_AVAILABILITY", "payload": payload})

        self.agent.on_event("PROCESS_PRESCRIPTION", on_process_prescription)
        self.agent.on_event("PRESCRIPTION_WRITTEN", on_prescription_written)
        self.agent.on_event("CHECK_MEDICINE_AVAILABILITY", on_check_medicine_availability)

    async def check_stock(self, medicine: str) -> bool:
        # Check Supabase first
        try:
            med_info = await fetch_medicine_stock_from_supabase(medicine)
            if med_info:
                return med_info.get("current_stock", 0) > 0
        except Exception as e:
            print(f"[Medicine Agent Warning] Supabase check failed: {e}")
        # Mock logic fallback
        return "rare" not in medicine.lower()
