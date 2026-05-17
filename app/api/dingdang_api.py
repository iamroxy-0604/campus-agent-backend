import json
from datetime import datetime
from typing import Optional, Dict, Any, List
from uuid import uuid4

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.services.intent_service import recognize_intent
from app.services.agent_service import get_agent_by_scene, execute_mock_agent

from app.db import get_db
from app.models import Message, Footprint


router = APIRouter(prefix="/api/dingdang", tags=["dingdang"])


# 内存 Footprint：保留，方便调试。
# 注意：服务重启后会清空。
FOOTPRINTS: List[Dict[str, Any]] = []


def to_text(value: Any) -> str:
    """
    把 dict / list 等复杂对象转成字符串，方便存入 SQLite Text 字段。
    """
    if isinstance(value, str):
        return value

    return json.dumps(value, ensure_ascii=False)


def add_footprint_memory(record: Dict[str, Any]) -> None:
    FOOTPRINTS.append({
        **record,
        "createdAt": datetime.now().isoformat(timespec="seconds"),
    })


def add_footprint_db(
    db: Session,
    trace_id: str,
    conversation_id: str,
    from_node: str,
    to_node: str,
    what: Any,
    result: Any,
    status: str,
) -> None:
    db.add(Footprint(
        trace_id=trace_id,
        conversation_id=conversation_id,
        from_node=from_node,
        to_node=to_node,
        what=to_text(what),
        result=to_text(result),
        status=status,
    ))
    db.commit()


def save_message(
    db: Session,
    conversation_id: str,
    trace_id: str,
    sender_type: str,
    sender_id: str,
    content: str,
    scene: Optional[str] = None,
) -> None:
    db.add(Message(
        conversation_id=conversation_id,
        trace_id=trace_id,
        sender_type=sender_type,
        sender_id=sender_id,
        content=content,
        scene=scene,
    ))
    db.commit()


class DingdangChatRequest(BaseModel):
    aicId: str = Field(default="AIC_001")
    conversationId: Optional[str] = Field(default=None)
    message: str
    scene: str = Field(default="CampusScene")
    context: Dict[str, Any] = Field(default_factory=dict)


AGENT_MAP = {
    "GymScene": {
        "agentId": "gym_admin",
        "name": "体育馆管理员",
        "reply": "体育馆今天正常开放，开放时间是 8:00-22:00。你想预约场地还是查看活动？",
    },
    "McDonaldScene": {
        "agentId": "mcd_manager",
        "name": "麦当劳经理",
        "reply": "欢迎来到麦当劳。你想点套餐、饮品、小食，还是看看今日推荐？",
    },
    "OfficeScene": {
        "agentId": "dean_chen",
        "name": "陈院长",
        "reply": "你好，我可以回答培养方案、课程安排和教学政策相关问题。",
    },
}


def simple_intent_recognize(message: str):
    if "麦当劳" in message or "汉堡" in message or "套餐" in message or "点餐" in message:
        return "navigate", "McDonaldScene"

    if "体育馆" in message or "游泳馆" in message or "健身" in message:
        return "navigate", "GymScene"

    if "院长" in message or "教务" in message or "培养方案" in message or "课程" in message:
        return "navigate", "OfficeScene"

    return "unknown", None


@router.post("/chat")
def dingdang_chat(req: DingdangChatRequest, db: Session = Depends(get_db)):
    conversation_id = req.conversationId or f"C_{uuid4().hex[:8]}"
    trace_id = f"T_{uuid4().hex[:8]}"

    # 1. 保存用户消息到数据库
    save_message(
        db=db,
        conversation_id=conversation_id,
        trace_id=trace_id,
        sender_type="user",
        sender_id=req.aicId,
        content=req.message,
        scene=req.scene,
    )

    # 2. 记录 User → Dingdang-BE
    footprint_1 = {
        "traceId": trace_id,
        "conversationId": conversation_id,
        "from": req.aicId,
        "to": "Dingdang-BE",
        "what": req.message,
        "result": "received",
        "status": "success",
    }

    add_footprint_memory(footprint_1)
    add_footprint_db(
        db=db,
        trace_id=trace_id,
        conversation_id=conversation_id,
        from_node=req.aicId,
        to_node="Dingdang-BE",
        what=req.message,
        result="received",
        status="success",
    )

    # 3. 后端意图识别
    intent_result = recognize_intent(req.message)

    intent = intent_result["intent"]
    target_scene = intent_result["targetScene"]

    footprint_2 = {
        "traceId": trace_id,
        "conversationId": conversation_id,
        "from": "Dingdang-BE",
        "to": "IntentRouter",
        "what": req.message,
        "result": intent_result,
        "status": "success",
    }

    add_footprint_memory(footprint_2)
    add_footprint_db(
        db=db,
        trace_id=trace_id,
        conversation_id=conversation_id,
        from_node="Dingdang-BE",
        to_node="IntentRouter",
        what=req.message,
        result=intent_result,
        status="success",
    )

    # 4. 无法识别
    if intent == "unknown":
        reply = "我还没听懂你的意思。你可以试试说：我要去体育馆、我要去麦当劳、我想问培养方案。"

        save_message(
            db=db,
            conversation_id=conversation_id,
            trace_id=trace_id,
            sender_type="dingdang",
            sender_id="Dingdang-BE",
            content=reply,
            scene=req.scene,
        )

        footprint_3 = {
            "traceId": trace_id,
            "conversationId": conversation_id,
            "from": "IntentRouter",
            "to": "Dingdang-BE",
            "what": req.message,
            "result": reply,
            "status": "unknown",
        }

        add_footprint_memory(footprint_3)
        add_footprint_db(
            db=db,
            trace_id=trace_id,
            conversation_id=conversation_id,
            from_node="IntentRouter",
            to_node="Dingdang-BE",
            what=req.message,
            result=reply,
            status="unknown",
        )

        return {
            "success": True,
            "conversationId": conversation_id,
            "traceId": trace_id,
            "intent": "unknown",
            "targetScene": None,
            "selectedAgent": None,
            "action": {
                "type": "unknown",
                "scene": req.scene,
            },
            "reply": reply,
        }

    # 5. 根据场景选择 mock agent
    agent = get_agent_by_scene(db, target_scene)

    if not agent:
        reply = "我识别到了你的目标场景，但还没有找到对应的智能体。"

        save_message(
            db=db,
            conversation_id=conversation_id,
            trace_id=trace_id,
            sender_type="dingdang",
            sender_id="Dingdang-BE",
            content=reply,
            scene=target_scene,
        )

        return {
            "success": True,
            "conversationId": conversation_id,
            "traceId": trace_id,
            "intent": intent,
            "targetScene": target_scene,
            "selectedAgent": None,
            "action": {
                "type": "chat",
                "scene": req.scene,
            },
            "reply": reply,
        }

    reply = execute_mock_agent(agent, req.message)

    save_message(
        db=db,
        conversation_id=conversation_id,
        trace_id=trace_id,
        sender_type="agent",
        sender_id=agent.agent_id,
        content=reply,
        scene=target_scene,
    )

    footprint_3 = {
        "traceId": trace_id,
        "conversationId": conversation_id,
        "from": "Dingdang-BE",
        "to": agent.agent_id,
        "what": req.message,
        "result": reply,
        "status": "success",
    }

    add_footprint_memory(footprint_3)
    add_footprint_db(
        db=db,
        trace_id=trace_id,
        conversation_id=conversation_id,
        from_node="Dingdang-BE",
        to_node=agent.agent_id,
        what=req.message,
        result=reply,
        status="success",
    )

    return {
        "success": True,
        "conversationId": conversation_id,
        "traceId": trace_id,
        "intent": intent,
        "targetScene": target_scene,
        "selectedAgent": {
            "agentId": agent.agent_id,
            "name": agent.name,
        },
        "action": {
            "type": "navigate_and_chat",
            "scene": target_scene,
        },
        "reply": reply,
    }


@router.get("/footprints")
def get_footprints(db: Session = Depends(get_db)):
    """
    查看数据库里的 Footprint。
    """
    rows = db.query(Footprint).order_by(Footprint.id.desc()).limit(50).all()

    return {
        "success": True,
        "count": len(rows),
        "data": [
            {
                "id": row.id,
                "traceId": row.trace_id,
                "conversationId": row.conversation_id,
                "from": row.from_node,
                "to": row.to_node,
                "what": row.what,
                "result": row.result,
                "status": row.status,
                "createdAt": row.created_at.isoformat() if row.created_at else None,
            }
            for row in rows
        ],
    }


@router.get("/messages")
def get_messages(db: Session = Depends(get_db)):
    """
    查看数据库里的消息记录。
    """
    rows = db.query(Message).order_by(Message.id.desc()).limit(50).all()

    return {
        "success": True,
        "count": len(rows),
        "data": [
            {
                "id": row.id,
                "conversationId": row.conversation_id,
                "traceId": row.trace_id,
                "senderType": row.sender_type,
                "senderId": row.sender_id,
                "content": row.content,
                "scene": row.scene,
                "createdAt": row.created_at.isoformat() if row.created_at else None,
            }
            for row in rows
        ],
    }


@router.delete("/footprints")
def clear_footprints(db: Session = Depends(get_db)):
    """
    清空 Footprint。调试用。
    """
    FOOTPRINTS.clear()
    db.query(Footprint).delete()
    db.commit()

    return {
        "success": True,
        "message": "footprints cleared",
    }


@router.delete("/messages")
def clear_messages(db: Session = Depends(get_db)):
    """
    清空消息。调试用。
    """
    db.query(Message).delete()
    db.commit()

    return {
        "success": True,
        "message": "messages cleared",
    }