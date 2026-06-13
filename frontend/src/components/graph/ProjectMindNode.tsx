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

  const tags = data?.tags || "";

  const nodeType = data?.nodeType || "research";

  const nodeTypeColors: Record<string, string> = {
    research: "border-blue-500",
    task: "border-green-500",
    code: "border-purple-500",
    memory: "border-yellow-500",
    research_question: "border-red-500",
    concept: "border-orange-500",
    dataset: "border-lime-500",
    component: "border-sky-500",
    algorithm: "border-rose-300",
    technology: "border-[#D1a5aB]"
  };

  const getRandomColorFromText = (text: string): string => {
    // 1. Array of available Tailwind color bases
    const colors = ["blue", "green", "purple", "yellow", "red", "orange", "lime", "sky", "rose", "emerald", "indigo", "pink"];
    
    // 2. Loop through every character to generate a unique numeric hash
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // 3. Pick a color safely using the remainder (modulo) operator
    const colorIndex = Math.abs(hash) % colors.length;
    const pickedColor = colors[colorIndex];
  
    // 4. Return the full dynamic border tailwind class string
    return `border-${pickedColor}-500`;
  };
  

  const borderColor =
  nodeTypeColors[nodeType] ||
  getRandomColorFromText(nodeType);

  const shortDescription =
  description.length > 40
    ? description.slice(0, 35) + "..."
    : description;

  const tagList =
  String(tags)
    .split(",")
    .filter(
      (tag: string) =>
        tag.trim()
    );

  const visibleTags =
  tagList.slice(0, 2);

  const hiddenTagCount =
  tagList.length - 2;

  return (
    <div
  className={`
  group
  bg-white
  border-2
  ${borderColor}
  rounded-xl
  p-3
  min-w-55
  max-w-70
  shadow-lg
  transition-all
  duration-300
  ease-out 
  hover:max-w-87.5
  hover:shadow-2xl
  hover:scale-130
  `}
>

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

      <div>
        <div
          className="
          block
          group-hover:hidden
          "
        >
          <p
            className="
            text-sm
            text-gray-500
            mt-2
            "
          >
            {shortDescription}
          </p>
        </div>

        <div
          className="
          hidden
          group-hover:block
          "
        >
          <p
            className="
            text-sm
            text-gray-600
            mt-2
            "
          >
            {description}
          </p>
        </div>
      </div>
        
      <div
        className="
        flex
        gap-2
        mt-3
        flex-wrap
        group-hover:hidden
        "
      >

        {visibleTags.map(
          (tag: string) => (
            <span
              key={tag}
              className="
              text-xs
              bg-blue-100
              text-blue-700
              px-2
              py-1
              rounded-full
              "
            >
              #{tag.trim()}
            </span>
          )
        )}

        {hiddenTagCount > 0 && (

          <span
            className="
            text-xs
            bg-gray-200
            px-2
            py-1
            rounded-full
            "
          >
            +{hiddenTagCount}
          </span>

        )}

      </div>

      <div
        className="
        hidden
        group-hover:flex
        flex-wrap
        gap-2
        mt-2
        "
      >

        {tagList.map(
          (tag: string) => (

            <span
              key={tag}
              className="
              text-xs
              px-2
              py-1
              rounded-full
            bg-blue-100
             text-blue-700
              "
            >
              #{tag.trim()}
            </span>

          )
        )}

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