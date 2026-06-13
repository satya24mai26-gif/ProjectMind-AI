"use client";

import { useEffect, useState } from "react";

import { getProjectStats } from "@/services/api";
import { useGraphStore } from "@/store/graphStore";

export default function ProjectDashboard({ projectId }: { projectId: number }) {
  const [stats, setStats] = useState<any>(null);
  const analyticsRefresh = useGraphStore((state) => state.analyticsRefresh);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    getProjectStats(projectId).then(setStats);
  }, [projectId, analyticsRefresh]);

  if (!stats) {
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
        Select a project to see graph health.
      </div>
    );
  }

  const metricClass =
    "rounded-md border border-slate-200 bg-slate-50 px-3 py-2";

  return (
    <div className="grid grid-cols-3 gap-2 text-xs">
      <div className={metricClass}>
        <div className="text-slate-500">Nodes</div>
        <div className="text-base font-semibold text-slate-900">{stats.nodes}</div>
      </div>

      <div className={metricClass}>
        <div className="text-slate-500">Links</div>
        <div className="text-base font-semibold text-slate-900">
          {stats.relationships}
        </div>
      </div>

      <div className={metricClass}>
        <div className="text-slate-500">Orphans</div>
        <div className="text-base font-semibold text-slate-900">
          {stats.orphan_nodes}
        </div>
      </div>

      <div className="col-span-2 rounded-md border border-slate-200 bg-white px-3 py-2">
        <div className="text-slate-500">Most Connected</div>
        <div className="truncate font-medium text-slate-900">
          {stats.most_connected_node ?? "N/A"}
        </div>
      </div>

      <div className={metricClass}>
        <div className="text-slate-500">Avg</div>
        <div className="text-base font-semibold text-slate-900">
          {stats.average_connections}
        </div>
      </div>
    </div>
  );
}
