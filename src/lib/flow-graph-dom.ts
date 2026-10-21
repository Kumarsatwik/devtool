"use client";

import {
  buildFlowGraph,
  classifyFlowNode,
  isFlowchartDiagramType,
  nodeSourceId,
  parseEdgeEndpoints,
  type FlowGraph,
} from "./flow-graph.ts";

function labelText(element: Element | null) {
  return (element?.textContent ?? "").replace(/\s+/g, " ").trim();
}

function sourceEdgeId(domId: string) {
  const prefixIndex = domId.lastIndexOf("-L_");
  if (prefixIndex >= 0) return domId.slice(prefixIndex + 1);
  return domId.startsWith("L_") ? domId : "";
}

/** Recover the supported Mermaid flowchart graph from its rendered SVG DOM. */
export function extractFlowGraphFromSvg(
  svg: SVGSVGElement,
  diagramType: string,
): FlowGraph | null {
  if (!isFlowchartDiagramType(diagramType)) return null;

  const nodeElements = [...svg.querySelectorAll<SVGGElement>("g.node[id]")];
  const nodeRecords = nodeElements.flatMap((element) => {
    const id = nodeSourceId(element.id);
    if (!id) return [];
    element.dataset.flowNodeId = id;
    const role = classifyFlowNode(
      [...element.classList],
      Boolean(element.querySelector("polygon")),
    );
    return [{
      id,
      domId: element.id,
      label: labelText(element.querySelector(".nodeLabel, .label")) || id,
      role,
    }];
  });

  const edgeLabels = [...svg.querySelectorAll<SVGGElement>("g.edgeLabel")];
  // Mermaid versions/renderers place the stable `L_<from>_<to>_<index>` ID
  // either on the edgePath group or on its flowchart-link path. Query both
  // shapes by ID, then deduplicate so each connection becomes one graph edge.
  const seenEdges = new Set<string>();
  const edgeRecords = [...svg.querySelectorAll<SVGElement>("g.edgePath[id], path[id]")]
    .flatMap((element, index) => {
      const edgeId = sourceEdgeId(element.id);
      const endpoints = parseEdgeEndpoints(edgeId);
      if (!endpoints || seenEdges.has(edgeId)) return [];
      seenEdges.add(edgeId);
      element.dataset.flowEdgeId = edgeId;
      return [{
        domId: element.id,
        edgeId,
        from: endpoints.from,
        to: endpoints.to,
        label: labelText(edgeLabels[index] ?? null),
      }];
    });

  return buildFlowGraph(nodeRecords, edgeRecords);
}
