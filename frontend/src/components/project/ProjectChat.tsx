"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useGraphStore } from "@/store/graphStore";
import {
  getGapAnalysis,
  addMissingConcept,
  createRelationship,
  updateRelationship,
  analyzeGraphRelationships,
  askProjectAIAdvanced,
  fetchProjectChatHistory
} from "@/services/api";

import ToolbarButton from "@/components/ui/ToolbarButton";

interface ChatTreeItem {
  id: number;
  project_id: number;
  role: "user" | "assistant";
  content: string;
  parent_id: number | null;
}

export default function ProjectChat({ projectId }: { projectId: number }) {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Advanced Layout & Operational States
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeParentId, setActiveParentId] = useState<number | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [isNewChat, setIsNewChat] = useState(true);
  const [sidebarMode, setSidebarMode] = useState<"tree" | "explorer">("explorer");
  const [explorerRootId, setExplorerRootId] = useState<number | null>(null);
  const [threadStack, setThreadStack] = useState<number[]>([]);
  const [expandedChains, setExpandedChains] = useState<Set<number>>(new Set());
  const [threadView, setThreadView] = useState<{
    open: boolean;
    rootId: number | null;
  }>({
    open: false,
    rootId: null,
  });

  // Safe Local Thread Storage to Prevent Zustand Snapshot Loops
  const [chatMessagesArray, setChatMessagesArray] = useState<ChatTreeItem[]>([]);

  // Original System Operation States preserved intact
  const [analysis, setAnalysis] = useState<any>(null);
  const [graphRelationships, setGraphRelationships] = useState<any[]>([]);
  const [relationshipSummary, setRelationshipSummary] = useState<{
    created: number;
    updated: number;
    unchanged: number;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const childrenMap = useMemo(() => {
    const map = new Map<number | null, ChatTreeItem[]>();
    chatMessagesArray.forEach((msg) => {
      if (msg.role !== "user") return;
      const key = msg.parent_id;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(msg);
    });
    return map;
  }, [chatMessagesArray]);

  const rootThreads = useMemo(() => {
    return chatMessagesArray.filter(
      (m) => m.role === "user" && m.parent_id === null
    );
  }, [chatMessagesArray]);

  const getLatestBranchLeaf = (rootId: number): number => {
    let currentId = rootId;
    while (true) {
      const children = childrenMap.get(currentId) ?? [];
      if (children.length === 0) {
        return currentId;
      }
      const newestChild = children[children.length - 1];
      currentId = newestChild.id;
    }
  };

  const nodeMap = useMemo(() => {
    const map = new Map<number, ChatTreeItem>();
    chatMessagesArray.forEach((msg) => {
      if (msg.role === "user") {
        map.set(msg.id, msg);
      }
    });
    return map;
  }, [chatMessagesArray]);
  
  const activePathIds = useMemo(() => {
    const ids = new Set<number>();
    if (activeParentId === null) {
      return ids;
    }
    let current = nodeMap.get(activeParentId);
    while (current) {
      ids.add(current.id);
      if (current.parent_id === null) {
        break;
      }
      current = nodeMap.get(current.parent_id);
    }
    return ids;
  }, [activeParentId, nodeMap]);

  const STORAGE_KEY = `project-chat-${projectId}`;

  const saveLocalChat = (messages: ChatTreeItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {}
  };

  const loadLocalChat = (): ChatTreeItem[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  };

  // Safe Zustand state triggers
  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  const triggerGraphRefresh = useGraphStore((state) => state.triggerGraphRefresh);

  // Synchronize history logs securely directly into component state
  const syncProjectHistory = async (id: number) => {
    if (!id) return;
    try {
      const history = await fetchProjectChatHistory(id);
      const normalized = history.map((msg: any) => ({
        id: Number(msg.id),
        project_id: Number(msg.project_id),
        role: msg.role === "assistant" || msg.is_assistant ? "assistant" : "user",
        content: msg.content,
        parent_id: msg.parent_id !== null && msg.parent_id !== undefined ? Number(msg.parent_id) : null
      }));
      
      setChatMessagesArray(normalized);
      saveLocalChat(normalized);
    } catch (err) {
      setErrorMsg("Failed to synchronize global project copilot history.");
    }
  };

  useEffect(() => {
    if (!projectId) return;
    const cached = loadLocalChat();
    if (cached.length > 0) {
      setChatMessagesArray(cached);
    }
    setIsHistoryLoading(true);

    syncProjectHistory(projectId).finally(() => {
      setIsHistoryLoading(false);
      setIsNewChat(true);
      setActiveParentId(null);
    });
  }, [projectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeParentId, chatMessagesArray, isLoading]);

  // --- ARBORIST ALGORITHM TIMELINE CONVERSATION FILTER ---
  const activeDisplayMessages = useMemo((): ChatTreeItem[] => {
    if (isNewChat) {
      return [];
    }
    if (activeParentId === null) {
      const roots = chatMessagesArray.filter(m => m.role === "user" && m.parent_id === null);
      const result: ChatTreeItem[] = [];
      roots.forEach(root => {
        result.push(root);
        const assistant = chatMessagesArray.find(m => m.role === "assistant" && m.parent_id === root.id);
        if (assistant) result.push(assistant);
      });
      return result;
    }

    const pairs: { user: ChatTreeItem; ai?: ChatTreeItem }[] = [];
    let traversalId: number | null = activeParentId;
    const maxIterations = 100;
    let iterations = 0;

    while (traversalId !== null && iterations < maxIterations) {
      iterations++;
      const targetId: any = traversalId;
      const userPrompt = chatMessagesArray.find(m => m.id === targetId && m.role === "user");
      
      if (userPrompt) {
        const aiResponse = chatMessagesArray.find(m => m.role === "assistant" && m.parent_id === userPrompt.id);
        pairs.unshift({ user: userPrompt, ai: aiResponse });
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
  }, [chatMessagesArray, activeParentId, isNewChat]);

  // --- PIPELINE LIFECYCLE CONTROLLERS ---
  const handleSend = async (options?: { overridePrompt?: string; editMessageId?: number; isRegenerate?: boolean; clearAll?: boolean }) => {
    if (isLoading || isHistoryLoading || !projectId) return;

    const targetPrompt = options?.overridePrompt || message.trim();
    if (!targetPrompt && !options?.isRegenerate && !options?.clearAll) return;

    if (!options?.overridePrompt) setMessage("");
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const tempUserId = -Date.now();
      const optimisticUser: ChatTreeItem = {
        id: tempUserId,
        project_id: projectId,
        role: "user",
        content: targetPrompt,
        parent_id: activeParentId
      };

      const optimisticAssistant: ChatTreeItem = {
        id: tempUserId - 1,
        project_id: projectId,
        role: "assistant",
        content: "Thinking...",
        parent_id: tempUserId
      };

      const optimisticMessages = [...chatMessagesArray, optimisticUser, optimisticAssistant];
      setChatMessagesArray(optimisticMessages);
      saveLocalChat(optimisticMessages);
      
      setActiveParentId(tempUserId);

      const isInitialRootThread = activeParentId === null;

      // FIX: Capture backend response explicitly
      const result = await askProjectAIAdvanced(projectId, targetPrompt, options?.editMessageId, options?.isRegenerate, options?.clearAll, null, activeParentId);
      
      await syncProjectHistory(projectId);
      setEditingMessageId(null);

      // FIX: Route active tree location directly to the generated structural node ID
      if (result && result.user_message_id) {
        const newId = Number(result.user_message_id);
        setActiveParentId(newId);
        setIsNewChat(false); // Explicitly mark chat as active now

        // FIX: If this was a brand new root thread, force the Explorer sidebar to jump inside it!
        if (isInitialRootThread) {
          setThreadView({
            open: true,
            rootId: newId // The new user message ID is the root of this thread
          });
        }
      } else {
        const freshHistory = await fetchProjectChatHistory(projectId);
        const wasRootThread = activeParentId === null;
        if (wasRootThread) {
          const latestRoot = [...freshHistory].reverse().find((m: any) => m.role === "user" && m.parent_id === null);
          if (latestRoot) {
            setActiveParentId(Number(latestRoot.id));
          }
        } else {
          const latestUser = [...freshHistory].reverse().find((m: any) => m.role === "user" && Number(m.parent_id) === activeParentId);
          if (latestUser) setActiveParentId(Number(latestUser.id));
        }
      }
    } catch (err) {
      setErrorMsg("Error syncing updates with Copilot core memory engine.");
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
    if (!confirm("Permanently drop this conversational block pair and all nested entries?")) return;
    setIsLoading(true);
    try {
      // Find the node we are about to delete in our local state arrays to figure out its lineage
      const targetNode = chatMessagesArray.find(m => m.id === pairId);
      const fallbackParentId = targetNode ? targetNode.parent_id : null;
  
      await askProjectAIAdvanced(projectId, "", null, false, false, pairId);
      await syncProjectHistory(projectId);
  
      if (fallbackParentId !== null) {
        // Bug 1 Fix: If it was a sub-branch, activate its immediate parent node
        setActiveParentId(fallbackParentId);
        setIsNewChat(false);
      } else {
        // Bug 2 Fix: If it was a root node (null parent), cleanly transition to a blank new chat slate
        setActiveParentId(null);
        setIsNewChat(true);
      }
    } catch (err) {
      setErrorMsg("Failed to delete branch sequence from backend database storage.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleWipeFullChat = async () => {
    if (!confirm("Are you sure you want to permanently clear all multi-thread history for this project?")) return;
    await handleSend({ overridePrompt: "", clearAll: true });
    setActiveParentId(null);
  };

  const getUserChildren = (id: number | null) =>
    chatMessagesArray.filter((m) => m.role === "user" && m.parent_id === id);
  
  const isImportantNode = (node: ChatTreeItem) => {
    const children = getUserChildren(node.id);
    return (
      node.parent_id === null ||      
      children.length === 0 ||        
      children.length > 1 ||          
      activeParentId === node.id      
    );
  };

  const renderSidebarTreeNodes = (parentId: number | null, depth = 0) => {
    const originalNodes = getUserChildren(parentId);
    const userNodes: (ChatTreeItem | { dots: true; start: ChatTreeItem; next: ChatTreeItem; end: ChatTreeItem; })[] = [];
    
    for (let node of originalNodes) {
      let current = node;
      let skipped = false;
    
      while (true) {
        const children = getUserChildren(current.id);
        if (children.length === 1 && !isImportantNode(current)) {
          skipped = true;
          current = children[0];
        } else {
          break;
        }
      }
    
      if (skipped) {
        userNodes.push({ dots: true, start: node, next: current, end: current });
      } else {
        userNodes.push(current);
      }
    }

    return userNodes.map((item) => {
      if ("dots" in item) {
        const uNode = item.next;
        const key = item.start.id;
        const expanded = expandedChains.has(key);

        if (expanded) {
          return (
            <button
              key={`dots-${key}`}
              style={{ paddingLeft: `${Math.max(depth * 14, 8)}px` }}
              className="text-xs text-blue-500 hover:text-blue-700 italic"
              onClick={() => {
                setExpandedChains(prev => {
                  const s = new Set(prev);
                  s.add(key);
                  return s;
                });
              }}
            >
              + Expand
            </button>
          );
        }
      
        return (
          <div key={`dots-${uNode.id}`} className="flex flex-col">
            {renderSidebarTreeNodes(uNode.parent_id, depth)}
          </div>
        );
      }
      
      const uNode = item;
      const isSelectedBranch = activePathIds.has(uNode.id);
      const isCurrentLeaf = activeParentId === uNode.id;
      const truncatedLabel = uNode.content.length > 20 ? `${uNode.content.substring(0, 20)}...` : uNode.content;

      return (
        <div key={uNode.id} className="flex flex-col w-full">
          <button
            onClick={() => {
              setIsNewChat(false);
              const newestLeaf = getLatestBranchLeaf(Number(uNode.id));
              setActiveParentId(newestLeaf);
              setEditingMessageId(null);
            }}
            style={{ paddingLeft: `${Math.max(depth * 14, 8)}px` }}
            className={`flex items-center text-left w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all border
              ${isCurrentLeaf
                ? "bg-slate-900 text-white border-slate-900 shadow-md"
                : isSelectedBranch
                ? "bg-slate-200 text-slate-900 border-slate-300"
                : "text-slate-600 hover:bg-slate-100 border-transparent"
              }`}
          >
            <span className={`mr-1.5 font-mono text-[9px] ${isCurrentLeaf ? "text-cyan-400" : isSelectedBranch ? "text-indigo-500" : "text-slate-400"}`}>
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

  const findExistingRelationship = (sourceNodeId: number, targetNodeId: number) => {
    return edges.find((edge) => Number(edge.source) === sourceNodeId && Number(edge.target) === targetNodeId);
  };
  
  if (!projectId) return null;

  return (
    <div className={`flex flex-col bg-white border border-slate-200 shadow-xl transition-all duration-300 ease-in-out ${isFullScreen ? "fixed top-4 left-4 right-4 bottom-4 z-50 rounded-2xl h-auto bg-white/95 backdrop-blur-md" : "rounded-xl w-full h-145"}`}>
      <div className="flex items-center gap-2 p-2">
        <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
        <h3 className="text-xs font-bold text-slate-950 uppercase tracking-wider">Project Copilot Workspace</h3>
      </div>

      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-4 py-3 shrink-0">
        <ToolbarButton position="top-left" icon="။။||၊" tooltip="Open Branch Navigator" active={isSidebarOpen} onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="px-2 py-1 border border-slate-200 rounded-md text-xs font-bold text-slate-700 shadow-sm" />
        <div className="flex items-center gap-1.5">
          <ToolbarButton icon={isFullScreen ? "➕ New Branch" : "➕"} tooltip="Create New Branch" onClick={() => {
    setIsNewChat(true);
    setActiveParentId(null);
    setThreadView({
      open: false,
      rootId: null,
    });
    setMessage("");
    setEditingMessageId(null);
  }} className="text-[11px] bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-md font-bold hover:bg-slate-50 transition-all" />
          {chatMessagesArray.length > 0 && (
            <ToolbarButton icon={isFullScreen ? "🗑 Reset Log" : "🗑"} tooltip="Delete Entire Chat History" onClick={handleWipeFullChat} className="text-[11px] text-red-500 border border-slate-200 hover:bg-red-50 px-2 py-1 rounded-md font-semibold transition-colors" />
          )}
          <ToolbarButton icon={isFullScreen ? "🗗 Compact" : "🗖 Fullscreen"} tooltip={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"} onClick={() => setIsFullScreen(!isFullScreen)} className="text-[11px] bg-slate-900 text-white px-2.5 py-1 rounded-md font-bold hover:bg-slate-800" />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden divide-x divide-slate-100 bg-white">
        <aside className={`bg-slate-50/30 p-2 space-y-1 overflow-y-auto flex flex-col shrink-0 transition-all duration-300 ${isSidebarOpen ? "w-52 opacity-100" : "w-0 opacity-0 pointer-events-none p-0! border-none"}`}>
          <div className="flex gap-2 mb-2">
            <ToolbarButton icon={sidebarMode === "tree" ? "@" : "+ chat list"} tooltip="Threads" position="bottom-left" onClick={() => setSidebarMode("explorer")} className={sidebarMode === "explorer" ? "bg-slate-900 text-white px-2 py-1 rounded" : "bg-slate-100 px-2 py-1 rounded"} />
            <ToolbarButton icon={sidebarMode !== "tree" ? "𖥧" : "+ chat tree"} tooltip="Tree" position="bottom-right" onClick={() => setSidebarMode("tree")} className={sidebarMode === "tree" ? "bg-slate-900 text-white px-2 py-1 rounded" : "bg-slate-100 px-2 py-1 rounded"} />
          </div>

          <div className="flex-1 space-y-1">
            {sidebarMode === "tree" ? renderSidebarTreeNodes(null) : (
              <>
                {!threadView.open ? (
                  rootThreads.map((thread) => (
                    <button key={thread.id} className="w-full text-left p-2 rounded-lg bg-slate-100 hover:bg-slate-300" onClick={() => { setThreadView({ open: true, rootId: thread.id }); setActiveParentId(getLatestBranchLeaf(thread.id)); setIsNewChat(false); setEditingMessageId(null); }}>
                      <div className="font-medium">{thread.content.length > 20 ? `${thread.content.substring(0, 20)}...` : thread.content}</div>
                    </button>
                  ))
                ) : (
                  <>
                    <button className="mb-2 text-xs" onClick={() => { setThreadView({ open: false, rootId: null }); setIsNewChat(true); }}>← Back</button>
                    {renderSidebarTreeNodes(threadView.rootId)}
                  </>
                )}
              </>
            )}
            {chatMessagesArray.filter((m) => m.role === "user").length === 0 && <div className="text-xs text-slate-400 italic px-2 py-4">No active branches.</div>}
          </div>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isNewChat && activeDisplayMessages.length === 0 ? (
              <div className="flex h-full items-center justify-center">🚀 Start a new conversation</div>
            ) : activeDisplayMessages.length === 0 ? (
              <div className="flex flex-col h-full items-center justify-center text-slate-400 text-center py-12 space-y-2 select-none">
                <span className="text-3xl">🚀</span>
                <p className="text-xs font-semibold max-w-xs text-slate-500">Query the project graph context or spawn nested discussion branches from the left thread panel mapping tree.</p>
              </div>
            ) : (
              activeDisplayMessages.map((msg, idx) => {
                const isUser = msg.role === "user";
                const isEditing = editingMessageId === msg.id;

                return (
                  <div key={msg.id || idx} className={`group relative flex flex-col max-w-[85%] rounded-xl px-4 py-3 text-sm shadow-sm border transition-all ${isUser ? "ml-auto bg-slate-900 text-slate-50 rounded-br-none border-slate-950" : "mr-auto bg-white border-slate-100 text-slate-800 rounded-bl-none"}`}>
                    <div className={`absolute -top-3.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center bg-white border border-slate-200 rounded-md shadow-md px-2 py-0.5 gap-2 z-10 ${isUser ? "right-2" : "left-2"}`}>
                      <button onClick={() => handleCopy(msg.id, msg.content)} className="text-[10px] font-bold text-slate-500 hover:text-slate-800">
                        {copiedId === msg.id ? "Copied ✓" : "📋 Copy"}
                      </button>
                      {isUser && !isEditing && (
                        <button onClick={() => { setEditingMessageId(msg.id); setEditValue(msg.content); }} className="text-[10px] font-bold text-slate-500 hover:text-slate-800">✏️ Edit</button>
                      )}
                      {isUser && (
                        <button onClick={() => { setActiveParentId(Number(msg.id)); setMessage(""); }} className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800" title="Spawn sub-chat branching loops">🌿 Sub-Chat</button>
                      )}
                      {!isUser && (
                        <button onClick={() => handleSend({ overridePrompt: "", isRegenerate: true })} className="text-[10px] font-bold text-cyan-600 hover:text-cyan-800">↻ Regenerate</button>
                      )}
                      <button onClick={() => handleDeletePair(msg.id)} className="text-[10px] font-bold text-red-500 hover:text-red-700">🗑️ Delete</button>
                    </div>

                    {isEditing ? (
                      <div className="space-y-2 py-1 min-w-60">
                        <textarea value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-full bg-slate-800 text-white border border-slate-700 rounded p-2 text-xs focus:outline-none resize-none font-sans" rows={2} />
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => setEditingMessageId(null)} className="px-2 py-0.5 text-[10px] bg-slate-700 text-slate-200 rounded font-medium">Cancel</button>
                          <button onClick={() => handleSend({ overridePrompt: editValue.trim(), editMessageId: msg.id })} className="px-2 py-0.5 text-[10px] bg-cyan-600 text-white rounded font-medium">Save</button>
                        </div>
                      </div>
                    ) : isUser ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    ) : (
                      <article className="prose prose-slate prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-headings:my-1 prose-ul:list-disc prose-ul:ml-4">
                        {msg.content === "Thinking..." ? (
                          <div className="flex items-center gap-2 text-slate-500 italic"><span className="animate-pulse">●</span>Thinking...</div>
                        ) : (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        )}
                      </article>
                    )}
                  </div>
                );
              })
            )}
            {errorMsg && <div className="max-w-[85%] rounded-lg bg-red-50 border border-red-100 p-2 text-xs text-red-700 font-medium">{errorMsg}</div>}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-slate-100 p-3 bg-white shrink-0">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
              <input value={message} onChange={(e) => setMessage(e.target.value)} disabled={isLoading || isHistoryLoading} className="h-10 flex-1 rounded-lg border border-slate-200 bg-slate-50/50 px-3.5 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-slate-400 focus:bg-white" placeholder={activeParentId ? "Replying inside this sub-thread branch..." : "Query project knowledge graph maps..."} />
              <button type="submit" disabled={!message.trim() || isLoading || isHistoryLoading} className="h-10 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 transition-all shadow-sm">Send</button>
            </form>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <button onClick={async () => { const result = await analyzeGraphRelationships(projectId); setGraphRelationships(result.missing_relationships || []); }} className="w-full bg-indigo-600 text-white rounded px-4 py-2">Analyze Graph Connections</button>
        {graphRelationships.length > 0 && (
          <button onClick={async () => {
            let created = 0, updated = 0, unchanged = 0;
            for (const relationship of graphRelationships) {
              const sourceNode = nodes.find((n) => n.data.title === relationship.source);
              const targetNode = nodes.find((n) => n.data.title === relationship.target);
              if (!sourceNode || !targetNode) continue;
              const existing = findExistingRelationship(Number(sourceNode.id), Number(targetNode.id));
              if (!existing) {
                await createRelationship(Number(sourceNode.id), Number(targetNode.id), relationship.type, projectId);
                created++;
              } else if (existing.label !== relationship.type) {
                await updateRelationship(Number(existing.id), relationship.type);
                updated++;
              } else { unchanged++; }
            }
            setRelationshipSummary({ created, updated, unchanged });
            triggerGraphRefresh();
            setGraphRelationships([]);
          }} className="w-full bg-emerald-600 text-white rounded px-4 py-2 mt-2">Accept All Relationships</button>
        )}

        {relationshipSummary && (
          <div className="mt-4 border rounded-lg p-4 bg-green-50">
            <div className="font-semibold mb-2">Graph Update Summary</div>
            <div>✅ Created: {relationshipSummary.created}</div>
            <div>🔄 Updated: {relationshipSummary.updated}</div>
            <div>⚪ Unchanged: {relationshipSummary.unchanged}</div>
          </div>
        )}

        {graphRelationships.map((relationship, index) => (
          <div key={index} className="border rounded p-3 mt-2">
            <div><strong>{relationship.source}</strong> → <strong>{relationship.target}</strong></div>
            <div className="text-sm text-gray-500">{relationship.type}</div>
            <button onClick={async () => {
              const sourceNode = nodes.find((n) => n.data.title === relationship.source);
              const targetNode = nodes.find((n) => n.data.title === relationship.target);
              if (!sourceNode || !targetNode) return;
              await createRelationship(Number(sourceNode.id), Number(targetNode.id), relationship.type, projectId);
              triggerGraphRefresh();
              setGraphRelationships((prev) => prev.filter((_, i) => i !== index));
            }} className="mt-2 bg-blue-600 text-white px-3 py-1 rounded">Accept</button>
          </div>
        ))}
      </div>
    </div>
  );
}