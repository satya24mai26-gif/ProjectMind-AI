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