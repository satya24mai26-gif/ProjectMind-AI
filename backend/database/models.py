from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import String

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