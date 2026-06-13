import { buildContext } from "./contextBuilder";
import { askAI } from "./aiApi";

export async function askGraphAI(
  selectedNode: any,
  nodes: any[],
  edges: any[],
  question: string
): Promise<string> {
  if (!selectedNode) throw new Error("A valid active node context is required.");

  // Build the state structure
  const context = buildContext(selectedNode, edges, nodes);

  // Await and extract payload safely
  const result = await askAI(question, context);
  
  return result.answer || "No response received from the engine.";
}


