from pydantic import BaseModel

class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    
class ProjectChatRequest(
    BaseModel
):

    project_id: int

    question: str

    parent_id: int | None = None