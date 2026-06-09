from fastapi import FastAPI

import json

from database.db import engine
from database.models import Base

from database.db import SessionLocal
from database.models import Project

from database.models import (Node, AISettings)

from fastapi.middleware.cors import CORSMiddleware

from schemas.node import (
    NodeCreate,
    NodePositionUpdate,
    NodeUpdate
)


from database.models import Relationship
from schemas.relationship import (
    RelationshipCreate,
    RelationshipUpdate
)

from schemas.ai import (AIRequest, MissingConceptRequest, AISettingsUpdate)

from schemas.project import ProjectCreate

from services.ollama_service import (ask_ollama, ask_gap_analysis, ask_model, ask_ai)
#from services.ai_service import ask_ai



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

try:
    db = SessionLocal()
    settings = (
        db.query(AISettings)
        .first()
    )


    if not settings:

        settings = AISettings(
            provider="ollama",
            model="qwen3:8b"
        )

        db.add(settings)

        db.commit()
    else:

        print(
            settings.provider,
            settings.model,
            settings.id
        )
    
finally:
    db.close()

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
    tags=data.tags,
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
    data: NodeUpdate
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
    node.tags = data.tags

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

    try:

        existing = (
            db.query(Relationship)
            .filter(
                Relationship.source_node_id
                == data.source_node_id,

                Relationship.target_node_id
                == data.target_node_id,

                Relationship.project_id
                == data.project_id
            )
            .first()
        )

        if existing:

            return {
                "message":
                "Relationship already exists"
            }

        relationship = Relationship(
            source_node_id=
            data.source_node_id,

            target_node_id=
            data.target_node_id,

            relation_type=
            data.relationship_type,

            project_id=
            data.project_id
        )

        db.add(relationship)

        db.commit()

        db.refresh(relationship)

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
        
        existing = (
            db.query(Relationship)
            .filter(
                Relationship.source_node_id
                == relationship.source_node_id,

                Relationship.target_node_id
                == relationship.target_node_id,

                Relationship.relation_type
                == data.relation_type,

                Relationship.project_id
                == relationship.project_id,

                Relationship.id
                != relationship_id
            )
            .first()
        )

        if existing:

            return {
                "message":
                "Relationship already exists"
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

        node_count = len(nodes)

        relationship_count = len(
            relationships
        )

        connection_counts = {}

        for node in nodes:

            connection_counts[
                node.id
            ] = 0

        for relationship in relationships:

            connection_counts[
                relationship.source_node_id
            ] += 1

            connection_counts[
                relationship.target_node_id
            ] += 1

        most_connected_node = None

        most_connected_count = 0

        for node in nodes:

            count = connection_counts[
                node.id
            ]

            if (
                count >
                most_connected_count
            ):

                most_connected_count = count

                most_connected_node = (
                    node.title
                )

        orphan_nodes = sum(
            1
            for count in
            connection_counts.values()
            if count == 0
        )

        average_connections = (
            round(
                sum(
                    connection_counts
                    .values()
                )
                /
                node_count,
                2
            )
            if node_count > 0
            else 0
        )

        return {
            "nodes":
                node_count,

            "relationships":
                relationship_count,

            "most_connected_node":
                most_connected_node,

            "most_connected_count":
                most_connected_count,

            "orphan_nodes":
                orphan_nodes,

            "average_connections":
                average_connections,
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

        OUTGOING RELATIONSHIPS:
        """

        for relationship in relationships:

            if relationship.source_node_id == node_id:

                target = (
                    db.query(Node)
                    .filter(
                        Node.id ==
                        relationship.target_node_id
                    )
                    .first()
                )

                if target:

                    context += (
                        f"\n{node.title}"
                        f" --{relationship.relation_type}--> "
                        f"{target.title}"
                    )

        context += "\n\nINCOMING RELATIONSHIPS:\n"

        for relationship in relationships:

            if relationship.target_node_id == node_id:

                source = (
                    db.query(Node)
                    .filter(
                        Node.id ==
                        relationship.source_node_id
                    )
                    .first()
                )

                if source:

                    context += (
                        f"\n{source.title}"
                        f" --{relationship.relation_type}--> "
                        f"{node.title}"
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

        node_map = {
            node.id: node.title
            for node in nodes
        }

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
                    "source":
                    node_map.get(
                        r.source_node_id
                    ),

                    "relationship":
                    r.relation_type,

                    "target":
                    node_map.get(
                        r.target_node_id
                    )
                }
                for r in relationships
            ]
        }

    finally:
        db.close()


@app.post("/projects/{project_id}/chat")
def project_chat(
    project_id: int,
    data: AIRequest
):
    db = SessionLocal()

    try:

        nodes = (
            db.query(Node)
            .filter(
                Node.project_id == project_id
            )
            .all()
        )

        relationships = (
            db.query(Relationship)
            .filter(
                Relationship.project_id == project_id
            )
            .all()
        )

        node_map = {
            node.id: node.title
            for node in nodes
        }

        context = "PROJECT KNOWLEDGE GRAPH\n\n"

        for node in nodes:

            context += (
                f"Node: {node.title}\n"
                f"Type: {node.node_type}\n"
                f"Description: {node.description or 'No description'}\n\n"
                f"Notes: {node.notes or 'No notes'}\n\n"
            )

        context += "\nRELATIONSHIPS\n"

        for relationship in relationships:

            source = node_map.get(
                relationship.source_node_id
            )

            target = node_map.get(
                relationship.target_node_id
            )

            context += (
                f"{source}"
                f" --{relationship.relation_type}--> "
                f"{target}\n"
            )

        prompt = f"""
                You are ProjectMind AI.

                Question:
                {data.question}

                Project Context:
                {context}

                Answer using only the project knowledge graph.
                """

        answer = ask_ollama(prompt)

        return {
            "answer": answer
        }
    finally:
        db.close()

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

        suggestions = ask_ai(
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

        result = ask_ai(
            prompt
        )

        return {
            "suggestions":
            result
        }

    finally:
        db.close()

@app.get(
    "/projects/{project_id}/gap-analysis"
)
def gap_analysis(
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

        node_map = {
            node.id: node.title
            for node in nodes
        }

        context = "PROJECT KNOWLEDGE GRAPH\n\n"

        context += "NODES:\n"

        for node in nodes:

            context += (
                f"- {node.title}\n"
            )

        context += "\nRELATIONSHIPS:\n"

        for relationship in relationships:

            source = node_map.get(
                relationship.source_node_id
            )

            target = node_map.get(
                relationship.target_node_id
            )

            context += (
                f"{source}"
                f" --{relationship.relation_type}--> "
                f"{target}\n"
            )

        prompt = """
        Return ONLY JSON.

        dont take more time give fast with in 3 seconds

        JSON Format:

        {
            "missing_concepts": [
            "Feature Vectors",
            "Identity Persistence"
        ],

        "missing_relationships": [
            {
                "source": "Face Recognition",
                "target": "Feature Vectors",
                "type": "uses"
            }
        ],

        "weak_areas": [
            "Tracking"
        ]
        }
        """
        return {
            "missing_concepts": [
                "Feature Vectors",
                "Identity Persistence"
            ],

            "missing_relationships": [
                {
                    "source": "Face Recognition",
                    "target": "Feature Vectors",
                    "type": "uses"
                }
            ],

            "weak_areas": [
                "Tracking"
            ]
        }

        result = ask_gap_analysis(prompt)

        print("vs", result)

        import json

        try:

            if not result:

                return {
                    "missing_concepts": [],
                    "missing_relationships": [],
                    "weak_areas": []
                }

            parsed = json.loads(
                result
            )

            return parsed

        except Exception as e:

            print(
                "JSON Parse Error:",
                e
            )

            print(
                "Raw Response:",
                result
            )

            return {
                "raw": result
            }

    finally:
        db.close()

@app.post(
    "/projects/{project_id}/add-concept"
)
def add_missing_concept(
    project_id: int,
    data: MissingConceptRequest
):

    db = SessionLocal()

    try:

        existing = (
            db.query(Node)
            .filter(
                Node.project_id ==
                project_id,

                Node.title ==
                data.title
            )
            .first()
        )

        if existing:

            return {
                "message":
                "Concept already exists"
            }

        node = Node(
            project_id=
                project_id,

            title=
                data.title,

            node_type=
                "concept",

            description=""
        )

        db.add(node)

        db.commit()

        db.refresh(node)

        return {
            "id": node.id,
            "title": node.title
        }

    finally:
        db.close()


@app.get(
    "/nodes/{node_id}/concept-suggestions"
)
def concept_suggestions(
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
        
        prompt = f"""
            Return JSON only.

            Node:
            {node.title}

            Description:
            {node.description}

            Suggest 5 concepts
            that should exist
            in the knowledge graph.

            Format:

            {{
            "concepts": []
            }}
            """
        
        result = ask_model(prompt)

        return json.loads(result)
    finally:
        db.close()

@app.get("/testing")
def test_qwen():

    # Groq is an online provider known for extreme speed
    response = ask_model(
    "Hello OpenRouter!", 
    provider="openrouter", 
    model="anthropic/claude-3-haiku"
)
    print(response)
    return response

@app.get(
    "/ai-settings"
)
def get_ai_settings():

    db = SessionLocal()

    try:

        settings = (
            db.query(
                AISettings
            )
            .first()
        )

        return settings

    finally:

        db.close()

@app.put(
    "/ai-settings"
)
def update_ai_settings(
    data: AISettingsUpdate
):

    db = SessionLocal()

    try:

        settings = (
            db.query(
                AISettings
            )
            .first()
        )

        settings.provider = (
            data.provider
        )

        settings.model = (
            data.model
        )

        db.commit()

        return settings

    finally:

        db.close()

@app.get(
    "/available-models"
)
def available_models():

    import requests

    ollama_models = []

    try:

        response = requests.get(
            "http://localhost:11434/api/tags"
        )

        data = response.json()

        for model in data.get(
            "models",
            []
        ):

            ollama_models.append({
                "provider": "ollama",
                "model": model["name"]
            })

    except:

        pass

    cloud_models = [

        {
            "provider": "openai",
            "model": "gpt-4o"
        },


        {
            "provider": "groq",
            "model": "llama-3.3-70b"
        },

        {
            "provider": "groq",
            "model": "llama-3.3-70b-versatile"
        },

        {
            "provider": "groq",
            "model": "llama-3.1-8b-instant"
        },

        {
            "provider": "openrouter",
            "model": "anthropic/claude-3-haiku"
        },

        {
            "provider": "openrouter",
            "model": "anthropic/claude-3.5-sonnet"
        }

    ]

    return (
        ollama_models
        +
        cloud_models
    )

@app.get("/test-ai-settings")
def test_ai_settings():

    db = SessionLocal()

    try:

        settings = (
            db.query(AISettings)
            .first()
        )

        prompt = (
            "Respond with exactly: "
            f"Hello this is {settings.model}"
        )

        result = ask_model(
            prompt=prompt,
            provider=settings.provider,
            model=settings.model
        )

        return {
            "provider": settings.provider,
            "model": settings.model,
            "response": result
        }

    finally:

        db.close()

@app.get("/debug-ai-settings")
def debug_ai_settings():

    db = SessionLocal()

    settings = (
        db.query(AISettings)
        .first()
    )

    return {
        "provider":
            settings.provider,
        "model":
            settings.model
    }