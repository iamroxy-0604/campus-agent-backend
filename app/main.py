from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.dingdang_api import router as dingdang_router
from app.db import Base, engine
from app import models
from app.db import SessionLocal
from app.seed import seed_default_agents
from app.api.agent_api import router as agent_router
from app.api.agent_log_api import router as agent_log_router

app = FastAPI(
    title="校园智能体后端",
    description="北邮小镇 / 前后端联调服务",
    version="0.1.0",
)

# 项目启动时自动创建数据库表
Base.metadata.create_all(bind=engine)

db = SessionLocal()
try:
    seed_default_agents(db)
finally:
    db.close()


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dingdang_router)
app.include_router(agent_router)
app.include_router(agent_log_router)


@app.get("/")
def root():
    return {
        "message": "校园智能体 FastAPI 后端已启动"
    }