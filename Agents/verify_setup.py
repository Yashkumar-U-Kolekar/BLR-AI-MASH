import asyncio
import logging
import os
from dotenv import load_dotenv
from band import Agent
from band.config import load_agent_config

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def verify_setup():
    load_dotenv()

    # Load agent credentials from agent_config.yaml
    try:
        agent_id, api_key = load_agent_config("my_agent")
        logger.info(f"Loaded agent configuration. UUID: {agent_id}")
    except Exception as e:
        logger.error(f"Failed to load agent configuration from agent_config.yaml: {e}")
        return

    # Check for correct socket URLs
    ws_url = os.getenv("BAND_WS_URL") or os.getenv("THENVOI_WS_URL")
    rest_url = os.getenv("BAND_REST_URL") or os.getenv("THENVOI_REST_URL")
    logger.info(f"Using REST URL: {rest_url}")
    logger.info(f"Using WS URL: {ws_url}")

    # Note: To create an active agent reasoning loop, we pass a framework adapter.
    from band.adapters import LangGraphAdapter
    from langchain_openai import ChatOpenAI
    from langgraph.checkpoint.memory import InMemorySaver

    logger.info("Initializing Agent connection check...")
    try:
        # Create adapter
        adapter = LangGraphAdapter(
            llm=ChatOpenAI(model="gpt-4o"),
            checkpointer=InMemorySaver(),
        )

        # Create agent check loop
        agent = Agent.create(
            adapter=adapter,
            agent_id=agent_id,
            api_key=api_key,
            ws_url=ws_url,
            rest_url=rest_url,
        )
        
        # Connect to Band socket
        logger.info("Connecting to Band platform...")
        await agent.start()
        logger.info(f"Connected successfully as: {agent.agent_name}")
        
        # Shut down connection
        await agent.stop()
        logger.info("Setup verified successfully!")
    except Exception as e:
        logger.error(f"Connection check failed: {e}")

if __name__ == "__main__":
    asyncio.run(verify_setup())
