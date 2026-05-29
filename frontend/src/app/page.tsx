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

export default function Home() {

  const clearGraph = useGraphStore(
    (state) => state.clearGraph
  );

  const setNodes = useGraphStore(
    (state) => state.setNodes
  );

  useEffect(() => {loadNodes();
  }, []);

  const loadNodes = async () => {
  const dbNodes = await getNodes();

  const dbRelationships = await getRelationships();

  const flowNodes = dbNodes.map(
    (node: any, index: number) => ({
      id: String(node.id),

      position: {
        x: 200 * index,
        y: 100,
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
      (node) => node.id
    )
  );
  const flowEdges =
  dbRelationships.filter(
    (relationship) =>
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
      id:
        `edge-${relationship.id}`,

      source:
        String(
          relationship.source_node_id
        ),

      target:
        String(
          relationship.target_node_id
        ),

      label:
        relationship.relation_type,
    })
  );

  
  
    setNodes(flowNodes);
    setEdges(flowEdges);
  };
  
  const handleCreateNode =
  async () => {

    await createNode(
      `Node ${Date.now()}`
    );

    await loadNodes();
  };

  const setEdges = useGraphStore(
    (state) => state.setEdges
  );

  

  return (
    <main className="w-screen h-screen relative">
      <div className="absolute top-4 left-4 z-10 flex gap-2">
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