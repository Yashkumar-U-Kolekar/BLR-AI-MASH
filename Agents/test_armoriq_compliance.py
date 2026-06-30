import sys
import os
import asyncio
from datetime import datetime

# Set up paths
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.armoriq import ArmorIQ, BlockedException, ACTIVE_IAPS
from src.band_config import TelemetryAuditRoom, PharmacyInventoryRoom
from src.telemetry_agent import TelemetryAgent
from src.stock_agent import StockManagementAgent

async def run_compliance_tests():
    print("==================================================")
    print("   M.A.S.H - ARMORIQ SECURITY COMPLIANCE TESTING   ")
    print("==================================================")
    
    # 1. Instantiate TelemetryAgent to listen for security logs
    telemetry_agent = TelemetryAgent()
    stock_agent = StockManagementAgent()
    
    print("\n--- TEST 1: Plan Capture & Cryptographic Signing ---")
    patient_id = "patient-123"
    symptoms = "I am feeling feverish and coughing, I need Amoxicillin medicine."
    
    plan = ArmorIQ.capture_plan(patient_id, symptoms)
    ACTIVE_IAPS[patient_id] = plan
    
    print(f"Captured Plan ID: {plan['iap_id']}")
    print(f"Authorized Scopes: {plan['authorized_scopes']}")
    print(f"Cryptographic Signature: {plan['signature']}")
    
    # Verify plan signature
    is_valid_plan = ArmorIQ.verify_plan(plan)
    print(f"IAP Signature Valid: {is_valid_plan}")
    assert is_valid_plan == True, "Failed to verify IAP signature!"
    
    print("\n--- TEST 2: Scoped Delegation Token Generation ---")
    # Delegate 'prescription.validate' to StockManagementAgent
    token = ArmorIQ.delegate("StockManagementAgent", ["prescription.validate", "inventory.stock.decrement"], plan)
    print(f"Delegated Scopes: {token['delegated_scopes']}")
    print(f"Delegation Signature: {token['signature']}")
    
    # Verify delegation signature
    is_valid_del = ArmorIQ.verify_delegation(token)
    print(f"Delegation Signature Valid: {is_valid_del}")
    assert is_valid_del == True, "Failed to verify delegation signature!"

    print("\n--- TEST 3: In-Scope Tool Invocation (Allowed) ---")
    # Verify in-scope stock check action
    allowed = ArmorIQ.invoke("StockManagementAgent", "check_stock", token)
    print(f"Check Stock Allowed: {allowed}")
    assert allowed == True, "Failed to invoke in-scope action!"
    
    print("\n--- TEST 4: Out-of-Scope Tool Invocation (Blocked) ---")
    # Attempt out-of-scope stock deletion action (not in delegated scopes)
    try:
        ArmorIQ.invoke("StockManagementAgent", "delete_all_low_stock", token)
        print("FAIL: Out-of-scope action bypassed security checks!")
        sys.exit(1)
    except BlockedException as e:
        print(f"PASS: Action blocked successfully as expected. Reason: {e}")

    print("\n--- TEST 5: End-to-End Agent Event Block Verification ---")
    # Trigger the simulated stock agent delete check by broadcasting event
    print("Broadcasting DELETE_ALL_LOW_STOCK to PharmacyInventoryRoom...")
    
    # Set the global active IAP for the event context
    ACTIVE_IAPS["patient-123"] = plan
    
    # Broadcast to trigger stock agent listener
    PharmacyInventoryRoom.broadcast_local("DELETE_ALL_LOW_STOCK", {
        "patientId": "patient-123"
    })
    
    # Yield control to let async event loop dispatch the event handler
    await asyncio.sleep(0.5)
    
    # Verify telemetry logs contains the block entry
    print("\nVerifying Telemetry Audit Logs...")
    logs = telemetry_agent.audit_log
    security_blocked_entries = [log for log in logs if log["type"] == "SECURITY_BLOCKED"]
    
    if security_blocked_entries:
        entry = security_blocked_entries[0]
        print(f"Found Audit Log Entry: [{entry['type']}]")
        print(f"Agent: {entry['agent']}")
        print(f"Action: {entry['action']}")
        print(f"Details: {entry['details']}")
        print(f"Merkle Root: {entry['merkle_root']}")
        print(f"Merkle Proof Path: {entry['merkle_proof']}")
        print("\nVerification SUCCESS: Verifiable audit log with Merkle proof registered.")
    else:
        print("FAIL: Security blocked event was not captured in the audit log!")
        sys.exit(1)
        
    print("\n==================================================")
    print("   ALL ARMORIQ COMPLIANCE TESTS PASSED SUCCESSFULLY! ")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(run_compliance_tests())
