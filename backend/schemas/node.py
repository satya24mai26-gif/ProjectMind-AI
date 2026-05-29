from pydantic import BaseModel


class NodeCreate(BaseModel):
    title: str
    description: str = ""
    node_type: str = "research"
    notes: str = ""