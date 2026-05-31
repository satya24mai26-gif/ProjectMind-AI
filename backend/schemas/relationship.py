from pydantic import BaseModel

class RelationshipCreate(BaseModel):
    source_node_id: int
    target_node_id: int
    relationship_type: str
    project_id: int

class RelationshipUpdate(BaseModel):
    relation_type: str