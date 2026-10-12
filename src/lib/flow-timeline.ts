import type { FlowEdge, FlowGraph, FlowHop, FlowNode } from "./flow-graph.ts";

/**
 * Timeline scheduler for the Animated tab.
 *
 * Pure module (no DOM, no React): converts an ordered hop list into the
 * request events the playback loop renders, and answers "what is active at
 * time T" for any T. All of this is covered by `tests/flow-timeline.test.ts`.
 */

export type FlowEventKind = "dispatch" | "arrive" | "process" | "idle";

export interface FlowEvent {
  /** Milliseconds from the start of the loop. */
  at: number;
  kind: Exclude<FlowEventKind, "idle">;
  hopIndex: number;
  edgeDomId: string;
  from: string;
  to: string;
  /** Edge label text (e.g. `GET /users`), for the event log. */
  label: string;
}

export interface FlowPlayback {
  /** Total loop length in ms; the player wraps elapsed time by this. */
  durationMs: number;
  events: FlowEvent[];
}

export interface FlowSample {
  /** Edge DOM id → packet progress (0 = just dispatched, 1 = arriving). */
  inFlight: Map<string, number>;
  /** Node ids currently processing a received request. */
  processing: Set<string>;
  /** Node ids that have started (received) at least one request. */
  started: Set<string>;
  /** Number of dispatch events whose time has passed. */
  dispatchedCount: number;
}

export interface FlowTimelineOptions {
  /** Packet travel time per hop. Defaults to DEFAULT_HOP_MS. */
  hopMs?: number;
  /** How long a node glows after a request arrives. Defaults to PROCESSING_MS. */
  processMs?: number;
  /** Pause between the last hop and the loop restart. Defaults to LOOP_PAUSE_MS. */
  loopPauseMs?: number;
}

/** Packet travel time per hop, before the speed multiplier is applied. */
export const DEFAULT_HOP_MS = 900;

/** How long a node shows its "processing" state after a request arrives. */
export const PROCESSING_MS = 1100;

/** Pause between the last hop finishing and the trace restarting. */
export const LOOP_PAUSE_MS = 1400;

/** Maximum arrival offset between siblings so parallel hops stay readable. */
const STAGGER_STEP_MS = 120;

/**
 * Schedule hops that share a BFS depth as a parallel wave: packets leave
 * together, with a small per-hop stagger so overlapping edges stay readable.
 * A later wave only starts after every packet and processing glow of the
 * previous wave has finished, keeping cause and effect visually ordered.
 */
export function buildTimeline(
  hops: FlowHop[],
  edgesByDomId: Map<string, FlowEdge>,
  options: FlowTimelineOptions = {},
): FlowPlayback {
  const hopMs = options.hopMs ?? DEFAULT_HOP_MS;
  const processMs = options.processMs ?? PROCESSING_MS;
  const loopPauseMs = options.loopPauseMs ?? LOOP_PAUSE_MS;

  const byDepth = new Map<number, FlowHop[]>();
  hops.forEach((hop) => {
    const wave = byDepth.get(hop.depth) ?? [];
    wave.push({ ...hop });
    byDepth.set(hop.depth, wave);
  });

  const events: FlowEvent[] = [];
  let cursor = 0;
  const hopOrder = new Map(hops.map((hop, index) => [hop.edgeId, index]));
  const depths = [...byDepth.keys()].sort((a, b) => a - b);
  for (const depth of depths) {
    const wave = byDepth.get(depth)!;
    let waveEnd = cursor;
    wave.forEach((hop, position) => {
      const hopIndex = hopOrder.get(hop.edgeId) ?? 0;
      const edge = edgesByDomId.get(hop.edgeId);
      const at = cursor + position * STAGGER_STEP_MS;
      events.push({
        at,
        kind: "dispatch",
        hopIndex,
        edgeDomId: hop.edgeId,
        from: hop.from,
        to: hop.to,
        label: edge?.label ?? "",
      });
      events.push({
        at: at + hopMs,
        kind: "arrive",
        hopIndex,
        edgeDomId: hop.edgeId,
        from: hop.from,
        to: hop.to,
        label: edge?.label ?? "",
      });
      events.push({
        at: at + hopMs + processMs,
        kind: "process",
        hopIndex,
        edgeDomId: hop.edgeId,
        from: hop.from,
        to: hop.to,
        label: edge?.label ?? "",
      });
      waveEnd = Math.max(waveEnd, at + hopMs + processMs);
    });
    cursor = waveEnd;
  }

  const durationMs = hops.length === 0 ? 0 : cursor + loopPauseMs;
  return { durationMs, events };
}


/** Build a DOM-id lookup once; the player passes it to `buildTimeline`. */
export function indexEdgesByDomId(graph: FlowGraph): Map<string, FlowEdge> {
  return new Map(graph.edges.map((edge) => [edge.domId, edge]));
}

/**
 * Totally order events for stable rendering and logging. Dispatch ordering
 * breaks ties towards the source of the hop list so parallel waves are
 * listed in the order their hops were traced.
 */
export function sortFlowEvents(events: FlowEvent[]): FlowEvent[] {
  return [...events].sort((a, b) => a.at - b.at || a.hopIndex - b.hopIndex);
}

/**
 * Node ids that receive at least one request, in first-arrival order. Powers
 * the "services touched" summary and the map of node id → display label.
 */
export function touchedNodes(hops: FlowHop[], nodesById: Map<string, FlowNode>): FlowNode[] {
  const seen = new Set<string>();
  const touched: FlowNode[] = [];
  for (const hop of hops) {
    for (const id of [hop.from, hop.to]) {
      if (seen.has(id)) continue;
      seen.add(id);
      const node = nodesById.get(id);
      if (node) touched.push(node);
    }
  }
  return touched;
}

/**
 * Answer "what is the diagram showing at `elapsedMs`". Pure in, pure out:
 * the playback loop calls this each frame and only touches the DOM to apply
 * the returned state, which keeps the rAF layer trivially thin.
 */
export function sampleTimeline(
  playback: FlowPlayback,
  elapsedMs: number,
  options: FlowTimelineOptions = {},
): FlowSample {
  const hopMs = options.hopMs ?? DEFAULT_HOP_MS;
  const processMs = options.processMs ?? PROCESSING_MS;

  const inFlight = new Map<string, number>();
  const processing = new Set<string>();
  const started = new Set<string>();
  let dispatchedCount = 0;

  for (const event of playback.events) {
    if (event.at > elapsedMs) continue;
    if (event.kind === "dispatch") {
      dispatchedCount += 1;
      started.add(event.from);
    } else if (event.kind === "arrive") {
      started.add(event.to);
    }
  }

  for (const event of playback.events) {
    if (event.kind === "dispatch") {
      if (event.at <= elapsedMs && elapsedMs < event.at + hopMs) {
        const span = Math.max(hopMs, 1);
        inFlight.set(event.edgeDomId, (elapsedMs - event.at) / span);
      }
    } else if (event.kind === "arrive") {
      if (event.at <= elapsedMs && elapsedMs < event.at + processMs) {
        processing.add(event.to);
      }
    }
  }

  return { inFlight, processing, started, dispatchedCount };
}

