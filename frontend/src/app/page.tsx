"use client";

import GraphCanvas from "../components/graph/GraphCanvas";

import { useGraphStore } from "../store/graphStore";

import NodeInspector from "../components/graph/NodeInspector";

export default function Home() {
  const addNode = useGraphStore((state) => state.addNode);

  const clearGraph = useGraphStore(
    (state) => state.clearGraph
  );

  return (
    <main className="w-screen h-screen relative">
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <button
          onClick={addNode}
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
      <NodeInspector />
    </main>
  );
}