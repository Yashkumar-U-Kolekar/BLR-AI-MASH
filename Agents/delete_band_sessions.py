import asyncio
import os
import yaml
from band.client.rest import AsyncRestClient

async def main():
    # Load config
    try:
        with open("agent_config.yaml", "r") as f:
            config = yaml.safe_load(f)
            api_key = config["my_agent"]["api_key"]
    except Exception as e:
        print(f"Failed to load API key: {e}")
        return

    client = AsyncRestClient(api_key=api_key, base_url="https://app.band.ai")

    try:
        # Fetch all chats
        print("Fetching chats...")
        rooms_list_res = await client.agent_api_chats.list_agent_chats(page_size=100)
        
        if not rooms_list_res or not hasattr(rooms_list_res, 'data') or not rooms_list_res.data:
            print("No chats found.")
            return

        chats = rooms_list_res.data
        print(f"Found {len(chats)} chats. Deleting...")

        for chat in chats:
            try:
                print(f"Deleting chat {chat.id}...")
                await client.agent_api_chats.delete_agent_chat(chat_id=chat.id)
            except Exception as delete_err:
                print(f"Failed to delete {chat.id}: {delete_err}")

        print("Finished deleting chats.")
        
        # Also clear .env.rooms locally
        if os.path.exists(".env.rooms"):
            os.remove(".env.rooms")
            print("Deleted .env.rooms to clear local mapping.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
