/**
 * Flowchart graph model for the Animated tab.
 *
 * Pure module (no DOM, no React) so the topology rules that drive the
 * request-flow simulation stay unit testable under `node --test`.
 *
 * The model is recovered from mermaid's rendered SVG (see
 * `flow-graph-dom.ts`), not by re-parsing mermaid syntax: mermaid keeps the
 * only layout, and its deterministic DOM ids carry the topology.
 *
 * ID contract observed in mermaid@11 (flowchart-v2, dagre):
 * - node groups: `<g class="node …" id="flowchart-<srcId>-<counter>">`
 * - edge paths: `<path id="<renderId>-<edgeId>" class="… flowchart-link">`
 * - edge ids: `L_<from>_<to>_<counter>` (prefix "L")
 */

/** Mermaid's per-render DOM prefix for flowchart node group ids. */
export const MERMAID_FLOW_NODE_PREFIX = "flowchart-";

/** Mermaid's per-edge DOM prefix for flowchart-v2 link ids. */
export const MERMAID_FLOW_EDGE_PREFIX = "L_";

/** Upper bound on hops in one trace so cyclic diagrams always terminate. */
export const MAX_TRACE_HOPS = 500;

export type FlowNodeRole = "default" | "terminal" | "action" | "decision";

export interface FlowNode {
  /** Source-level id (`A` in `A[Label]`); the DOM counter suffix is dropped. */
  id: string;
  /** Full DOM id (`flowchart-A-0`); used to highlight the node in the SVG. */
  domId: string;
  /** Visible label text, recovered from the node's label group. */
  label: string;
  /** Semantic role, derived from the node's classes/shape (see below). */
  role: FlowNodeRole;
  /** Outgoing edge ids in stable DOM order. */
  outgoing: string[];
  /** Incoming edge ids in stable DOM order. */
  incoming: string[];
}

export interface FlowEdge {
  /** Full DOM id (`<renderId>-L_A_B_0`); used to find the path element. */
  domId: string;
  /** Source-level edge id (`L_A_B_0`), empty when the DOM id won't parse. */
  edgeId: string;
  from: string;
  to: string;
  /** Visible edge label text (`GET /users`), may be empty. */
  label: string;
}

export interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

/** One request hop: a packet travels `edgeId` from `from` to `to`. */
export interface FlowHop {
  edgeId: string;
  from: string;
  to: string;
  /** BFS depth from the entry node; hops at the same depth run in parallel. */
  depth: number;
}

export interface FlowTrace {
  hops: FlowHop[];
  /** Source ids with no incoming edges — the candidate entry points. */
  entryCandidates: string[];
  /** The entry the trace was actually built from. */
  entryId: string;
  /** Source ids that exist but no hop reaches (reported, not animated). */
  unreachable: string[];
  /** True when the hop cap stopped the walk (dense or cyclic diagrams). */
  truncated: boolean;
}

/**
 * Parse a source-level edge id of the form `L_<from>_<to>_<counter>` into
 * its endpoints. Returns null for user-defined ids, older formats, and ids
 * whose source ids genuinely contain underscores (ambiguous by construction).
 */
export function parseEdgeEndpoints(edgeId: string): { from: string; to: string } | null {
  if (!edgeId.startsWith(MERMAID_FLOW_EDGE_PREFIX)) return null;
  const body = edgeId.slice(MERMAID_FLOW_EDGE_PREFIX.length);
  const lastSep = body.lastIndexOf("_");
  if (lastSep === -1) return null;
  const stem = body.slice(0, lastSep);
  const firstSep = stem.indexOf("_");
  if (firstSep === -1) return null;
  const from = stem.slice(0, firstSep);
  const to = stem.slice(firstSep + 1);
  if (!from || !to || from.includes("_") || to.includes("_")) return null;
  return { from, to };
}

/** Node source id held in a DOM id like `flowchart-A-0`. */
export function nodeSourceId(domId: string): string | null {
  // `mermaid.render(renderId, ...)` prefixes generated SVG IDs with the
  // caller's renderId, e.g. `mermaid-abc-flowchart-Client-0`.
  const prefixIndex = domId.lastIndexOf(MERMAID_FLOW_NODE_PREFIX);
  if (prefixIndex === -1) return null;
  const rest = domId.slice(prefixIndex + MERMAID_FLOW_NODE_PREFIX.length);
  const sep = rest.lastIndexOf("-");
  // Plain `flowchart-A` (no counter) is not a mermaid flowchart-v2 node.
  if (sep === -1) return null;
  const id = rest.slice(0, sep);
  return id ? id : null;
}

/**
 * Classify a node from its DOM evidence. Terminal/action roles come from
 * the project's `:::flow-start` / `:::flow-action` classes; decisions are
 * the diamond polygons mermaid draws for `{…}` nodes.
 */
export function classifyFlowNode(
  classList: readonly string[],
  hasPolygon: boolean,
): FlowNodeRole {
  if (classList.includes("flow-start")) return "terminal";
  if (classList.includes("flow-action")) return "action";
  if (hasPolygon) return "decision";
  return "default";
}


/**
 * Build an adjacency-rich graph from unordered node/edge records. Self-loops
 * and edges pointing at unknown nodes are kept for the unsequenced fallback
 * (packets can still travel them) but never entered into the BFS trace, so a
 * degenerate extraction cannot hang the simulator.
 */
export function buildFlowGraph(
  nodes: Array<{ id: string; domId: string; label: string; role: FlowNodeRole }>,
  edges: Array<{ domId: string; edgeId: string; from: string; to: string; label: string }>,
): FlowGraph {
  const byId = new Map<string, FlowNode>();
  const graphNodes: FlowNode[] = nodes.map((node) => {
    const entry: FlowNode = { ...node, outgoing: [], incoming: [] };
    // First record wins for duplicate ids; duplicates are a degenerate case.
    if (!byId.has(node.id)) byId.set(node.id, entry);
    return entry;
  });

  const graphEdges: FlowEdge[] = edges.map((edge) => ({ ...edge }));
  for (const edge of graphEdges) {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to || edge.from === edge.to) continue;
    from.outgoing.push(edge.domId);
    to.incoming.push(edge.domId);
  }
  return { nodes: graphNodes, edges: graphEdges };
}

function edgeByDomId(graph: FlowGraph, domId: string): FlowEdge | undefined {
  return graph.edges.find((edge) => edge.domId === domId);
}

/**
 * Order the graph's hops for the request simulation. BFS from the entry node
 * so sibling services animate together; the walk revisits each directed edge
 * at most once and stops at MAX_TRACE_HOPS, which guarantees termination on
 * cyclic diagrams (retries, polling loops).
 *
 * When `entryId` is missing or unknown, the first entry candidate is used;
 * when the graph has no candidates (every node has an incoming edge), the
 * first node is used so pure cycles still animate.
 */
export function buildFlowTrace(graph: FlowGraph, entryId?: string): FlowTrace {
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const entryCandidates = graph.nodes
    .filter((node) => node.incoming.length === 0)
    .map((node) => node.id);
  const entry =
    (entryId && nodeIds.has(entryId) ? entryId : undefined) ??
    entryCandidates[0] ??
    graph.nodes[0]?.id ??
    "";

  const hops: FlowHop[] = [];
  const visitedEdges = new Set<string>();
  let truncated = false;
  if (entry) {
    const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: entry, depth: 0 }];
    const queuedNodes = new Set([entry]);
    while (queue.length > 0) {
      const current = queue.shift()!;
      const node = graph.nodes.find((n) => n.id === current.nodeId);
      if (!node) continue;
      for (const edgeDomId of node.outgoing) {
        if (visitedEdges.has(edgeDomId)) continue;
        const edge = edgeByDomId(graph, edgeDomId);
        // Edges whose target vanished between extraction and now are skipped
        // rather than crashing the walk.
        if (!edge || !nodeIds.has(edge.to)) continue;
        if (hops.length >= MAX_TRACE_HOPS) {
          truncated = true;
          queue.length = 0;
          break;
        }
        visitedEdges.add(edgeDomId);
        hops.push({ edgeId: edge.domId, from: edge.from, to: edge.to, depth: current.depth });
        if (!queuedNodes.has(edge.to)) {
          queuedNodes.add(edge.to);
          queue.push({ nodeId: edge.to, depth: current.depth + 1 });
        }
      }
    }
  }

  const reached = new Set<string>([entry, ...hops.flatMap((hop) => [hop.from, hop.to])]);
  const unreachable = graph.nodes.map((node) => node.id).filter((id) => !reached.has(id));

  return { hops, entryCandidates, entryId: entry, unreachable, truncated };
}

/** Flowcharts mermaid reports as `flowchart` / `flowchart-v2` (plus legacy `graph`). */
export function isFlowchartDiagramType(diagramType: string): boolean {
  return diagramType === "flowchart" || diagramType === "flowchart-v2" || diagramType === "graph";
}

