from pydantic import BaseModel


class NodeCreate(BaseModel):
    title: str
    description: str = ""
    node_type: str = "research"
    notes: str = ""
    project_id: int
    position_x: int = 100
    position_y: int = 100

class NodePositionUpdate(BaseModel):
    position_x: int
    position_y: int