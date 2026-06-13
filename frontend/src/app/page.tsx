"use client";

import { useEffect, useState } from "react";

import EdgeInspector from "@/components/graph/EdgeInspector";
import AISettingsModal from "@/components/graph/AISettingsModal";
import CreateNodeModal from "@/components/graph/CreateNodeModal";
import GraphCanvas from "@/components/graph/GraphCanvas";
import NodeInspector from "@/components/graph/NodeInspector";
import ProjectDashboard from "@/components/graph/ProjectDashboard";
import ProjectSelector from "@/components/graph/ProjectSelector";
import NodeChat from "@/components/chat/NodeChat";
import ProjectChat from "@/components/project/ProjectChat";
import { getAISettings, getNodes, getRelationships } from "@/services/api";
import { useGraphStore } from "@/store/graphStore";

const nodeTypes = [
  { value: "all", label: "All types" },
  { value: "concept", label: "Concept" },
  { value: "technology", label: "Technology" },
  { value: "algorithm", label: "Algorithm" },
  { value: "component", label: "Component" },
  { value: "dataset", label: "Dataset" },
  { value: "paper", label: "Paper" },
  { value: "research_question", label: "Research question" },
];

export default function Home() {
  const clearGraph = useGraphStore((state) => state.clearGraph);
  const selectedProjectId = useGraphStore((state) => state.selectedProjectId);
  const setNodes = useGraphStore((state) => state.setNodes);
  const setEdges = useGraphStore((state) => state.setEdges);
  const nodes = useGraphStore((state) => state.nodes);
  const refreshAnalytics = useGraphStore((state) => state.refreshAnalytics);

  const [searchText, setSearchText] = useState("");
  const [nodeFilter, setNodeFilter] = useState("all");
  const [showCreateNode, setShowCreateNode] = useState(false);
  const [aiSettingsOpen, setAISettingsOpen] = useState(false);
  const [aiSettings, setAISettings] = useState({
    provider: "ollama",
    model: "qwen3:8b",
  });



  const loadAISettings = async () => {
    try {
      const data = await getAISettings();
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

    const flowNodes = dbNodes.map((node: any) => ({
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
      animated: true,

      style: {
        strokeWidth: 2,
        stroke: "#94a3b8",
      },

      labelStyle: {
        fontSize: 11,
        fontWeight: 600,
        fill: "#475569",
      },

      labelBgStyle: {
        fill: "#ffffff",
        fillOpacity: 0.95,
      },

      labelBgPadding: [6, 3],

      labelBgBorderRadius: 8,
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

      console.log(
        "DB RELATIONSHIPS",
        dbRelationships.length
      );
      
      console.log(
        "FLOW EDGES",
        flowEdges.length
      );

    const filteredNodes =
      nodeFilter === "all"
        ? flowNodes
        : flowNodes.filter((node: any) => node.data.nodeType === nodeFilter);

    setNodes(filteredNodes);
    setEdges(flowEdges);
  };

  const refreshGraph =
useGraphStore(
  (state) =>
    state.refreshGraph
);

  useEffect(() => {
    console.log(
      "REFRESH GRAPH:",
      refreshGraph
    );
    loadGraph();
  
    loadAISettings();
  }, [selectedProjectId, nodeFilter, refreshGraph]);

  const matchingNode = nodes.find((node) =>
    node.data.title.toLowerCase().includes(searchText.toLowerCase())
  );

  const selectedNodeId = useGraphStore((state) => state.selectedNodeId);
  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-[#f5f7fb] text-slate-900">
      <header className="z-20 flex min-h-[88px] items-center gap-4 border-b border-slate-200 bg-white/95 px-5 shadow-sm">
        <div className="min-w-[210px]">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-cyan-700">
            ProjectMind AI
          </div>
          <div className="text-lg font-semibold text-slate-950">
            Graph RAG Workspace
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <ProjectSelector />

          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Find a node"
            className="h-10 w-56 rounded-md border border-slate-300 bg-slate-50 px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
          />

          <button
            className="h-10 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50"
            onClick={() => {
              if (!matchingNode) {
                return;
              }

              useGraphStore.getState().setSelectedNode(matchingNode.id);
            }}
          >
            Find
          </button>

          <button
            onClick={() => setShowCreateNode(true)}
            className="h-10 rounded-md bg-cyan-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700"
          >
            Add Node
          </button>

          <select
            value={nodeFilter}
            onChange={(e) => setNodeFilter(e.target.value)}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
          >
            {nodeTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="text-sm font-medium text-slate-900">
              {aiSettings.provider}
            </div>
            <div className="text-xs text-slate-500">{aiSettings.model}</div>
          </div>

          <button
            onClick={() => setAISettingsOpen(true)}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-50"
          >
            AI Settings
          </button>

          <button
            onClick={clearGraph}
            className="h-10 rounded-md border border-rose-200 bg-rose-50 px-3 text-sm font-medium text-rose-700 hover:bg-rose-100"
          >
            Clear
          </button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-[360px_minmax(0,1fr)] overflow-hidden">
        <aside className="overflow-y-auto border-r border-slate-200 bg-white p-4">
          <div className="mb-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Project Copilot
            </div>
            <div className="mt-1 text-sm text-slate-600">
              Ask across the graph, find gaps, and promote useful missing concepts.
            </div>
          </div>

          {selectedProjectId && <ProjectChat projectId={selectedProjectId} />}

          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
            <div className="mb-3 text-sm font-semibold text-slate-900">
              Graph Health
            </div>
            <ProjectDashboard projectId={selectedProjectId} />
          </div>
        </aside>

        <section className="relative min-w-0 bg-slate-100">
          <GraphCanvas />
          {selectedNode !== null && (
            <NodeChat />
          )}
          <EdgeInspector />
          <NodeInspector />
        </section>
      </div>

      <CreateNodeModal
        projectId={selectedProjectId}
        open={showCreateNode}
        onClose={() => setShowCreateNode(false)}
        onCreated={async () => {
          await loadGraph();
          refreshAnalytics();
        }}
      />

      <AISettingsModal
        open={aiSettingsOpen}
        onClose={() => {
          setAISettingsOpen(false);
          loadAISettings();
        }}
      />
    </main>
  );
}
