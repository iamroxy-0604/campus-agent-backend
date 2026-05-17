from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Agent
from app.services.agent_service import get_agent_by_id, execute_mock_agent


router = APIRouter(prefix="/api/agent", tags=["agent"])


@router.get("/list")
def list_agents(db: Session = Depends(get_db)):
    rows = db.query(Agent).order_by(Agent.id.asc()).all()

    return {
        "success": True,
        "count": len(rows),
        "data": [
            {
                "id": row.id,
                "agentId": row.agent_id,
                "name": row.name,
                "scene": row.scene,
                "role": row.role,
                "description": row.description,
                "status": row.status,
                "mockReply": row.mock_reply,
                "createdAt": row.created_at.isoformat() if row.created_at else None,
            }
            for row in rows
        ],
    }


@router.get("/{agent_id}")
def get_agent(agent_id: str, db: Session = Depends(get_db)):
    agent = get_agent_by_id(db, agent_id)

    if not agent:
        return {
            "success": False,
            "error": "agent not found",
        }

    return {
        "success": True,
        "data": {
            "agentId": agent.agent_id,
            "name": agent.name,
            "scene": agent.scene,
            "role": agent.role,
            "description": agent.description,
            "status": agent.status,
            "mockReply": agent.mock_reply,
        },
    }


@router.post("/ask")
def ask_agent(payload: dict, db: Session = Depends(get_db)):
    agent_id = payload.get("agentId")
    question = payload.get("question", "")
    context = payload.get("context", {})

    agent = get_agent_by_id(db, agent_id)

    if not agent:
        return {
            "success": False,
            "answer": "没有找到对应智能体。",
            "agentId": agent_id,
            "source": "mock_agent",
        }

    answer = execute_mock_agent(agent, question)

    return {
        "success": True,
        "answer": answer,
        "agentId": agent.agent_id,
        "source": "mock_agent",
    }