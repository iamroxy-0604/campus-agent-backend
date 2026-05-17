from datetime import datetime
from typing import Dict, Any, List


FOOTPRINTS: List[Dict[str, Any]] = []


def add_footprint(record: Dict[str, Any]) -> None:
    FOOTPRINTS.append({
        **record,
        "createdAt": datetime.now().isoformat(timespec="seconds"),
    })


def get_footprints() -> List[Dict[str, Any]]:
    return FOOTPRINTS

@router.get("/footprints/test-add")
def test_add_footprint():
    add_footprint({
        "traceId": "T_TEST",
        "conversationId": "C_TEST",
        "from": "test",
        "to": "footprint",
        "what": "手动测试 footprint",
        "result": "ok",
        "status": "success"
    })

    return {
        "success": True,
        "message": "test footprint added",
        "count": len(FOOTPRINTS),
        "data": FOOTPRINTS
    }