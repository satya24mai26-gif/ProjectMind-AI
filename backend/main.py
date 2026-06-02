from fastapi import FastAPI

from database.db import engine
from database.models import Base

from database.db import SessionLocal
from database.models import Project

from database.models import Node

from fastapi.middleware.cors import CORSMiddleware

from schemas.node import (
    NodeCreate,
    NodePositionUpdate
)


from database.models import Relationship
from schemas.relationship import (
    RelationshipCreate,
    RelationshipUpdate
)

from schemas.ai import (AIRequest, ProjectAIRequest)

from schemas.project import ProjectCreate

from fastapi import Depends
from sqlalchemy.orm import Session

from services.ollama_service import ask_ollama



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
def create_project(
    data: ProjectCreate
):

    db = SessionLocal()

    project = Project(
    name=data.name,
    description=data.description
)

    db.add(project)
    db.commit()
    db.refresh(project)

    try:
        return project
    finally:
        db.close()

@app.get("/projects")
def get_projects():

    db = SessionLocal()

    try:
        return db.query(Project).all()
    finally:
        db.close()

@app.post("/nodes")
def create_node(data: NodeCreate):

    db = SessionLocal()

    node = Node(
    project_id=data.project_id,
    title=data.title,
    description=data.description,
    node_type=data.node_type,
    notes=data.notes,
    )

    db.add(node)

    db.commit()

    db.refresh(node)

    try:
        return node
    finally:
        db.close()

@app.get("/nodes")
def get_nodes(
    project_id: int
):

    db = SessionLocal()
    try:
        return (db.query(Node).filter(Node.project_id == project_id).all())
    finally:
        db.close()

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
        db.close()
        return {
            "error": "Node not found"
        }

    node.title = data.title
    node.description = data.description
    node.node_type = data.node_type
    node.notes = data.notes

    db.commit()
    db.refresh(node)

    try:
        return node
    finally:
        db.close()

@app.delete("/nodes/{node_id}")
def delete_node(node_id: int):

    db = SessionLocal()

    node = (
        db.query(Node)
        .filter(Node.id == node_id)
        .first()
    )

    if not node:
        db.close()
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
    relation_type=data.relationship_type,
    project_id=data.project_id
)

    db.add(relationship)

    db.commit()

    db.refresh(relationship)

    try:
        return relationship
    finally:
        db.close()

@app.get("/relationships")
def get_relationships(
    project_id: int
):
    db = SessionLocal()
    try: 
        return (
          db.query(Relationship)
          .filter(
            Relationship.project_id
           == project_id
           )
        .all()
        )
    finally:
        db.close()

@app.put("/relationships/{relationship_id}")
def update_relationship(
    relationship_id: int,
    data: RelationshipUpdate
):
    db = SessionLocal()

    try:

        relationship = (
            db.query(Relationship)
            .filter(
                Relationship.id ==
                relationship_id
            )
            .first()
        )

        if not relationship:
            return {
                "error":
                "Relationship not found"
            }

        relationship.relation_type = (
            data.relation_type
        )

        db.commit()

        db.refresh(relationship)

        return relationship

    finally:
        db.close()

@app.post("/ai/chat")
def ai_chat(data: AIRequest):

    prompt = f"""
You are ProjectMind AI.

Question:
{data.question}

Project Context:
{data.context}

Answer the question using the context.
"""

    answer = ask_ollama(prompt)

    return {
        "answer": answer
    }

@app.put("/nodes/{node_id}/position")
def update_node_position(
    node_id: int,
    data: NodePositionUpdate
):
    db = SessionLocal()

    try:
        node = (
            db.query(Node)
            .filter(Node.id == node_id)
            .first()
        )

        if not node:
            return {
                "error":
                "Node not found"
            }

        node.position_x = data.position_x
        node.position_y = data.position_y

        db.commit()

        db.refresh(node)

        return node

    finally:
        db.close()

@app.delete("/relationships/{relationship_id}")
def delete_relationship(
    relationship_id: int
):
    db = SessionLocal()

    try:
        relationship = (
            db.query(Relationship)
            .filter(
                Relationship.id ==
                relationship_id
            )
            .first()
        )

        if not relationship:
            return {
                "error":
                "Relationship not found"
            }

        db.delete(relationship)

        db.commit()

        return {
            "success": True
        }

    finally:
        db.close()

@app.delete("/projects/{project_id}")
def delete_project(project_id: int):

    db = SessionLocal()

    try:

        db.query(Relationship).filter(
            Relationship.project_id == project_id
        ).delete(
            synchronize_session=False
        )

        db.query(Node).filter(
            Node.project_id == project_id
        ).delete(
            synchronize_session=False
        )

        project = (
            db.query(Project)
            .filter(
                Project.id == project_id
            )
            .first()
        )

        if project:
            db.delete(project)

        db.commit()

        return {
            "success": True
        }

    finally:
        db.close()

@app.get("/projects/{project_id}/stats")
def get_project_stats(
    project_id: int
):
    db = SessionLocal()

    try:

        node_count = (
            db.query(Node)
            .filter(
                Node.project_id ==
                project_id
            )
            .count()
        )

        relationship_count = (
            db.query(Relationship)
            .filter(
                Relationship.project_id ==
                project_id
            )
            .count()
        )

        return {
            "nodes": node_count,
            "relationships":
                relationship_count,
        }

    finally:
        db.close()   

@app.get("/context/{node_id}")
def build_context(node_id: int):

    db = SessionLocal()

    try:

        node = (
            db.query(Node)
            .filter(Node.id == node_id)
            .first()
        )

        if not node:
            return {
                "context": "Node not found"
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

        context = f"""
NODE:
{node.title}

TYPE:
{node.node_type}

DESCRIPTION:
{node.description}

NOTES:
{node.notes}

RELATIONSHIPS:
"""

        for relationship in relationships:

            context += (
                f"\n"
                f"{relationship.relation_type}"
            )

        return {
            "context": context
        }

    finally:
        db.close()


@app.get("/projects/{project_id}/context")
def get_project_context(
    project_id: int
):

    db = SessionLocal()

    try:

        nodes = (
            db.query(Node)
            .filter(
                Node.project_id ==
                project_id
            )
            .all()
        )

        relationships = (
            db.query(Relationship)
            .filter(
                Relationship.project_id ==
                project_id
            )
            .all()
        )

        return {
            "nodes": [
                {
                    "title": n.title,
                    "type": n.node_type,
                    "description":
                    n.description
                }
                for n in nodes
            ],

            "relationships": [
                {
                    "type":
                    r.relation_type
                }
                for r in relationships
            ]
        }

    finally:
        db.close()


@app.post("/ai/project-chat")
def project_chat(
    data: ProjectAIRequest
):

    prompt = f"""
You are ProjectMind AI.

Question:
{data.question}

Project Context:
{data.context}

Answer using the project context.
"""

    answer = ask_ollama(prompt)

    return {
        "answer": answer
    }

@app.get(
    "/projects/{project_id}/summary"
)
def project_summary(
    project_id: int
):

    db = SessionLocal()

    try:

        nodes = (
            db.query(Node)
            .filter(
                Node.project_id ==
                project_id
            )
            .all()
        )

        relationships = (
            db.query(Relationship)
            .filter(
                Relationship.project_id ==
                project_id
            )
            .all()
        )

        titles = [
            n.title
            for n in nodes
        ]

        relation_types = [
            r.relation_type
            for r in relationships
        ]

        prompt = f"""
You are ProjectMind AI.

Analyze this project.

Nodes:
{titles}

Relationship Types:
{relation_types}

Node Count:
{len(nodes)}

Relationship Count:
{len(relationships)}

Write a concise project summary.
"""

        summary = ask_ollama(prompt)

        return {
            "summary":
            summary
        }

    finally:
        db.close()

@app.get(
    "/projects/{project_id}/analytics"
)
def project_analytics(
    project_id: int
):

    db = SessionLocal()

    try:

        nodes = (
            db.query(Node)
            .filter(
                Node.project_id ==
                project_id
            )
            .all()
        )

        relationships = (
            db.query(Relationship)
            .filter(
                Relationship.project_id ==
                project_id
            )
            .all()
        )

        counts = {}

        for node in nodes:

            counts[node.id] = 0

        for relationship in relationships:

            counts[
                relationship.source_node_id
            ] += 1

            counts[
                relationship.target_node_id
            ] += 1

        most_connected = None

        if counts:

            best_id = max(
                counts,
                key=counts.get
            )

            most_connected = next(
                (
                    n.title
                    for n in nodes
                    if n.id == best_id
                ),
                None
            )

        isolated = []

        for node in nodes:

            if counts[node.id] == 0:

                isolated.append(
                    node.title
                )

        return {
            "node_count":
                len(nodes),

            "relationship_count":
                len(relationships),

            "most_connected":
                most_connected,

            "isolated_nodes":
                isolated,
        }

    finally:
        db.close()


@app.get(
    "/projects/{project_id}/suggestions"
)
def project_suggestions(
    project_id: int
):

    db = SessionLocal()

    try:

        nodes = (
            db.query(Node)
            .filter(
                Node.project_id ==
                project_id
            )
            .all()
        )

        relationships = (
            db.query(Relationship)
            .filter(
                Relationship.project_id ==
                project_id
            )
            .all()
        )

        prompt = f"""
You are ProjectMind AI.

Nodes:
{[n.title for n in nodes]}

Relationships:
{[r.relation_type for r in relationships]}

Provide useful project improvement suggestions.
"""     
        
        print("NODES:", [n.title for n in nodes])
        print("RELATIONSHIPS:", [r.relation_type for r in relationships])

        suggestions = ask_ollama(
            prompt
        )

        return {
            "suggestions":
            suggestions
        }

    finally:
        db.close()

@app.get(
    "/nodes/{node_id}/suggestions"
)
def node_suggestions(
    node_id: int
):

    db = SessionLocal()

    try:

        node = (
            db.query(Node)
            .filter(
                Node.id == node_id
            )
            .first()
        )

        if not node:
            return {
                "error":
                "Node not found"
            }

        prompt = f"""
You are ProjectMind AI.

Node Title:
{node.title}

Description:
{node.description}

Domain:
{node.domain}

Keywords:
{node.keywords}

Node Type:
{node.node_type}

Suggest useful graph relationships
and related nodes.

Keep response under 150 words.
"""

        suggestions = ask_ollama(
            prompt
        )

        return {
            "suggestions":
            suggestions
        }

    finally:
        db.close()

@app.get(
    "/nodes/{node_id}/relationship-suggestions"
)
def relationship_suggestions(
    node_id: int
):

    db = SessionLocal()

    try:

        node = (
            db.query(Node)
            .filter(
                Node.id == node_id
            )
            .first()
        )

        if not node:
            return {
                "error":
                "Node not found"
            }

        all_nodes = (
            db.query(Node)
            .filter(
                Node.project_id ==
                node.project_id
            )
            .all()
        )

        other_nodes = [
            {
                "id": n.id,
                "title": n.title,
                "description": n.description
            }
            for n in all_nodes
            if n.id != node.id
        ]

        prompt = f"""
You are a knowledge graph expert.

Current Node:
{node.title}

Available Nodes:
{other_nodes}

Return ONLY JSON.

Example:

[
  {{
    "source": "Face Recognition",
    "relationship": "uses",
    "target": "FAISS"
  }}
]

Maximum 5 suggestions.
"""

        result = ask_ollama(
            prompt
        )

        return {
            "suggestions":
            result
        }

    finally:
        db.close()