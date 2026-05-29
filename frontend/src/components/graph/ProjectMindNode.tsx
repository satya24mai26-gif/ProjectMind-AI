"use client";

import {
  Handle,
  Position,
} from "reactflow";

import { ProjectMindNodeData } from "@/types/graph";

type Props = {
  data?: Partial<ProjectMindNodeData>;
};

export default function ProjectMindNode({
  data,
}: Props) {
  const title = data?.title || "Untitled Node";

  const description =
    data?.description || "No description";

  const tags = data?.tags || [];

  const nodeType = data?.nodeType || "research";

  const nodeTypeColors: Record<string, string> = {
    research: "border-blue-500",
    task: "border-green-500",
    code: "border-purple-500",
    memory: "border-yellow-500",
  };

  const borderColor =
  nodeTypeColors[nodeType] ||
  "border-black";

  return (
    <div className={`bg-white border-2 ${borderColor} rounded-xl p-4 min-w-[220px] shadow-lg`}>

<div className="text-xs text-gray-500 mt-1 uppercase">
  {nodeType}
</div>

      <Handle
        type="target"
        position={Position.Top}
        style={{
          width: 12,
          height: 12,
          background: "#000",
        }}
      />

      <div className="font-bold text-lg">
        {title}
      </div>

      <p className="text-sm text-gray-500 mt-2">
        {description}
      </p>

      <div className="flex gap-2 mt-3 flex-wrap">
        {tags.map((tag) => (
          <span
            key={tag}
            className="text-xs bg-gray-200 px-2 py-1 rounded"
          >
            #{tag}
          </span>
        ))}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          width: 12,
          height: 12,
          background: "#000",
        }}
      />
    </div>
  );
}