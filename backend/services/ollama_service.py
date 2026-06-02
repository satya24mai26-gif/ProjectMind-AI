import requests

OLLAMA_URL = "http://localhost:11434/api/generate"

def ask_ollama(prompt: str):

    response = requests.post(
        OLLAMA_URL,
        json={
            "model": "qwen3:8b",
            "prompt": prompt,
            "stream": False,
        },
        timeout=120
    )

    data = response.json()

    return data["response"]