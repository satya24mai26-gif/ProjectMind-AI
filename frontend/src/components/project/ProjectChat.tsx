"use client";

import { useState } from "react";

import {
  getProjectContext,
  askProjectAI,
} from "@/services/api";

export default function ProjectChat({
  projectId,
}: {
  projectId: number;
}) {

  const [message, setMessage] =
    useState("");

  const [response, setResponse] =
    useState("");

  const sendMessage =
    async () => {

      const context =
        await getProjectContext(
          projectId
        );

      const result =
        await askProjectAI(
          message,
          context
        );

      setResponse(
        result.answer
      );
    };

  return (
    <div
      className="
      bg-white
      border
      rounded
      p-4
      "
    >
      <h3
        className="
        font-bold
        mb-2
        "
      >
        Project Chat
      </h3>

      <input
        value={message}
        onChange={(e) =>
          setMessage(
            e.target.value
          )
        }
        placeholder="
          Ask about project...
        "
        className="
          border
          w-full
          p-2
          rounded
        "
      />

      <button
        onClick={sendMessage}
        className="
          mt-2
          bg-black
          text-white
          px-4
          py-2
          rounded
        "
      >
        Ask
      </button>

      <div
        className="
        mt-4
        whitespace-pre-wrap
        "
      >
        {response}
      </div>
    </div>
  );
}