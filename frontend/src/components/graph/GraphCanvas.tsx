"use client";

import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  NodeMouseHandler,
} from "reactflow";

import { useGraphStore } from "../../store/graphStore";

import ProjectMindNode from "./ProjectMindNode";

import { createRelationship } from "../../services/api";

import { updateNodePosition } from "@/services/api";

import { useEffect, useState } from "react";

const nodeTypes = {
  projectmind: ProjectMindNode,
};

export default function GraphCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } =
    useGraphStore();

  const setSelectedNode = useGraphStore((state) => state.setSelectedNode);

  const selectedProjectId = useGraphStore((state) => state.selectedProjectId);

  const setSelectedEdge = useGraphStore((state) => state.setSelectedEdge);

  const setEdges = useGraphStore((state) => state.setEdges);

  const [hoveredNode, setHoveredNode] =
  useState<string | null>(null);

  const [
    hoveredEdge,
    setHoveredEdge
  ] = useState<string | null>(null);

  const onNodeClick: NodeMouseHandler = (_, node) => {
    setSelectedEdge(null);

    setSelectedNode(node.id);
  };

  const refreshAnalytics =
  useGraphStore(
    (
      state
    ) =>
      state.refreshAnalytics
  );


  const handleConnect = async (connection: any) => {
    const relationship = await createRelationship(
      Number(connection.source),
      Number(connection.target),
      "references",
      selectedProjectId
    );

    refreshAnalytics();

    if (relationship.message) {
      alert(relationship.message);
      return;
    }

    console.log("CONNECTION", connection);
    console.log("DB RELATIONSHIP", relationship);

    setEdges([
      ...edges,
      {
        id: String(relationship.id),
        source: String(relationship.source_node_id),
        target: String(relationship.target_node_id),
        label: relationship.relation_type,
      },
    ]);
  };

  const [searchTerm, setSearchTerm] =
  useState("");

  const [typeFilter, setTypeFilter] =
  useState("all");
  

  const filteredNodes =
  nodes.filter((node: any) => {
  
    const search =
      searchTerm.toLowerCase();
  
    const matchesSearch =
      node.data.title
        ?.toLowerCase()
        .includes(search)
  
      ||
  
      node.data.description
        ?.toLowerCase()
        .includes(search)
  
      ||
  
      String(
        node.data.tags || ""
      )
        .toLowerCase()
        .includes(search);
  
    const matchesType =
      typeFilter === "all"
      ||
      node.data.nodeType ===
      typeFilter;
  
    return (
      matchesSearch
      &&
      matchesType
    );
  });

  const visibleNodeIds =
  new Set(
    filteredNodes.map(
      (node) => node.id
    )
  );

const filteredEdges =
  edges.filter(
    (edge) =>
      visibleNodeIds.has(
        edge.source
      ) &&
      visibleNodeIds.has(
        edge.target
      )
  );

  const enhancedEdges =
  edges.map((edge) => {

    const outgoing =
      edge.source === hoveredNode;

    const incoming =
      edge.target === hoveredNode;

    const edgeHovered =
      hoveredEdge === edge.id;

    return {

      ...edge,

      animated:
        outgoing ||
        incoming ||
        edgeHovered,

      style: {

        strokeWidth:
          edgeHovered
            ? 6
            : outgoing || incoming
            ? 4
            : 2,

        stroke:
          edgeHovered
            ? "#8b5cf6"     // Purple
            : outgoing
            ? "#3b82f6"     // Blue
            : incoming
            ? "#00FF00"     // Red
            : "#94a3b8",    // Gray

        filter:
          edgeHovered
            ? "drop-shadow(0 0 8px #8b5cf6)"
            : outgoing
            ? "drop-shadow(0 0 5px #3b82f6)"
            : incoming
            ? "drop-shadow(0 0 5px #00FF00)"
            : "none",

        transition:
          "all 0.2s ease",

      },

    };

  });
  

  return (
    <div className="relative h-full w-full">
      <div className="absolute left-4 top-4 z-10 flex w-[min(560px,calc(100%-32px))] gap-2 rounded-lg border border-slate-200 bg-white/95 p-2 shadow-lg">
      <input
        type="text"
        placeholder="Search nodes..."
        value={searchTerm}
        onChange={(e) =>
          setSearchTerm(e.target.value)
        }
        className="
        h-10
        min-w-0
        flex-1
        rounded-md
        border
        border-slate-300
        bg-slate-50
        px-3
        text-sm
        outline-none
        focus:border-cyan-500
        focus:ring-2
        focus:ring-cyan-100
        "
      />

      <select
        value={typeFilter}
        onChange={(e) =>
          setTypeFilter(
            e.target.value
          )
        }
        className="
        h-10
        rounded-md
        border
        border-slate-300
        bg-white
        px-3
        text-sm
        outline-none
        focus:border-cyan-500
        focus:ring-2
        focus:ring-cyan-100
        "
      >
        <option value="all">
          All Types
        </option>

        <option value="concept">
          Concept
        </option>

        <option value="technology">
          Technology
        </option>

        <option value="algorithm">
          Algorithm
        </option>

        <option value="paper">
          Paper
        </option>
      </select>
      </div>

      <ReactFlow
        nodes={filteredNodes}
        edges={enhancedEdges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onNodesChange={onNodesChange}
        onEdgeClick={(_, edge) => {
          setSelectedNode(null);

          setSelectedEdge(edge.id);
        }}
        onPaneClick={() => {

          setSelectedNode(null);
        
          setSelectedEdge(null);
        
        }}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        fitView
        onNodeDragStop={async (_, node) => {
          await updateNodePosition(
            Number(node.id),
            node.position.x,
            node.position.y
          );
        }}

        onNodeMouseEnter={(_, node) => {
          setHoveredNode(node.id);
        }}
        
        onNodeMouseLeave={() => {
          setHoveredNode(null);
        }}

        onEdgeMouseEnter={(_, edge) => {

          setHoveredEdge(
            edge.id
          );
        
        }}
        
        onEdgeMouseLeave={() => {
        
          setHoveredEdge(
            null
          );
        
        }}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
