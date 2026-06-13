"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useGraphStore } from "../../store/graphStore";
import { askAI, fetchChatHistory } from "../../services/aiApi"; // Matches your original api.ts import path
import { buildContext } from "../../services/contextBuilder";

interface ChatTreeItem {
  id: number;
  node_id: number;
  role: "user" | "assistant";
  content: string;
  parent_id: number | null;
  created_at?: string;
}

export default function NodeChat() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Advanced UI Workspace Layout & Navigation Controls
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeParentId, setActiveParentId] = useState<number | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Zustand State hooks
  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId);
  const setMessages = useGraphStore((state) => state.setMessages);

  // Safely find selected node and normalize string/numerical IDs
  const selectedNode = useMemo(() => {
    return nodes.find((node) => String(node.id) === String(selectedNodeId));
  }, [nodes, selectedNodeId]);

  const rawDbMessages: ChatTreeItem[] = useMemo(() => {
    const msgs = selectedNode?.data?.messages;
    return Array.isArray(msgs) ? msgs : [];
  }, [selectedNode]);

  const rootMessages =
  rawDbMessages.filter(
    (msg) =>
      msg.parent_id === null
  );

const childMessages =
rawDbMessages.filter(
    (msg) =>
      msg.parent_id !== null
  );
  const sortedMessages =
  [...rawDbMessages]
    .sort(
      (a, b) =>
        new Date(
          a.created_at || ""
        ).getTime()
        -
        new Date(
          b.created_at || ""
        ).getTime()
    );

  function getChildren(
    parentId: number,
    messages: any[]
  ) {
    return messages.filter(
      (msg) =>
        msg.parent_id ===
        parentId
    );
  }

  type ChatBranch = {
    question: any;
    answer?: any;
    children: ChatBranch[];
  };

  function buildBranches(
    messages: any[],
    parentId: number | null = null
  ): ChatBranch[] {
  
    const userMessages =
      messages.filter(
        (msg) =>
          msg.role === "user" &&
          msg.parent_id === parentId
      );
  
    return userMessages.map(
      (question) => {
  
        const answer =
  messages.find(
    (msg) =>
      msg.role === "assistant" &&
      msg.parent_id === question.id
  );
  
        return {
          question,
          answer,
          children:
            buildBranches(
              messages,
              question.id
            ),
        };
  
      }
    );
  
  }

  const branches =
  buildBranches(
    sortedMessages
  );
  console.log(branches)
  // Synchronize history records securely
  const syncHistory = async (nodeId: string | number) => {
    if (!nodeId) return;
    try {
      const stringId = String(nodeId);
      const numericalId = Number(nodeId);
      const history = await fetchChatHistory(numericalId);
      
      // Enforce clean typing rules to guarantee zero comparison mismatch anomalies
      const normalizedHistory = history.map((msg: any) => ({
        id: Number(msg.id),
        node_id: Number(msg.node_id),
        role: msg.role === "assistant" || msg.is_assistant ? "assistant" : "user",
        content: msg.content,
        parent_id: msg.parent_id !== null && msg.parent_id !== undefined ? Number(msg.parent_id) : null,
        created_at: msg.created_at
      }));

      setMessages(stringId, normalizedHistory);
    } catch (err) {
      setErrorMsg("Network error: Failed to synchronize historical chat elements.");
    }
  };

  // 🔄 FIX REFRESH RACE CONDITION: Immediate hydration listener
  useEffect(() => {
    const activeId = selectedNodeId || useGraphStore.getState().selectedNodeId;
    if (!activeId) return;

    setIsHistoryLoading(true);
    syncHistory(activeId).finally(() => {
      setIsHistoryLoading(false);
      setActiveParentId(null); // Keep view anchored cleanly on main threads on focus switch
    });
  }, [selectedNodeId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeParentId, rawDbMessages, isLoading]);

  // --- 🔥 FIXED: ADVANCED CONVERSATION TIMELINE VIEWPORT TRAVERSAL ---
  const activeDisplayMessages = useMemo((): ChatTreeItem[] => {
    if (activeParentId === null) {
      // Root level view: show messages that don't have an upstream parent reference
      return rawDbMessages.filter(m => m.parent_id === null);
    }

    const pairs: {
      user: ChatTreeItem;
      ai?: ChatTreeItem;
    }[] = [];
    let traversalId: number | null = activeParentId;
    const maxIterations = 100;
    let iterations = 0;

    // Follow thread coordinates upstream to parse the active chain line cleanly
    while (traversalId !== null && iterations < maxIterations) {
      iterations++;
      const targetId:any = traversalId;
      const userPrompt = rawDbMessages.find(m => m.id === targetId && m.role === "user");
      
      if (userPrompt) {
        
        // Match the assistant response by finding the reply associated with this prompt
        const aiResponse = rawDbMessages.find(
          m => m.role === "assistant" && (m.parent_id === userPrompt.id || m.id === userPrompt.id + 1 || m.parent_id === userPrompt.parent_id) && m.id > userPrompt.id
        );
        
        pairs.unshift({
          user: userPrompt,
          ai: aiResponse
        });
        
        traversalId = userPrompt.parent_id;
      } else {
        break;
      }
    }
    const ordered: ChatTreeItem[] = [];

    pairs.forEach(pair => {

      ordered.push(pair.user);

      if (pair.ai) {
        ordered.push(pair.ai);
      }

    });

    return ordered;
  }, [rawDbMessages, activeParentId]);

  // --- USER CONTROLLERS PACK ---

  const handleSend = async (options?: { overridePrompt?: string; editMessageId?: number; isRegenerate?: boolean; clearAll?: boolean }) => {
    if (isLoading || isHistoryLoading || !selectedNode) return;

    const targetPrompt = options?.overridePrompt || message.trim();
    if (!targetPrompt && !options?.isRegenerate && !options?.clearAll) return;

    if (!options?.overridePrompt) setMessage("");
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const context = buildContext(selectedNode, edges, nodes);
      await askAI(targetPrompt, context, options?.editMessageId, options?.isRegenerate, options?.clearAll, null, activeParentId);
      
      await syncHistory(selectedNode.id);
      setEditingMessageId(null);

      // Snappy Viewport Tracking Focus Auto Shift
      if (!options?.editMessageId && !options?.isRegenerate && !options?.clearAll) {
        const freshHistory = await fetchChatHistory(Number(selectedNode.id));
        const latestUserMsg = freshHistory.reverse().find((m: any) => m.role === "user");
        if (latestUserMsg) setActiveParentId(Number(latestUserMsg.id));
      }
    } catch (err) {
      setErrorMsg("Inference Error: Failure synchronizing node response packages.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (id: number, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleDeletePair = async (pairId: number) => {
    if (!selectedNode || !confirm("Permanently drop this conversational block pair and all nested sub-chat children?")) return;
    setIsLoading(true);
    try {
      const context = buildContext(selectedNode, edges, nodes);
      await askAI("", context, null, false, false, pairId);
      await syncHistory(selectedNode.id);
      setActiveParentId(null);
    } catch (err) {
      setErrorMsg("Failed to fully delete branch from server model.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleWipeNodeChat = async () => {
    if (!confirm("Are you sure you want to permanently clear all multi-thread history for this node?")) return;
    await handleSend({ overridePrompt: "", clearAll: true });
    setActiveParentId(null);
  };

  // --- RECURSIVE SIDEBAR CHAT TREE MAP GENERATOR ---
  const renderSidebarTreeNodes = (parentId: number | null, depth = 0) => {
    // 🔥 FIXED: Sidebar now filters EXCLUSIVELY for role === "user" messages
    const userNodes = rawDbMessages.filter(
      (m) => m.role === "user" && (parentId === null ? m.parent_id === null : m.parent_id === parentId)
    );

    return userNodes.map((uNode) => {
      const isSelectedBranch = activeParentId === uNode.id;
      const truncatedLabel = uNode.content.length > 18 ? `${uNode.content.substring(0, 18)}...` : uNode.content;

      return (
        <div key={uNode.id} className="flex flex-col w-full">
          <button
            onClick={() => {
              setActiveParentId(Number(uNode.id));
              setEditingMessageId(null);
            }}
            style={{ paddingLeft: `${Math.max(depth * 14, 8)}px` }}
            className={`flex items-center text-left w-full px-3 py-2 rounded-xl text-xs font-semibold tracking-wide border border-transparent transition-all duration-200 ${
              isSelectedBranch 
                ? "bg-slate-900 text-slate-50 shadow-md border-slate-950 scale-[1.01]" 
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <span className={`mr-1.5 font-mono text-[9px] ${isSelectedBranch ? "text-cyan-400" : "text-slate-400"}`}>
              {"#".repeat(depth + 1)}
            </span>
            <span className="truncate">{truncatedLabel}</span>
          </button>
          
          <div className="w-full">
            {renderSidebarTreeNodes(uNode.id, depth + 1)}
          </div>
        </div>
      );
    });
  };

  // 🛡️ CRITICAL RULES OF HOOKS SEPARATION: Guard clause shifted strictly below all initialization loops
  if (!selectedNodeId || !selectedNode) return null;

  return (
    <div className={`fixed z-40 flex flex-col bg-white border border-slate-200/80 shadow-2xl transition-all duration-300 ease-in-out ${
      isFullScreen ? "top-4 left-4 right-4 bottom-4 rounded-2xl h-auto" : "bottom-4 left-4 right-[340px] h-[460px] rounded-xl"
    }`}>
      
      {/* Upper Control Bar Layout Panel */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3 select-none shrink-0">
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white shadow-sm text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {isSidebarOpen ? "📁 Hide Branches" : "📂 Show Map"}
          </button>
          <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
          <div className="truncate text-xs font-bold uppercase tracking-wider text-slate-400">Context:</div>
          <div className="truncate text-sm font-bold text-slate-800 max-w-[180px]">{selectedNode.data?.title}</div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => { setActiveParentId(null); setMessage(""); }} className="text-xs bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50 font-bold shadow-sm transition-all">
            ➕ New Thread
          </button>
          {rawDbMessages.length > 0 && (
            <button onClick={handleWipeNodeChat} className="text-xs text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg font-semibold transition-colors">
              🗑️ Reset All
            </button>
          )}
          <button onClick={() => setIsFullScreen(!isFullScreen)} className="text-xs bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg font-bold shadow-sm transition-all">
            {isFullScreen ? "🗗 Compact" : "🗖 Fullscreen"}
          </button>
        </div>
      </div>

      {/* Main Structural Frame Content Core Split View */}
      <div className="flex flex-1 overflow-hidden divide-x divide-slate-100 bg-white">
        
        {/* DISCUSSION SIDEBAR TREE MAP */}
        <aside className={`bg-slate-50/30 p-2 space-y-1 overflow-y-auto flex flex-col shrink-0 transition-all duration-300 border-r border-slate-100/50 ${
          isSidebarOpen ? "w-56 opacity-100" : "w-0 opacity-0 pointer-events-none !p-0"
        }`}>
          <div className="text-[10px] font-bold text-slate-400 px-2 py-1.5 uppercase tracking-wider mb-1 select-none">
            Branch Map Tree
          </div>
          <div className="flex-1 space-y-1">
            {renderSidebarTreeNodes(null)}
            {rawDbMessages.filter(m => m.role === "user").length === 0 && (
              <div className="text-xs text-slate-400 italic px-2 py-4 select-none">No active branches.</div>
            )}
          </div>
        </aside>

        {/* MAIN MESSAGING STREAM VIEWPORT CONTAINER */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isHistoryLoading ? (
              <div className="text-xs text-slate-400 text-center py-12 font-medium">Re-mapping matrix trees...</div>
            ) : activeDisplayMessages.length === 0 ? (
              <div className="flex flex-col h-full items-center justify-center text-slate-400 text-center py-12 space-y-2 select-none">
                <span className="text-3xl">🌿</span>
                <p className="text-xs font-semibold max-w-xs text-slate-500">Choose an explicit conversational branch from the left map, or type a query below to spin up a new interaction layer.</p>
              </div>
            ) : (
              activeDisplayMessages.map((msg, idx) => {
                const isUser = msg.role === "user";
                const isEditing = editingMessageId === msg.id;

                return (
                  <div key={msg.id || idx} className={`group relative flex flex-col max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm border transition-all ${
                    isUser 
                      ? "ml-auto bg-slate-900 text-slate-50 rounded-br-none border-slate-950" 
                      : "mr-auto bg-white border-slate-100 text-slate-800 rounded-bl-none"
                  }`}>
                    
                    {/* Hover Floating Toolbar */}
                    <div className={`absolute top-[-14px] opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center bg-white border border-slate-200 rounded-md shadow-md px-2 py-0.5 gap-2.5 z-10 ${
                      isUser ? "right-2" : "left-2"
                    }`}>
                      <button onClick={() => handleCopy(msg.id, msg.content)} className="text-[10px] font-bold text-slate-500 hover:text-slate-800 transition-colors">
                        {copiedId === msg.id ? "Copied! ✓" : "📋 Copy"}
                      </button>
                      {isUser && !isEditing && (
                        <button onClick={() => { setEditingMessageId(msg.id); setEditValue(msg.content); }} className="text-[10px] font-bold text-slate-500 hover:text-slate-800 transition-colors">
                          ✏️ Edit
                        </button>
                      )}
                      {isUser && (
                        <button onClick={() => { setActiveParentId(Number(msg.id)); setMessage(""); }} className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 transition-colors" title="Fork chat history from this statement onward into a sub-chat branch">
                          🌿 Sub-Chat
                        </button>
                      )}
                      {!isUser && (
                        <button onClick={() => handleSend({ overridePrompt: "", isRegenerate: true })} className="text-[10px] font-bold text-cyan-600 hover:text-cyan-800 transition-colors">
                          ↻ Regenerate
                        </button>
                      )}
                      <button onClick={() => handleDeletePair(msg.id)} className="text-[10px] font-bold text-red-500 hover:text-red-700 transition-colors">
                        🗑️ Delete
                      </button>
                    </div>

                    {/* Rendering Layout Area Condition Router */}
                    {isEditing ? (
                      <div className="space-y-2 py-1 min-w-[260px]">
                        <textarea value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-full bg-slate-800 text-white border border-slate-700 rounded p-2 text-xs focus:outline-none resize-none font-sans" rows={2} />
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => setEditingMessageId(null)} className="px-2.5 py-0.5 text-[10px] bg-slate-700 text-slate-200 rounded font-medium">Cancel</button>
                          <button onClick={() => handleSend({ overridePrompt: editValue.trim(), editMessageId: msg.id })} className="px-2.5 py-0.5 text-[10px] bg-cyan-600 text-white rounded font-medium">Save Updates</button>
                        </div>
                      </div>
                    ) : isUser ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    ) : (
                      <article className="prose prose-slate prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-headings:my-1 prose-ul:list-disc prose-ul:ml-4">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </article>
                    )}
                  </div>
                );
              })
            )}
            {errorMsg && <div className="max-w-[85%] rounded-lg bg-red-50 border border-red-100 p-2 text-xs text-red-700 font-medium">{errorMsg}</div>}
            <div ref={messagesEndRef} />
          </div>

          {/* User Input Footer Action Tray Form Area */}
          <div className="border-t border-slate-100 p-3 bg-white shrink-0">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
              <input 
                value={message} 
                onChange={(e) => setMessage(e.target.value)} 
                disabled={isLoading || isHistoryLoading} 
                className="h-10 flex-1 rounded-lg border border-slate-200 bg-slate-50/50 px-3.5 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-slate-400 focus:bg-white disabled:opacity-60" 
                placeholder={activeParentId ? "Replying inside this sub-chat path segment branch..." : "Message this active node context..."} 
              />
              <button 
                type="submit" 
                disabled={!message.trim() || isLoading || isHistoryLoading} 
                className="h-10 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40 transition-all shadow-sm active:scale-[0.98]"
              >
                Send
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}