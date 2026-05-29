from pydantic import BaseModel

class RelationshipCreate(BaseModel):
    source_node_id: int
    target_node_id: int
    relation_type: str

class RelationshipUpdate(BaseModel):
    relation_type: str