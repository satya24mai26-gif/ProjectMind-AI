"use client";

import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  NodeMouseHandler,
} from "reactflow";

import { useGraphStore } from "../../store/graphStore";

import ProjectMindNode from "./ProjectMindNode";

import {
  createRelationship
} from "../../services/api";

import {
  updateNodePosition
} from "@/services/api";

const nodeTypes = {
  projectmind: ProjectMindNode,
};

export default function GraphCanvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
  } = useGraphStore();
  
  const setSelectedNode = useGraphStore(
    (state) => state.setSelectedNode
  );

  const selectedProjectId =
  useGraphStore(
    (state) =>
      state.selectedProjectId
  );

  const setSelectedEdge =
  useGraphStore(
    (state) =>
      state.setSelectedEdge
  );

  const setEdges = useGraphStore(
    (state) => state.setEdges
  );

  const onNodeClick: NodeMouseHandler = (
    _,
    node
  ) => {
    setSelectedNode(node.id);
  };
  

  const handleConnect =
  async (connection: any) => {
  
    const relationship =
      await createRelationship(
        Number(connection.source),
        Number(connection.target),
        "references",
        selectedProjectId
      );

      console.log("CONNECTION", connection);
      console.log("DB RELATIONSHIP", relationship);
  
    setEdges([
      ...edges,
      {
        id: String(relationship.id),
        source: String(
          relationship.source_node_id
        ),
        target: String(
          relationship.target_node_id
        ),
        label: relationship.relation_type,
      },
    ]);
  };

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onNodesChange={onNodesChange}
        onEdgeClick={(_, edge) => {
          setSelectedEdge(edge.id);
        }}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect
          
        }
        fitView
        onNodeDragStop={
          async (_, node) => {
        
            await updateNodePosition(
              Number(node.id),
              node.position.x,
              node.position.y
            );
        
          }
        }
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}