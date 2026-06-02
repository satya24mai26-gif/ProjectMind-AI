"use client";

import GraphCanvas from "../components/graph/GraphCanvas";

import { useGraphStore } from "../store/graphStore";

import NodeInspector from "../components/graph/NodeInspector";

import EdgeInspector from "@/components/graph/EdgeInspector";

import NodeChat from "../components/chat/NodeChat";

import {
  createNode,
  getNodes,
  getRelationships
} from "../services/api";

import { useEffect } from "react";

import ProjectSelector from "@/components/graph/ProjectSelector";

import ProjectDashboard
from "@/components/graph/ProjectDashboard";

import ProjectChat
from "@/components/project/ProjectChat";

export default function Home() {

  const clearGraph = useGraphStore(
    (state) => state.clearGraph
  );

  const selectedProjectId =
  useGraphStore(
    (state) =>
      state.selectedProjectId
  );

  const setNodes = useGraphStore(
    (state) => state.setNodes
  );

  useEffect(() => {
    loadGraph();
  }, [selectedProjectId]);

  const loadGraph = async () => {
  const dbNodes = await getNodes(selectedProjectId);

  const dbRelationships = await getRelationships(selectedProjectId);
  
  const flowNodes = dbNodes.map(
    (node: any, index: number) => ({
      id: String(node.id),

      position: {
        x: isNaN(Number(node.position_x))
          ? 100
          : Number(node.position_x),
      
        y: isNaN(Number(node.position_y))
          ? 100
          : Number(node.position_y),
      },

      type: "projectmind",

      data: {
        title: node.title,
        description:
          node.description,
        nodeType:
          node.node_type,
        notes: node.notes,
        tags: [],
        messages: [],
      },
    })
  );

  const validNodeIds =
  new Set(
    flowNodes.map(
      (node: any) => node.id
    )
  );

  const safeRelationships =
  Array.isArray(
    dbRelationships
  )
    ? dbRelationships
    : [];

  const flowEdges =
  safeRelationships.filter(
    (relationship: any) =>
      validNodeIds.has(
        String(
          relationship.source_node_id
        )
      ) &&
      validNodeIds.has(
        String(
          relationship.target_node_id
        )
      )
  )
  .map(
    (relationship: any) => ({
      id: String(relationship.id),
      source: String(
        relationship.source_node_id
      ),
      target: String(
        relationship.target_node_id
      ),
      label: relationship.relation_type,
    })
  );

  
  
    setNodes(flowNodes);
    setEdges(flowEdges);
  };
  
  const handleCreateNode =
  async () => {
    const title =
    prompt("Node Title");
  
    if (!title) {
       return;
    }

    await createNode(
      title,
      selectedProjectId
    );

    await loadGraph();
  };

  const setEdges = useGraphStore(
    (state) => state.setEdges
  );

  

  return (
    <main className="w-screen h-screen flex flex-col bg-gray-100">
  
      {/* Top Toolbar */}
      <div
        className="
        flex
        items-center
        justify-between
        px-4
        py-3
        bg-white
        border-b
        shadow-sm
        z-20
        "
      >
  
        {/* Left Side */}
        <div
          className="
          flex
          items-center
          gap-3
          "
        >
          <ProjectSelector />
  
          <button
            onClick={handleCreateNode}
            className="
            bg-black
            text-white
            px-4
            py-2
            rounded
            hover:bg-gray-800
            "
          >
            Add Node
          </button>
  
          <button
            onClick={clearGraph}
            className="
            bg-red-500
            text-white
            px-4
            py-2
            rounded
            hover:bg-red-600
            "
          >
            Clear
          </button>
        </div>
  
        {/* Right Side */}
        <ProjectDashboard
          projectId={selectedProjectId}
        />
        
  
      </div>

      {
  selectedProjectId && (
    <ProjectChat
      projectId={
        selectedProjectId
      }
    />
  )
}
  
      {/* Graph Area */}
      <div
        className="
        flex-1
        relative
        "
      >
        <GraphCanvas />
        <NodeChat />
        <EdgeInspector />
        <NodeInspector />
      </div>
  
    </main>
  );
}