# services/ai_service.py

import requests

OLLAMA_URL = "http://localhost:11434/api/generate"

AI_PROVIDER = "ollama"

OLLAMA_MODEL = "qwen3:8b"


def ask_ai(prompt: str):

    if AI_PROVIDER == "ollama":

        return ask_ollama(prompt)

    raise Exception(
        f"Unknown provider: {AI_PROVIDER}"
    )


def ask_ollama(prompt: str):

    response = requests.post(
        OLLAMA_URL,
        json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.3
            }
        },
        timeout=300
    )

    data = response.json()

    return data["response"]