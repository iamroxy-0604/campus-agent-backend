from app.mock.mock_scene_data import SCHOOL_SCENE


def get_scene_config(scene_id: str):
    if scene_id == "school":
        return SCHOOL_SCENE

    return None