from typing import Optional

from sqlalchemy.orm import Session

from app.models import Agent


def get_agent_by_scene(db: Session, scene: str) -> Optional[Agent]:
    return (
        db.query(Agent)
        .filter(Agent.scene == scene)
        .filter(Agent.status == "active")
        .first()
    )


def get_agent_by_id(db: Session, agent_id: str) -> Optional[Agent]:
    return (
        db.query(Agent)
        .filter(Agent.agent_id == agent_id)
        .filter(Agent.status == "active")
        .first()
    )


def execute_mock_agent(agent: Agent, message: str) -> str:
    if not agent:
        return "我还没有找到合适的智能体来处理这个问题。"

    return agent.mock_reply or f"你好，我是{agent.name}，可以继续为你服务。"