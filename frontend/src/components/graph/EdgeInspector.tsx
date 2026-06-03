"use client";

import { useGraphStore }
from "../../store/graphStore";

import {
    updateRelationship,
    deleteRelationship
  } from "../../services/api";

export default function EdgeInspector() {

  const edges =
    useGraphStore(
      (state) => state.edges
    );

  const selectedEdgeId =
    useGraphStore(
      (state) =>
        state.selectedEdgeId
    );

  const edge = edges.find(
    (e) => e.id === selectedEdgeId
  );

  const setEdges = useGraphStore(
    (state) => state.setEdges
  );

  if (!edge) {
    return null;
  }

  

  return (
    <div className="absolute top-28 left-0 w-[280px] bg-white border-r p-4 z-20">
      <h2 className="font-bold mb-4">Edge Inspector</h2>

      <select
        value={String(edge.label ?? "references")}
        onChange={async (e) => {
          const relationType = e.target.value;

          const relationshipId = Number(edge.id);

          console.log("EDGE ID:", edge.id);

          await updateRelationship(relationshipId, relationType);
          setEdges(
            edges.map((existingEdge) => {
              if (existingEdge.id !== edge.id) {
                return existingEdge;
              }

              return {
                ...existingEdge,
                label: relationType,
              };
            })
          );
          console.log(edge);
        }}
      >
        <option value="references">References</option>

        <option value="implements">Implements</option>

        <option value="depends_on">Depends On</option>

        <option value="contains">Contains</option>

        <option value="extends">Extends</option>

        <option value="related_to">Related To</option>

        <option value="references">references</option>

        <option value="depends_on">depends_on</option>

        <option value="related_to">related_to</option>

        <option value="contains">contains</option>

        <option value="uses">uses</option>
      </select>
      <button
        className="mt-4 bg-red-500 text-white px-4 py-2 rounded"
        onClick={async () => {
          const relationshipId = Number(edge.id);

          await deleteRelationship(relationshipId);

          setEdges(edges.filter((existingEdge) => existingEdge.id !== edge.id));
        }}
      >
        Delete Relationship
      </button>
    </div>
  );
}