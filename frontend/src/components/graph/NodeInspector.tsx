"use client";

import { ChangeEvent } from "react";

import { useGraphStore } from "../../store/graphStore";

import { updateNode as updateNodeApi } from "../../services/api";

import { deleteNode, getContext, repairNode } from "@/services/api";

import { buildContext } from "../../services/contextBuilder";

import { getRelationshipSuggestions } from "@/services/api";

import { useState } from "react";


import { createRelationship } from "../../services/api";

import { createNode, getNodes, getRelationships, getConceptSuggestions } from "@/services/api";

export default function NodeInspector() {
  const setNodes = useGraphStore((state) => state.setNodes);

  const setEdges = useGraphStore((state) => state.setEdges);

  const [relationshipSuggestions, setRelationshipSuggestions] = useState<any[]>(
    []
  );

  const [acceptResult, setAcceptResult] = useState("");

  const nodes = useGraphStore((state) => state.nodes);

  const refreshAnalytics =
  useGraphStore(
    (
      state
    ) =>
      state.refreshAnalytics
  );

  const selectedProjectId = useGraphStore((state) => state.selectedProjectId);

  const selectedNodeId = useGraphStore((state) => state.selectedNodeId);

  const [
    conceptSuggestions,
    setConceptSuggestions
  ] = useState<string[]>([]);

  const [
    conceptResult,
    setConceptResult
  ] = useState("");
  
  const [
    loadingConcepts,
    setLoadingConcepts
  ] = useState(false);

  const [
    repairing,
    setRepairing
  ] = useState(false);

  const triggerGraphRefresh =
  useGraphStore(
    (state) =>
      state.triggerGraphRefresh
  );




  const updateNode = useGraphStore((state) => state.updateNode);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  const edges = useGraphStore((state) => state.edges);

  if (!selectedNode) {
    return null;
  }

  const context = buildContext(selectedNode, edges, nodes);

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    updateNode(selectedNode.id, {
      title: e.target.value,
    });
  };

  const handleDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    updateNode(selectedNode.id, {
      description: e.target.value,
    });
  };

  const generateConcepts =
  async () => {

    if (!selectedNode) {
      return;
    }

    setLoadingConcepts(true);

    try {

      const result =
        await getConceptSuggestions(
          Number(
            selectedNode.id
          )
        );

      setConceptSuggestions(
        result.concepts || []
      );

    } catch (error) {

      console.error(error);

    } finally {

      setLoadingConcepts(false);

    }

  };
  const addConcept =
  async (
    concept: string
  ) => {

    await createNode(
      {
        title: concept,

        description: "",

        node_type:
          "concept",

        notes: "",

        project_id:
          selectedProjectId,
      }
    );

    setConceptSuggestions(
      (prev) =>
        prev.filter(
          (c) =>
            c !== concept
        )
    );

    triggerGraphRefresh();
  };

  const acceptAllConcepts =
async () => {

  let added = 0;

  for (
    const concept
    of conceptSuggestions
  ) {

    try {

      await createNode({
        title: concept,

        description: "",

        node_type:
          "concept",

        notes: "",

        project_id:
          selectedProjectId,
      });

      added++;

    } catch (error) {

      console.error(error);

    }

  }

  setConceptResult(
    `${added} concepts added`
  );

  setConceptSuggestions([]);

  triggerGraphRefresh();

};

  return (
    <div className="absolute right-0 top-0 z-20 h-full w-[320px] overflow-y-auto border-l border-slate-200 bg-white p-4 shadow-2xl">
      <div className="mb-6 border-b border-slate-200 pb-4">
        <h2 className="text-lg font-semibold text-slate-950">Node Details</h2>

        <p className="text-sm text-slate-500">
          Edit and manage the selected node
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-600">Title</label>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">
              Node Type
            </label>

            <select
              value={selectedNode.data.nodeType}
              onChange={(e) =>
                updateNode(selectedNode.id, {
                  nodeType: e.target.value,
                })
              }
              className="mb-3 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            >
              <option value="concept">Concept</option>

              <option value="technology">Technology</option>

              <option value="algorithm">Algorithm</option>

              <option value="component">Component</option>

              <option value="dataset">Dataset</option>

              <option value="paper">Paper</option>

              <option value="research_question">Research Question</option>

              {!["concept", "technology", "algorithm", "component", "dataset", "paper", "research_question"].includes(selectedNode.data.nodeType) && (
                <option value={selectedNode.data.nodeType}>
                  {selectedNode.data.nodeType || "Unknown Type"}
                </option>
              )}
            </select>
          </div>

          <input
            type="text"
            value={selectedNode.data.title}
            onChange={handleTitleChange}
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-600">
            Description
          </label>

          <textarea
            value={selectedNode.data.description}
            onChange={handleDescriptionChange}
            className="min-h-[120px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-600">Tags</label>

          <input
            type="text"
            value={selectedNode.data.tags || ""}
            onChange={(e) =>
              updateNode(selectedNode.id, {
                tags: e.target.value,
              })
            }
            placeholder="faiss, embeddings, vector-search"
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
          />

          <div className="flex gap-2 flex-wrap mt-2">
            {String(selectedNode.data.tags || "")
              .split(",")
              .filter((tag: string) => tag.trim())
              .map((tag: string) => (
                <span
                  key={tag}
                  className="
                  bg-blue-100
                  text-blue-800
                  px-2
                  py-1
                  rounded
                  text-xs
                  "
                >
                  {tag.trim()}
                </span>
              ))}
          </div>
        </div>

        <div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">Notes</label>

            <textarea
              value={selectedNode.data.notes || ""}
              onChange={(e) =>
                updateNode(selectedNode.id, {
                  notes: e.target.value,
                })
              }
              className="min-h-[180px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={async () => {
                await updateNodeApi(Number(selectedNode.id), {
                  title: selectedNode.data.title,

                  description: selectedNode.data.description,

                  node_type: selectedNode.data.nodeType,

                  notes: selectedNode.data.notes,

                  tags: selectedNode.data.tags,
                });

                refreshAnalytics();

                setAcceptResult("Saved");
              }}
              className="rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Save Node
            </button>

            <button

              onClick={async () => {

                setRepairing(true);

                
                const repaired =
                  await repairNode(
                    Number(selectedNode.id)
                  );

                  setNodes(
                    nodes.map(node =>
                      node.id === selectedNode.id
                        ? {
                            ...node,
                            data: {
                              ...node.data,
                              description:
                                repaired.node.description,
                              notes:
                                repaired.node.notes,
                              tags:
                                repaired.node.tags,
                              nodeType:
                                repaired.node.node_type
                            }
                          }
                        : node
                    )
                  )

                console.log(
                  "AFTER REPAIR",
                  repaired.node
                );

                console.log(
                  "CURRENT NODE",
                  selectedNode.data
                );

                triggerGraphRefresh();

                setRepairing(false);

              }}

              className="
              w-full
              bg-violet-600
              hover:bg-violet-700
              text-white
              py-2
              rounded-lg
              font-medium
              "
            >

              {
                repairing
                  ? "Repairing..."
                  : "🧠 AI Repair Node"
              }

            </button>

            <button
              onClick={async () => {
                await deleteNode(Number(selectedNode.id));

                setNodes(nodes.filter((node) => node.id !== selectedNode.id));

                setEdges(
                  edges.filter(
                    (edge) =>
                      edge.source !== selectedNode.id &&
                      edge.target !== selectedNode.id
                  )
                );

                refreshAnalytics();
              }}
              className="rounded-md border border-rose-200 bg-rose-50 px-4 text-sm font-medium text-rose-700 hover:bg-rose-100"
            >
              Delete Node
            </button>
          </div>

          <button
            onClick={async () => {
              const result = await getContext(Number(selectedNode.id));

              setAcceptResult(result.context);
            }}
            className="
    bg-blue-500
    text-white
    px-4
    py-2
    rounded
    mt-4
  "
          >
            Show Context
          </button>

          <button
            onClick={async () => {
              const result = await getRelationshipSuggestions(
                Number(selectedNode.id)
              );
              try {
                setRelationshipSuggestions(JSON.parse(result.suggestions));
              } catch (error) {
                console.error(error);

                alert("AI returned invalid JSON");
              }
              console.log(result.suggestions);
            }}
            className="
              bg-purple-600
              text-white
              px-4
              py-2
              rounded
              mt-2
              w-full
            "
          >
            Generate AI Relationships
          </button>

          {relationshipSuggestions.length > 0 && (
            <button
              className="
                bg-green-700
                text-white
                px-4
                py-2
                rounded
                mt-3
                w-full
                "
              onClick={async () => {
                let added = 0;
                let existed = 0;

                for (const suggestion of relationshipSuggestions) {
                  const sourceNode = nodes.find(
                    (n) => n.data.title === suggestion.source
                  );

                  const targetNode = nodes.find(
                    (n) => n.data.title === suggestion.target
                  );

                  if (!sourceNode || !targetNode) {
                    continue;
                  }

                  try {
                    const result = await createRelationship(
                      Number(sourceNode.id),
                      Number(targetNode.id),
                      suggestion.relationship,
                      selectedProjectId
                    );

                    refreshAnalytics();

                    if (result?.message?.toLowerCase().includes("already")) {
                      existed++;
                    } else {
                      added++;
                    }
                  } catch {
                    existed++;
                  }
                }

                triggerGraphRefresh();

                setRelationshipSuggestions([]);

                setAcceptResult(
                  `${added} relationships added | ${existed} already existed`
                );
              }}
            >
              Accept All
            </button>
          )}

          {acceptResult && (
            <div
              className="
                mt-3
                p-3
                rounded
                border
              bg-green-50
              border-green-300
              text-green-800
                "
            >
              {acceptResult}
            </div>
          )}

          {relationshipSuggestions.map((suggestion, index) => (
            <div
              key={index}
              className="
                border
                rounded
                p-2
                mt-2
              "
            >
              <div>
                {suggestion.source}
                {" -> "}
                {suggestion.relationship}
                {" -> "}
                {suggestion.target}
              </div>

              <button
                className="
            bg-green-600
            text-white
            px-3
            py-1
            rounded
            mt-2
          "
                onClick={async () => {
                  const sourceNode = nodes.find(
                    (n) => n.data.title === suggestion.source
                  );

                  const targetNode = nodes.find(
                    (n) => n.data.title === suggestion.target
                  );

                  if (!sourceNode || !targetNode) {
                    return;
                  }

                  await createRelationship(
                    Number(sourceNode.id),
                    Number(targetNode.id),
                    suggestion.relationship,
                    selectedProjectId
                  );

                  triggerGraphRefresh();

                  setRelationshipSuggestions((prev) =>
                    prev.filter((_, i) => i !== index)
                  );

                  setAcceptResult("Relationship added");
                }}
              >
                Accept
              </button>
            </div>
          ))}

          <div
            className="
            mt-6
            border-t
            pt-4
            "
          >
            <div
              className="
              flex
              items-center
              justify-between
              mb-3
              "
            >
              <div
                className="
                flex
                justify-between
                items-center
                "
              >

                <h3
                  className="
                  font-semibold
                  text-gray-800
                  "
                >
                  AI Concept Expansion
                </h3>

                {
                  conceptSuggestions.length > 0 && (

                    <button
                      onClick={
                        acceptAllConcepts
                      }
                      className="
                      bg-green-600
                      hover:bg-green-700
                      text-white
                      px-3
                      py-2
                      rounded-lg
                      text-sm
                      "
                    >
                      Accept All
                    </button>

                  )
                }

              </div>

              {
                conceptResult && (

                  <div
                    className="
                    mt-3
                    p-3
                    rounded-lg
                    border
                    border-green-300
                    bg-green-50
                    text-green-700
                    "
                  >
                    {conceptResult}
                  </div>

                )
              }

              <button
                onClick={generateConcepts}
                disabled={loadingConcepts}
                className="
                bg-purple-600
                hover:bg-purple-700
                text-white
                px-4
                py-2
                rounded-lg
                text-sm
                "
              >
                {loadingConcepts ? "Generating..." : "Generate Concepts"}
              </button>
            </div>

            {conceptSuggestions.length > 0 && (
              <div
                className="
                  border
                  rounded-lg
                  bg-gray-50
                  p-3
                  space-y-2
                  "
              >
                {conceptSuggestions.map((concept) => (
                  <div
                    key={concept}
                    className="
                          flex
                          items-center
                          justify-between
                          bg-white
                          border
                          rounded-lg
                          px-3
                          py-2
                          "
                  >
                    <span
                      className="
                            font-medium
                            "
                    >
                      {concept}
                    </span>

                    <button
                      onClick={() => addConcept(concept)}
                      className="
                            bg-green-600
                            hover:bg-green-700
                            text-white
                            px-3
                            py-1
                            rounded
                            text-sm
                            "
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
