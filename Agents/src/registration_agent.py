from typing import Dict, Any, List, TypedDict
from langgraph.graph import StateGraph, START, END
from src.band_config import PatientManagementRoom, DoctorDashboardRoom, BandSDK
from src.telemetry import Telemetry
from src.supabase_tools import fetch_doctors_from_supabase, book_appointment_in_supabase, reschedule_appointment_in_supabase, PatientNotFoundError

class RegistrationState(TypedDict):
    event_name: str
    payload: Dict[str, Any]

class RegistrationAgent:
    def __init__(self):
        self.agent = BandSDK.create_agent("RegistrationAgent")
        PatientManagementRoom.join(self.agent)
        self.graph = self._build_graph()
        self.setup_listeners()

    def _build_graph(self):
        builder = StateGraph(RegistrationState)

        async def query_doctors_node(state: RegistrationState) -> RegistrationState:
            payload = state["payload"]
            req_id = payload.get("requestId")
            date = payload.get("date")
            
            Telemetry.track_event(self.agent.name, "FETCHING_DOCTOR_LIST", {})
            db_docs = await fetch_doctors_from_supabase(date)
            docs = db_docs if db_docs else []
            
            response_payload = {"doctors": docs}
            if req_id:
                response_payload["requestId"] = req_id
                
            PatientManagementRoom.broadcast("DOCTORS_LIST_RESPONSE", response_payload)
            return state

        async def book_appointment_node(state: RegistrationState) -> RegistrationState:
            payload = state["payload"]
            req_id = payload.get("requestId")
            patient_name = payload.get("patientName")
            doctor_id = payload.get("doctorId")
            slot_time = payload.get("slotTime")
            date = payload.get("date")
            reason = payload.get("reason", "")
            
            try:
                success = await book_appointment_in_supabase(patient_name, doctor_id, slot_time, date, reason)
                if success:
                    msg = f"Successfully booked appointment for {patient_name} at {slot_time}."
                    PatientManagementRoom.broadcast("BOOKING_CONFIRMED", {
                        "requestId": req_id, 
                        "message": msg,
                        "doctorId": doctor_id,
                        "patientName": patient_name,
                        "slotTime": slot_time
                    })
                    # Relay to Doctor Dashboard so the DoctorAgent gets notified
                    DoctorDashboardRoom.broadcast("BOOKING_CONFIRMED", {
                        "doctorId": doctor_id,
                        "patientName": patient_name,
                        "slotTime": slot_time
                    })
                else:
                    msg = "Failed to book appointment. Please try again."
                    PatientManagementRoom.broadcast("BOOKING_FAILED", {"requestId": req_id, "message": msg, "doctorId": doctor_id})
            except PatientNotFoundError:
                msg = f"Patient {patient_name} is not in the database."
                PatientManagementRoom.broadcast("BOOKING_FAILED", {
                    "requestId": req_id, 
                    "message": msg, 
                    "doctorId": doctor_id,
                    "error": "patient_not_found"
                })
            return state

        async def reschedule_appointment_node(state: RegistrationState) -> RegistrationState:
            payload = state["payload"]
            req_id = payload.get("requestId")
            patient_name = payload.get("patientName")
            new_slot_time = payload.get("newSlotTime")
            date = payload.get("date")
            
            try:
                success = await reschedule_appointment_in_supabase(patient_name, new_slot_time, date)
                if success:
                    msg = f"Successfully rescheduled appointment for {patient_name} to {new_slot_time}."
                    PatientManagementRoom.broadcast("RESCHEDULE_CONFIRMED", {"requestId": req_id, "message": msg})
                else:
                    msg = "Failed to reschedule appointment. Please try again."
                    PatientManagementRoom.broadcast("RESCHEDULE_FAILED", {"requestId": req_id, "message": msg})
            except PatientNotFoundError:
                msg = f"Patient {patient_name} is not in the database."
                PatientManagementRoom.broadcast("RESCHEDULE_FAILED", {
                    "requestId": req_id, 
                    "message": msg,
                    "error": "patient_not_found"
                })
            return state

        async def check_availability_node(state: RegistrationState) -> RegistrationState:
            payload = state["payload"]
            from src.supabase_tools import resolve_doctor_id
            doctor_id = resolve_doctor_id(payload["doctorId"])
            slot = payload["slot"]
            date = payload.get("date")

            db_docs = await fetch_doctors_from_supabase(date)
            docs = db_docs if db_docs else []
            doc = next((d for d in docs if d["id"] == doctor_id), None)
            is_available = slot in doc["availableSlots"] if doc else False

            Telemetry.track_event(self.agent.name, "CHECK_AVAILABILITY_RESULT", {
                "doctorId": doctor_id,
                "slot": slot,
                "isAvailable": is_available
            })
            PatientManagementRoom.broadcast("DOCTOR_AVAILABILITY_STATUS", {
                "doctorId": doctor_id,
                "slot": slot,
                "isAvailable": is_available
            })
            return state

        async def request_doctor_match_node(state: RegistrationState) -> RegistrationState:
            payload = state["payload"]
            patient_id = payload["patientId"]
            symptoms = payload.get("symptoms", "").lower()
            requested_slot = payload.get("requestedSlot", "09:00")

            if "chest pain" in symptoms or "heart" in symptoms or "cardio" in symptoms:
                specialty = "Cardiology"
            elif "fever" in symptoms or "child" in symptoms or "pediatric" in symptoms:
                specialty = "Pediatrics"
            elif "skin" in symptoms or "rash" in symptoms or "acne" in symptoms:
                specialty = "Dermatology"
            elif "bone" in symptoms or "joint" in symptoms or "fracture" in symptoms:
                specialty = "Orthopedics"
            elif "eye" in symptoms or "vision" in symptoms:
                specialty = "Ophthalmology"
            elif "mental" in symptoms or "depression" in symptoms or "anxiety" in symptoms:
                specialty = "Psychiatry"
            elif "cancer" in symptoms or "tumor" in symptoms:
                specialty = "Oncology"
            elif "ear" in symptoms or "nose" in symptoms or "throat" in symptoms:
                specialty = "ENT"
            elif "urine" in symptoms or "kidney" in symptoms:
                specialty = "Urology"
            else:
                specialty = "General Medicine"

            db_docs = await fetch_doctors_from_supabase()
            docs = db_docs if db_docs else []
            matched_doc = next((d for d in docs if d["specialty"] == specialty), None)
            if not matched_doc:
                # Fallback to General Medicine if specialty not found
                matched_doc = next((d for d in docs if d["specialty"] == "General Medicine"), None)
                
            if matched_doc:
                doctor_id = matched_doc["id"]
                doctor_name = matched_doc["name"]
            else:
                doctor_id = "unknown"
                doctor_name = "Unknown Doctor"

            Telemetry.track_event(self.agent.name, "DOCTOR_MATCH_REQUESTED", {
                "patientId": patient_id,
                "symptoms": symptoms,
                "matchedSpecialty": specialty,
                "assignedDoctor": doctor_name
            })

            PatientManagementRoom.broadcast("DOCTOR_ASSIGNED", {
                "patientId": patient_id,
                "doctorId": doctor_id,
                "doctorName": doctor_name,
                "specialty": specialty,
                "slot": requested_slot
            })
            return state

        def route_event(state: RegistrationState) -> str:
            event_name = state.get("event_name")
            if event_name == "QUERY_DOCTORS":
                return "query_doctors"
            elif event_name == "BOOKING_REQUESTED":
                return "book_appointment"
            elif event_name == "RESCHEDULE_REQUESTED":
                return "reschedule_appointment"
            elif event_name == "CHECK_DOCTOR_AVAILABILITY":
                return "check_availability"
            elif event_name == "REQUEST_DOCTOR_MATCH":
                return "request_doctor_match"
            return END

        builder.add_node("query_doctors", query_doctors_node)
        builder.add_node("book_appointment", book_appointment_node)
        builder.add_node("reschedule_appointment", reschedule_appointment_node)
        builder.add_node("check_availability", check_availability_node)
        builder.add_node("request_doctor_match", request_doctor_match_node)

        builder.add_conditional_edges(
            START,
            route_event,
            {
                "query_doctors": "query_doctors",
                "book_appointment": "book_appointment",
                "reschedule_appointment": "reschedule_appointment",
                "check_availability": "check_availability",
                "request_doctor_match": "request_doctor_match",
                END: END
            }
        )
        builder.add_edge("query_doctors", END)
        builder.add_edge("book_appointment", END)
        builder.add_edge("reschedule_appointment", END)
        builder.add_edge("check_availability", END)
        builder.add_edge("request_doctor_match", END)

        return builder.compile()

    def setup_listeners(self):
        async def on_query_doctors(payload: Dict[str, Any]):
            await self.graph.ainvoke({"event_name": "QUERY_DOCTORS", "payload": payload})
            
        async def on_booking_requested(payload: Dict[str, Any]):
            await self.graph.ainvoke({"event_name": "BOOKING_REQUESTED", "payload": payload})
            
        async def on_reschedule_requested(payload: Dict[str, Any]):
            await self.graph.ainvoke({"event_name": "RESCHEDULE_REQUESTED", "payload": payload})

        async def on_check_doctor_availability(payload: Dict[str, Any]):
            await self.graph.ainvoke({"event_name": "CHECK_DOCTOR_AVAILABILITY", "payload": payload})

        async def on_request_doctor_match(payload: Dict[str, Any]):
            await self.graph.ainvoke({"event_name": "REQUEST_DOCTOR_MATCH", "payload": payload})

        self.agent.on_event("QUERY_DOCTORS", on_query_doctors)
        self.agent.on_event("BOOKING_REQUESTED", on_booking_requested)
        self.agent.on_event("RESCHEDULE_REQUESTED", on_reschedule_requested)
        self.agent.on_event("CHECK_DOCTOR_AVAILABILITY", on_check_doctor_availability)
        self.agent.on_event("REQUEST_DOCTOR_MATCH", on_request_doctor_match)
