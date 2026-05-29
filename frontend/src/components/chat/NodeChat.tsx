"use client";

import { useState } from "react";
import { useGraphStore } from "../../store/graphStore";
import {
    generateReply,
  } from "../../services/aiService";

import {
    askGraphAI,
  } from "../../services/graphAiService";

export default function NodeChat() {
  const [message, setMessage] = useState("");

  const nodes = useGraphStore((state) => state.nodes);
  const edges =
  useGraphStore(
    (state) => state.edges
  );


  const selectedNodeId = useGraphStore(
    (state) => state.selectedNodeId
  );

  const addMessage = useGraphStore(
    (state) => state.addMessage
  );

  const selectedNode = nodes.find(
    (node) => node.id === selectedNodeId
  );

  const addAssistantMessage =
  useGraphStore(
    (state) =>
      state.addAssistantMessage
  );

  if (!selectedNode) {
    return null;
  }

  const sendMessage = async () => {
    if (!message.trim()) return;
  
    addMessage(selectedNode.id, message);
  
    const response =
  await askGraphAI(
    selectedNode,
    nodes,
    edges,
    message
  );
  
    addAssistantMessage(
      selectedNode.id,
      response
    );
  
    setMessage("");
  };


  return (
    <div className="absolute bottom-0 left-0 right-[320px] h-[250px] bg-white border-t z-20 flex flex-col">

      <div className="flex-1 overflow-y-auto p-4">
        {selectedNode.data.messages.map((msg: any) => (
          <div
            key={msg.id}
            className="mb-2 p-2 border rounded"
          >
            {msg.content}
          </div>
        ))}
      </div>

      <div className="border-t p-3 flex gap-2">
        <input
          value={message}
          onChange={(e) =>
            setMessage(e.target.value)
          }
          className="flex-1 border rounded px-3 py-2"
          placeholder="Message this node..."
        />

        <button
          onClick={sendMessage}
          className="bg-black text-white px-4 rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
}