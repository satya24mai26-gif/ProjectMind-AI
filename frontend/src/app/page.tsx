"use client";

import GraphCanvas from "../components/graph/GraphCanvas";

import { useGraphStore } from "../store/graphStore";

import NodeInspector from "../components/graph/NodeInspector";

import EdgeInspector from "@/components/graph/EdgeInspector";

import NodeChat from "../components/chat/NodeChat";

import { getNodes, getRelationships } from "../services/api";

import { useEffect } from "react";

import { useState } from "react";

import ProjectSelector from "@/components/graph/ProjectSelector";

import ProjectDashboard from "@/components/graph/ProjectDashboard";

import ProjectChat from "@/components/project/ProjectChat";

import CreateNodeModal
from "@/components/graph/CreateNodeModal";

import AISettingsModal
from "@/components/graph/AISettingsModal";

import {
  getAISettings
}
from "@/services/api";

export default function Home() {
  const clearGraph = useGraphStore((state) => state.clearGraph);

  const selectedProjectId = useGraphStore((state) => state.selectedProjectId);

  const setNodes = useGraphStore((state) => state.setNodes);

  const nodes =
  useGraphStore(
    (state) => state.nodes
  );

  const [searchText, setSearchText] =
  useState("");

  const [nodeFilter, setNodeFilter] =
  useState("all");

  const [searchTerm, setSearchTerm] =
  useState("");

  const [
    showCreateNode,
    setShowCreateNode
  ] = useState(false);

  const [
    aiSettingsOpen,
    setAISettingsOpen
  ] = useState(false);

  const [
    aiSettings,
    setAISettings
  ] = useState({
    provider: "ollama",
    model: "qwen3:8b",
  });

  const refreshAnalytics =
  useGraphStore(
    (
      state
    ) =>
      state.refreshAnalytics
  );

  const loadAISettings =
    async () => {

      try {

        const data =
          await getAISettings();

        setAISettings(data);

      } catch (error) {

        console.error(error);

      }

    };


  const loadGraph = async () => {
    if (!selectedProjectId) {
      return;
    }
    const dbNodes = await getNodes(selectedProjectId);

    const dbRelationships = await getRelationships(selectedProjectId);

    const flowNodes = dbNodes.map((node: any, index: number) => ({
      id: String(node.id),

      position: {
        x: isNaN(Number(node.position_x)) ? 100 : Number(node.position_x),

        y: isNaN(Number(node.position_y)) ? 100 : Number(node.position_y),
      },

      type: "projectmind",

      data: {
        title: node.title,
        description: node.description,
        nodeType: node.node_type,
        notes: node.notes,
        tags: node.tags || "",
        messages: [],
      },
    }));

    const validNodeIds = new Set(flowNodes.map((node: any) => node.id));

    const safeRelationships = Array.isArray(dbRelationships)
      ? dbRelationships
      : [];

    const flowEdges = safeRelationships
      .filter(
        (relationship: any) =>
          validNodeIds.has(String(relationship.source_node_id)) &&
          validNodeIds.has(String(relationship.target_node_id))
      )
      .map((relationship: any) => ({
        id: String(relationship.id),
        source: String(relationship.source_node_id),
        target: String(relationship.target_node_id),
        label: relationship.relation_type,
      }));

    const filteredNodes =
      nodeFilter === "all"
        ? flowNodes
        : flowNodes.filter(
            (node: any) =>
              node.data.nodeType ===
              nodeFilter
          );
    
    setNodes(filteredNodes);
    setEdges(flowEdges);
  };

  useEffect(() => {
    loadGraph();
    loadAISettings();
  }, [
    selectedProjectId,
    nodeFilter
  ]);

  const setEdges = useGraphStore((state) => state.setEdges);

  const matchingNode =
  nodes.find(
    (node) =>
      node.data.title
        .toLowerCase()
        .includes(
          searchText
            .toLowerCase()
        )
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
        <div
          className="
          flex
          items-center
          gap-3
          "
        >
          <ProjectSelector />

          <div className="flex flex-col gap-2">

          <input
            value={searchText}
            onChange={(e) =>
              setSearchText(
                e.target.value
              )
            }
            placeholder="Search nodes..."
            className="
              border
              px-3
              py-2
              rounded
              w-64
            "
          />
          <div className="
        flex
        items-center
        gap-2
        
        ">
          <button
            className="
            bg-black
            text-white
            px-4
            py-2
            rounded
            "
            onClick={() => {

              if (!matchingNode) {
                return;
              }

              useGraphStore
                .getState()
                .setSelectedNode(
                  matchingNode.id
                );
            }}
          >
            Find
          </button>
  
          <button
            onClick={() =>
              setShowCreateNode(
                true
              )
            }
            className="
            bg-black
            text-white
            px-4
            py-2
            rounded
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
            "
          >
            Clear
          </button>
          </div>

          </div>

          <div>
          <select
            value={nodeFilter}
            onChange={(e) =>
              setNodeFilter(
                e.target.value
              )
            }
            className="border px-3 py-2 rounded"
          >
            <option value="all">
              All
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

            <option value="component">
              Component
            </option>

            <option value="dataset">
              Dataset
            </option>

            <option value="paper">
              Paper
            </option>

            <option value="research_question">
              Research Question
            </option>
          </select>

          <div>
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
          </div>
          </div>

          
        </div>

        <div
          className="
          flex
          items-center
          gap-3
          "
        >

          <div
            className="
            flex
            items-center
            gap-2
            px-3
            py-2
            rounded-lg
            bg-gray-100
            "
          >

            <span
              className="
              text-sm
              font-medium
              "
            >
              {aiSettings.provider}
            </span>

            <span
              className="
              text-xs
              text-gray-500
              "
            >
              {aiSettings.model}
            </span>

          </div>

          <button
            onClick={() =>
              setAISettingsOpen(
                true
              )
            }
            className="
            px-3
            py-2
            rounded-lg
            border
            hover:bg-gray-100
            "
          >
            ⚙ AI Settings
          </button>

        </div>
  
        <ProjectDashboard
          projectId={selectedProjectId}
        />

      </div>
  
      {/* Main Workspace */}
      <div
        className="
        flex-1
        flex
        overflow-hidden
        "
      >
        <div
          className="
          flex-1
          relative
          "
        >
          <GraphCanvas />

          <div
            className="
            absolute
            top-4
            left-4
            w-87.5
            z-20
            "
          >
            {selectedProjectId && (
              <ProjectChat
                projectId={selectedProjectId}
              />
            )}
          </div>

          <NodeChat />
          <EdgeInspector />
          <NodeInspector />
          
        </div>
      </div>

      <CreateNodeModal
        projectId={
          selectedProjectId
        }

        open={
          showCreateNode
        }

        onClose={() =>
          setShowCreateNode(
            false
          )
        }

        onCreated={
          async () => {

            await loadGraph();

            useGraphStore
              .getState()
              .refreshAnalytics();

          }
        }
      />

      <AISettingsModal

      open={
        aiSettingsOpen
      }

      onClose={() => {

        setAISettingsOpen(
          false
        );

        loadAISettings();

      }}

      />
  
    </main>
  );
    
}
