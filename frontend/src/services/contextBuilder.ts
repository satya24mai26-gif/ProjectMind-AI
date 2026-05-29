export function buildContext(
    node: any,
    edges: any[],
    nodes: any[]
  ) {
  
    const outgoingEdges =
      edges.filter(
        (edge) =>
          edge.source === node.id
      );
  
    const incomingEdges =
      edges.filter(
        (edge) =>
          edge.target === node.id
      );
  
    return {
      node: {
        id: node.id,
        title: node.data.title,
        description:
          node.data.description,
        type:
          node.data.nodeType,
      },
  
      notes:
        node.data.notes,
  
      messages:
        node.data.messages,
  
      outgoingRelations:
        outgoingEdges.map(
          (edge) => {
  
            const target =
              nodes.find(
                (n) =>
                  n.id === edge.target
              );
  
            return {
              type:
                edge.label,
  
              target:
                target?.data.title,
            };
  
          }
        ),
  
      incomingRelations:
        incomingEdges.map(
          (edge) => {
  
            const source =
              nodes.find(
                (n) =>
                  n.id === edge.source
              );
  
            return {
              type:
                edge.label,
  
              source:
                source?.data.title,
            };
  
          }
        ),
    };
  }