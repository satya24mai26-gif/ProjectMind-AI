const API_URL = "http://127.0.0.1:8000";

export async function createNode(
  title: string,
  projectId: number
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
        project_id: projectId,
      }),
    }
  );

  return response.json();
}

export async function getNodes(
  projectId: number
) {

  const response =
    await fetch(
      `${API_URL}/nodes?project_id=${projectId}`
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
    relationType: string,
    projectId: number
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
          source_node_id: sourceNodeId,
          target_node_id: targetNodeId,
          relationship_type: relationType,
          project_id: projectId,
        }),
      }
    );
  
    return response.json();
  }

  export async function getRelationships(projectId: number) {
    const response = await fetch(
      `${API_URL}/relationships?project_id=${projectId}`
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

  export async function getProjects() {
    const response = await fetch(
      `${API_URL}/projects`
    );
  
    return response.json();
  }

  export async function updateNodePosition(
  nodeId: number,
  x: number,
  y: number
) {
  const response = await fetch(
    `${API_URL}/nodes/${nodeId}/position`,
    {
      method: "PUT",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        position_x: Math.round(x),
        position_y: Math.round(y),
      }),
    }
  );

  return response.json();
}


export async function deleteRelationship(
  relationshipId: number
) {
  const response = await fetch(
    `${API_URL}/relationships/${relationshipId}`,
    {
      method: "DELETE",
    }
  );

  return response.json();
}

export async function deleteProject(
  projectId: number
) {
  const response = await fetch(
    `${API_URL}/projects/${projectId}`,
    {
      method: "DELETE",
    }
  );

  return response.json();
}

export async function createProject(
  name: string,
  description: string
) {
  const response = await fetch(
    `${API_URL}/projects`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        name,
        description,
      }),
    }
  );

  return response.json();
}

export async function getProjectStats(
  projectId: number
) {
  const response = await fetch(
    `${API_URL}/projects/${projectId}/stats`
  );

  return response.json();
}

export async function getContext(
  nodeId: number
) {
  const response = await fetch(
    `${API_URL}/context/${nodeId}`
  );

  return response.json();
}

export async function chatWithNode(
  nodeId: number,
  message: string
) {

  const response =
    await fetch(
      `${API_URL}/ai/chat`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          node_id: nodeId,
          message,
        }),
      }
    );

  return response.json();
}

export async function getProjectContext(
  projectId: number
) {

  const response =
    await fetch(
      `${API_URL}/projects/${projectId}/context`
    );

  return response.json();
}


export async function askProjectAI(
  question: string,
  context: any
) {

  const response =
    await fetch(
      `${API_URL}/ai/project-chat`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          question,
          context,
        }),
      }
    );

  return response.json();
}

export async function getRelationshipSuggestions(
  nodeId: number
) {

  const response =
    await fetch(
      `${API_URL}/nodes/${nodeId}/relationship-suggestions`
    );

  return response.json();
}