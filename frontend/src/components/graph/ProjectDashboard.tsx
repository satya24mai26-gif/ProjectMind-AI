"use client";

import {
  useEffect,
  useState
} from "react";

import {
  getProjectStats
} from "@/services/api";

import {
  useGraphStore
} from "@/store/graphStore";

export default function ProjectDashboard({
  projectId,
}: {
  projectId: number;
}) {

  const [stats, setStats] =
    useState<any>(null);

  const analyticsRefresh =
    useGraphStore(
      (
        state
      ) =>
        state.analyticsRefresh
    );

  useEffect(() => {

    getProjectStats(
      projectId
    ).then(setStats);

  }, [projectId,
    analyticsRefresh]);

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
      min-w-[280px]
      "
    >
      <h3
        className="
        font-bold
        mb-3
        "
      >
        Project Analytics
      </h3>
  
      <div>
        Nodes:
        {stats.nodes}
      </div>
  
      <div>
        Relationships:
        {stats.relationships}
      </div>
  
      <div>
        Most Connected:
        {" "}
        {stats.most_connected_node ??
          "N/A"}
      </div>
  
      <div>
        Connection Count:
        {" "}
        {stats.most_connected_count}
      </div>
  
      <div>
        Orphan Nodes:
        {" "}
        {stats.orphan_nodes}
      </div>
  
      <div>
        Avg Connections:
        {" "}
        {stats.average_connections}
      </div>
  
    </div>
  );
}