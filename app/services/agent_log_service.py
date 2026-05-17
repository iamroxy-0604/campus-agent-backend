from sqlalchemy.orm import Session

from app.models import AgentRpcLog


def create_agent_rpc_log(db: Session, payload):
    log = AgentRpcLog(
        request_id=payload.request_id,
        conversation_id=payload.conversation_id,
        task_id=payload.task_id,

        from_agent=payload.from_agent,
        to_agent=payload.to_agent,

        protocol=payload.protocol,
        command=payload.command,

        input_text=payload.input_text,
        output_text=payload.output_text,

        state=payload.state,

        raw_request=payload.raw_request,
        raw_response=payload.raw_response,
    )

    db.add(log)
    db.commit()
    db.refresh(log)

    return log