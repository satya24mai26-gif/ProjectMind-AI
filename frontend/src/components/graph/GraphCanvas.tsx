"use client";

import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  NodeMouseHandler,
} from "reactflow";

import { useGraphStore } from "../../store/graphStore";

import ProjectMindNode from "./ProjectMindNode";

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

  const onNodeClick: NodeMouseHandler = (
    _,
    node
  ) => {
    setSelectedNode(node.id);
  };

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}