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

  const setSelectedEdge =
  useGraphStore(
    (state) =>
      state.setSelectedEdge
  );

  const onNodeClick: NodeMouseHandler = (
    _,
    node
  ) => {
    setSelectedNode(node.id);
  };

  const handleConnect =
  async (connection: any) => {

    onConnect(connection);

    await createRelationship(
      Number(connection.source),
      Number(connection.target),
      "references"
    );
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
        onConnect={handleConnect}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}