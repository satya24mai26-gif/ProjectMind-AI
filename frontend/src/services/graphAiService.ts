import { buildContext } from "./contextBuilder";
import { askAI }
from "./aiApi";

export async function askGraphAI(
  selectedNode: any,
  nodes: any[],
  edges: any[],
  question: string
) {
  const context = buildContext(
    selectedNode,
    edges,
    nodes
  );

  const result =
  await askAI(
    question,
    context
  );

return result.answer;
}