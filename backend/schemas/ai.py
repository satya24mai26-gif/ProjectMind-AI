from pydantic import BaseModel


class AIRequest(BaseModel):
    question: str

class ProjectAIRequest(BaseModel):
    question: str
    context: dict

class MissingConceptRequest(
    BaseModel
):
    title: str

class AISettingsUpdate(
    BaseModel
):
    provider: str
    model: str

class ChatMessageCreate(BaseModel):
    node_id: int
    content: str
    sender: str
    is_assistant: bool

class ChatMessageUpdate(BaseModel):
    content: str