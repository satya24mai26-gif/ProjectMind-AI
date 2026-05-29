import { ChatMessage } from "./chat";

export type NodeType =
  | "research"
  | "task"
  | "code"
  | "memory";


export interface ProjectMindNodeData {
    title: string;
    description: string;
    tags: string[];
    nodeType: NodeType;
    notes: string;
    messages: ChatMessage[];
  }