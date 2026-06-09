"use client";

import { useEffect, useState } from "react";

import {
  getProjects,
  deleteProject,
  createProject
} from "@/services/api";

import {
  useGraphStore,
} from "../../store/graphStore";


export default function ProjectSelector() {

  const [projects, setProjects] =
    useState([]);

  const selectedProjectId =
    useGraphStore(
      (state) =>
        state.selectedProjectId
    );

  const setSelectedProjectId =
    useGraphStore(
      (state) =>
        state.setSelectedProjectId
    );

  useEffect(() => {

    getProjects()
      .then(setProjects);

  }, []);

  useEffect(() => {
    getProjects().then((data) => {
      console.log("PROJECTS:", data);
      setProjects(data);
    });
  }, []);

  return (
    <div className="flex flex-col gap-2">


      <select
        value={selectedProjectId}
        onChange={(e) =>
          setSelectedProjectId(
            Number(e.target.value)
          )
        }
        className="
          border
          rounded
          px-3
          py-2
        "
      >
        {projects.map(
          (project: any) => (
            <option
              key={project.id}
              value={project.id}
            >
              {project.name}
            </option>
          )
        )}
      </select>

      <div className="flex flex-row gap-2">
  
      <button
        className="bg-red-500 text-white px-3 py-2 rounded"
        onClick={async () => {
  
          if (!selectedProjectId) {
            return;
          }
  
          const confirmed =
            confirm(
              "Delete project and all nodes?"
            );
  
          if (!confirmed) {
            return;
          }
  
          await deleteProject(
            selectedProjectId
          );
  
          window.location.reload();
        }}
      >
        Delete Project
      </button>
      <button
        className="
        bg-black
        text-white
        px-4
        py-2
        rounded
        "
        onClick={async () => {

          const name =
            prompt("Project Name");

          if (!name) return;

          await createProject(
            name,
            ""
          );

          window.location.reload();
        }}
      >
        New Project
      </button>
      </div>
    </div>
  );
}