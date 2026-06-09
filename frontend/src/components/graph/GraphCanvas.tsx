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


  

  return (
    <div className="w-full h-full">
      <div className="flex gap-3 mb-4">
      <input
        type="text"
        placeholder="Search nodes..."
        value={searchTerm}
        onChange={(e) =>
          setSearchTerm(e.target.value)
        }
        className="
        border
        rounded
        px-3
        py-2
        w-full
        mb-4
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
        border
        rounded
        px-3
        py-2
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
        edges={filteredEdges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onNodesChange={onNodesChange}
        onEdgeClick={(_, edge) => {
          setSelectedNode(null);

          setSelectedEdge(edge.id);
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
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
