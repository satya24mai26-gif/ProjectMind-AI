from fastapi import FastAPI

import json
from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database.db import engine, get_db
from database.models import Base, NodeChatMessage

from database.db import SessionLocal
from database.models import Project

from database.models import (Node, AISettings, ProjectChatMessage)

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

from schemas.ai import (AIRequest, ProjectAIRequest, AISettingsUpdate, ChatMessageCreate, ChatMessageUpdate)

from schemas.project import (ProjectCreate, ProjectChatRequest)

from services.ollama_service import (ask_model, ask_ai, ask_ai_chat)
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


@app.post("/ai/chat1")
def ai_chat(data: ProjectAIRequest):
    context = data.context
    node = context.get("node", {})

    # Helper functions to avoid ugly multi-line string comprehensions
    outgoing = "\n".join([f"- {node.get('title')} -- {r['type']} -> {r['target']}" for r in context.get("outgoingRelations", [])])
    incoming = "\n".join([f"- {r['source']} -- {r['type']} -> {node.get('title')}" for r in context.get("incomingRelations", [])])
    #chat history
    history = (
        db.query(NodeChatMessage)
        .filter(
            NodeChatMessage.node_id
            ==
            node["id"]
        )
        .order_by(
            NodeChatMessage.id.desc()
        )
        .limit(10)
        .all()
    )
    chat_history = "\n".join(

        [
            f"{m.role}: {m.content}"

            for m in reversed(history)
        ]

    )
    # Cleaned context representation using markdown formatting block
    context_md = f"""
# Node Details
- **Title**: {node.get("title", "Untitled")}
- **Type**: {node.get("type", "Unknown")}
- **Description**: {node.get("description", "No description provided.")}
- **Tags**: {node.get("tags", "No tags")}

## Active Notes
{context.get("notes", "No active notes on this node.")}

## Outgoing Relationships
{outgoing if outgoing else "No outgoing relations."}

## Incoming Relationships
{incoming if incoming else "No incoming relations."}
"""

    # Structured prompt targeting the chatbot's demeanor
    prompt = f"""
You are ProjectMind AI, a world-class node-focused research assistant.
Your primary job is helping the user understand and expand the CURRENT NODE. 
Do not behave as a general chatbot.
Always use node information first.
Always mention related graph nodes when relevant.
Use the system context provided below to answer the User Question accurately.

[SYSTEM KNOWLEDGE GRAPH CONTEXT]
{context_md}

[USER QUESTION]
{data.question}

## Previous Discussion

{chat_history}

[CONVERSATION RULES]

- Use graph context first.
- Use previous discussion for continuity.
- Do not repeat information unnecessarily.
- Mention related nodes only when relevant.
- For greetings:
  respond briefly.
- For acknowledgements:
  respond briefly.
- Do not generate long reports unless requested.

Answer:
"""
    
    print(f"\n--- INCOMING USER QUESTION ---\n{data.question}")
    
    # Executing using our new chat wrapper
    user_message = NodeChatMessage(
        node_id=node["id"],
        role="user",
        content=data.question
    )

    db.add(user_message)

    db.commit()
    answer = ask_ai_chat(prompt)

    assistant_message = NodeChatMessage(
        node_id=node["id"],
        role="assistant",
        content=answer
    )

    db.add(assistant_message)

    db.commit()

    return {
        "answer": answer
    }

@app.get(
    "/nodes/{node_id}/chat-history"
)
def get_chat_history(
    node_id: int
):
    messages = (
        db.query(NodeChatMessage)
        .filter(
            NodeChatMessage.node_id
            ==
            node_id
        )
        .order_by(
            NodeChatMessage.id.asc()
        )
        .all()
    )

    return messages

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


@app.post("/projects/{project_id}/chat1")
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

        answer = ask_ai_chat(prompt)

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

        summary = ask_ai(prompt)

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
        Return ONLY valid JSON.

        You are analyzing a knowledge graph.

        Rules:

        1. Suggest only concepts that are NOT already present in the graph.
        2. Suggest only relationships that do NOT already exist in the graph.
        3. Relationship source and target must be existing nodes OR suggested missing concepts.
        4. Keep suggestions highly relevant to the graph domain.
        5. Maximum:

        * 5 missing concepts
        * 5 missing relationships
        * 3 weak areas
        6. Do NOT include explanations.
        7. Output valid JSON only.
        8. dont include any matter just start from { and end from this }

        Graph Nodes:
        {nodes}

        Graph Relationships:
        {relationships}

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

        result = ask_model(
            prompt=prompt,
            provider=settings.provider,
            model=settings.model
        )


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

@app.post("/add-concept")
def add_missing_concept(data: NodeCreate):

    db = SessionLocal()

    print("helloooo")

    print(data)

    try:

        existing = (
            db.query(Node)
            .filter(
                Node.project_id ==
                data.project_id,

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

        return {
            "id": node.id,
            "title": node.title
        }
    
    except Exception as e:
        print(e)

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

@app.get(
    "/projects/{project_id}/relationship-analysis"
)
def relationship_analysis(
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

        node_titles = [
            node.title
            for node in nodes
        ]

        relationship_data = [

            {
                "source":
                    next(
                        (
                            n.title
                            for n in nodes
                            if n.id ==
                            r.source_node_id
                        ),
                        ""
                    ),

                "target":
                    next(
                        (
                            n.title
                            for n in nodes
                            if n.id ==
                            r.target_node_id
                        ),
                        ""
                    ),

                "type":
                    r.relation_type

            }

            for r in relationships

        ]

        prompt = f"""
        Analyze this entire knowledge graph.
        
        Find important missing relationships
        between existing nodes.

        Do not suggest relationships
        that already exist.

        Return ONLY JSON.

        JSON Format:

        {{
            "missing_relationships": [
                {{
                    "source": "FAISS",
                    "target": "Embeddings",
                    "type": "indexes"
                }}
            ]
        }}

        Nodes:
        {node_titles}

        Relationships:
        {relationship_data}
        """

        result = ask_ai(
            prompt=prompt,
            provider=settings.provider,
            model=settings.model
        )

        return json.loads(result)

    finally:

        db.close()


@app.post(
    "/nodes/{node_id}/repair"
)
def repair_node(
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
            Analyze and improve this knowledge graph node.

            Title:
            {node.title}

            Description:
            {node.description}

            Notes:
            {node.notes}

            Tags:
            {node.tags}

            Current Type:
            {node.node_type}

            Return ONLY JSON.

            Format:

            {{
                "description": "",
                "notes": "",
                "tags": "",
                "node_type": ""
            }}

            Rules:

            1. Improve description (shortest).
            2. Improve notes.
            3. Generate useful tags (best 2 or 3).
            4. Choose best node type.
            5. Return JSON only.
            """

        result = ask_ai(
            prompt=prompt,
            provider=settings.provider,
            model=settings.model
        )

        data = json.loads(result)


        print(data)

        node.description = (
            data.get(
                "description",
                node.description
            )
        )

        node.notes = (
            data.get(
                "notes",
                node.notes
            )
        )

        raw_tags = data.get("tags", node.tags)

        if isinstance(raw_tags, str):
            tags_string = raw_tags
        elif isinstance(raw_tags, (list, tuple)):
            tags_string = ", ".join(map(str, raw_tags))
        else:
            tags_string = str(raw_tags)

        node.tags = (
            tags_string
        )

        node.node_type = (
            data.get(
                "node_type",
                node.node_type
            )
        )

        db.commit()

        db.refresh(node)

        return {
            "success": True,
            "node": {
                "id": node.id,
                "title": node.title,
                "description": node.description,
                "notes": node.notes,
                "tags": node.tags,
                "node_type": node.node_type
            }
        }

    except Exception as e:

        return {
            "error": str(e)
        }

    finally:

        db.close()

from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
import json

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from datetime import datetime, UTC

class NodeChatMessage(Base):
    __tablename__ = "node_chat_messages"

    __table_args__ = {'extend_existing': True}

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

    # 🔥 THE CRITICAL FIX: Explicitly add parent_id to map the discussion tree hierarchy
    parent_id = Column(
        Integer,
        ForeignKey("node_chat_messages.id", ondelete="CASCADE"),
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.now(UTC)
    )


from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List

class ProjectAIRequest(BaseModel):
    question: str
    context: dict
    edit_message_id: Optional[int] = None
    is_regenerate: Optional[bool] = False
    clear_all: Optional[bool] = False  
    delete_pair_id: Optional[int] = None
    parent_id: Optional[int] = None       # The frontend passes this to spawn sub-chats

@app.post("/ai/chat")
def ai_chat(data: ProjectAIRequest, db: Session = Depends(get_db)):
    context = data.context
    node = context.get("node", {})
    
    try:
        node_id = int(node.get("id"))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid Node ID format provided.")

    # --- 1. CASCADE PAIR & SUB-BRANCH THREAD DELETION ---
    if data.delete_pair_id:
        target_msg = db.query(NodeChatMessage).filter(NodeChatMessage.id == data.delete_pair_id).first()
        if target_msg:
            user_msg_id = target_msg.id if target_msg.role == "user" else None
            
            if target_msg.role == "assistant":
                prev_user = db.query(NodeChatMessage).filter(
                    NodeChatMessage.node_id == node_id,
                    NodeChatMessage.id < target_msg.id,
                    NodeChatMessage.role == "user"
                ).order_by(NodeChatMessage.id.desc()).first()
                if prev_user:
                    user_msg_id = prev_user.id
                    db.delete(prev_user)
            else:
                next_ai = db.query(NodeChatMessage).filter(
                    NodeChatMessage.node_id == node_id,
                    NodeChatMessage.id > target_msg.id,
                    NodeChatMessage.role == "assistant"
                ).order_by(NodeChatMessage.id.asc()).first()
                if next_ai:
                    db.delete(next_ai)
            
            db.delete(target_msg)
            db.commit()

            # CASCADE WIPE: Drop downstream nested branches off this point
            if user_msg_id:
                db.query(NodeChatMessage).filter(
                    NodeChatMessage.node_id == node_id,
                    NodeChatMessage.parent_id == user_msg_id
                ).delete(synchronize_session=False)
                db.commit()

        return {"answer": "Selected branch sequence dropped from tree model.", "status": "deleted"}

    # --- 2. COMPLETE RESET PANE WORKSPACE ---
    if data.clear_all:
        db.query(NodeChatMessage).filter(NodeChatMessage.node_id == node_id).delete()
        db.commit()
        return {"answer": "Full log sequence wiped.", "cleared": True}

    # --- 3. THE REGENERATION INLINE MAP CYCLE ---
    active_parent_id = data.parent_id
    target_question = data.question

    if data.is_regenerate:
        last_ai = db.query(NodeChatMessage).filter(
            NodeChatMessage.node_id == node_id,
            NodeChatMessage.role == "assistant"
        ).order_by(NodeChatMessage.id.desc()).first()
        
        if last_ai:
            corresponding_user = db.query(NodeChatMessage).filter(
                NodeChatMessage.node_id == node_id,
                NodeChatMessage.id < last_ai.id,
                NodeChatMessage.role == "user"
            ).order_by(NodeChatMessage.id.desc()).first()
            
            if corresponding_user:
                target_question = corresponding_user.content
                active_parent_id = corresponding_user.parent_id
            db.delete(last_ai)
            db.commit()

    # --- 4. INLINE RECORD MODIFICATION EDITING ---
    elif data.edit_message_id:
        target_msg = db.query(NodeChatMessage).filter(NodeChatMessage.id == data.edit_message_id).first()
        if target_msg:
            target_msg.content = data.question
            db.commit()
            active_parent_id = target_msg.parent_id
            target_question = data.question

            # Wipe trailing context logs off this modified question branch
            db.query(NodeChatMessage).filter(
                NodeChatMessage.node_id == node_id,
                NodeChatMessage.id > data.edit_message_id
            ).delete(synchronize_session=False)
            db.commit()

    # --- 5. SECURE NEW MESSAGE SEED SEQUENCE ---
    else:
        user_message = NodeChatMessage(
            node_id=node_id,
            role="user",
            content=target_question,
            parent_id=active_parent_id  # Saved cleanly to database row columns!
        )
        db.add(user_message)
        db.commit()
        db.refresh(user_message)

    # --- RECURSIVE CHAT HISTORY PROMPT ASSEMBLY ---
    # Walks backwards along parent links to build the exact context path for the LLM prompt
    linear_history = []
    current_trace_id = active_parent_id

    while current_trace_id is not None:
        ancestor_user = db.query(NodeChatMessage).filter(NodeChatMessage.id == current_trace_id).first()
        if not ancestor_user:
            break
        linear_history.append(f"user: {ancestor_user.content}")
        
        ancestor_ai = db.query(NodeChatMessage).filter(
            NodeChatMessage.node_id == node_id,
            NodeChatMessage.id > ancestor_user.id,
            NodeChatMessage.role == "assistant"
        ).order_by(NodeChatMessage.id.asc()).first()
        
        if ancestor_ai:
            linear_history.append(f"assistant: {ancestor_ai.content}")
        
        current_trace_id = ancestor_user.parent_id

    linear_history.reverse()
    linear_history.append(f"user: {target_question}")
    chat_history_str = "\n".join(linear_history)

    # --- KNOWLEDGE CONTEXT INTERACTION WRAPPING ---
    outgoing = "\n".join([f"- {node.get('title')} -- {r['type']} -> {r['target']}" for r in context.get("outgoingRelations", [])])
    incoming = "\n".join([f"- {r['source']} -- {r['type']} -> {node.get('title')}" for r in context.get("incomingRelations", [])])

    context_md = f"""
# Node Details
- **Title Focus**: {node.get("title", "Untitled")}
- **Type**: {node.get("nodeType", "Concept")}
- **Description**: {node.get("description", "No description provided.")}

## Active Graph Relationships
- **Outgoing**: {outgoing if outgoing else "None"}
- **Incoming**: {incoming if incoming else "None"}
"""

    prompt = f"You are ProjectMind AI. Answer accurately based on this context:\n{context_md}\n\nHistory Chain:\n{chat_history_str}\n\nQuestion: {target_question}"
    
    # Fire off wrapper inference run
    answer = ask_ai_chat(prompt)

    # Persist the System Reply, linking it to the same parent scope context tier
    assistant_message = NodeChatMessage(
        node_id=node_id,
        role="assistant",
        content=answer,
        parent_id=active_parent_id  # Tied to the same thread tier layout
    )
    db.add(assistant_message)
    db.commit()

    return {"answer": answer}


@app.get("/nodes/{node_id}/chat-history")
def get_chat_history(node_id: int, db: Session = Depends(get_db)):
    """
    Returns clean database chat entries sorted chronologically with explicit 
    null value handling to prevent frontend type serialization drops.
    """
    messages = (
        db.query(NodeChatMessage)
        .filter(NodeChatMessage.node_id == node_id)
        .order_by(NodeChatMessage.id.asc())
        .all()
    )

    # Hardened structural serialization map
    serialized_history = []
    for m in messages:
        serialized_history.append({
            "id": int(m.id),
            "node_id": int(m.node_id),
            "role": str(m.role),
            "content": str(m.content),
            # Explicit fallback preserves 'null' key values perfectly over network lines
            "parent_id": int(m.parent_id) if m.parent_id is not None else None,
            "created_at": m.created_at.isoformat() if m.created_at else None
        })

    return serialized_history

from pydantic import BaseModel
from typing import Optional, List
import json

# Extended schema ensuring type compliance with all advanced frontend operations
class ProjectChatAIRequest(BaseModel):
    question: str
    edit_message_id: Optional[int] = None
    is_regenerate: Optional[bool] = False
    clear_all: Optional[bool] = False  
    delete_pair_id: Optional[int] = None
    parent_id: Optional[int] = None

@app.post("/projects/{project_id}/chat")
def project_chat(project_id: int, data: ProjectChatAIRequest, db: Session = Depends(get_db)):
    # --- 1. CASCADE PAIR & SUB-BRANCH THREAD DELETION ---
    if data.delete_pair_id:
        target_msg = db.query(ProjectChatMessage).filter(ProjectChatMessage.id == data.delete_pair_id).first()
        if target_msg:
            user_msg_id = target_msg.id if target_msg.role == "user" else None
            
            if target_msg.role == "assistant":
                user_msg_id = target_msg.parent_id
                prev_user = db.query(ProjectChatMessage).filter(ProjectChatMessage.id == user_msg_id).first()
                if prev_user:
                    db.delete(prev_user)
                db.delete(target_msg)
            else:
                user_msg_id = target_msg.id
                next_ai = db.query(ProjectChatMessage).filter(
                    ProjectChatMessage.project_id == project_id,
                    ProjectChatMessage.parent_id == user_msg_id,
                    ProjectChatMessage.role == "assistant"
                ).first()
                if next_ai:
                    db.delete(next_ai)
                db.delete(target_msg)
            
            db.commit()

            # Cascade: clear child branches linked to this deleted item context anchor
            if user_msg_id:
                db.query(ProjectChatMessage).filter(
                    ProjectChatMessage.project_id == project_id,
                    ProjectChatMessage.parent_id == user_msg_id
                ).delete(synchronize_session=False)
                db.commit()

        return {"answer": "Selected conversational branch sequence terminated.", "status": "deleted"}

    # --- 2. COMPLETE RESET PANE WORKSPACE ---
    if data.clear_all:
        db.query(ProjectChatMessage).filter(ProjectChatMessage.project_id == project_id).delete()
        db.commit()
        return {"answer": "Workspace history cleared successfully.", "cleared": True}

    # --- 3. THE REGENERATION INLINE MAP CYCLE ---
    active_parent_id = data.parent_id
    target_question = data.question

    if data.is_regenerate:
        last_ai = db.query(ProjectChatMessage).filter(
            ProjectChatMessage.project_id == project_id,
            ProjectChatMessage.role == "assistant"
        ).order_by(ProjectChatMessage.id.desc()).first()
        
        if last_ai:
            active_parent_id = last_ai.parent_id
            corresponding_user = db.query(ProjectChatMessage).filter(ProjectChatMessage.id == active_parent_id).first()
            if corresponding_user:
                target_question = corresponding_user.content
                active_parent_id = corresponding_user.parent_id
            db.delete(last_ai)
            db.commit()

    # --- 4. INLINE RECORD MODIFICATION EDITING ---
    elif data.edit_message_id:
        target_msg = db.query(ProjectChatMessage).filter(ProjectChatMessage.id == data.edit_message_id).first()
        if target_msg:
            target_msg.content = data.question
            db.commit()
            active_parent_id = target_msg.parent_id
            target_question = data.question

            # Wipe trailing context logs off this modified question branch
            db.query(ProjectChatMessage).filter(
                ProjectChatMessage.project_id == project_id,
                ProjectChatMessage.id > data.edit_message_id
            ).delete(synchronize_session=False)
            db.commit()

    # --- 5. SECURE NEW MESSAGE SEED SEQUENCE ---
    else:
        active_parent_id = int(data.parent_id) if data.parent_id is not None else None
        
        user_message = ProjectChatMessage(
            project_id=project_id,
            role="user",
            content=target_question,
            parent_id=active_parent_id
        )
        db.add(user_message)
        db.commit()
        db.refresh(user_message)
        new_user_prompt_id = user_message.id

    # --- SOLIDIFIED CHROMATIC LINEAGE WALKER ALGORITHM ---
    # Traverses the multi-threaded chat tree backwards to gather conversation context
    linear_history = []
    current_trace_id = active_parent_id

    while current_trace_id is not None:
        ancestor_user = db.query(ProjectChatMessage).filter(ProjectChatMessage.id == current_trace_id).first()
        if not ancestor_user:
            break
        linear_history.append(f"user: {ancestor_user.content}")
        
        ancestor_ai = db.query(ProjectChatMessage).filter(
            ProjectChatMessage.project_id == project_id,
            ProjectChatMessage.parent_id == ancestor_user.id,
            ProjectChatMessage.role == "assistant"
        ).first()
        
        if ancestor_ai:
            linear_history.append(f"assistant: {ancestor_ai.content}")
        
        current_trace_id = ancestor_user.parent_id

    linear_history.reverse()
    linear_history.append(f"user: {target_question}")
    chat_history_str = "\n".join(linear_history)

    # --- PROJECT KNOWLEDGE GRAPH CONTEXT INJECTION ---
    nodes = db.query(Node).filter(Node.project_id == project_id).all()
    relationships = db.query(Relationship).filter(Relationship.project_id == project_id).all()
    node_map = {node.id: node.title for node in nodes}

    context_str = "PROJECT KNOWLEDGE GRAPH CONTEXT\n\n"
    for node in nodes:
        context_str += (
            f"Node: {node.title}\n"
            f"Type: {node.node_type}\n"
            f"Description: {node.description or 'No description'}\n"
            f"Notes: {node.notes or 'No notes'}\n\n"
        )

    context_str += "\nGRAPH RELATIONSHIPS SYSTEM LINKS\n"
    for r in relationships:
        source = node_map.get(r.source_node_id, "Unknown")
        target = node_map.get(r.target_node_id, "Unknown")
        context_str += f"{source} --{r.relation_type}--> {target}\n"

    prompt = f"""
You are ProjectMind AI, a world-class system architecture knowledge graph assistant.
Your job is helping the user query, analyze, and optimize the overall PROJECT ENVIRONMENT context map.
Format your responses natively using clean, readable Markdown (headings, lists, bold keywords).

[PROJECT DATA GRAPH CONTEXT]
{context_str}

## Chronological Conversation Thread History 
{chat_history_str}

Answer:
"""
    # Execute Markdown AI text generation wrapper
    answer = ask_ai_chat(prompt)

    # Save Assistant response block linked to its prompt ID
    assistant_message = ProjectChatMessage(
        project_id=project_id,
        role="assistant",
        content=answer,
        parent_id=new_user_prompt_id if not data.is_regenerate and not data.edit_message_id else last_ai.parent_id
    )
    db.add(assistant_message)
    db.commit()

    return {"answer": answer}


@app.get("/projects/{project_id}/chat-history")
def get_project_chat_history(project_id: int, db: Session = Depends(get_db)):
    """
    Returns sanitized project conversation entries sorted chronologically
    with explicit null parsing to safeguard frontend thread building selectors.
    """
    messages = (
        db.query(ProjectChatMessage)
        .filter(ProjectChatMessage.project_id == project_id)
        .order_by(ProjectChatMessage.id.asc())
        .all()
    )
    
    serialized_history = []
    for m in messages:
        serialized_history.append({
            "id": int(m.id),
            "project_id": int(m.project_id),
            "role": str(m.role),
            "content": str(m.content),
            "parent_id": int(m.parent_id) if m.parent_id is not None else None
        })
    return serialized_history