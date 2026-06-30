
import asyncio
import yaml
from band.client.rest import AsyncRestClient

async def test_key(name, agent_id, api_key):
    client = AsyncRestClient(api_key=api_key, base_url="https://app.band.ai")
    try:
        # Try a simple REST call that requires auth
        res = await client.agent_api_chats.list_agent_chats(page_size=1)
        print(f"[{name}] REST: SUCCESS (Found {len(res.data) if res and res.data else 0} rooms)")
        return True
    except Exception as e:
        print(f"[{name}] REST: FAILED - {e}")
        return False

async def main():
    with open("agent_config.yaml", "r") as f:
        config = yaml.safe_load(f)
    
    for key, val in config.items():
        if isinstance(val, dict):
            agent_id = val.get("agent_id")
            api_key = val.get("api_key")
            if agent_id and api_key:
                await test_key(key, agent_id, api_key)

if __name__ == "__main__":
    asyncio.run(main())
