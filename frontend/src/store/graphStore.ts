import { create } from "zustand";

import { persist } from "zustand/middleware";

import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Connection,
  Edge,
  Node,
  OnEdgesChange,
  OnNodesChange,
} from "reactflow";

type GraphState = {
  nodes: Node[];
  edges: Edge[];

  analyticsRefresh: number;

  refreshAnalytics: () => void;
  

  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;

  addNode: () => void;

  onConnect: (connection: Connection) => void;

  clearGraph: () => void;

  selectedNodeId: string | null;

  setSelectedNode: (id: string | null) => void;

  setNodes: (nodes: Node[]) => void;

  setEdges: (edges: Edge[]) => void;

  addMessage: (
    nodeId: string,
    content: string
  ) => void;

  addAssistantMessage: (
    nodeId: string,
    content: string
  ) => void;

  updateNode: (
    id: string,
    data: {
      title?: string;
      description?: string;
      notes?: string;
      nodeType?: string;
      tags?:string;
    }
  ) => void;

selectedEdgeId: string | null;

setSelectedEdge: (
  id: string | null
) => void;

selectedProjectId: number;

setSelectedProjectId: (
  id: number
) => void;
  
};

export const useGraphStore = create<GraphState>()(
  persist(
    (set, get) => ({
      nodes: [],
      edges: [],
      selectedNodeId: null,

      setSelectedNode: (id) => {
        set({
          selectedNodeId: id,
        });
      },

      setNodes: (nodes) => {
        set({
          nodes,
        });
      },

      analyticsRefresh: 0,

      refreshAnalytics: () => {

        set({
          analyticsRefresh:
            get()
              .analyticsRefresh + 1
        });

      },

      setEdges: (edges) => {
        set({
          edges,
        });
      },

      addMessage: (nodeId, content) => {
        set({
          nodes: get().nodes.map((node) => {
            if (node.id !== nodeId) {
              return node;
            }
      
            return {
              ...node,
              data: {
                ...node.data,
                messages: [
                  ...node.data.messages,
                  {
                    id: crypto.randomUUID(),
                    role: "user",
                    content,
                    createdAt: new Date().toISOString(),
                  },
                ],
              },
            };
          }),
        });
      },

      updateNode: (id, data) => {
        set({
          nodes: get().nodes.map((node) => {
            if (node.id !== id) {
              return node;
            }
      
            return {
              ...node,
              data: {
                ...node.data,
                ...data,
              },
            };
          }),
        });
      },

      addAssistantMessage: (
        nodeId,
        content
      ) => {
        set({
          nodes: get().nodes.map((node) => {
            if (node.id !== nodeId) {
              return node;
            }
      
            return {
              ...node,
              data: {
                ...node.data,
                messages: [
                  ...node.data.messages,
                  {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content,
                    createdAt:
                      new Date().toISOString(),
                  },
                ],
              },
            };
          }),
        });
      },

      selectedEdgeId: null,

selectedProjectId: 0,

setSelectedProjectId: (
  id
) => {
  set({
    selectedProjectId: id,
  });
},

setSelectedEdge: (id) => {
  set({
    selectedEdgeId: id,
  });
      },
      

      onNodesChange: (changes) => {
        set({
          nodes: applyNodeChanges(changes, get().nodes),
        });
      },

      onEdgesChange: (changes) => {
        set({
          edges: applyEdgeChanges(changes, get().edges),
        });
      },

      onConnect: (connection) => {
        set({
          edges: addEdge(connection, get().edges),
        });
      },

      addNode: () => {
        const newNode: Node = {
          id: crypto.randomUUID(),

          position: {
            x: Math.random() * 500,
            y: Math.random() * 500,
          },

          data: {
            title: `Node ${get().nodes.length + 1}`,
            description: "Node description",
            tags: ["projectmind"],
            nodeType: "research",
            notes: "",
            messages: [],
          },

          type: "projectmind",
        };

        set({
          nodes: [...get().nodes, newNode],
        });
      },

      clearGraph: () => {
        set({
          nodes: [],
          edges: [],
        });
      },
    }),

    {
      name: "projectmind-graph-storage",
    }
  )
);