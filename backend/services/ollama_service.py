import requests
import os
import re
from typing import Optional
from dotenv import load_dotenv


load_dotenv()
# Reusable session for faster consecutive requests
session = requests.Session()

def ask_model(
    prompt: str,
    provider: str = "ollama",           # Default to local Ollama
    model: str = "qwen2.5:1.5b",        # Default model for Ollama
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

OLLAMA_URL = "http://localhost:11434/api/generate"

AI_PROVIDER = "ollama"

OLLAMA_MODEL = "qwen3:8b"

def ask_ai(
    prompt: str,
    provider: str = "openrouter",       # Swap defaults here if you prefer 'ollama'
    model: str = "anthropic/claude-3-haiku", # Default model for your active provider
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

def ask_ollama(prompt: str):

    response = requests.post(
        OLLAMA_URL,
        json={
            "model": "qwen3:8b",
            "prompt": prompt,
            "options": {
            "temperature": 0.3
            },
            "stream": False,
        },
        timeout=300
    )

    data = response.json()

    return data["response"]

def ask_gap_analysis(prompt: str):

    response = requests.post(
        OLLAMA_URL,
        json={
            "model": "qwen3:8b", 

            "prompt": f"/no_think\n{prompt}",

            "stream": False,

            "options": {
                "temperature": 0.1,
                "num_predict": 400
            }
        },
        timeout=600
    )

    data = response.json()

    if "error" in data:

        raise Exception(
            data["error"]
        )

    print("\nGAP ANALYSIS DATA:")
    print(data)

    return data.get(
        "response",
        ""
    )