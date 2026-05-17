from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, DateTime
from app.db import Base


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(String(64), index=True)
    trace_id = Column(String(64), index=True)

    sender_type = Column(String(32))  # user / agent / dingdang / system
    sender_id = Column(String(64))

    content = Column(Text)
    scene = Column(String(64), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)


class Footprint(Base):
    __tablename__ = "footprints"

    id = Column(Integer, primary_key=True, index=True)
    trace_id = Column(String(64), index=True)
    conversation_id = Column(String(64), index=True)

    from_node = Column(String(64))
    to_node = Column(String(64))

    what = Column(Text)
    result = Column(Text)
    status = Column(String(32))

    created_at = Column(DateTime, default=datetime.utcnow)


class Agent(Base):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True, index=True)

    agent_id = Column(String(64), unique=True, index=True)
    name = Column(String(64))
    scene = Column(String(64), index=True)

    role = Column(Text)
    description = Column(Text, nullable=True)

    status = Column(String(32), default="active")  # active / disabled

    mock_reply = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow)


from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from datetime import datetime
from .db import Base


class AgentRpcLog(Base):
    __tablename__ = "agent_rpc_logs"

    id = Column(Integer, primary_key=True, index=True)

    request_id = Column(String(100), index=True, nullable=True)
    conversation_id = Column(String(100), index=True, nullable=True)
    task_id = Column(String(200), index=True, nullable=True)

    from_agent = Column(String(255), nullable=False)
    to_agent = Column(String(255), nullable=False)

    protocol = Column(String(50), default="AIP_RPC")
    command = Column(String(50), nullable=True)

    input_text = Column(Text, nullable=True)
    output_text = Column(Text, nullable=True)

    state = Column(String(50), nullable=True)

    raw_request = Column(JSON, nullable=True)
    raw_response = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)