const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export interface ChatResponse {
  answer: string;
}

export interface ChatMessage {
  id: number;
  node_id: number;
  role: "user" | "assistant";
  content: string;
}

// Replace or append this precise function block inside your current frontend services/api.ts file:
export async function askAI(
  question: string,
  context: any,
  editMessageId?: number | null,
  isRegenerate?: boolean,
  clearAll?: boolean,
  deletePairId?: number | null,
  parentId?: number | null // Tracks nested thread tree pathways
): Promise<{ answer: string; status?: string; cleared?: boolean }> {
  const response = await fetch(`http://127.0.0.1:8000/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question,
      context,
      edit_message_id: editMessageId || null,
      is_regenerate: isRegenerate || false,
      clear_all: clearAll || false,
      delete_pair_id: deletePairId || null,
      parent_id: parentId || null // Passes structural thread parent metadata down to FastAPI database logs
    }),
  });

  if (!response.ok) {
    const errPayload = await response.json().catch(() => ({}));
    throw new Error(errPayload?.detail || `Inference error coordinate status: ${response.status}`);
  }

  return response.json();
}


// Existing askAI function ...

export async function fetchChatHistory(nodeId: number): Promise<any[]> {
  try {
    const response = await fetch(`${API_URL}/nodes/${nodeId}/chat-history`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`[fetchChatHistory Failure] for Node ${nodeId}:`, error);
    return []; // Safe fallback tracking layout state arrays
  }
}