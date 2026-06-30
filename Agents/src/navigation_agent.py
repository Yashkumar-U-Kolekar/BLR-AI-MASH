from typing import Dict, Any
from src.band_config import PatientManagementRoom, BandSDK
from src.telemetry import Telemetry

class PatientNavigationAgent:
    def __init__(self):
        self.agent = BandSDK.create_agent("PatientNavigationAgent")
        PatientManagementRoom.join(self.agent)
        self.doctor_locations: Dict[str, Dict[str, str]] = {
            "doc-1": {"room": "Room 302", "floor": "3rd Floor"}, # Dr. Smith
            "doc-2": {"room": "Room 105", "floor": "1st Floor"}, # Dr. Jones
            "doc-3": {"room": "Room 204", "floor": "2nd Floor"}  # Dr. Davis
        }
        self.setup_listeners()

    def _get_directions(self, doctor_id: str, current_location: str) -> str:
        doc_clean = str(doctor_id).lower()
        if "pharmacy" in doc_clean:
            return f"From {current_location}: The Pharmacy is located immediately to your right as you enter the building."
        elif "reception" in doc_clean:
            return f"From {current_location}: You are already at the Reception."
        
        # Try dynamic lookup
        import requests
        try:
            from src.supabase_tools import SUPABASE_URL, get_headers
            url = f"{SUPABASE_URL}/rest/v1/doctor_details?doctor_id=eq.{doctor_id}"
            res = requests.get(url, headers=get_headers(), timeout=5)
            if res.status_code == 200:
                data = res.json()
                if data:
                    room = data[0].get("room_number", "unknown")
                    if "401" in room or "402" in room:
                        return f"From {current_location}: Take the corridor to Consultation Wing A for {room}."
                    elif "403" in room or "404" in room:
                        return f"From {current_location}: Take the corridor to Consultation Wing B for {room}."
                    elif "405" in room or "406" in room:
                        return f"From {current_location}: Take the corridor to Consultation Wing C for {room}."
                    elif "407" in room or "408" in room:
                        return f"From {current_location}: Take the corridor to Consultation Wing D for {room}."
                    elif "ER" in room:
                        return f"From {current_location}: Exit reception and head straight down the corridor to the Emergency Room."
                    elif "1" in room:
                        return f"From {current_location}: Exit the reception/waiting area, walk straight into the corridor, and take the first right into Doctor Consultation Room 1."
                    elif "2" in room:
                        return f"From {current_location}: Exit the reception/waiting area, walk straight into the corridor, pass Doctor Consultation Room 1, and take the second right into Doctor Consultation Room 2."
                    else:
                        return f"From {current_location}: Walk down the main corridor and proceed to {room}."
        except Exception as e:
            print(f"Error fetching directions: {e}")
            
        return f"From {current_location}: Exit the reception area and walk down the corridor to find your destination room."

    def setup_listeners(self):
        def on_request_navigation(payload: Dict[str, Any]):
            patient_id = payload.get("patientId")
            doctor_id = payload.get("doctorId")
            current_location = payload.get("currentLocation", "Reception Desk")
            req_id = payload.get("requestId")

            Telemetry.track_event(self.agent.name, "GENERATING_NAVIGATION", payload)

            directions = self._get_directions(doctor_id, current_location)

            PatientManagementRoom.broadcast("NAVIGATION_DIRECTIONS", {
                "requestId": req_id,
                "patientId": patient_id,
                "doctorId": doctor_id,
                "directions": directions
            })

        def on_navigate_to_room(payload: Dict[str, Any]):
            patient_id = payload.get("patientId")
            doctor_id = payload.get("doctorId")
            current_location = payload.get("currentLocation", "Reception Desk")
            req_id = payload.get("requestId")

            Telemetry.track_event(self.agent.name, "GENERATING_ROOM_NAVIGATION", payload)

            directions = self._get_directions(doctor_id, current_location)

            PatientManagementRoom.broadcast("NAVIGATION_DIRECTIONS", {
                "requestId": req_id,
                "patientId": patient_id,
                "doctorId": doctor_id,
                "directions": directions
            })

        def on_doctor_room_change(payload: Dict[str, Any]):
            doctor_id = payload.get("doctorId")
            room = payload.get("room")
            floor = payload.get("floor")

            self.doctor_locations[doctor_id] = {"room": room, "floor": floor}

            Telemetry.track_event(self.agent.name, "DOCTOR_ROOM_UPDATED", {
                "doctorId": doctor_id,
                "room": room,
                "floor": floor
            })

        self.agent.on_event("REQUEST_NAVIGATION", on_request_navigation)
        self.agent.on_event("NAVIGATE_TO_ROOM", on_navigate_to_room)
        self.agent.on_event("DOCTOR_ROOM_CHANGE", on_doctor_room_change)

