"use client";

import { useEffect, useState } from "react";

import {
  getProjects,
} from "../../services/api";

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
  );
}