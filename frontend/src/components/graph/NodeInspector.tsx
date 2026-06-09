"use client";

import { ChangeEvent } from "react";

import { useGraphStore } from "../../store/graphStore";

import { updateNode as updateNodeApi } from "../../services/api";

import { deleteNode, getContext } from "@/services/api";

import { buildContext } from "../../services/contextBuilder";

import { getRelationshipSuggestions } from "@/services/api";

import { useState } from "react";

import { useEffect } from "react";

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

  const loadGraph = async () => {
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

    setNodes(flowNodes);
    setEdges(flowEdges);
    refreshAnalytics();
  };

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

    await loadGraph();
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
    `✓ ${added} Concepts Added`
  );

  setConceptSuggestions([]);

  await loadGraph();

};

  return (
    <div className="absolute top-0 right-0 w-[320px] h-full bg-white border-l p-4 z-20 shadow-lg overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold">Node Details</h2>

        <p className="text-sm text-gray-500">
          Edit and manage the selected node
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="text-sm text-gray-500 block mb-2">Title</label>

          <div>
            <label className="text-sm text-gray-500 block mb-2">
              Node Type
            </label>

            <select
              value={selectedNode.data.nodeType}
              onChange={(e) =>
                updateNode(selectedNode.id, {
                  nodeType: e.target.value,
                })
              }
              className="w-full border rounded px-5 py-2"
            >
              <option value="concept">Concept</option>

              <option value="technology">Technology</option>

              <option value="algorithm">Algorithm</option>

              <option value="component">Component</option>

              <option value="dataset">Dataset</option>

              <option value="paper">Paper</option>

              <option value="research_question">Research Question</option>
            </select>
          </div>

          <input
            type="text"
            value={selectedNode.data.title}
            onChange={handleTitleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="text-sm text-gray-500 block mb-2">
            Description
          </label>

          <textarea
            value={selectedNode.data.description}
            onChange={handleDescriptionChange}
            className="w-full border rounded px-3 py-2 min-h-[120px]"
          />
        </div>

        <div>
          <label className="text-sm text-gray-500 block mb-2">Tags</label>

          <input
            type="text"
            value={selectedNode.data.tags || ""}
            onChange={(e) =>
              updateNode(selectedNode.id, {
                tags: e.target.value,
              })
            }
            placeholder="faiss, embeddings, vector-search"
            className="w-full border rounded px-3 py-2"
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
            <label className="text-sm text-gray-500 block mb-2">Notes</label>

            <textarea
              value={selectedNode.data.notes || ""}
              onChange={(e) =>
                updateNode(selectedNode.id, {
                  notes: e.target.value,
                })
              }
              className="w-full border rounded px-3 py-2 min-h-[200px]"
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
              className="bg-black text-white px-4 py-2 rounded"
            >
              Save Node
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
              className="bg-red-500 text-white px-4 py-2 rounded ml-2"
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

                await loadGraph();

                setRelationshipSuggestions([]);

                setAcceptResult(
                  `✓ ${added} Relationships Added | ✓ ${existed} Already Existed`
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

                  await loadGraph();

                  setRelationshipSuggestions((prev) =>
                    prev.filter((_, i) => i !== index)
                  );

                  setAcceptResult("✓ Relationship Added");
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
