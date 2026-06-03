from pydantic import BaseModel
from pydantic import Field

class RelationshipCreate(BaseModel):
    source_node_id: int
    target_node_id: int
    relationship_type: str = Field(example="references")
    project_id: int

class RelationshipUpdate(BaseModel):
    relation_type: str