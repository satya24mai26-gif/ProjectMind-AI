"use client";

import {
  useEffect,
  useState
} from "react";

import {
  getProjectStats
} from "@/services/api";

export default function ProjectDashboard({
  projectId,
}: {
  projectId: number;
}) {

  const [stats, setStats] =
    useState<any>(null);

  useEffect(() => {

    getProjectStats(
      projectId
    ).then(setStats);

  }, [projectId]);

  if (!stats) {
    return null;
  }

  return (
    <div
      className="
      bg-white
      border
      rounded
      p-3
      shadow
      min-w-[220px]
      "
    >
      <h3
        className="
        font-bold
        mb-2
        "
      >
        Project Stats
      </h3>
  
      <div>
        Nodes:
        {stats.nodes}
      </div>
  
      <div>
        Relationships:
        {stats.relationships}
      </div>
  
    </div>
  );
}