import asyncio, os
from band.client.rest import AsyncRestClient, ChatEventRequest, DEFAULT_REQUEST_OPTIONS
from band.config import load_agent_config
from dotenv import load_dotenv

load_dotenv()

async def run():
    print("Loading agent config...")
    agent_id, api_key = load_agent_config("my_agent", config_path="agent_config.yaml")
    print(f"Agent ID: {agent_id}")
    rest_url = os.getenv("BAND_REST_URL") or os.getenv("THENVOI_REST_URL") or "https://app.band.ai"
    print(f"REST URL: {rest_url}")
    client = AsyncRestClient(api_key=api_key, base_url=rest_url)
    room_id = "a2905249-8798-448f-93c5-bb5054ebdc4f"
    for mtype in ["thought", "tool_call", "tool_result", "error", "task"]:
        print(f"Testing message_type={mtype}...")
        try:
            res = await client.agent_api_events.create_agent_chat_event(
                chat_id=room_id,
                event=ChatEventRequest(content=f"test {mtype}", message_type=mtype, metadata={}),
                request_options=DEFAULT_REQUEST_OPTIONS
            )
            print(f"{mtype}: SUCCESS -> {res}")
        except Exception as e:
            print(f"{mtype}: FAILED -> {e}")

if __name__ == "__main__":
    asyncio.run(run())
