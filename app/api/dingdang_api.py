import json
from datetime import datetime
from typing import Optional, Dict, Any, List
from uuid import uuid4

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

# 保留你项目原有服务导入（只保留真实智能体调用，移除无用服务）
from app.services.real_agent_client import call_leader_agent

# 保留数据库相关
from app.db import get_db
from app.models import Message, Footprint, AgentRpcLog

# 路由配置
router = APIRouter(prefix="/api/dingdang", tags=["dingdang"])

# ====================== 原有工具函数（完整保留，不改动）======================
# 内存足迹（调试用）
FOOTPRINTS: List[Dict[str, Any]] = []


def to_text(value: Any) -> str:
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


def save_agent_rpc_log(
        db: Session,
        conversation_id: str,
        user_message: str,
        agent_result: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
) -> None:
    agent_result = agent_result or {}
    raw_response = agent_result.get("raw_response")
    if error_message:
        raw_response = {
            "error": error_message,
            "raw_response": raw_response,
        }

    db.add(AgentRpcLog(
        request_id=agent_result.get("request_id"),
        conversation_id=conversation_id,
        task_id=agent_result.get("task_id"),
        from_agent=agent_result.get("from_agent", "leader"),
        to_agent=agent_result.get("to_agent", "mcdonalds"),
        protocol=agent_result.get("protocol", "AIP RPC SDK"),
        command=agent_result.get("command", "query"),
        input_text=user_message,
        output_text=agent_result.get("reply"),
        state=agent_result.get("state", "failed" if error_message else None),
        raw_request=agent_result.get("raw_request"),
        raw_response=raw_response,
    ))
    db.commit()


# ====================== 新请求体（兼容新旧字段）======================
class DingdangChatRequest(BaseModel):
    # 兼容驼峰+下划线，适配所有前端调用
    conversationId: Optional[str] = None
    conversation_id: Optional[str] = None

    userId: Optional[str] = None
    user_id: Optional[str] = None

    agentId: Optional[str] = None
    aicId: Optional[str] = None

    message: str
    scene: Optional[str] = None
    source: Optional[str] = None


# ====================== 重写核心 /chat 接口 ======================
@router.post("/chat")
async def dingdang_chat(
        payload: DingdangChatRequest,
        db: Session = Depends(get_db)
):
    # 1. 统一参数（兼容新旧字段）
    conversation_id = payload.conversationId or payload.conversation_id or f"C_{uuid4().hex[:8]}"
    user_id = payload.userId or payload.user_id or f"U_{uuid4().hex[:8]}"
    agent_id = payload.agentId or payload.aicId or "leader_agent"
    trace_id = f"T_{uuid4().hex[:8]}"  # 保留原有trace_id，兼容数据库

    # 原始请求参数（日志用）
    raw_request = {
        "conversation_id": conversation_id,
        "user_id": user_id,
        "agent_id": agent_id,
        "message": payload.message,
        "scene": payload.scene,
        "source": payload.source,
    }

    # 2. 保存用户消息（调用原有函数，完全兼容）
    save_message(
        db=db,
        conversation_id=conversation_id,
        trace_id=trace_id,
        sender_type="user",
        sender_id=user_id,
        content=payload.message,
        scene=payload.scene,
    )

    # 3. 记录足迹（原有调试功能）
    footprint = {
        "traceId": trace_id,
        "conversationId": conversation_id,
        "from": user_id,
        "to": "Leader-Agent",
        "what": payload.message,
        "result": "received",
        "status": "success",
    }
    add_footprint_memory(footprint)
    add_footprint_db(
        db=db, trace_id=trace_id, conversation_id=conversation_id,
        from_node=user_id, to_node="Leader-Agent",
        what=payload.message, result="received", status="success"
    )

    try:
        # 4. 调用真实 Leader Agent（核心逻辑）
        result = await call_leader_agent(
            conversation_id=conversation_id,
            user_id=user_id,
            message=payload.message,
            scene=payload.scene,
        )

        # 5. 兼容多字段提取回复（适配智能体返回格式）
        answer = (
                result.get("answer")
                or result.get("reply")
                or result.get("text")
                or result.get("result")
                or "智能体已返回，但未获取到有效内容"
        )

        # 6. 保存主RPC日志（调用原有函数）
        save_agent_rpc_log(
            db=db,
            conversation_id=conversation_id,
            user_message=payload.message,
            agent_result={**result, "raw_request": raw_request}
        )

        # 7. 保存Leader返回的子日志（如果有）
        rpc_logs = result.get("rpc_logs") or []
        for item in rpc_logs:
            save_agent_rpc_log(
                db=db,
                conversation_id=conversation_id,
                user_message=item.get("input_text", payload.message),
                agent_result=item
            )

        # 8. 保存智能体回复消息
        save_message(
            db=db,
            conversation_id=conversation_id,
            trace_id=trace_id,
            sender_type="agent",
            sender_id=agent_id,
            content=answer,
            scene=payload.scene,
        )

        # 9. 成功返回（兼容新旧字段）
        return {
            "success": True,
            "conversationId": conversation_id,
            "conversation_id": conversation_id,
            "traceId": trace_id,
            "agentId": agent_id,
            "agent_id": agent_id,
            "reply": answer,
            "answer": answer,
            "source": result.get("source"),
            "raw": result,
        }

    except Exception as e:
        error_message = str(e)

        # 10. 保存失败日志
        save_agent_rpc_log(
            db=db,
            conversation_id=conversation_id,
            user_message=payload.message,
            error_message=error_message
        )

        # 11. 失败返回
        return {
            "success": False,
            "conversationId": conversation_id,
            "traceId": trace_id,
            "agentId": agent_id,
            "reply": f"智能体调用失败：{error_message}",
            "answer": f"智能体调用失败：{error_message}",
            "error": error_message,
        }


# ====================== 原有调试接口（完整保留，不改动）======================
@router.get("/footprints")
def get_footprints(db: Session = Depends(get_db)):
    rows = db.query(Footprint).order_by(Footprint.id.desc()).limit(50).all()
    return {
        "success": True, "count": len(rows),
        "data": [{
            "id": row.id, "traceId": row.trace_id, "conversationId": row.conversation_id,
            "from": row.from_node, "to": row.to_node, "what": row.what, "result": row.result,
            "status": row.status, "createdAt": row.created_at.isoformat() if row.created_at else None
        } for row in rows]
    }


@router.get("/messages")
def get_messages(db: Session = Depends(get_db)):
    rows = db.query(Message).order_by(Message.id.desc()).limit(50).all()
    return {
        "success": True, "count": len(rows),
        "data": [{
            "id": row.id, "conversationId": row.conversation_id, "traceId": row.trace_id,
            "senderType": row.sender_type, "senderId": row.sender_id, "content": row.content,
            "scene": row.scene, "createdAt": row.created_at.isoformat() if row.created_at else None
        } for row in rows]
    }


@router.get("/agent-rpc-logs")
def get_agent_rpc_logs(db: Session = Depends(get_db)):
    rows = db.query(AgentRpcLog).order_by(AgentRpcLog.id.desc()).limit(50).all()
    return {
        "success": True, "count": len(rows),
        "data": [{
            "id": row.id, "requestId": row.request_id, "conversationId": row.conversation_id,
            "taskId": row.task_id, "fromAgent": row.from_agent, "toAgent": row.to_agent,
            "protocol": row.protocol, "command": row.command, "inputText": row.input_text,
            "outputText": row.output_text, "state": row.state, "rawRequest": row.raw_request,
            "rawResponse": row.raw_response, "createdAt": row.created_at.isoformat() if row.created_at else None
        } for row in rows]
    }


@router.delete("/footprints")
def clear_footprints(db: Session = Depends(get_db)):
    FOOTPRINTS.clear()
    db.query(Footprint).delete()
    db.commit()
    return {"success": True, "message": "footprints cleared"}


@router.delete("/messages")
def clear_messages(db: Session = Depends(get_db)):
    db.query(Message).delete()
    db.commit()
    return {"success": True, "message": "messages cleared"}


@router.delete("/agent-rpc-logs")
def clear_agent_rpc_logs(db: Session = Depends(get_db)):
    db.query(AgentRpcLog).delete()
    db.commit()
    return {"success": True, "message": "agent rpc logs cleared"}