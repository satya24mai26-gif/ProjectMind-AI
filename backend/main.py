from fastapi import FastAPI

from database.db import engine
from database.models import Base

from database.db import SessionLocal
from database.models import Project

from database.models import Node

from fastapi.middleware.cors import CORSMiddleware

from schemas.node import NodeCreate


from database.models import Relationship
from schemas.relationship import (
    RelationshipCreate,
    RelationshipUpdate
)

from schemas.ai import AIRequest

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ProjectMind API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "ProjectMind API Running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }

@app.post("/projects")
def create_project():

    db = SessionLocal()

    project = Project(
        name="My First Project"
    )

    db.add(project)
    db.commit()
    db.refresh(project)

    return project

@app.post("/nodes")
def create_node(data: NodeCreate):

    db = SessionLocal()

    node = Node(
    project_id=1,
    title=data.title,
    description=data.description,
    node_type=data.node_type,
    notes=data.notes,
    )

    db.add(node)

    db.commit()

    db.refresh(node)

    return node

@app.get("/nodes")
def get_nodes():

    db = SessionLocal()

    return db.query(Node).all()

@app.put("/nodes/{node_id}")
def update_node(
    node_id: int,
    data: NodeCreate
):
    db = SessionLocal()

    node = (
        db.query(Node)
        .filter(Node.id == node_id)
        .first()
    )

    if not node:
        return {
            "error": "Node not found"
        }

    node.title = data.title
    node.description = data.description
    node.node_type = data.node_type
    node.notes = data.notes

    db.commit()
    db.refresh(node)

    return node

@app.delete("/nodes/{node_id}")
def delete_node(node_id: int):

    db = SessionLocal()

    node = (
        db.query(Node)
        .filter(Node.id == node_id)
        .first()
    )

    if not node:
        return {
            "error": "Node not found"
        }
    
    relationships = (
    db.query(Relationship)
    .filter(
        (Relationship.source_node_id == node_id)
        |
        (Relationship.target_node_id == node_id)
    )
    .all()
)

    for relationship in relationships:
        db.delete(relationship)

        db.delete(node)

        db.commit()

        return {
        "message": "Node deleted"
    }

@app.post("/relationships")
def create_relationship(
    data: RelationshipCreate
):
    db = SessionLocal()

    relationship = Relationship(
        source_node_id=data.source_node_id,
        target_node_id=data.target_node_id,
        relation_type=data.relation_type,
    )

    db.add(relationship)

    db.commit()

    db.refresh(relationship)

    return relationship

@app.get("/relationships")
def get_relationships():

    db = SessionLocal()

    return (
        db.query(Relationship)
        .all()
    )

@app.put("/relationships/{relationship_id}")
def update_relationship(
    relationship_id: int,
    data: RelationshipUpdate
):
    db = SessionLocal()

    relationship = (
        db.query(Relationship)
        .filter(
            Relationship.id == relationship_id
        )
        .first()
    )

    if not relationship:
        return {
            "error": "Relationship not found"
        }

    relationship.relation_type = (
        data.relation_type
    )

    db.commit()
    db.refresh(relationship)

    return relationship

@app.post("/ai/chat")
def ai_chat(data: AIRequest):

    return {
        "answer": f"""
Question:
{data.question}

Context:
{data.context}
"""
    }