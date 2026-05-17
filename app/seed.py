from sqlalchemy.orm import Session

from app.models import Agent


DEFAULT_AGENTS = [
    {
        "agent_id": "gym_admin",
        "name": "体育馆管理员",
        "scene": "GymScene",
        "role": "负责体育馆场地预约、收费、开放时间咨询",
        "description": "体育馆场景默认智能体",
        "mock_reply": "体育馆今天正常开放，开放时间是 8:00-22:00。你想预约场地还是查看活动？",
    },
    {
        "agent_id": "mcd_manager",
        "name": "麦当劳经理",
        "scene": "McDonaldScene",
        "role": "负责推荐套餐、联名活动、限定餐品信息",
        "description": "麦当劳场景默认智能体",
        "mock_reply": "欢迎来到麦当劳。你想点套餐、饮品、小食，还是看看今日推荐？",
    },
    {
        "agent_id": "dean_chen",
        "name": "陈院长",
        "scene": "OfficeScene",
        "role": "负责本科教学政策、培养方案、学院介绍",
        "description": "院长办公室场景默认智能体",
        "mock_reply": "你好，我可以回答培养方案、课程安排和教学政策相关问题。",
    },
]


def seed_default_agents(db: Session):
    for item in DEFAULT_AGENTS:
        exists = db.query(Agent).filter(Agent.agent_id == item["agent_id"]).first()

        if exists:
            continue

        db.add(Agent(**item))

    db.commit()