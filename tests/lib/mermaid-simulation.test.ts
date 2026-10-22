import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFlowSimulation,
  createDefaultSimulationConfig,
  readSimulationConfig,
  resolveSimulationConfig,
  sampleFlowSimulation,
  writeSimulationConfig,
} from "../../src/lib/mermaid/simulation.ts";
import type { FlowGraph } from "../../src/lib/mermaid/graph.ts";

const graph: FlowGraph = {
  nodes: [
    {
      id: "A",
      domId: "flowchart-A-0",
      label: "Start",
      role: "terminal",
      outgoing: ["r-L_A_B_0"],
      incoming: [],
    },
    {
      id: "B",
      domId: "flowchart-B-0",
      label: "Work",
      role: "default",
      outgoing: [],
      incoming: ["r-L_A_B_0"],
    },
  ],
  edges: [
    {
      domId: "r-L_A_B_0",
      edgeId: "L_A_B_0",
      from: "A",
      to: "B",
      label: "call",
    },
  ],
};

test("creates defaults with zero processing for terminal nodes", () => {
  assert.deepEqual(createDefaultSimulationConfig(graph), {
    version: 2,
    nodes: {
      A: { processingMs: 0, capacity: 1, queueLimit: 5 },
      B: { processingMs: 450, capacity: 1, queueLimit: 5 },
    },
    edges: { L_A_B_0: { latencyMs: 300 } },
    traffic: { mode: "count", requestCount: 1, intervalMs: 500 },
  });
});

test("builds a deterministic bounded simulation", () => {
  const config = createDefaultSimulationConfig(graph);
  const first = buildFlowSimulation(graph, config);
  const second = buildFlowSimulation(graph, config);

  assert.deepEqual(first, second);
  assert.equal(first.events.length, 8);
  assert.deepEqual(first.summary, {
    requestCount: 1,
    completedRequests: 1,
    rejectedRequests: 0,
    durationMs: 750,
    averageLatencyMs: 750,
    totalQueueWaitMs: 0,
    averageQueueWaitMs: 0,
    maxQueueLength: 0,
    truncated: false,
  });
});

test("writes and reads the portable simulator marker", () => {
  const config = createDefaultSimulationConfig(graph);
  const written = writeSimulationConfig("flowchart TD\n A-->B", config);

  assert.equal(written.match(/%% @simulator:v2 /g)?.length, 1);
  assert.deepEqual(readSimulationConfig(written), { config, warning: null });
  assert.deepEqual(readSimulationConfig("flowchart TD"), {
    config: null,
    warning: null,
  });
});

test("reports malformed and unsupported saved settings", () => {
  assert.match(
    readSimulationConfig("%% @simulator:v2 {bad").warning ?? "",
    /malformed/,
  );
  assert.match(
    readSimulationConfig("%% @simulator:v9 {}").warning ?? "",
    /unsupported version/,
  );
  assert.match(
    readSimulationConfig(
      "%% @simulator:v2 {}\n%% @simulator:v2 {}",
    ).warning ?? "",
    /Multiple simulator settings/,
  );
});

test("clamps saved overrides and drops unknown ids", () => {
  const resolved = resolveSimulationConfig(graph, {
    nodes: {
      A: { processingMs: 99_999, capacity: 0, queueLimit: 999 },
      Z: { processingMs: 1, capacity: 1, queueLimit: 1 },
    },
    edges: { L_A_B_0: { latencyMs: -1 } },
    traffic: { mode: "count", requestCount: 999, intervalMs: 1 },
  });

  assert.deepEqual(resolved, {
    version: 2,
    nodes: {
      A: { processingMs: 60_000, capacity: 1, queueLimit: 100 },
      B: { processingMs: 450, capacity: 1, queueLimit: 5 },
    },
    edges: { L_A_B_0: { latencyMs: 0 } },
    traffic: { mode: "count", requestCount: 100, intervalMs: 50 },
  });
});

test("samples in-flight and completed state at a timestamp", () => {
  const simulation = buildFlowSimulation(graph, createDefaultSimulationConfig(graph));

  const midFlight = sampleFlowSimulation(simulation, 150);
  assert.equal(midFlight.inFlight.length, 1);
  assert.equal(midFlight.inFlight[0]?.edgeDomId, "r-L_A_B_0");
  assert.equal(midFlight.inFlight[0]?.progress, 0.5);

  const done = sampleFlowSimulation(simulation, 750);
  assert.equal(done.inFlight.length, 0);
  assert.equal(done.completedRequests, 1);
});
