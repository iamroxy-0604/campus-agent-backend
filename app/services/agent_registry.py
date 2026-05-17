from typing import Optional, Dict, Any


AGENT_REGISTRY = {
    "GymScene": {
        "agentId": "gym_admin",
        "name": "体育馆管理员",
        "scene": "GymScene",
        "role": "负责体育馆场地预约、收费、开放时间咨询",
    },
    "McDonaldScene": {
        "agentId": "mcd_manager",
        "name": "麦当劳经理",
        "scene": "McDonaldScene",
        "role": "负责推荐套餐、联名活动、限定餐品信息",
    },
    "OfficeScene": {
        "agentId": "dean_chen",
        "name": "陈院长",
        "scene": "OfficeScene",
        "role": "负责本科教学政策、培养方案、学院介绍",
    },
}


def get_agent_by_scene(scene: Optional[str]) -> Optional[Dict[str, Any]]:
    if not scene:
        return None

    return AGENT_REGISTRY.get(scene)