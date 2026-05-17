from fastapi import APIRouter, HTTPException
from app.services.scene_service import get_scene_config

router = APIRouter(prefix="/api/scenes", tags=["场景接口"])


@router.get("/{scene_id}/config")
def scene_config(scene_id: str):
    data = get_scene_config(scene_id)

    if data is None:
        raise HTTPException(status_code=404, detail="场景不存在")

    return {
        "code": 0,
        "message": "success",
        "data": data
    }