const API_URL = "http://127.0.0.1:8000";

export async function createNode(
  title: string
) {
  const response = await fetch(
    `${API_URL}/nodes`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        title,
        description: "",
        node_type: "research",
        notes: "",
      }),
    }
  );

  return response.json();
}

export async function getNodes() {
  const response = await fetch(
    `${API_URL}/nodes`
  );

  return response.json();
}

export async function updateNode(
    id: number,
    data: {
      title: string;
      description: string;
      node_type: string;
      notes: string;
    }
  ) {
    const response = await fetch(
      `${API_URL}/nodes/${id}`,
      {
        method: "PUT",
  
        headers: {
          "Content-Type":
            "application/json",
        },
  
        body: JSON.stringify(data),
      }
    );
  
    return response.json();
  }

  export async function deleteNode(
    id: number
  ) {
    const response = await fetch(
      `${API_URL}/nodes/${id}`,
      {
        method: "DELETE",
      }
    );
  
    return response.json();
  }

  export async function createRelationship(
    sourceNodeId: number,
    targetNodeId: number,
    relationType: string
  ) {
    const response = await fetch(
      `${API_URL}/relationships`,
      {
        method: "POST",
  
        headers: {
          "Content-Type":
            "application/json",
        },
  
        body: JSON.stringify({
          source_node_id:
            sourceNodeId,
  
          target_node_id:
            targetNodeId,
  
          relation_type:
            relationType,
        }),
      }
    );
  
    return response.json();
  }

  export async function getRelationships() {
    const response = await fetch(
      `${API_URL}/relationships`
    );
  
    return response.json();
  }

  export async function updateRelationship(
    id: number,
    relationType: string
  ) {
    const response = await fetch(
      `${API_URL}/relationships/${id}`,
      {
        method: "PUT",
  
        headers: {
          "Content-Type":
            "application/json",
        },
  
        body: JSON.stringify({
          relation_type: relationType,
        }),
      }
    );
  
    return response.json();
  }