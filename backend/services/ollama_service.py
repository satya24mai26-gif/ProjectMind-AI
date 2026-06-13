import requests
import os
import re
from typing import Optional
from dotenv import load_dotenv
from database.db import SessionLocal
from database.models import (AISettings)


load_dotenv()
# Reusable session for faster consecutive requests
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

def ask_model(
    prompt: str,
    provider: str = settings.provider,           # Default to local Ollama
    model: str = settings.model,        # Default model for Ollama
    api_key: Optional[str] = None,      # API key (not needed for Ollama)
    temperature: float = 0.3,           # Default temperature
    timeout: int = 120                  # Default timeout in seconds
) -> Optional[str]:
    """
    Sends a prompt to local Ollama or an online provider.
    Can be called with just one argument: ask_model("Hello!")
    """
    
    headers = {"Content-Type": "application/json"}

    print(
        "\n==== MODEL CALL ===="
    )
    print(
        "PROVIDER:",
        provider
    )
    print(
        "MODEL:",
        model
    )
    print(
        "====================\n"
    )
    
    # 1. Route the request based on the provider
    if provider == "ollama":
        base_url = "http://localhost:11434/v1/chat/completions"
        
    elif provider == "openrouter":
        base_url = "https://openrouter.ai/api/v1/chat/completions"
        # Use passed key, or fallback to environment variable
        key = api_key or os.getenv("OPENROUTER_API_KEY") 
        headers["Authorization"] = f"Bearer {key}"
        
    elif provider == "openai":
        base_url = "https://api.openai.com/v1/chat/completions"
        key = api_key or os.getenv("OPENAI_API_KEY")
        headers["Authorization"] = f"Bearer {key}"
        
    elif provider == "groq":
        base_url = "https://api.groq.com/openai/v1/chat/completions"
        key = api_key or os.getenv("GROQ_API_KEY")
        headers["Authorization"] = f"Bearer {key}"
        
    else:
        print(f"Error: Unsupported provider '{provider}'")
        return None

    # 2. Universal Payload (OpenAI standard supported by Ollama/Groq/OpenRouter)
    payload = {
        "model": model,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": temperature,
        "stream": False
    }

    # 3. Execute the request
    try:
        response = session.post(base_url, headers=headers, json=payload, timeout=timeout)
        response.raise_for_status() # Check for HTTP errors (401, 500, etc.)
        
        data = response.json()
        
        # Parse the standard response structure
        raw = data["choices"][0]["message"]["content"]
        if raw.startswith("```json"):
            return raw.replace("```json\n", "").replace("\n```", "")
        return raw

    except requests.exceptions.HTTPError as http_err:
        print(f"API Error ({provider}): {http_err}")
        print(f"Details: {response.text}") # Prints the actual error from the provider
        return None
    except requests.exceptions.RequestException as req_err:
        print(f"Network Error ({provider}): {req_err}")
        return None


def ask_ai(
    prompt: str,
    provider: str = settings.provider,       # Swap defaults here if you prefer 'ollama'
    model: str = settings.model, # Default model for your active provider
    temperature: float = 0.1,           # Low temperature is critical for strict JSON
    timeout: int = 60
) -> str:  # Always returns a string to protect the frontend JSON.parse()
    """
    Unified AI wrapper optimized to guarantee valid JSON string responses.
    Can be called with exactly one argument: ask_ai(prompt)
    """
    headers = {"Content-Type": "application/json"}

    print(
        "\nMODEL CALL:",
        provider,
        model
    )
    
    # 1. Routing endpoints
    if provider == "ollama":
        base_url = "http://localhost:11434/v1/chat/completions"
        api_key_val = "ollama"
    elif provider == "openrouter":
        base_url = "https://openrouter.ai/api/v1/chat/completions"
        api_key_val = os.getenv("OPENROUTER_API_KEY")
        headers["Authorization"] = f"Bearer {api_key_val}"
    elif provider == "groq":
        base_url = "https://api.groq.com/openai/v1/chat/completions"
        api_key_val = os.getenv("GROQ_API_KEY")
        headers["Authorization"] = f"Bearer {api_key_val}"
    elif provider == "openai":
        base_url = "https://api.openai.com/v1/chat/completions"
        api_key_val = os.getenv("OPENAI_API_KEY")
        headers["Authorization"] = f"Bearer {api_key_val}"
    else:
        print(f"Error: Unsupported provider '{provider}'")
        return "[]"

    # Fallback if someone forgot to configure their .env file
    if not api_key_val:
        print(f"Error: API Key missing for provider '{provider}'")
        return "[]"

    # 2. Universal JSON-enforced payload
    payload = {
        "model": model,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": temperature,
        "stream": False,
        # Forces modern models to output raw JSON directly
        "response_format": {"type": "json_object"} 
    }

    try:
        response = session.post(base_url, headers=headers, json=payload, timeout=timeout)
        response.raise_for_status()

        print(response.json)
        
        raw_content = response.json()["choices"][0]["message"]["content"].strip()
        
        # 3. Defensive Cleaning: strip markdown blocks if an older model still outputs them
        if raw_content.startswith("```"):
            # Removes leading ```json or  ``` and trailing ```
            raw_content = re.sub(r"^```(?:json)?\s*", "", raw_content)
            raw_content = re.sub(r"\s*```$", "", raw_content)
            raw_content = raw_content.strip()
            
        return raw_content

    except Exception as e:
        print(f"AI Call failed processing for {provider}: {e}")
        # Crucial fallback: returns an empty JSON list string so frontend's 
        # JSON.parse() succeeds, and relationshipSuggestions.length becomes 0 safely.
        return "[]"



def ask_ai_chat(
    prompt: str,
    provider: str = settings.provider,       # Default chat provider
    model: str = settings.model,             # Default chat model
    temperature: float = 0.7,                 # 0.7 is perfect for creative & natural markdown (ChatGPT style)
    timeout: int = 60
) -> str:
    """
    Unified AI wrapper optimized for natural Markdown text/chat responses (ChatGPT/Gemini style).
    """
    headers = {"Content-Type": "application/json"}

    print(f"\n[CHAT MODEL CALL]: {provider} -> {model}")
    
    # 1. Routing endpoints
    if provider == "ollama":
        base_url = "http://localhost:11434/v1/chat/completions"
        api_key_val = "ollama"
    elif provider == "openrouter":
        base_url = "https://openrouter.ai/api/v1/chat/completions"
        api_key_val = os.getenv("OPENROUTER_API_KEY")
        headers["Authorization"] = f"Bearer {api_key_val}"
    elif provider == "groq":
        base_url = "https://api.groq.com/openai/v1/chat/completions"
        api_key_val = os.getenv("GROQ_API_KEY")
        headers["Authorization"] = f"Bearer {api_key_val}"
    elif provider == "openai":
        base_url = "https://api.openai.com/v1/chat/completions"
        api_key_val = os.getenv("OPENAI_API_KEY")
        headers["Authorization"] = f"Bearer {api_key_val}"
    else:
        print(f"Error: Unsupported provider '{provider}'")
        return "I'm sorry, but my chat system is currently misconfigured."

    # Fallback if API key is missing
    if not api_key_val:
        print(f"Error: API Key missing for provider '{provider}'")
        return "I encounter an authentication issue. Please check the server configuration."

    # 2. Standard Chat Payload (No JSON enforcement)
    payload = {
        "model": model,
        "messages": [
            {
                "role": "system", 
                "content": "you are more then  ultra super pro altimate multi maz z++ designer developer Frontier Model SOTA, Follow the instructions contained in the user prompt, Format your responses with clean, readable Markdown (bolding, bullet points, headers) where appropriate. Respond naturally and accurately. not analyze content if only user ask small queations like hii, helo give simple responed for simple queations, if hard qeation give big respond."
            },
            {"role": "user", "content": prompt}
        ],
        "temperature": temperature,
        "stream": False
        # "response_format" removed entirely to allow free-form markdown text response
    }

    try:
        response = session.post(base_url, headers=headers, json=payload, timeout=timeout)
        response.raise_for_status()
        
        raw_content = response.json()["choices"][0]["message"]["content"].strip()
        return raw_content

    except Exception as e:
        print(f"AI Chat Call failed processing for {provider}: {e}")
        return "I'm having trouble connecting to my mind engine right now. Please try again in a moment."