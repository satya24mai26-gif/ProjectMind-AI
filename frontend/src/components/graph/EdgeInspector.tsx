"use client";

import { useGraphStore }
from "../../store/graphStore";

import {
    updateRelationship,
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

  if (!edge) {
    return null;
  }

  

  return (
    <div className="absolute top-16 left-0 w-[280px] bg-white border-r p-4 z-20">
      <h2 className="font-bold mb-4">Edge Inspector</h2>

      <select
        value={edge.label}
        onChange={async (e) => {
          const relationType = e.target.value;

          const relationshipId = Number(edge.id.replace("edge-", ""));

          await updateRelationship(relationshipId, relationType);
          window.location.reload();
        }}
      >
        <option value="references">References</option>

        <option value="implements">Implements</option>

        <option value="depends_on">Depends On</option>

        <option value="contains">Contains</option>

        <option value="extends">Extends</option>

        <option value="related_to">Related To</option>
      </select>
    </div>
  );
}