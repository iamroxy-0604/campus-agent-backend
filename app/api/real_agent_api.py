from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.real_agent_client import call_leader_agent


router = APIRouter(
    prefix="/api/real-agent",
    tags=["real-agent"]
)


class RealAgentQueryRequest(BaseModel):
    conversation_id: str
    user_id: str
    message: str
    scene: Optional[str] = None


@router.post("/query")
async def query_real_agent(payload: RealAgentQueryRequest):
    result = await call_leader_agent(
        conversation_id=payload.conversation_id,
        user_id=payload.user_id,
        message=payload.message,
        scene=payload.scene,
    )

    return {
        "ok": True,
        "data": result,
    }