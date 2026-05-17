import json
from typing import Dict, Any, Optional

import httpx

from app.config import DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, DEEPSEEK_MODEL


def fallback_intent_recognize(message: str) -> Dict[str, Any]:
    """
    本地关键词 fallback。
    DeepSeek 失败或未配置 Key 时使用。
    """
    text = message or ""

    if any(k in text for k in ["麦当劳", "汉堡", "套餐", "点餐", "饮品", "小食"]):
        return {
            "intent": "navigate",
            "targetScene": "McDonaldScene",
            "query": message,
            "confidence": 0.6,
            "source": "fallback_rule",
        }

    if any(k in text for k in ["体育馆", "游泳馆", "健身", "预约场地", "篮球", "羽毛球"]):
        return {
            "intent": "navigate",
            "targetScene": "GymScene",
            "query": message,
            "confidence": 0.6,
            "source": "fallback_rule",
        }

    if any(k in text for k in ["院长", "教务", "培养方案", "课程", "学院", "政策"]):
        return {
            "intent": "navigate",
            "targetScene": "OfficeScene",
            "query": message,
            "confidence": 0.6,
            "source": "fallback_rule",
        }

    return {
        "intent": "unknown",
        "targetScene": None,
        "query": message,
        "confidence": 0.2,
        "source": "fallback_rule",
    }


def normalize_intent_result(raw: Dict[str, Any], message: str, source: str) -> Dict[str, Any]:
    """
    把 DeepSeek 返回格式统一成后端使用的格式。
    前端旧格式可能叫 target，后端统一叫 targetScene。
    """
    intent = raw.get("intent", "unknown")
    target_scene = raw.get("targetScene") or raw.get("target")
    query = raw.get("query") or message

    valid_scenes = {"GymScene", "McDonaldScene", "OfficeScene"}

    if intent not in {"navigate", "chat", "unknown"}:
        intent = "unknown"

    if target_scene not in valid_scenes:
        target_scene = None

    if intent == "unknown":
        target_scene = None

    return {
        "intent": intent,
        "targetScene": target_scene,
        "query": query,
        "confidence": raw.get("confidence", 0.8 if source == "deepseek" else 0.5),
        "source": source,
    }


def deepseek_intent_recognize(message: str) -> Optional[Dict[str, Any]]:
    """
    调用 DeepSeek 做意图识别。
    失败时返回 None，让上层 fallback。
    """
    if not DEEPSEEK_API_KEY:
        return None

    url = f"{DEEPSEEK_BASE_URL}/chat/completions"

    system_prompt = """
你是校园智能体系统“叮当”的意图识别模块。
请分析用户输入，并只返回严格 JSON，不要输出解释文字。

返回格式：
{
  "intent": "navigate|chat|unknown",
  "targetScene": "GymScene|McDonaldScene|OfficeScene|null",
  "query": "用户原始问题或提取后的核心问题",
  "confidence": 0.0到1.0之间的数字
}

规则：
1. 如果用户表达想去某个地点，intent 为 "navigate"。
2. 如果用户在询问某个场景相关问题，也可以返回对应 targetScene。
3. 体育馆、游泳馆、运动、健身、场地预约，对应 GymScene。
4. 麦当劳、汉堡、套餐、饮品、点餐，对应 McDonaldScene。
5. 院长、办公室、教务、培养方案、课程、教学政策，对应 OfficeScene。
6. 无法识别时，intent 为 "unknown"，targetScene 为 null。
"""

    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [
            {
                "role": "system",
                "content": system_prompt.strip(),
            },
            {
                "role": "user",
                "content": message,
            },
        ],
        "response_format": {
            "type": "json_object",
        },
        "temperature": 0.2,
    }

    try:
        response = httpx.post(
            url,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
            },
            json=payload,
            timeout=15,
        )

        response.raise_for_status()

        data = response.json()
        content = data["choices"][0]["message"]["content"]

        raw_result = json.loads(content)

        return normalize_intent_result(
            raw=raw_result,
            message=message,
            source="deepseek",
        )

    except Exception as exc:
        print("[IntentService] DeepSeek 调用失败，准备使用 fallback:", repr(exc))
        return None


def recognize_intent(message: str) -> Dict[str, Any]:
    """
    统一意图识别入口。
    优先 DeepSeek，失败则 fallback。
    """
    deepseek_result = deepseek_intent_recognize(message)

    if deepseek_result:
        return deepseek_result

    return fallback_intent_recognize(message)