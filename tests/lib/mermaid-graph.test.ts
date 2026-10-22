import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFlowGraph,
  classifyFlowNode,
  isFlowchartDiagramType,
  nodeSourceId,
  parseEdgeEndpoints,
} from "../../src/lib/mermaid/graph.ts";

test("parses mermaid edge endpoints and rejects ambiguous ids", () => {
  assert.deepEqual(parseEdgeEndpoints("L_A_B_0"), { from: "A", to: "B" });
  assert.equal(parseEdgeEndpoints("L_A_B_C_0"), null);
  assert.equal(parseEdgeEndpoints("X_A_B_0"), null);
  assert.equal(parseEdgeEndpoints("L_A"), null);
  assert.equal(parseEdgeEndpoints("L__B_0"), null);
});

test("extracts source ids from mermaid node DOM ids", () => {
  assert.equal(nodeSourceId("flowchart-A-0"), "A");
  assert.equal(nodeSourceId("mermaid-abc-flowchart-Client-0"), "Client");
  assert.equal(nodeSourceId("flowchart-A"), null);
  assert.equal(nodeSourceId("A-0"), null);
});

test("classifies nodes from classes and shape evidence", () => {
  assert.equal(classifyFlowNode(["flow-start"], false), "terminal");
  assert.equal(classifyFlowNode(["flow-action"], false), "action");
  assert.equal(classifyFlowNode([], true), "decision");
  assert.equal(classifyFlowNode(["node"], false), "default");
});

test("builds adjacency while skipping self-loops and unknown endpoints", () => {
  const graph = buildFlowGraph(
    [
      { id: "A", domId: "flowchart-A-0", label: "A", role: "default" },
      { id: "B", domId: "flowchart-B-0", label: "B", role: "default" },
      { id: "C", domId: "flowchart-C-0", label: "C", role: "default" },
    ],
    [
      { domId: "r-L_A_B_0", edgeId: "L_A_B_0", from: "A", to: "B", label: "call" },
      { domId: "r-L_B_C_0", edgeId: "L_B_C_0", from: "B", to: "C", label: "" },
      { domId: "r-L_A_A_0", edgeId: "L_A_A_0", from: "A", to: "A", label: "self" },
      { domId: "r-L_A_Z_0", edgeId: "L_A_Z_0", from: "A", to: "Z", label: "missing" },
    ],
  );

  assert.deepEqual(graph.nodes.map((node) => node.id), ["A", "B", "C"]);
  assert.deepEqual(graph.nodes[0]?.outgoing, ["r-L_A_B_0"]);
  assert.deepEqual(graph.nodes[1]?.incoming, ["r-L_A_B_0"]);
  assert.deepEqual(graph.nodes[1]?.outgoing, ["r-L_B_C_0"]);
  assert.deepEqual(graph.nodes[2]?.incoming, ["r-L_B_C_0"]);
  assert.equal(graph.edges.length, 4);
});

test("recognizes mermaid flowchart diagram types", () => {
  for (const type of ["flowchart", "flowchart-v2", "graph"]) {
    assert.equal(isFlowchartDiagramType(type), true, type);
  }
  for (const type of ["sequence", "class", "state"]) {
    assert.equal(isFlowchartDiagramType(type), false, type);
  }
});
