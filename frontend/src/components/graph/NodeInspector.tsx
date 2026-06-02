"use client";

import { ChangeEvent } from "react";

import { useGraphStore } from "../../store/graphStore";

import {
  updateNode as updateNodeApi
} from "../../services/api";

import {
  deleteNode, getContext
} from "@/services/api";

import {
  buildContext,
} from "../../services/contextBuilder";

import {
  getRelationshipSuggestions
} from "@/services/api";

import { useState } from "react";

import {
  createRelationship
} from "../../services/api";

import {
  createNode,
  getNodes,
  getRelationships
} from "@/services/api";

export default function NodeInspector() {

  const setNodes =
  useGraphStore(
    (state) => state.setNodes
  );

const setEdges =
  useGraphStore(
    (state) => state.setEdges
  );

  const [
    suggestions,
    setSuggestions
  ] = useState("");

  const [
    relationshipSuggestions,
    setRelationshipSuggestions
  ] = useState<any[]>([]);

  const nodes = useGraphStore((state) => state.nodes);

  const selectedProjectId =
  useGraphStore(
    (state) =>
      state.selectedProjectId
  );


  const selectedNodeId = useGraphStore(
    (state) => state.selectedNodeId
  );


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


  const updateNode = useGraphStore(
    (state) => state.updateNode
  );

  const selectedNode = nodes.find(
    (node) => node.id === selectedNodeId
  );

  const edges = useGraphStore(
    (state) => state.edges
  );
  
  if (!selectedNode) {
    return null;
  }

  const context =
  buildContext(
    selectedNode,
    edges,
    nodes
  );

  const handleTitleChange = (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    updateNode(selectedNode.id, {
      title: e.target.value,
    });
  };

  const handleDescriptionChange = (
    e: ChangeEvent<HTMLTextAreaElement>
  ) => {
    updateNode(selectedNode.id, {
      description: e.target.value,
    });

  };
  

  return (
    <div className="absolute top-0 right-0 w-[320px] h-full bg-white border-l p-4 z-20 shadow-lg overflow-y-auto">

      <h2 className="text-2xl font-bold mb-6">
        Node Inspector
      </h2>

      <div className="space-y-6">

        <div>
          <label className="text-sm text-gray-500 block mb-2">
            Title
          </label>

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
    <option value="research">
      Research
    </option>

    <option value="task">
      Task
    </option>

    <option value="code">
      Code
    </option>

    <option value="memory">
      Memory
    </option>
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
          <label className="text-sm text-gray-500 block mb-2">
            Tags
          </label>

          <div className="flex gap-2 flex-wrap">
            {selectedNode.data.tags.map(
              (tag: string) => (
                <span
                  key={tag}
                  className="bg-gray-200 px-2 py-1 rounded text-xs"
                >
                  #{tag}
                </span>
              )
            )}
          </div>

          <div>
  <label className="text-sm text-gray-500 block mb-2">
    Notes
  </label>

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
<button
  onClick={async () => {

    await updateNodeApi(
      Number(selectedNode.id),
      {
        title:
          selectedNode.data.title,

        description:
          selectedNode.data.description,

        node_type:
          selectedNode.data.nodeType,

        notes:
          selectedNode.data.notes,
      }
    );

    alert("Saved");
  }}
  className="bg-black text-white px-4 py-2 rounded"
>
  Save Node
</button>

<button
  onClick={async () => {

    await deleteNode(
      Number(selectedNode.id)
    );

    setNodes(
      nodes.filter(
        (node) =>
          node.id !== selectedNode.id
      )
    );
    
    setEdges(
      edges.filter(
        (edge) =>
          edge.source !==
            selectedNode.id &&
          edge.target !==
            selectedNode.id
      )
    );

  }}
  className="bg-red-500 text-white px-4 py-2 rounded ml-2"
>
  Delete Node
</button>

<button
  onClick={async () => {

    const result =
      await getContext(
        Number(selectedNode.id)
      );
  
    alert(
      result.context
    );
  
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

    const result =
      await getRelationshipSuggestions(
        Number(selectedNode.id)
      );

      setRelationshipSuggestions(
        JSON.parse(
          result.suggestions
        )
      );
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

{suggestions && (
  <div
    className="
      mt-3
      border
      rounded
      p-3
      text-sm
      whitespace-pre-wrap
    "
  >
    {suggestions}
  </div>

  
)}


{
  relationshipSuggestions.map(
    (
      suggestion,
      index
    ) => (
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

            const sourceNode =
              nodes.find(
                (n) =>
                  n.data.title ===
                  suggestion.source
              );
          
            const targetNode =
              nodes.find(
                (n) =>
                  n.data.title ===
                  suggestion.target
              );
          
            if (
              !sourceNode ||
              !targetNode
            ) {
              return;
            }
          
            await createRelationship(
              Number(sourceNode.id),
              Number(targetNode.id),
              suggestion.relationship,
              selectedProjectId
            );
          
            await loadGraph();
          }}

        >
          Accept
        </button>
      </div>
    )
  )
}
        </div>

      </div>
    </div>
  );
}