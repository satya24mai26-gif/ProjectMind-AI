import os
import math
import requests
from requests import Session
from database.models import Node, Relationship
from database.db import SessionLocal
from database.models import (AISettings)

session = requests.Session()

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
# =====================================================================
# REAL EMBEDDING GENERATOR (Replaces embedding_client placeholder)
# =====================================================================
def get_text_embedding(text: str, provider: str = settings.provider) -> list[float]:
    """
    Calls your AI provider to turn a piece of text into a vector embedding array.
    Supports OpenAI, OpenRouter, Groq, and Ollama.
    """
    headers = {"Content-Type": "application/json"}
    
    # 1. Route to the correct embedding endpoint based on your provider
    if provider == "openai":
        url = "https://api.openai.com/v1/embeddings"
        headers["Authorization"] = f"Bearer {os.getenv('OPENAI_API_KEY')}"
        payload = {"model": "text-embedding-3-small", "input": text}
        
    elif provider == "openrouter":
        url = "https://openrouter.ai/api/v1/embeddings"
        headers["Authorization"] = f"Bearer {os.getenv('OPENROUTER_API_KEY')}"
        # A common generic embedding model available on OpenRouter
        payload = {"model": "openai/text-embedding-3-small", "input": text}
        
    elif provider == "ollama":
        url = "http://localhost:11434/api/embeddings"
        # Uses whichever local model you have pulled, like mxbai-embed-large or llama3
        payload = {"model": settings.model, "prompt": text}
        
    else:
        # Fallback default endpoint (OpenAI style standard)
        url = "https://api.openai.com/v1/embeddings"
        headers["Authorization"] = f"Bearer {os.getenv('OPENAI_API_KEY')}"
        payload = {"model": "text-embedding-3-small", "input": text}

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=15)
        response.raise_for_status()
        res_json = response.json()
        
        # Parse the vector array out of the response format
        if provider == "ollama":
            return res_json["embedding"]
        else:
            return res_json["data"][0]["embedding"]
            
    except Exception as e:
        print(f"[RAG EMBEDDING ERROR]: Failed to fetch embedding array: {e}")
        # Return a mock vector of 1536 zeros if the network API completely fails
        return [0.0] * 1536


# =====================================================================
# COSINE SIMILARITY SEARCH (Replaces vector_db placeholder)
# =====================================================================
def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """Calculates the mathematical similarity angle between two vector strings."""
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0
    dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot_product / (norm_a * norm_b)


# =====================================================================
# MAIN RAG GRAPH FILTER PIPELINE
# =====================================================================
def get_relevant_graph_context(project_id: int, user_question: str, db: Session, top_k: int = 5) -> str:
    """
    Extracts only the most contextually relevant graph nodes and relationships 
    matching the user's prompt using vector tracking.
    """
    # 1. Pull ALL nodes belonging to this project to search through them
    all_project_nodes = db.query(Node).filter(Node.project_id == project_id).all()
    if not all_project_nodes:
        return "PROJECT KNOWLEDGE GRAPH CONTEXT: No active nodes found."

    # 2. Convert the user's question into a numerical search vector
    question_vector = get_text_embedding(user_question)

    # 3. Calculate semantic score match for every node dynamically
    scored_nodes = []
    for node in all_project_nodes:
        # Create a combined summary string of what this node represents
        node_content_string = f"Node Title: {node.title}. Type: {node.node_type}. Description: {node.description or ''}. Notes: {node.notes or ''}"
        
        # Get vector for this node
        node_vector = get_text_embedding(node_content_string)
        
        # Score it
        similarity_score = cosine_similarity(question_vector, node_vector)
        scored_nodes.append((similarity_score, node))

    # 4. Sort by highest matching score and pick the top_k elements
    scored_nodes.sort(key=lambda item: item[0], reverse=True)
    selected_node_pairs = scored_nodes[:top_k]
    relevant_node_ids = [node.id for score, node in selected_node_pairs]

    # 5. Extract only those specific nodes and their companion relationships
    nodes = db.query(Node).filter(Node.id.in_(relevant_node_ids)).all()
    
    relationships = db.query(Relationship).filter(
        (Relationship.project_id == project_id) & 
        ((Relationship.source_node_id.in_(relevant_node_ids)) | 
         (Relationship.target_node_id.in_(relevant_node_ids)))
    ).all()
    
    node_map = {n.id: n.title for n in db.query(Node).filter(Node.project_id == project_id).all()}

    # 6. Format this highly focused context chunk into text for the LLM
    context_str = "RELEVANT PROJECT DATA GRAPH CONTEXT (SEARCH MATCHED):\n\n"
    for node in nodes:
        context_str += (
            f"Node: {node.title}\n"
            f"Type: {node.node_type}\n"
            f"Description: {node.description or 'No description'}\n"
            f"Notes: {node.notes or 'No notes'}\n\n"
        )

    context_str += "\nRELEVANT GRAPH RELATIONSHIPS LINKS:\n"
    for r in relationships:
        source = node_map.get(r.source_node_id, "Unknown")
        target = node_map.get(r.target_node_id, "Unknown")
        context_str += f"{source} --{r.relation_type}--> {target}\n"

    return context_str