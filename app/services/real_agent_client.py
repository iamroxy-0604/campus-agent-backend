import os
import uuid
from typing import Optional, Dict, Any

import httpx


LEADER_RPC_URL = os.getenv(
    "LEADER_RPC_URL",
    "http://117.74.66.94:5000/rpc"
)


async def call_leader_agent(
    conversation_id: str,
    user_id: str,
    message: str,
    scene: Optional[str] = None,
) -> Dict[str, Any]:
    request_id = f"{conversation_id}-{uuid.uuid4()}"

    rpc_payload = {
        "jsonrpc": "2.0",
        "method": "query",
        "id": request_id,
        "params": {
            "query": message
        }
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            LEADER_RPC_URL,
            json=rpc_payload,
        )
        response.raise_for_status()

    data = response.json()

    if "error" in data:
        raise RuntimeError(f"Leader RPC error: {data['error']}")

    result = data.get("result", {})
    partner_result = result.get("partner_result", {})

    return {
        "request_id": request_id,
        "reply": result.get("answer", ""),
        "from_agent": "leader",
        "to_agent": partner_result.get("partner", result.get("source", "unknown")),
        "task_id": partner_result.get("task_id"),
        "session_id": partner_result.get("session_id"),
        "state": partner_result.get("state"),
        "protocol": partner_result.get("protocol", "AIP RPC SDK"),
        "command": "query",
        "scene": scene,
        "raw_request": rpc_payload,
        "raw_response": data,
    }