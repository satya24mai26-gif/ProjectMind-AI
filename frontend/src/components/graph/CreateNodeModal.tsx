"use client";

import { useState } from "react";

import { createNode } from "@/services/api";

export default function CreateNodeModal({
  projectId,
  open,
  onClose,
  onCreated,
}: {
  projectId: number;

  open: boolean;

  onClose: () => void;

  onCreated: () => void;
}) {
  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [nodeType, setNodeType] =
    useState("concept");

  const [notes, setNotes] =
    useState("");

  const [
      tags,
      setTags
    ] = useState("");

  if (!open) {
    return null;
  }

  const handleCreate =
    async () => {

      if (!title.trim()) {
        return;
      }

      await createNode(
        {
          title,
          description,
          node_type:
            nodeType,
          notes,
          project_id:
            projectId,
        }
      );

      setTitle("");
      setDescription("");
      setNodeType(
        "concept"
      );
      setNotes("");

      onCreated();

      onClose();
    };

  return (
    <div
      className="
      fixed
      inset-0
      bg-black/50
      flex
      items-center
      justify-center
      z-50
      "
    >
      <div
        className="
        bg-white
        rounded-lg
        p-6
        w-[500px]
        shadow-xl
        "
      >
        <h2
          className="
          text-xl
          font-bold
          mb-4
          "
        >
          Create Node
        </h2>

        <input
          value={title}
          onChange={(e) =>
            setTitle(
              e.target.value
            )
          }
          placeholder="Title"
          className="
          border
          p-2
          w-full
          rounded
          mb-3
          "
        />

        <select
          value={nodeType}
          onChange={(e) =>
            setNodeType(
              e.target.value
            )
          }
          className="
          border
          p-2
          w-full
          rounded
          mb-3
          "
        >
          <option value="concept">
            Concept
          </option>

          <option value="technology">
            Technology
          </option>

          <option value="algorithm">
            Algorithm
          </option>

          <option value="component">
            Component
          </option>

          <option value="dataset">
            Dataset
          </option>

          <option value="paper">
            Paper
          </option>

          <option value="research_question">
            Research Question
          </option>
        </select>

        <input
          value={tags}
          onChange={(e) =>
            setTags(
              e.target.value
            )
          }
          placeholder="
        embeddings, faiss,
        vector-search
        "
        className="
          border
          p-2
          w-full
          rounded
          mb-3
          "
        />

        <textarea
          value={description}
          onChange={(e) =>
            setDescription(
              e.target.value
            )
          }
          placeholder="Description"
          className="
          border
          p-2
          w-full
          rounded
          mb-3
          "
        />

        <textarea
          value={notes}
          onChange={(e) =>
            setNotes(
              e.target.value
            )
          }
          placeholder="Notes"
          className="
          border
          p-2
          w-full
          rounded
          mb-4
          "
        />

        <div
          className="
          flex
          justify-end
          gap-2
          "
        >
          <button
            onClick={onClose}
            className="
            px-4
            py-2
            border
            rounded
            "
          >
            Cancel
          </button>

          <button
            onClick={
              handleCreate
            }
            className="
            px-4
            py-2
            bg-black
            text-white
            rounded
            "
          >
            Create Node
          </button>
        </div>
      </div>
    </div>
  );
}