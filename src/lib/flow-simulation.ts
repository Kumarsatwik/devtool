import type { FlowEdge, FlowGraph } from "./flow-graph.ts";

export const SIMULATION_CONFIG_VERSION = 2;
export const DEFAULT_PROCESSING_MS = 450;
export const DEFAULT_LATENCY_MS = 300;
export const DEFAULT_CAPACITY = 1;
export const DEFAULT_QUEUE_LIMIT = 5;
export const MAX_SIMULATION_REQUESTS = 100;
export const MAX_SIMULATION_EVENTS = 30_000;

export interface NodeSimulationSettings {
  processingMs: number;
  capacity: number;
  queueLimit: number;
}

export interface EdgeSimulationSettings {
  latencyMs: number;
}

export type TrafficScenario =
  | { mode: "count"; requestCount: number; intervalMs: number }
  | { mode: "rate"; requestsPerSecond: number; durationMs: number };

export interface FlowSimulationConfig {
  version: typeof SIMULATION_CONFIG_VERSION;
  nodes: Record<string, NodeSimulationSettings>;
  edges: Record<string, EdgeSimulationSettings>;
  traffic: TrafficScenario;
}

export type SimulationEventKind =
  | "request_start"
  | "dispatch"
  | "arrival"
  | "queued"
  | "processing_start"
  | "processing_complete"
  | "request_complete"
  | "request_rejected"
  | "overload_start"
  | "overload_end";

export interface SimulationEvent {
  at: number;
  order: number;
  kind: SimulationEventKind;
  requestId: string;
  taskId?: string;
  nodeId?: string;
  edgeId?: string;
  edgeDomId?: string;
  from?: string;
  to?: string;
  label?: string;
  waitMs?: number;
  queuePosition?: number;
}

export interface SimulationSummary {
  requestCount: number;
  completedRequests: number;
  rejectedRequests: number;
  durationMs: number;
  averageLatencyMs: number;
  totalQueueWaitMs: number;
  averageQueueWaitMs: number;
  maxQueueLength: number;
  truncated: boolean;
}

export interface FlowSimulation {
  events: SimulationEvent[];
  durationMs: number;
  summary: SimulationSummary;
}

export interface SimulationFrame {
  inFlight: Array<{
    key: string;
    requestId: string;
    edgeDomId: string;
    progress: number;
  }>;
  processing: Set<string>;
  started: Set<string>;
  overloaded: Set<string>;
  completedRequests: number;
  rejectedRequests: number;
}

export const SIMULATION_CONFIG_MARKER = `%% @simulator:v${SIMULATION_CONFIG_VERSION} `;

function clampInteger(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function createDefaultSimulationConfig(graph: FlowGraph): FlowSimulationConfig {
  return {
    version: SIMULATION_CONFIG_VERSION,
    nodes: Object.fromEntries(
      graph.nodes.map((node) => [node.id, {
        processingMs: node.role === "terminal" ? 0 : DEFAULT_PROCESSING_MS,
        capacity: DEFAULT_CAPACITY,
        queueLimit: DEFAULT_QUEUE_LIMIT,
      }]),
    ),
    edges: Object.fromEntries(
      graph.edges.map((edge) => [edge.edgeId, { latencyMs: DEFAULT_LATENCY_MS }]),
    ),
    traffic: { mode: "count", requestCount: 1, intervalMs: 500 },
  };
}

function sanitizeTraffic(value: unknown): TrafficScenario {
  if (typeof value !== "object" || value === null) {
    return { mode: "count", requestCount: 1, intervalMs: 500 };
  }
  const candidate = value as Record<string, unknown>;
  if (candidate.mode === "rate") {
    return {
      mode: "rate",
      requestsPerSecond: Math.min(20, Math.max(0.1,
        typeof candidate.requestsPerSecond === "number" && Number.isFinite(candidate.requestsPerSecond)
          ? candidate.requestsPerSecond
          : 1,
      )),
      durationMs: clampInteger(candidate.durationMs, 10_000, 100, 60_000),
    };
  }
  return {
    mode: "count",
    requestCount: clampInteger(candidate.requestCount, 1, 1, MAX_SIMULATION_REQUESTS),
    intervalMs: clampInteger(candidate.intervalMs, 500, 50, 10_000),
  };
}

/** Parse the portable Mermaid comment without making rendering depend on it. */
export function readSimulationConfig(source: string): {
  config: Partial<FlowSimulationConfig> | null;
  warning: string | null;
} {
  const lines = source.split(/\r?\n/);
  const marked = lines.filter((line) => /^%% @simulator:v\d+\s/.test(line));
  if (marked.length === 0) return { config: null, warning: null };
  if (marked.length > 1) {
    return { config: null, warning: "Multiple simulator settings comments found. Defaults are in use." };
  }

  try {
    const marker = marked[0].match(/^%% @simulator:v(\d+)\s/);
    const savedVersion = Number(marker?.[1]);
    if (!marker || ![1, SIMULATION_CONFIG_VERSION].includes(savedVersion)) {
      return { config: null, warning: "These saved simulator settings use an unsupported version. Defaults are in use." };
    }
    const payload = marked[0].replace(/^%% @simulator:v\d+\s/, "");
    const parsed: unknown = JSON.parse(payload);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("Invalid settings");
    const value = parsed as Record<string, unknown>;
    if (value.version !== savedVersion) {
      return { config: null, warning: "These saved simulator settings use an unsupported version. Defaults are in use." };
    }
    const nodes: FlowSimulationConfig["nodes"] = {};
    if (typeof value.nodes === "object" && value.nodes !== null && !Array.isArray(value.nodes)) {
      for (const [id, raw] of Object.entries(value.nodes)) {
        if (!id || typeof raw !== "object" || raw === null) continue;
        const settings = raw as Record<string, unknown>;
        nodes[id] = {
          processingMs: clampInteger(settings.processingMs, DEFAULT_PROCESSING_MS, 0, 60_000),
          capacity: clampInteger(
            savedVersion === 1 ? settings.concurrency : settings.capacity,
            DEFAULT_CAPACITY,
            1,
            100,
          ),
          queueLimit: clampInteger(
            savedVersion === 1 ? MAX_SIMULATION_REQUESTS : settings.queueLimit,
            DEFAULT_QUEUE_LIMIT,
            0,
            MAX_SIMULATION_REQUESTS,
          ),
        };
      }
    }
    const edges: FlowSimulationConfig["edges"] = {};
    if (typeof value.edges === "object" && value.edges !== null && !Array.isArray(value.edges)) {
      for (const [id, raw] of Object.entries(value.edges)) {
        if (!id || typeof raw !== "object" || raw === null) continue;
        const settings = raw as Record<string, unknown>;
        edges[id] = { latencyMs: clampInteger(settings.latencyMs, DEFAULT_LATENCY_MS, 0, 60_000) };
      }
    }
    return {
      config: { version: SIMULATION_CONFIG_VERSION, nodes, edges, traffic: sanitizeTraffic(value.traffic) },
      warning: savedVersion === 1 ? "Simulator settings were upgraded. Save the diagram to keep the new capacity settings." : null,
    };
  } catch {
    return { config: null, warning: "Saved simulator settings are malformed. Defaults are in use." };
  }
}

export function writeSimulationConfig(source: string, config: FlowSimulationConfig): string {
  const line = `${SIMULATION_CONFIG_MARKER}${JSON.stringify(config)}`;
  const lines = source.split(/\r?\n/).filter((entry) => !/^%% @simulator:v\d+\s/.test(entry));
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return `${lines.join("\n")}\n${line}`;
}

/** Merge saved settings with graph defaults, dropping ids no longer in the diagram. */
export function resolveSimulationConfig(
  graph: FlowGraph,
  saved?: Partial<FlowSimulationConfig> | null,
): FlowSimulationConfig {
  const defaults = createDefaultSimulationConfig(graph);
  const nodes = Object.fromEntries(graph.nodes.map((node) => {
    const settings = saved?.nodes?.[node.id];
    return [node.id, {
      processingMs: clampInteger(settings?.processingMs, defaults.nodes[node.id].processingMs, 0, 60_000),
      capacity: clampInteger(settings?.capacity, defaults.nodes[node.id].capacity, 1, 100),
      queueLimit: clampInteger(settings?.queueLimit, defaults.nodes[node.id].queueLimit, 0, MAX_SIMULATION_REQUESTS),
    }];
  }));
  const edges = Object.fromEntries(graph.edges.map((edge) => {
    const settings = saved?.edges?.[edge.edgeId];
    return [edge.edgeId, {
      latencyMs: clampInteger(settings?.latencyMs, DEFAULT_LATENCY_MS, 0, 60_000),
    }];
  }));
  return {
    version: SIMULATION_CONFIG_VERSION,
    nodes,
    edges,
    traffic: sanitizeTraffic(saved?.traffic),
  };
}

interface ScheduledAction {
  at: number;
  order: number;
  run: () => void;
}

function compareActions(a: ScheduledAction, b: ScheduledAction) {
  return a.at - b.at || a.order - b.order;
}

function pushAction(heap: ScheduledAction[], action: ScheduledAction) {
  heap.push(action);
  let index = heap.length - 1;
  while (index > 0) {
    const parent = Math.floor((index - 1) / 2);
    if (compareActions(heap[parent], heap[index]) <= 0) break;
    [heap[parent], heap[index]] = [heap[index], heap[parent]];
    index = parent;
  }
}

function popAction(heap: ScheduledAction[]) {
  if (heap.length === 0) return undefined;
  const first = heap[0];
  const last = heap.pop()!;
  if (heap.length > 0) {
    heap[0] = last;
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let smallest = index;
      if (left < heap.length && compareActions(heap[left], heap[smallest]) < 0) smallest = left;
      if (right < heap.length && compareActions(heap[right], heap[smallest]) < 0) smallest = right;
      if (smallest === index) break;
      [heap[index], heap[smallest]] = [heap[smallest], heap[index]];
      index = smallest;
    }
  }
  return first;
}

/** Build one deterministic bounded run, simulating each request once per edge. */
export function buildFlowSimulation(
  graph: FlowGraph,
  config: FlowSimulationConfig,
): FlowSimulation {
  const actions: ScheduledAction[] = [];
  const events: SimulationEvent[] = [];
  let nextOrder = 0;
  let now = 0;
  let maxQueueLength = 0;
  let totalQueueWaitMs = 0;
  const latencies: number[] = [];
  const completed = new Set<string>();
  const rejected = new Set<string>();
  const overloadedNodes = new Set<string>();
  const startedAt = new Map<string, number>();
  const pendingWork = new Map<string, number>();
  const visitedByRequest = new Map<string, Set<string>>();
  const busyByNode = new Map<string, number>();
  const queues = new Map<string, Array<{ requestId: string; taskId: string; arrivedAt: number }>>();
  const edgeByDomId = new Map(graph.edges.map((edge) => [edge.domId, edge]));
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  let releaseTimes: number[];
  const traffic = config.traffic;
  if (traffic.mode === "count") {
    releaseTimes = Array.from(
      { length: Math.min(MAX_SIMULATION_REQUESTS, traffic.requestCount) },
      (_, index) => index * traffic.intervalMs,
    );
  } else {
    releaseTimes = Array.from(
      { length: Math.min(MAX_SIMULATION_REQUESTS, Math.ceil(traffic.requestsPerSecond * traffic.durationMs / 1000)) },
      (_, index) => index * 1000 / traffic.requestsPerSecond,
    ).filter((at) => at < traffic.durationMs);
  }

  const emit = (event: Omit<SimulationEvent, "at" | "order">, at = now) => {
    if (events.length >= MAX_SIMULATION_EVENTS) return;
    events.push({ ...event, at: Math.max(0, at), order: nextOrder++ });
  };

  const schedule = (at: number, run: () => void) => {
    pushAction(actions, { at, order: nextOrder++, run });
  };

  const insertNodeTask = (requestId: string, nodeId: string, taskId: string, at: number) => {
    const node = nodesById.get(nodeId);
    if (!node) return;
    const settings = config.nodes[nodeId] ?? {
      processingMs: DEFAULT_PROCESSING_MS,
      capacity: DEFAULT_CAPACITY,
      queueLimit: DEFAULT_QUEUE_LIMIT,
    };
    const queue = queues.get(nodeId) ?? [];
    queues.set(nodeId, queue);
    const task = { requestId, taskId, arrivedAt: at };
    if ((busyByNode.get(nodeId) ?? 0) >= settings.capacity) {
      if (queue.length >= settings.queueLimit) {
        if (!overloadedNodes.has(nodeId)) {
          overloadedNodes.add(nodeId);
          emit({ kind: "overload_start", requestId, taskId, nodeId }, at);
        }
        rejected.add(requestId);
        emit({ kind: "request_rejected", requestId, taskId, nodeId }, at);
        pendingWork.set(requestId, (pendingWork.get(requestId) ?? 1) - 1);
        return;
      }
      queue.push(task);
      maxQueueLength = Math.max(maxQueueLength, queue.length);
      emit({ kind: "queued", requestId, taskId, nodeId, queuePosition: queue.length }, at);
      return;
    }

    const startTask = (next: typeof task, started: number) => {
      busyByNode.set(nodeId, (busyByNode.get(nodeId) ?? 0) + 1);
      const waitMs = Math.max(0, started - next.arrivedAt);
      totalQueueWaitMs += waitMs;
      emit({ kind: "processing_start", requestId: next.requestId, taskId: next.taskId, nodeId, waitMs }, started);
      schedule(started + settings.processingMs, () => {
        now = started + settings.processingMs;
        emit({ kind: "processing_complete", requestId: next.requestId, taskId: next.taskId, nodeId }, now);
        busyByNode.set(nodeId, Math.max(0, (busyByNode.get(nodeId) ?? 1) - 1));

        const visited = visitedByRequest.get(next.requestId) ?? new Set<string>();
        visitedByRequest.set(next.requestId, visited);
        const outgoing = node.outgoing
          .map((domId) => edgeByDomId.get(domId))
          .filter((edge): edge is FlowEdge => Boolean(edge && !visited.has(edge.edgeId)));
        pendingWork.set(next.requestId, (pendingWork.get(next.requestId) ?? 1) - 1 + outgoing.length);

        for (const edge of outgoing) {
          visited.add(edge.edgeId);
          const latencyMs = config.edges[edge.edgeId]?.latencyMs ?? DEFAULT_LATENCY_MS;
          emit({
            kind: "dispatch", requestId: next.requestId, taskId: next.taskId,
            edgeId: edge.edgeId, edgeDomId: edge.domId, from: edge.from, to: edge.to, label: edge.label,
          }, now);
          const arrivalTaskId = `${next.requestId}:${edge.edgeId}`;
          schedule(now + latencyMs, () => {
            const arrivalAt = now;
            emit({
              kind: "arrival", requestId: next.requestId, taskId: arrivalTaskId,
              nodeId: edge.to, edgeId: edge.edgeId, edgeDomId: edge.domId,
              from: edge.from, to: edge.to, label: edge.label,
            }, arrivalAt);
            insertNodeTask(next.requestId, edge.to, arrivalTaskId, arrivalAt);
          });
        }

        const waiting = queue.shift();
        if (waiting) startTask(waiting, now);
        if (
          overloadedNodes.has(nodeId) &&
          ((busyByNode.get(nodeId) ?? 0) < settings.capacity || queue.length < settings.queueLimit)
        ) {
          overloadedNodes.delete(nodeId);
          emit({ kind: "overload_end", requestId: next.requestId, nodeId }, now);
        }
        if (
          (pendingWork.get(next.requestId) ?? 0) === 0 &&
          !completed.has(next.requestId) &&
          !rejected.has(next.requestId)
        ) {
          completed.add(next.requestId);
          const latency = now - (startedAt.get(next.requestId) ?? now);
          latencies.push(latency);
          emit({ kind: "request_complete", requestId: next.requestId }, now);
        }
      });
    };
    startTask(task, at);
  };

  const entryId = graph.nodes.find((node) => node.incoming.length === 0)?.id ?? graph.nodes[0]?.id;
  if (entryId) {
    releaseTimes.forEach((releaseAt, index) => {
      const requestId = `REQ-${String(index + 1).padStart(3, "0")}`;
      schedule(releaseAt, () => {
        now = releaseAt;
        startedAt.set(requestId, releaseAt);
        pendingWork.set(requestId, 1);
        visitedByRequest.set(requestId, new Set());
        emit({ kind: "request_start", requestId, nodeId: entryId }, now);
        insertNodeTask(requestId, entryId, `${requestId}:entry`, now);
      });
    });
  }

  while (actions.length > 0 && events.length < MAX_SIMULATION_EVENTS) {
    const action = popAction(actions)!;
    now = action.at;
    action.run();
  }

  const requestCount = releaseTimes.length;
  const lastEventAt = events.reduce((latest, event) => Math.max(latest, event.at), 0);
  const durationMs = Math.max(0, lastEventAt);
  return {
    events: events.sort((a, b) => a.at - b.at || a.order - b.order),
    durationMs,
    summary: {
      requestCount,
      completedRequests: completed.size,
      rejectedRequests: rejected.size,
      durationMs,
      averageLatencyMs: latencies.length ? latencies.reduce((sum, value) => sum + value, 0) / latencies.length : 0,
      totalQueueWaitMs,
      averageQueueWaitMs: completed.size ? totalQueueWaitMs / completed.size : 0,
      maxQueueLength,
      truncated: actions.length > 0 || events.length >= MAX_SIMULATION_EVENTS,
    },
  };
}

export function sampleFlowSimulation(
  simulation: FlowSimulation,
  elapsedMs: number,
): SimulationFrame {
  const now = Math.max(0, elapsedMs);
  const inFlight = new Map<string, { requestId: string; edgeDomId: string; at: number }>();
  const arrivalTimes = new Map<string, number>();
  for (const event of simulation.events) {
    if (event.kind === "arrival" && event.edgeId) {
      arrivalTimes.set(`${event.requestId}:${event.edgeId}`, event.at);
    }
  }
  const processingTasks = new Map<string, string>();
  const started = new Set<string>();
  const overloaded = new Set<string>();
  const rejectedRequests = new Set<string>();
  let completedRequests = 0;

  for (const event of simulation.events) {
    if (event.at > now) break;
    if (event.kind === "dispatch" && event.edgeDomId) {
      inFlight.set(`${event.requestId}:${event.edgeId}`, {
        requestId: event.requestId,
        edgeDomId: event.edgeDomId,
        at: event.at,
      });
    } else if (event.kind === "arrival" && event.edgeId) {
      inFlight.delete(`${event.requestId}:${event.edgeId}`);
      if (event.nodeId) started.add(event.nodeId);
    } else if (event.kind === "processing_start" && event.nodeId && event.taskId) {
      processingTasks.set(event.taskId, event.nodeId);
      started.add(event.nodeId);
    } else if (event.kind === "processing_complete" && event.taskId) {
      processingTasks.delete(event.taskId);
    } else if (event.kind === "request_start" && event.nodeId) {
      started.add(event.nodeId);
    } else if (event.kind === "request_complete") {
      completedRequests += 1;
    } else if (event.kind === "request_rejected") {
      rejectedRequests.add(event.requestId);
    } else if (event.kind === "overload_start" && event.nodeId) {
      overloaded.add(event.nodeId);
    } else if (event.kind === "overload_end" && event.nodeId) {
      overloaded.delete(event.nodeId);
    }
  }

  return {
    inFlight: [...inFlight].map(([key, packet]) => {
      const span = Math.max(1, (arrivalTimes.get(key) ?? simulation.durationMs) - packet.at);
      return {
        key,
        requestId: packet.requestId,
        edgeDomId: packet.edgeDomId,
        progress: Math.min(1, Math.max(0, (now - packet.at) / span)),
      };
    }),
    processing: new Set(processingTasks.values()),
    started,
    overloaded,
    completedRequests,
    rejectedRequests: rejectedRequests.size,
  };
}
