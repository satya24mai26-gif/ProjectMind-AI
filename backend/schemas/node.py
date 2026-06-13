import random
from pydantic import BaseModel, Field


BASE_X = 100
BASE_Y = 100
OFFSET = 500  # max distance from base position


class NodeCreate(BaseModel):
    title: str
    description: str = ""
    node_type: str = "concept"
    notes: str = ""
    tags: str = ""
    project_id: int

    position_x: int = Field(
        default_factory=lambda: BASE_X + random.randint(-OFFSET, OFFSET)
    )
    position_y: int = Field(
        default_factory=lambda: BASE_Y + random.randint(-OFFSET, OFFSET)
    )

class NodePositionUpdate(BaseModel):
    position_x: int
    position_y: int

class NodeUpdate(BaseModel):

    title: str

    description: str

    node_type: str

    notes: str

    tags: str