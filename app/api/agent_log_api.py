from typing import Optional, Dict, Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.services.agent_log_service import create_agent_rpc_log


router = APIRouter(
    prefix="/api/agent-logs",
    tags=["agent-logs"]
)


class AgentRpcLogCreate(BaseModel):
    request_id: Optional[str] = None
    conversation_id: Optional[str] = None
    task_id: Optional[str] = None

    from_agent: str
    to_agent: str

    protocol: str = "AIP_RPC"
    command: Optional[str] = None

    input_text: Optional[str] = None
    output_text: Optional[str] = None

    state: Optional[str] = None

    raw_request: Optional[Dict[str, Any]] = None
    raw_response: Optional[Dict[str, Any]] = None


@router.post("")
def create_log(payload: AgentRpcLogCreate, db: Session = Depends(get_db)):
    log = create_agent_rpc_log(db, payload)

    return {
        "ok": True,
        "id": log.id,
        "conversation_id": log.conversation_id,
        "task_id": log.task_id,
    }