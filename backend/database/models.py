from datetime import datetime, UTC

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime
)

from sqlalchemy import Boolean
from .db import Base

from sqlalchemy import Text


class Project(Base):
    __tablename__ = "projects"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String,
        nullable=False
    )

    description = Column(
        Text,
        default=""
    )

from sqlalchemy import Text
from sqlalchemy import ForeignKey


class Node(Base):
    __tablename__ = "nodes"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    project_id = Column(
        Integer,
        ForeignKey("projects.id")
    )

    title = Column(
        String,
        nullable=False
    )

    description = Column(
        Text,
        default=""
    )

    node_type = Column(
        String,
        default="research"
    )

    notes = Column(
        Text,
        default=""
    )

    position_x = Column(
        Integer,
        default=100
    )

    position_y = Column(
        Integer,
        default=100
    )

    tags = Column(
    String,
    default=""
    )


class Message(Base):
    __tablename__ = "messages"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    node_id = Column(
        Integer,
        ForeignKey("nodes.id")
    )

    role = Column(
        String,
        nullable=False
    )

    content = Column(
        Text,
        nullable=False
    )

class Relationship(Base):
    __tablename__ = "relationships"

    project_id = Column(
    Integer,
    nullable=False
    )

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    source_node_id = Column(
        Integer,
        ForeignKey("nodes.id")
    )

    target_node_id = Column(
        Integer,
        ForeignKey("nodes.id")
    )

    relation_type = Column(
        String,
        nullable=False
    )


class AISettings(Base):

    __tablename__ = "ai_settings"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    provider = Column(
        String,
        default="ollama"
    )

    model = Column(
        String,
        default="qwen3:8b"
    )

class AIModel(Base):

    __tablename__ = "ai_models"

    id = Column(
        Integer,
        primary_key=True
    )

    provider = Column(
        String
    )

    model_name = Column(
        String
    )

    enabled = Column(
        Boolean,
        default=True
    )

class NodeChatMessage(Base):

    __tablename__ = "node_chat_messages"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    node_id = Column(
        Integer,
        nullable=False
    )

    role = Column(
        String,
        nullable=False
    )

    content = Column(
        Text,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.now(UTC)
    )

class ProjectChatMessage(Base):
    __tablename__ = "project_chat_messages"
    
    # Permits runtime schema overrides during development reloads
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, nullable=False, index=True)
    role = Column(String, nullable=False) # "user" or "assistant"
    content = Column(Text, nullable=False)
    
    # Self-referencing link maps nested thread hierarchies
    parent_id = Column(
        Integer, 
        ForeignKey("project_chat_messages.id", ondelete="CASCADE"), 
        nullable=True
    )
    
    created_at = Column(DateTime, default=datetime.now(UTC))