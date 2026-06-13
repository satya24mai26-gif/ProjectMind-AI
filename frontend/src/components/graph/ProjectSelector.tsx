"use client";

import { useEffect, useState } from "react";

import { createProject, deleteProject, getProjects } from "@/services/api";
import { useGraphStore } from "../../store/graphStore";

export default function ProjectSelector() {
  const [projects, setProjects] = useState([]);
  const selectedProjectId = useGraphStore((state) => state.selectedProjectId);
  const setSelectedProjectId = useGraphStore(
    (state) => state.setSelectedProjectId
  );

  useEffect(() => {
    getProjects().then((data) => {
      setProjects(data);
    });
  }, []);

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedProjectId}
        onChange={(e) => setSelectedProjectId(Number(e.target.value))}
        className="h-10 min-w-[220px] rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
      >
        {projects.map((project: any) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>

      <button
        className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
        onClick={async () => {
          const name = prompt("Project Name");

          if (!name) return;

          await createProject(name, "");
          window.location.reload();
        }}
      >
        New Project
      </button>

      <button
        className="h-10 rounded-md border border-rose-200 bg-rose-50 px-3 text-sm font-medium text-rose-700 hover:bg-rose-100"
        onClick={async () => {
          if (!selectedProjectId) {
            return;
          }

          const confirmed = confirm("Delete project and all nodes?");

          if (!confirmed) {
            return;
          }

          await deleteProject(selectedProjectId);
          window.location.reload();
        }}
      >
        Delete
      </button>
    </div>
  );
}
