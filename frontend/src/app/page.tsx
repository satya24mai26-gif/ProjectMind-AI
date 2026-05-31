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
  console.log(
    "Relationships:",
    dbRelationships
  );
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

    await createNode(
      `Node ${Date.now()}`,
      selectedProjectId
    );

    await loadGraph();
  };

  const setEdges = useGraphStore(
    (state) => state.setEdges
  );

  

  return (
    <main className="w-screen h-screen relative">
      
      <div className="absolute top-4 left-4 z-10 flex gap-2">
      <ProjectSelector />
        <button
          onClick={handleCreateNode}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Add Node
        </button>

        <button
          onClick={clearGraph}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Clear
        </button>
      </div>

      <GraphCanvas />
      <NodeChat />
      <EdgeInspector />
      <NodeInspector />
    </main>
  );
}