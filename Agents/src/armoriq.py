import os
import hmac
import hashlib
import json
import uuid
from datetime import datetime

# Global registry to store active Intent Assurance Plans by patient ID
ACTIVE_IAPS = {}

class BlockedException(Exception):
    """Exception raised when an agent attempts an out-of-scope tool execution."""
    pass

# Try importing from the official ArmorIQ Python SDK
try:
    from armoriq_sdk import (
        ArmorIQClient,
        PolicyBlockedException,
        IntentMismatchException,
        TokenExpiredException
    )
    ARMORIQ_SDK_AVAILABLE = True
except ImportError:
    ARMORIQ_SDK_AVAILABLE = False

SECRET_KEY = b"mash_armoriq_secure_secret_key"

# Initialize the real ArmorIQ Client if an API key is configured
API_KEY = os.getenv("ARMORIQ_API_KEY")
CLIENT = None

if ARMORIQ_SDK_AVAILABLE and API_KEY:
    try:
        CLIENT = ArmorIQClient(api_key=API_KEY)
        print("[ARMORIQ] Real Python ArmorIQClient initialized successfully.")
    except Exception as e:
        print(f"[ARMORIQ] Warning: Failed to initialize real ArmorIQClient: {e}")


class ArmorIQ:
    @staticmethod
    def capture_plan(patient_id: str, symptoms: str) -> dict:
        """Analyze natural language patient symptoms and generate a signed Intent Assurance Plan (IAP)."""
        # Seed core scopes
        scopes = [
            "patient.registration",
            "patient.navigation",
            "clinical.history.read"
        ]
        
        # If symptoms include clinic operations or medicine/prescription checks, enable inventory/prescription scopes
        symptom_lower = symptoms.lower()
        if any(kw in symptom_lower for kw in ["pain", "cough", "fever", "med", "pill", "prescription", "stock", "pharmacy"]):
            scopes.extend([
                "prescription.validate",
                "inventory.stock.decrement"
            ])
            
        plan_data = None

        if CLIENT:
            try:
                # Map the symptoms to steps representing authorized actions in a real IAP
                steps = [{"action": scope, "mcp": "mash-mcp", "description": f"Authorized scope: {scope}"} for scope in scopes]
                captured = CLIENT.capture_plan(
                    llm="gemini-1.5-flash",
                    prompt=symptoms,
                    plan={
                        "goal": f"Handle patient triage and checkup for symptoms: {symptoms}",
                        "steps": steps
                    }
                )
                token = CLIENT.get_intent_token(captured)
                plan_data = {
                    "iap_id": token.tokenId,
                    "patient_id": patient_id,
                    "symptoms": symptoms,
                    "authorized_scopes": scopes,
                    "created_at": datetime.utcnow().isoformat(),
                    "signature": token.signature,
                    "raw_token": token
                }
            except Exception as e:
                print(f"[ARMORIQ] Real plan capture failed, falling back to local creation: {e}")

        if not plan_data:
            # Fallback/Offline local HMAC signature
            iap_id = f"iap-{str(uuid.uuid4())[:8]}"
            raw_plan = {
                "iap_id": iap_id,
                "patient_id": patient_id,
                "symptoms": symptoms,
                "authorized_scopes": scopes,
                "created_at": datetime.utcnow().isoformat()
            }
            serialized = json.dumps(raw_plan, sort_keys=True).encode("utf-8")
            sig = hmac.new(SECRET_KEY, serialized, hashlib.sha256).hexdigest()
            plan_data = { **raw_plan, "signature": sig }
            
        return plan_data

    @staticmethod
    def delegate(agent_name: str, scope: list, plan: dict) -> dict:
        """Delegate scoped authority to a sub-agent. Fails if scopes exceed the signed plan limits."""
        if not ArmorIQ.verify_plan(plan):
            raise BlockedException("Invalid Intent Assurance Plan (IAP) signature. Cryptographic trust verification failed.")
            
        plan_scopes = plan.get("authorized_scopes", [])
        invalid_scopes = [s for s in scope if s not in plan_scopes]
        if invalid_scopes:
            raise BlockedException(f"Delegation blocked by OPA policy: Scopes {invalid_scopes} are not authorized by the active IAP.")
            
        delegation_data = None

        if CLIENT and "raw_token" in plan:
            try:
                # Use a dummy public key hex for delegation matching Ed25519 requirements
                dummy_pub_key = "00" * 32
                res = CLIENT.delegate(
                    intent_token=plan["raw_token"],
                    delegate_public_key=dummy_pub_key,
                    allowed_actions=scope,
                    target_agent=agent_name
                )
                delegation_data = {
                    "iap_id": plan["iap_id"],
                    "agent_name": agent_name,
                    "delegated_scopes": scope,
                    "delegated_at": datetime.utcnow().isoformat(),
                    "signature": res.delegatedToken.signature,
                    "raw_token": res.delegatedToken
                }
            except Exception as e:
                print(f"[ARMORIQ] Real delegation failed, falling back to local creation: {e}")

        if not delegation_data:
            # Fallback/Offline local HMAC signature
            raw_delegation = {
                "iap_id": plan["iap_id"],
                "agent_name": agent_name,
                "delegated_scopes": scope,
                "delegated_at": datetime.utcnow().isoformat()
            }
            serialized = json.dumps(raw_delegation, sort_keys=True).encode("utf-8")
            sig = hmac.new(SECRET_KEY, serialized, hashlib.sha256).hexdigest()
            delegation_data = { **raw_delegation, "signature": sig }
            
        return delegation_data

    @staticmethod
    def verify_plan(plan: dict) -> bool:
        """Verify the integrity and authenticity of the signed IAP."""
        if not plan or "signature" not in plan:
            return False
        plan_copy = plan.copy()
        if "raw_token" in plan_copy:
            plan_copy.pop("raw_token")
        sig = plan_copy.pop("signature")
        serialized = json.dumps(plan_copy, sort_keys=True).encode("utf-8")
        expected_sig = hmac.new(SECRET_KEY, serialized, hashlib.sha256).hexdigest()
        return hmac.compare_digest(sig, expected_sig)

    @staticmethod
    def verify_delegation(delegation: dict) -> bool:
        """Verify the integrity and authenticity of the delegation token."""
        if not delegation or "signature" not in delegation:
            return False
        delegation_copy = delegation.copy()
        if "raw_token" in delegation_copy:
            delegation_copy.pop("raw_token")
        sig = delegation_copy.pop("signature")
        serialized = json.dumps(delegation_copy, sort_keys=True).encode("utf-8")
        expected_sig = hmac.new(SECRET_KEY, serialized, hashlib.sha256).hexdigest()
        return hmac.compare_digest(sig, expected_sig)

    @staticmethod
    def invoke(agent_name: str, action: str, token: dict, params: dict = None) -> bool:
        """Intercept tool call and validate if it matches delegated scopes in the trust token."""
        if not token:
            raise BlockedException(f"Access Denied: Agent '{agent_name}' attempted tool call '{action}' without an ArmorIQ token.")
            
        if not ArmorIQ.verify_delegation(token):
            raise BlockedException(f"Access Denied: Agent '{agent_name}' presented an invalid or tampered delegation token.")

        if CLIENT and "raw_token" in token:
            try:
                # Verify via the real SDK client
                CLIENT.invoke(
                    mcp="mash-mcp",
                    action=action,
                    intent_token=token["raw_token"],
                    params=params
                )
                return True
            except (PolicyBlockedException, IntentMismatchException, TokenExpiredException) as e:
                raise BlockedException(f"Access Denied: Real-time verification failed: {e}")
            except Exception as e:
                print(f"[ARMORIQ] Real verification failed, falling back to local checks: {e}")

        # Open Policy Agent rules mapping action -> required scope (local fallback engine)
        action_scopes = {
            "match_doctor": "patient.registration",
            "book_appointment": "patient.registration",
            "reschedule_appointment": "patient.registration",
            "get_navigation": "patient.navigation",
            "read_history": "clinical.history.read",
            "check_stock": "prescription.validate",
            "decrement_stock": "inventory.stock.decrement"
        }
        
        if action not in action_scopes:
            raise BlockedException(f"OPA Engine Blocked: Action '{action}' is not registered under any active security policy.")
            
        required_scope = action_scopes[action]
        delegated_scopes = token.get("delegated_scopes", [])
        if required_scope not in delegated_scopes:
            raise BlockedException(f"OPA Engine Blocked: Agent '{agent_name}' attempted out-of-scope action '{action}'. Required scope: '{required_scope}' is missing from token.")
            
        return True
