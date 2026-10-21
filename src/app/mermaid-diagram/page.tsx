"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { EditorPanel } from "@/components/editor-panel";
import { ToolPageLayout, StatusMessage } from "@/components/tool-page-layout";
import { ResizableSplit } from "@/components/resizable-split";
import { FileUpload } from "@/components/file-upload";
import {
  copyMermaidImage,
  exportMermaidSvg,
  exportMermaidImage,
} from "@/lib/mermaid-export";
import { extractFlowGraphFromSvg } from "@/lib/flow-graph-dom";
import {
  type FlowGraph,
} from "@/lib/flow-graph";
import {
  buildFlowSimulation,
  readSimulationConfig,
  resolveSimulationConfig,
  sampleFlowSimulation,
  writeSimulationConfig,
  type FlowSimulation,
  type FlowSimulationConfig,
  type SimulationEvent,
} from "@/lib/flow-simulation";
import {
  diagramThemes,
  defaultDiagramTheme,
  getMermaidConfig,
  getThemeSpec,
  type DiagramTheme,
} from "@/lib/mermaid-themes";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileImage,
  FileText,
  Image,
  Palette,
  RefreshCw,
  Wand2,
  Settings2,
  RotateCcw,
  Minus,
  Plus,
  Play,
  Pause,
  SkipForward,
  Activity,
  Save,
  Maximize,
  Minimize,
  Repeat,
} from "lucide-react";

const sampleMermaid = `flowchart LR
    Client([Web Client]):::flow-start -->|POST /orders| Gateway[API Gateway]
    Gateway -->|validate token| Auth[Auth Service]:::flow-action
    Auth -->|authorized request| Orders[Order Service]:::flow-action
    Orders -->|save order| Database[(Orders DB)]
    Orders -->|publish order.created| Queue[(Message Queue)]
    Queue -->|send confirmation| Worker[Email Worker]:::flow-action`;

const exportOptions = [
  { value: "svg", label: "SVG", icon: FileText },
  { value: "png", label: "PNG", icon: Image },
  { value: "jpg", label: "JPG", icon: FileImage },
] as const;

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  disabled,
  ariaLabel,
  inputClassName,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled: boolean;
  ariaLabel: string;
  inputClassName: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-0.5 text-[10px] text-muted-foreground">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        className={inputClassName}
      />
    </label>
  );
}

type SimulationStatus = "ready" | "running" | "paused" | "complete";

/**
 * Playback state for the request simulation. These values always move as one
 * unit — a new render, entering/exiting simulation, or every animation frame
 * rewrites them together — so they live in a single reducer instead of six
 * `useState` hooks that had to be reset in lockstep at five call sites.
 */
interface SimulationPlaybackState {
  status: SimulationStatus;
  progress: number;
  visibleEventCount: number;
  completedRequestCount: number;
  rejectedRequestCount: number;
  overloadedNodeIds: string[];
}

const initialSimulationPlaybackState: SimulationPlaybackState = {
  status: "ready",
  progress: 0,
  visibleEventCount: 0,
  completedRequestCount: 0,
  rejectedRequestCount: 0,
  overloadedNodeIds: [],
};

type SimulationPlaybackAction =
  | { type: "reset" }
  | { type: "setStatus"; status: SimulationStatus }
  | { type: "clearProgress" }
  | {
      type: "applyFrame";
      completedRequestCount: number;
      rejectedRequestCount: number;
      overloadedNodeIds: string[];
      progress: number;
      visibleEventCount: number;
    };

function simulationPlaybackReducer(
  state: SimulationPlaybackState,
  action: SimulationPlaybackAction,
): SimulationPlaybackState {
  switch (action.type) {
    case "reset":
      return initialSimulationPlaybackState;
    case "setStatus":
      return state.status === action.status
        ? state
        : { ...state, status: action.status };
    case "clearProgress":
      if (state.progress === 0 && state.visibleEventCount === 0) return state;
      return { ...state, progress: 0, visibleEventCount: 0 };
    case "applyFrame": {
      // Returning the same object when nothing changed lets React skip the
      // re-render, replacing the per-field `current === next ? current : next`
      // guards this reducer centralises.
      const overloadedUnchanged =
        state.overloadedNodeIds.length === action.overloadedNodeIds.length &&
        state.overloadedNodeIds.every(
          (id, index) => id === action.overloadedNodeIds[index],
        );
      if (
        state.completedRequestCount === action.completedRequestCount &&
        state.rejectedRequestCount === action.rejectedRequestCount &&
        state.progress === action.progress &&
        state.visibleEventCount === action.visibleEventCount &&
        overloadedUnchanged
      ) {
        return state;
      }
      return {
        ...state,
        completedRequestCount: action.completedRequestCount,
        rejectedRequestCount: action.rejectedRequestCount,
        overloadedNodeIds: action.overloadedNodeIds,
        progress: action.progress,
        visibleEventCount: action.visibleEventCount,
      };
    }
  }
}

/**
 * Outcome of the last Mermaid render. `renderDiagram` writes these five values
 * together in every branch (empty input, success, parse failure, render
 * error), so a reducer keeps each branch to a single dispatch.
 */
interface RenderOutcomeState {
  svgCode: string;
  error: string | null;
  flowGraph: FlowGraph | null;
  simulationConfig: FlowSimulationConfig | null;
  simulationConfigWarning: string | null;
}

const initialRenderOutcomeState: RenderOutcomeState = {
  svgCode: "",
  error: null,
  flowGraph: null,
  simulationConfig: null,
  simulationConfigWarning: null,
};

type RenderOutcomeAction =
  | { type: "renderEmpty" }
  | { type: "renderStart" }
  | {
      type: "renderSuccess";
      graph: FlowGraph | null;
      savedConfig: { config: Partial<FlowSimulationConfig> | null; warning: string | null };
      svgCode: string;
    }
  | { type: "renderParseFail"; svgCode: string }
  | { type: "renderError"; message: string }
  | { type: "setError"; error: string | null }
  | { type: "setConfig"; config: FlowSimulationConfig | null }
  | { type: "clearConfigWarning" };

function renderOutcomeReducer(
  state: RenderOutcomeState,
  action: RenderOutcomeAction,
): RenderOutcomeState {
  switch (action.type) {
    case "renderEmpty":
      return initialRenderOutcomeState;
    case "renderStart":
      return state.error === null ? state : { ...state, error: null };
    case "renderSuccess":
      return {
        ...state,
        flowGraph: action.graph,
        simulationConfigWarning: action.savedConfig.warning,
        // Preserve the previous config as the merge base when the diagram has
        // no saved settings and no version warning, mirroring the old
        // functional `setSimulationConfig((current) => …)` update.
        simulationConfig: action.graph
          ? resolveSimulationConfig(
              action.graph,
              action.savedConfig.config ??
                (action.savedConfig.warning ? null : state.simulationConfig),
            )
          : null,
        svgCode: action.svgCode,
      };
    case "renderParseFail":
      return { ...state, flowGraph: null, simulationConfig: null, svgCode: action.svgCode };
    case "renderError":
      return {
        ...state,
        svgCode: "",
        flowGraph: null,
        simulationConfig: null,
        error: action.message,
      };
    case "setError":
      return { ...state, error: action.error };
    case "setConfig":
      return { ...state, simulationConfig: action.config };
    case "clearConfigWarning":
      return { ...state, simulationConfigWarning: null };
  }
}

export default function MermaidDiagramPage() {
  const [input, setInput] = useState(sampleMermaid);
  const [exportFormat, setExportFormat] =
    useState<(typeof exportOptions)[number]["value"]>("svg");
  const [copied, setCopied] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [autoRender, setAutoRender] = useState(true);
  const [diagramTheme, setDiagramTheme] =
    useState<DiagramTheme>(defaultDiagramTheme);
  const [simulationMode, setSimulationMode] = useState(false);
  const [continuousSimulation, setContinuousSimulation] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [eventLogOpen, setEventLogOpen] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);

  const [render, dispatchRender] = useReducer(
    renderOutcomeReducer,
    initialRenderOutcomeState,
  );
  const { svgCode, error, flowGraph, simulationConfig, simulationConfigWarning } =
    render;

  const [playback, dispatchPlayback] = useReducer(
    simulationPlaybackReducer,
    initialSimulationPlaybackState,
  );
  const {
    status: simulationStatus,
    progress: simulationProgress,
    visibleEventCount,
    completedRequestCount,
    rejectedRequestCount,
    overloadedNodeIds,
  } = playback;
  const previewRef = useRef<HTMLDivElement>(null);
  const zoomTargetRef = useRef<HTMLDivElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(1);
  const copyResetTimerRef = useRef<number | null>(null);
  const simulationElapsedRef = useRef(0);
  const renderIdRef = useRef(0);
  const pendingZoomAnchorRef = useRef<{
    fx: number;
    fy: number;
    x: number;
    y: number;
  } | null>(null);

  const minZoom = 0.1;
  const maxZoom = 8;
  const zoomStep = 0.25;
  const flowSimulation = useMemo<FlowSimulation | null>(() => {
    if (!flowGraph || !simulationConfig) return null;
    return buildFlowSimulation(flowGraph, simulationConfig);
  }, [flowGraph, simulationConfig]);

  // Applies a new zoom. When an anchor (cursor point) is given, the content
  // under that point stays put: the scroll offset is corrected in the layout
  // effect below, once the zoomed layout has been committed.
  const commitZoom = useCallback(
    (next: number, anchor?: { x: number; y: number }) => {
      const clamped = Math.min(maxZoom, Math.max(minZoom, +next.toFixed(3)));
      if (clamped === zoomRef.current) return;

      if (anchor) {
        const rect = zoomTargetRef.current?.getBoundingClientRect();
        if (rect && rect.width > 0 && rect.height > 0) {
          pendingZoomAnchorRef.current = {
            fx: (anchor.x - rect.left) / rect.width,
            fy: (anchor.y - rect.top) / rect.height,
            x: anchor.x,
            y: anchor.y,
          };
        }
      }

      zoomRef.current = clamped;
      setZoom(clamped);
    },
    [],
  );

  const updateZoom = useCallback(
    (delta: number) => commitZoom(zoomRef.current + delta),
    [commitZoom],
  );

  const resetZoom = useCallback(() => commitZoom(1), [commitZoom]);

  useLayoutEffect(() => {
    const anchor = pendingZoomAnchorRef.current;
    pendingZoomAnchorRef.current = null;
    const el = previewScrollRef.current;
    const target = zoomTargetRef.current;
    if (!anchor || !el || !target) return;

    const rect = target.getBoundingClientRect();
    el.scrollLeft += rect.left + anchor.fx * rect.width - anchor.x;
    el.scrollTop += rect.top + anchor.fy * rect.height - anchor.y;
  }, [zoom]);

  // Fit the rendered diagram to the available canvas width. The CSS zoom is a
  // user multiplier on top of this fit, so simulation state never changes zoom.
  useLayoutEffect(() => {
    const container = previewScrollRef.current;
    const svg = zoomTargetRef.current?.querySelector("svg");
    if (!container || !svg) return;
    const fitDiagram = () => {
      const viewBox = svg.getAttribute("viewBox");
      if (!viewBox) return;
      const parts = viewBox.split(/\s+/).map(Number);
      if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return;
      const [, , viewBoxWidth, viewBoxHeight] = parts;
      if (viewBoxWidth <= 0 || viewBoxHeight <= 0) return;
      const canvasWidth = Math.max(160, container.clientWidth - 32);
      const canvasHeight = Math.max(160, container.clientHeight - 32);
      const fitWidth = previewFullscreen
        ? Math.min(canvasWidth, canvasHeight * (viewBoxWidth / viewBoxHeight))
        : canvasWidth;
      svg.style.width = `${fitWidth}px`;
      svg.style.height = `${fitWidth * (viewBoxHeight / viewBoxWidth)}px`;
    };
    fitDiagram();
    const frameId = requestAnimationFrame(fitDiagram);
    const observer = new ResizeObserver(fitDiagram);
    observer.observe(container);
    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [svgCode, previewFullscreen]);

  useEffect(() => {
    if (!previewFullscreen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewFullscreen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewFullscreen]);

  // Ctrl/Cmd + scroll (or trackpad pinch) zooms the preview around the cursor.
  // Native non-passive listener is required because React registers
  // wheel events passively, which blocks preventDefault.
  useEffect(() => {
    const el = previewScrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const step = e.deltaMode === 1 ? 0.1 : 0.003;
      commitZoom(zoomRef.current - e.deltaY * step, {
        x: e.clientX,
        y: e.clientY,
      });
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [commitZoom]);

  const renderDiagram = useCallback(async () => {
    if (!input.trim()) {
      dispatchRender({ type: "renderEmpty" });
      setSimulationMode(false);
      dispatchPlayback({ type: "reset" });
      simulationElapsedRef.current = 0;
      return;
    }

    const renderId = ++renderIdRef.current;
    setIsRendering(true);
    dispatchRender({ type: "renderStart" });

    try {
      // lazy: mermaid is ~1MB; loaded on first render, then cached by the bundler
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize(getMermaidConfig(diagramTheme));
      const id = `mermaid-${Math.random().toString(36).slice(2, 11)}`;
      const { svg } = await mermaid.render(id, input);
      if (renderId !== renderIdRef.current) return;

      try {
        const parsed = await mermaid.parse(input);
        const svgDocument = new DOMParser().parseFromString(
          svg,
          "image/svg+xml",
        );
        const svgElement =
          svgDocument.documentElement as unknown as SVGSVGElement;
        const graph = extractFlowGraphFromSvg(svgElement, parsed.diagramType);
        if (renderId !== renderIdRef.current) return;
        dispatchRender({
          type: "renderSuccess",
          graph,
          savedConfig: readSimulationConfig(input),
          svgCode: graph
            ? new XMLSerializer().serializeToString(svgElement)
            : svg,
        });
        simulationElapsedRef.current = 0;
        dispatchPlayback({ type: "clearProgress" });
        dispatchPlayback({ type: "setStatus", status: "ready" });
        setSimulationMode(false);
      } catch {
        if (renderId !== renderIdRef.current) return;
        dispatchRender({ type: "renderParseFail", svgCode: svg });
        setSimulationMode(false);
      }
    } catch (err) {
      if (renderId !== renderIdRef.current) return;
      dispatchRender({
        type: "renderError",
        message: err instanceof Error ? err.message : "Failed to render diagram",
      });
      setSimulationMode(false);
    } finally {
      if (renderId === renderIdRef.current) setIsRendering(false);
    }
  }, [input, diagramTheme]);

  const applySimulationFrame = useCallback(
    (elapsedMs: number) => {
      const svg = zoomTargetRef.current?.querySelector("svg");
      if (!svg || !flowGraph || !flowSimulation) return;

      const sample = sampleFlowSimulation(flowSimulation, elapsedMs);
      svg
        .querySelectorAll("[data-request-packet]")
        .forEach((packet) => packet.remove());

      for (const node of svg.querySelectorAll<SVGGElement>(
        "g.node[data-flow-node-id]",
      )) {
        const id = node.dataset.flowNodeId ?? "";
        node.classList.toggle("sim-node-processing", sample.processing.has(id));
        node.classList.toggle("sim-node-started", sample.started.has(id));
        node.classList.toggle("sim-node-overloaded", sample.overloaded.has(id));
      }

      const packetColor = getThemeSpec(diagramTheme).dark
        ? "#5EEAD4"
        : "#0F766E";
      const packetStroke = getThemeSpec(diagramTheme).dark ? "#15201E" : "#FFFFFF";
      for (const edge of flowGraph.edges) {
        const packets = sample.inFlight.filter((packet) =>
          packet.edgeDomId === edge.domId,
        );
        const edgeElement = svg.querySelector<SVGGElement | SVGPathElement>(`#${CSS.escape(edge.domId)}`);
        const group = edgeElement?.matches("g.edgePath")
          ? edgeElement
          : edgeElement?.closest<SVGGElement>("g.edgePath");
        const path = edgeElement?.matches("path")
          ? (edgeElement as SVGPathElement)
          : group?.querySelector<SVGPathElement>(
              "path.path, path.flowchart-link, path",
            );
        group?.classList.toggle("sim-edge-active", packets.length > 0);
        if (!path || packets.length === 0 || !path.parentElement) continue;

        for (const request of packets) {
          try {
            const point = path.getPointAtLength(path.getTotalLength() * request.progress);
            const packet = svg.ownerDocument.createElementNS(
              "http://www.w3.org/2000/svg",
              "circle",
            );
            packet.dataset.requestPacket = "true";
            packet.dataset.requestId = request.requestId;
            packet.setAttribute("cx", String(point.x));
            packet.setAttribute("cy", String(point.y));
            packet.setAttribute("r", "5.5");
            packet.setAttribute("fill", packetColor);
            packet.setAttribute("stroke", packetStroke);
            packet.setAttribute("stroke-width", "2");
            packet.setAttribute("pointer-events", "none");
            path.parentElement.appendChild(packet);
          } catch {
            // Some SVG paths can be unavailable to geometry APIs during layout.
          }
        }
      }

      const progress = flowSimulation.durationMs
        ? Math.min(100, Math.floor((elapsedMs / flowSimulation.durationMs) * 100))
        : 0;
      const visible = flowSimulation.events.filter((event) => event.at <= elapsedMs).length;
      dispatchPlayback({
        type: "applyFrame",
        completedRequestCount: sample.completedRequests,
        rejectedRequestCount: sample.rejectedRequests,
        overloadedNodeIds: [...sample.overloaded],
        progress,
        visibleEventCount: visible,
      });
    },
    [diagramTheme, flowGraph, flowSimulation],
  );

  useEffect(() => {
    if (!flowSimulation) return;
    if (!simulationMode) {
      simulationElapsedRef.current = 0;
      const svg = zoomTargetRef.current?.querySelector("svg");
      svg
        ?.querySelectorAll("[data-request-packet]")
        .forEach((packet) => packet.remove());
      svg
        ?.querySelectorAll(".sim-node-processing, .sim-node-started, .sim-node-overloaded")
        .forEach((node) => {
          node.classList.remove("sim-node-processing", "sim-node-started", "sim-node-overloaded");
        });
      svg?.querySelectorAll(".sim-edge-active").forEach((edge) => {
        edge.classList.remove("sim-edge-active");
      });
      dispatchPlayback({ type: "clearProgress" });
      return;
    }
    if (simulationStatus !== "running") {
      applySimulationFrame(simulationElapsedRef.current);
      return;
    }

    const duration = flowSimulation.durationMs;
    const startTime = performance.now() - simulationElapsedRef.current / simulationSpeed;
    let frameId = 0;
    const tick = (now: number) => {
      const runElapsed = (now - startTime) * simulationSpeed;
      const shouldLoop = continuousSimulation && duration > 0;
      const elapsed = shouldLoop
        ? runElapsed % duration
        : Math.min(duration, runElapsed);
      simulationElapsedRef.current = elapsed;
      applySimulationFrame(elapsed);
      if (!shouldLoop && elapsed >= duration) {
        dispatchPlayback({ type: "setStatus", status: "complete" });
        return;
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [
    applySimulationFrame,
    flowSimulation,
    simulationMode,
    simulationSpeed,
    simulationStatus,
    continuousSimulation,
  ]);

  useEffect(() => {
    if (autoRender) {
      const timer = setTimeout(() => {
        renderDiagram();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [input, autoRender, renderDiagram]);

  useEffect(() => {
    simulationElapsedRef.current = 0;
    dispatchPlayback({ type: "reset" });
  }, [flowSimulation]);

  const handleExport = async () => {
    if (!previewRef.current || !svgCode) return;

    try {
      dispatchRender({ type: "setError", error: null });
      switch (exportFormat) {
        case "svg":
          await exportMermaidSvg(previewRef.current, "diagram.svg");
          break;
        case "png":
          await exportMermaidImage(previewRef.current, "png", "diagram.png");
          break;
        case "jpg":
          await exportMermaidImage(previewRef.current, "jpg", "diagram.jpg");
          break;
      }
    } catch (err) {
      dispatchRender({
        type: "setError",
        error: err instanceof Error ? err.message : "Export failed",
      });
    }
  };

  const handleCopy = async () => {
    if (!previewRef.current || !svgCode) return;

    try {
      dispatchRender({ type: "setError", error: null });
      await copyMermaidImage(previewRef.current);
      setCopied(true);
      if (copyResetTimerRef.current !== null) {
        window.clearTimeout(copyResetTimerRef.current);
      }
      copyResetTimerRef.current = window.setTimeout(() => {
        copyResetTimerRef.current = null;
        setCopied(false);
      }, 2000);
    } catch (err) {
      setCopied(false);
      dispatchRender({
        type: "setError",
        error:
          err instanceof Error ? err.message : "Could not copy the diagram image",
      });
    }
  };

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current !== null) {
        window.clearTimeout(copyResetTimerRef.current);
      }
    };
  }, []);

  const handleFileLoaded = (content: string) => {
    setInput(content);
  };

  const updateNodeSettings = (
    nodeId: string,
    patch: Partial<FlowSimulationConfig["nodes"][string]>,
  ) => {
    if (!simulationConfig) return;
    dispatchRender({
      type: "setConfig",
      config: {
        ...simulationConfig,
        nodes: {
          ...simulationConfig.nodes,
          [nodeId]: { ...simulationConfig.nodes[nodeId], ...patch },
        },
      },
    });
  };

  const updateEdgeLatency = (edgeId: string, latencyMs: number) => {
    if (!simulationConfig) return;
    dispatchRender({
      type: "setConfig",
      config: {
        ...simulationConfig,
        edges: { ...simulationConfig.edges, [edgeId]: { latencyMs } },
      },
    });
  };

  const saveSimulationSettings = () => {
    if (!simulationConfig) return;
    setInput((current) => writeSimulationConfig(current, simulationConfig));
    dispatchRender({ type: "clearConfigWarning" });
  };

  const nodeLabels = new Map(flowGraph?.nodes.map((node) => [node.id, node.label]) ?? []);

  const eventDescription = (event: SimulationEvent) => {
    const node = (id?: string) => nodeLabels.get(id ?? "") ?? id ?? "component";
    switch (event.kind) {
      case "request_start": return `Request created at ${node(event.nodeId)}`;
      case "dispatch": return `${node(event.from)} sent ${event.label || `request to ${node(event.to)}`}`;
      case "arrival": return `${event.label ? `${event.label} · ` : ""}arrived at ${node(event.nodeId)}`;
      case "queued": return `Waiting at ${node(event.nodeId)} · queue position ${event.queuePosition}`;
      case "processing_start": return `${node(event.nodeId)} started processing${event.waitMs ? ` after ${event.waitMs} ms queued` : ""}`;
      case "processing_complete": return `${node(event.nodeId)} finished processing`;
      case "request_complete": return "Request completed";
      case "request_rejected": return `${node(event.nodeId)} rejected the request at capacity`;
      case "overload_start": return `${node(event.nodeId)} reached its capacity`;
      case "overload_end": return `${node(event.nodeId)} has capacity available again`;
    }
  };

  return (
    <ToolPageLayout
      title="Mermaid Diagram"
      description="Write Mermaid syntax, preview diagrams, and simulate request flows."
    >
      <div className="h-full flex flex-col gap-4">
        <style>{`
          .mermaid-simulation .sim-node-processing :is(rect, polygon, circle, ellipse, path) {
            stroke: #0F766E !important;
            stroke-width: 3px !important;
            filter: drop-shadow(0 0 4px #0F766E55);
          }
          .mermaid-simulation[data-diagram-dark="true"] .sim-node-processing :is(rect, polygon, circle, ellipse, path) {
            stroke: #5EEAD4 !important;
            filter: drop-shadow(0 0 5px #5EEAD466);
          }
          .mermaid-simulation .sim-node-started :is(rect, polygon, circle, ellipse, path) {
            stroke: #748A7D !important;
          }
          .mermaid-simulation[data-diagram-dark="true"] .sim-node-started :is(rect, polygon, circle, ellipse, path) {
            stroke: #718B83 !important;
          }
          .mermaid-simulation .sim-node-overloaded :is(rect, polygon, circle, ellipse, path) {
            stroke: #B42318 !important;
            stroke-width: 3px !important;
            filter: drop-shadow(0 0 5px #B4231855);
          }
          .mermaid-simulation[data-diagram-dark="true"] .sim-node-overloaded :is(rect, polygon, circle, ellipse, path) {
            stroke: #FDA29B !important;
            filter: drop-shadow(0 0 5px #FDA29B66);
          }
          .mermaid-simulation .sim-edge-active .path {
            stroke: #0F766E !important;
            stroke-width: 3px !important;
            filter: drop-shadow(0 0 3px #0F766E55);
          }
          .mermaid-simulation[data-diagram-dark="true"] .sim-edge-active .path {
            stroke: #5EEAD4 !important;
          }
          .mermaid-simulation [data-request-packet] {
            filter: drop-shadow(0 1px 2px #00000055);
          }
          .mermaid-zoom-target svg {
            max-width: none !important;
          }
        `}</style>
        {/* Settings Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border border-border/80 bg-card/90 p-3.5 rounded-xl text-xs select-none shadow-sm shrink-0">
          <div className="flex items-center gap-2.5 font-semibold text-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Settings2 className="h-4 w-4" />
            </span>
            <span>Diagram settings</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Theme Selector */}
            <div className="flex items-center gap-2">
              <Palette className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground font-semibold">
                Canvas
              </span>
              <select
                value={diagramTheme}
                onChange={(e) =>
                  setDiagramTheme(e.target.value as DiagramTheme)
                }
                aria-label="Diagram canvas theme"
                className="h-8 px-2.5 pr-7 rounded-lg border border-border bg-background text-xs font-semibold text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/15 hover:border-primary/40 transition-colors"
              >
                {diagramThemes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Export Format Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-semibold">
                Format:
              </span>
              <div className="flex border border-border rounded-lg p-0.5 bg-background">
                {exportOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <Button
                      key={option.value}
                      variant={
                        exportFormat === option.value ? "secondary" : "ghost"
                      }
                      size="xs"
                      className="h-7 gap-1.5 px-2.5 rounded-md text-xs font-semibold"
                      onClick={() => setExportFormat(option.value)}
                    >
                      <Icon className="h-3 w-3" />
                      <span>{option.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Export & Copy Buttons */}
            <div className="flex items-center gap-1.5">
              <Button
                onClick={handleExport}
                size="xs"
                className="h-8 gap-1.5 px-3.5 text-xs font-semibold rounded-lg shadow-none"
                disabled={!svgCode}
              >
                <Download className="h-3 w-3" />
                <span>Export</span>
              </Button>
              <Button
                onClick={handleCopy}
                size="xs"
                variant="outline"
                className="h-8 gap-1.5 px-3.5 text-xs font-semibold rounded-lg shadow-none"
                disabled={!svgCode}
                title="Copy the diagram image to your clipboard"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-emerald-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                <span>{copied ? "Copied" : "Copy image"}</span>
              </Button>
            </div>

            {/* Auto render toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-muted-foreground select-none hover:text-foreground">
              <input
                type="checkbox"
                checked={autoRender}
                onChange={(e) => setAutoRender(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary/15"
              />
              <span>Live Preview</span>
            </label>
          </div>
        </div>

        {/* Editor workspace — resizable source and width-fitted preview */}
        <ResizableSplit
          label="Resize Mermaid code and diagram preview"
          initialPercent={30}
          first={
            <>
              <label className="flex items-center justify-between text-xs font-semibold text-foreground shrink-0 px-0.5">
                <span>Source</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  .mmd
                </span>
              </label>
              <EditorPanel
                value={input}
                onChange={setInput}
                language="mermaid"
                title=""
                sampleText={sampleMermaid}
                downloadFileName="diagram.mmd"
                downloadExtension="mmd"
                height="fill"
                className="flex-1 min-h-0"
              />
            </>
          }
          second={
            <>
              {!previewFullscreen && <label className="flex items-center justify-between text-xs font-semibold text-foreground shrink-0 px-0.5">
                <span>Live canvas</span>
                <span className="text-[10px] font-medium text-muted-foreground">
                  ⌘/Ctrl + scroll to zoom
                </span>
              </label>}
              <div
                className={`flex flex-col border border-border/80 overflow-hidden bg-card transition-colors duration-200 min-h-0 ${previewFullscreen ? "fixed inset-0 z-50 h-[100dvh] w-screen rounded-none border-0 shadow-none" : "flex-1 rounded-xl shadow-sm hover:border-border"}`}
              >
                {/* Preview Header */}
                <div className="flex items-center justify-between bg-muted/35 border-b border-border/85 px-3.5 py-2 text-xs select-none shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      Rendered diagram
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border/70">
                      SVG
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="xs"
                      className="h-7 gap-1.5 rounded-md px-2 text-xs"
                      onClick={() => setPreviewFullscreen((value) => !value)}
                      aria-label={previewFullscreen ? "Exit fullscreen preview" : "Open fullscreen preview"}
                      title={previewFullscreen ? "Exit fullscreen (Esc)" : "Open fullscreen preview"}
                    >
                      {previewFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
                      <span>{previewFullscreen ? "Exit full screen" : "Full screen"}</span>
                    </Button>
                    <Button
                      variant={simulationMode ? "secondary" : "ghost"}
                      size="xs"
                      className="h-7 gap-1.5 px-2.5 text-xs font-semibold rounded-md"
                      onClick={() => {
                        if (simulationMode) {
                          dispatchPlayback({ type: "setStatus", status: "paused" });
                          setSimulationMode(false);
                        } else {
                          simulationElapsedRef.current = 0;
                          dispatchPlayback({ type: "reset" });
                          setSimulationMode(true);
                        }
                      }}
                      disabled={
                        !flowGraph?.edges.length ||
                        !flowSimulation?.events.length ||
                        isRendering
                      }
                      title={
                        flowGraph?.edges.length && flowSimulation?.events.length
                          ? "Simulate request traffic through this flowchart"
                          : "Use a Mermaid flowchart with simple component IDs and directed connections"
                      }
                      aria-pressed={simulationMode}
                    >
                      <Activity className="h-3.5 w-3.5" />
                      <span>
                        {simulationMode ? "Exit simulation" : "Simulate"}
                      </span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                      onClick={() => updateZoom(-zoomStep)}
                      disabled={zoom <= minZoom}
                      title="Zoom out"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-xs font-mono font-semibold text-foreground w-10 text-center tabular-nums">
                      {Math.round(zoom * 100)}%
                    </span>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                      onClick={() => updateZoom(zoomStep)}
                      disabled={zoom >= maxZoom}
                      title="Zoom in"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    {zoom !== 1 && (
                      <Button
                        variant="ghost"
                        size="xs"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                        onClick={resetZoom}
                        title="Fit to width"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    )}
                    {!autoRender && (
                      <Button
                        variant="ghost"
                        size="xs"
                        className="h-6 gap-1 px-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/70 ml-2"
                        onClick={renderDiagram}
                        disabled={isRendering}
                      >
                        {isRendering ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <Wand2 className="h-3 w-3" />
                        )}
                        <span>Render</span>
                      </Button>
                    )}
                  </div>
                </div>

                {svgCode && !flowGraph?.edges.length && (
                    <div className="border-b border-border/80 bg-muted/25 px-3.5 py-2 text-[11px] text-muted-foreground">
                      Request simulation supports Mermaid flowcharts with simple
                      component IDs and directed connections.
                    </div>
                  )}

                {simulationMode && flowGraph && simulationConfig && flowSimulation && (
                  <>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 bg-card px-3 py-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="secondary"
                        size="xs"
                        className="h-7 gap-1.5 rounded-md px-2.5"
                        onClick={() => {
                          if (simulationStatus === "complete") {
                            simulationElapsedRef.current = 0;
                            dispatchPlayback({ type: "clearProgress" });
                          }
                          dispatchPlayback({ type: "setStatus", status: "running" });
                        }}
                        disabled={simulationStatus === "running"}
                      >
                        {simulationStatus === "complete" ? (
                          <RotateCcw className="h-3.5 w-3.5" />
                        ) : (
                          <Play className="h-3.5 w-3.5" />
                        )}
                        <span>
                          {simulationStatus === "complete" ? "Replay" : "Play"}
                        </span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="h-7 gap-1.5 rounded-md px-2"
                        onClick={() => dispatchPlayback({ type: "setStatus", status: "paused" })}
                        disabled={simulationStatus !== "running"}
                        title="Pause request"
                      >
                        <Pause className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="h-7 gap-1.5 rounded-md px-2"
                        onClick={() => {
                          const nextEvent = flowSimulation.events.find(
                            ({ at }) => at > simulationElapsedRef.current,
                          );
                          if (!nextEvent) {
                            simulationElapsedRef.current =
                              flowSimulation.durationMs;
                            applySimulationFrame(flowSimulation.durationMs);
                            dispatchPlayback({ type: "setStatus", status: "complete" });
                            return;
                          }
                          simulationElapsedRef.current = nextEvent.at;
                          applySimulationFrame(nextEvent.at);
                          dispatchPlayback({
                            type: "setStatus",
                            status:
                              nextEvent.at >= flowSimulation.durationMs
                                ? "complete"
                                : "paused",
                          });
                        }}
                        disabled={
                          simulationStatus === "running" ||
                          simulationStatus === "complete" ||
                          flowSimulation.events.length === 0
                        }
                        title="Advance to the next request event"
                      >
                        <SkipForward className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="h-7 gap-1 rounded-md px-2"
                        onClick={() => {
                          simulationElapsedRef.current = 0;
                          dispatchPlayback({ type: "clearProgress" });
                          applySimulationFrame(0);
                          dispatchPlayback({ type: "setStatus", status: "ready" });
                        }}
                        title="Reset request"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Reset</span>
                      </Button>
                    </div>

                    <div className="flex min-w-0 flex-1 items-center justify-center gap-2 text-muted-foreground sm:justify-start">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      <span className="truncate" aria-live="polite">
                        {simulationStatus === "complete"
                          ? `${flowSimulation.summary.completedRequests} completed · ${flowSimulation.summary.rejectedRequests} rejected`
                          : simulationStatus === "running"
                            ? `${completedRequestCount} completed · ${rejectedRequestCount} rejected of ${flowSimulation.summary.requestCount}`
                            : simulationStatus === "paused"
                              ? `Paused · ${visibleEventCount} events recorded`
                              : `Ready · ${flowSimulation.summary.requestCount} request${flowSimulation.summary.requestCount === 1 ? "" : "s"} · parallel branches`}
                      </span>
                      <span
                        className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-muted sm:block"
                        role="progressbar"
                        aria-label="Request simulation progress"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={simulationProgress}
                      >
                        <span
                          className="block h-full rounded-full bg-emerald-600 transition-[width] duration-150"
                          style={{ width: `${simulationProgress}%` }}
                        />
                      </span>
                      <span className="hidden text-muted-foreground/70 sm:inline">
                        {simulationProgress}%
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant={continuousSimulation ? "secondary" : "ghost"}
                        size="xs"
                        className="h-7 gap-1.5 rounded-md px-2"
                        onClick={() => setContinuousSimulation((enabled) => !enabled)}
                        aria-pressed={continuousSimulation}
                        title={continuousSimulation ? "Loop requests continuously until paused" : "Stop after one run"}
                      >
                        <Repeat className="h-3.5 w-3.5" />
                        <span>Loop</span>
                      </Button>
                      <label className="flex items-center gap-1.5 text-muted-foreground">
                        <span>Speed</span>
                        <select
                          value={simulationSpeed}
                          onChange={(event) => setSimulationSpeed(Number(event.target.value))}
                          className="h-7 rounded-md border border-border bg-background px-2 font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label="Request simulation speed"
                        >
                          <option value={0.5}>0.5×</option>
                          <option value={1}>1×</option>
                          <option value={2}>2×</option>
                        </select>
                      </label>
                      <Button variant={settingsOpen ? "secondary" : "ghost"} size="xs" className="h-7 gap-1.5 px-2" onClick={() => setSettingsOpen((open) => !open)} aria-expanded={settingsOpen}>
                        <Settings2 className="h-3.5 w-3.5" /> Settings
                      </Button>
                    </div>
                  </div>
                  {settingsOpen && (
                    <div className="max-h-56 overflow-auto border-b border-border/80 bg-muted/20 px-3 py-3 text-xs">
                      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                        <div className="flex flex-wrap items-end gap-2.5">
                          <label className="grid gap-1 text-muted-foreground">
                            Traffic pattern
                            <select
                              className="h-8 rounded-md border border-border bg-background px-2 text-foreground"
                              aria-label="Traffic pattern"
                              value={simulationConfig.traffic.mode}
                              disabled={simulationStatus === "running"}
                              onChange={(event) => dispatchRender({ type: "setConfig", config: simulationConfig ? {
                                ...simulationConfig,
                                traffic: event.target.value === "rate"
                                  ? { mode: "rate", requestsPerSecond: 2, durationMs: 10_000 }
                                  : { mode: "count", requestCount: 5, intervalMs: 500 },
                              } : simulationConfig })}
                            >
                              <option value="count">Request count</option>
                              <option value="rate">Rate over time</option>
                            </select>
                          </label>
                          {simulationConfig.traffic.mode === "count" ? (
                            <>
                              <label className="grid gap-1 text-muted-foreground">
                                Requests
                                <input type="number" min={1} max={100} className="h-8 w-24 rounded-md border border-border bg-background px-2 text-foreground" aria-label="Request count" value={simulationConfig.traffic.requestCount} disabled={simulationStatus === "running"} onChange={(event) => dispatchRender({ type: "setConfig", config: simulationConfig?.traffic.mode === "count" ? { ...simulationConfig, traffic: { ...simulationConfig.traffic, requestCount: Math.min(100, Math.max(1, Number(event.target.value) || 1)) } } : simulationConfig })} />
                              </label>
                              <label className="grid gap-1 text-muted-foreground">
                                Interval (ms)
                                <input type="number" min={50} max={10000} step={50} className="h-8 w-28 rounded-md border border-border bg-background px-2 text-foreground" aria-label="Request interval in milliseconds" value={simulationConfig.traffic.intervalMs} disabled={simulationStatus === "running"} onChange={(event) => dispatchRender({ type: "setConfig", config: simulationConfig?.traffic.mode === "count" ? { ...simulationConfig, traffic: { ...simulationConfig.traffic, intervalMs: Math.min(10000, Math.max(50, Number(event.target.value) || 50)) } } : simulationConfig })} />
                              </label>
                            </>
                          ) : (
                            <>
                              <label className="grid gap-1 text-muted-foreground">
                                Requests / sec
                                <input type="number" min={0.1} max={20} step={0.1} className="h-8 w-28 rounded-md border border-border bg-background px-2 text-foreground" aria-label="Requests per second" value={simulationConfig.traffic.requestsPerSecond} disabled={simulationStatus === "running"} onChange={(event) => dispatchRender({ type: "setConfig", config: simulationConfig?.traffic.mode === "rate" ? { ...simulationConfig, traffic: { ...simulationConfig.traffic, requestsPerSecond: Math.min(20, Math.max(0.1, Number(event.target.value) || 0.1)) } } : simulationConfig })} />
                              </label>
                              <label className="grid gap-1 text-muted-foreground">
                                Duration (sec)
                                <input type="number" min={1} max={60} className="h-8 w-24 rounded-md border border-border bg-background px-2 text-foreground" aria-label="Traffic duration in seconds" value={simulationConfig.traffic.durationMs / 1000} disabled={simulationStatus === "running"} onChange={(event) => dispatchRender({ type: "setConfig", config: simulationConfig?.traffic.mode === "rate" ? { ...simulationConfig, traffic: { ...simulationConfig.traffic, durationMs: Math.min(60, Math.max(1, Number(event.target.value) || 1)) * 1000 } } : simulationConfig })} />
                              </label>
                            </>
                          )}
                        </div>
                        {simulationConfig.traffic.mode === "rate" && (
                          <p className="basis-full text-[10px] text-muted-foreground">Rate-based runs are capped at 100 requests so large scenarios stay responsive.</p>
                        )}
                        <Button size="xs" variant="outline" className="h-8 gap-1.5" onClick={saveSimulationSettings} disabled={simulationStatus === "running"}>
                          <Save className="h-3.5 w-3.5" /> Save settings to diagram
                        </Button>
                      </div>
                      <p className="mb-1 text-xs font-semibold text-foreground">Service capacity</p>
                      <p className="mb-2 text-[10px] text-muted-foreground">Capacity is the number of simultaneous requests. Requests wait up to the queue limit; additional requests are rejected.</p>
                      <div className="mb-3 grid gap-1.5 sm:grid-cols-2">
                        {flowGraph.nodes.map((node) => (
                          <div key={node.id} className="grid grid-cols-2 items-center gap-2 rounded-md border border-border/70 bg-background/75 px-2 py-1.5 sm:grid-cols-[minmax(0,1fr)_82px_82px_82px]">
                            <span className="col-span-2 truncate font-medium text-foreground sm:col-span-1" title={node.label}>{node.label}</span>
                            <NumberField
                              label="Process ms"
                              ariaLabel={`${node.label} processing time in milliseconds`}
                              value={simulationConfig.nodes[node.id]?.processingMs ?? 450}
                              min={0}
                              max={60000}
                              step={50}
                              disabled={simulationStatus === "running"}
                              inputClassName="h-7 w-full rounded border border-border bg-background px-1.5 text-xs text-foreground"
                              onChange={(value) => updateNodeSettings(node.id, { processingMs: Math.min(60000, Math.max(0, value || 0)) })}
                            />
                            <NumberField
                              label="Capacity"
                              ariaLabel={`${node.label} request capacity`}
                              value={simulationConfig.nodes[node.id]?.capacity ?? 1}
                              min={1}
                              max={100}
                              disabled={simulationStatus === "running"}
                              inputClassName="h-7 w-full rounded border border-border bg-background px-1.5 text-xs text-foreground"
                              onChange={(value) => updateNodeSettings(node.id, { capacity: Math.min(100, Math.max(1, value || 1)) })}
                            />
                            <NumberField
                              label="Queue limit"
                              ariaLabel={`${node.label} queue limit`}
                              value={simulationConfig.nodes[node.id]?.queueLimit ?? 5}
                              min={0}
                              max={100}
                              disabled={simulationStatus === "running"}
                              inputClassName="h-7 w-full rounded border border-border bg-background px-1.5 text-xs text-foreground"
                              onChange={(value) => updateNodeSettings(node.id, { queueLimit: Math.min(100, Math.max(0, value || 0)) })}
                            />
                          </div>
                        ))}
                      </div>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Connection latency · outgoing branches run in parallel</p>
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {flowGraph.edges.map((edge) => (
                          <label key={edge.edgeId} className="flex items-center justify-between gap-2 rounded-md border border-border/70 bg-background/75 px-2 py-1.5 text-muted-foreground">
                            <span className="min-w-0 truncate" title={`${nodeLabels.get(edge.from)} → ${nodeLabels.get(edge.to)}`}>{nodeLabels.get(edge.from)} → {nodeLabels.get(edge.to)}{edge.label ? ` · ${edge.label}` : ""}</span>
                            <span className="flex shrink-0 items-center gap-1">ms<input type="number" min={0} max={60000} step={50} aria-label={`${edge.label || `${nodeLabels.get(edge.from)} to ${nodeLabels.get(edge.to)}`} latency in milliseconds`} value={simulationConfig.edges[edge.edgeId]?.latencyMs ?? 300} disabled={simulationStatus === "running"} onChange={(event) => updateEdgeLatency(edge.edgeId, Math.min(60000, Math.max(0, Number(event.target.value) || 0)))} className="h-7 w-20 rounded border border-border bg-background px-1.5 text-xs text-foreground" /></span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  {simulationConfigWarning && (
                    <div role="status" className="border-b border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-200">
                      {simulationConfigWarning}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-border/80 bg-muted/20 px-3 py-2 text-[10px] text-muted-foreground" aria-label="Simulation summary">
                    <span><strong className="text-foreground">{completedRequestCount}</strong> / {flowSimulation.summary.requestCount} completed</span>
                    <span><strong className="text-foreground">{rejectedRequestCount}</strong> rejected</span>
                    <span>Avg. latency (run) <strong className="text-foreground">{Math.round(flowSimulation.summary.averageLatencyMs)} ms</strong></span>
                    <span>Queue wait (run) <strong className="text-foreground">{Math.round(flowSimulation.summary.totalQueueWaitMs)} ms</strong></span>
                    <span>Peak queue (run) <strong className="text-foreground">{flowSimulation.summary.maxQueueLength}</strong></span>
                    {flowSimulation.summary.truncated && <span className="text-amber-600">Run capped at the event safety limit</span>}
                  </div>
                  {overloadedNodeIds.length > 0 && (
                    <div role="alert" className="flex items-center gap-2 border-b border-red-500/25 bg-red-500/5 px-3 py-2 text-[11px] text-red-700 dark:text-red-300">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>At capacity: {overloadedNodeIds.map((id) => nodeLabels.get(id) ?? id).join(", ")}. New requests are being rejected.</span>
                    </div>
                  )}
                  </>
                )}

                {/* Preview body follows the selected Mermaid theme. */}
                <div
                  ref={previewScrollRef}
                  className="flex-1 relative overflow-auto p-4 min-h-0 transition-colors duration-200"
                  style={{
                    backgroundColor: getThemeSpec(diagramTheme).canvas,
                    backgroundImage: `radial-gradient(${getThemeSpec(diagramTheme).dark ? "#FFFFFF12" : "#24372B12"} 0.75px, transparent 0.75px)`,
                    backgroundSize: "18px 18px",
                  }}
                  title="Ctrl/⌘ + scroll to zoom"
                >
                  {isRendering && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground bg-background/80 z-10">
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      <span>Rendering diagram...</span>
                    </div>
                  )}

                  {!svgCode && !error && !isRendering && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                      <span>Enter Mermaid code to see the preview</span>
                    </div>
                  )}

                  {/* CSS zoom (not transform) so the scroll area grows with the
                    diagram; m-auto centers when small yet keeps every edge
                    reachable when zoomed past the viewport */}
                  <div
                    ref={previewRef}
                    className={`min-h-full min-w-fit flex ${simulationMode ? "mermaid-simulation" : ""}`}
                    data-diagram-dark={
                      getThemeSpec(diagramTheme).dark ? "true" : "false"
                    }
                  >
                    <div
                      ref={zoomTargetRef}
                      className="m-auto mermaid-zoom-target"
                      style={{ zoom }}
                      dangerouslySetInnerHTML={{ __html: svgCode }}
                    />
                  </div>
                </div>
                {simulationMode && flowSimulation && (
                    <section className={`shrink-0 border-t border-border/80 bg-card ${previewFullscreen ? "max-h-[30dvh]" : ""}`} aria-label="Request event log">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-3.5 py-2 text-left text-xs hover:bg-muted/35"
                      aria-expanded={eventLogOpen}
                      onClick={() => setEventLogOpen((open) => !open)}
                    >
                      <span className="font-semibold text-foreground">Event log <span className="ml-1 font-normal text-muted-foreground">{visibleEventCount} / {flowSimulation.events.length}</span></span>
                      <span className="font-mono text-[10px] text-muted-foreground">{eventLogOpen ? "Hide" : "Show"}</span>
                    </button>
                    {eventLogOpen && (
                      <ol className="max-h-36 divide-y divide-border/60 overflow-y-auto px-3.5 pb-1 text-[11px]">
                        {flowSimulation.events.slice(0, visibleEventCount).slice(-80).reverse().map((event, index) => (
                          <li key={`${event.order}-${index}`} className="flex items-start gap-2 py-1.5">
                            <time className="w-12 shrink-0 font-mono tabular-nums text-muted-foreground">+{(event.at / 1000).toFixed(2)}s</time>
                            <span className="w-16 shrink-0 font-mono text-[10px] font-semibold text-teal-700 dark:text-teal-300">{event.requestId}</span>
                            <span className="min-w-0 flex-1 text-foreground/85">{eventDescription(event)}</span>
                          </li>
                        ))}
                        {visibleEventCount === 0 && (
                          <li className="py-3 text-center text-muted-foreground">Play or step through the run to inspect request events.</li>
                        )}
                      </ol>
                    )}
                  </section>
                )}
              </div>
            </>
          }
        />

        {/* File drop zone if empty */}
        {!input && (
          <FileUpload
            accept=".mmd,.mermaid,.txt"
            onFileLoaded={handleFileLoaded}
            label="Drag and drop a Mermaid file here, or click to browse"
          />
        )}

        {/* Status messages */}
        {error && (
          <StatusMessage type="error">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-destructive">Diagram Error</p>
              <p className="text-muted-foreground text-xs mt-0.5">{error}</p>
            </div>
          </StatusMessage>
        )}

        {svgCode && !error && (
          <StatusMessage type="success">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-foreground" />
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
              <span className="font-semibold text-foreground">
                Diagram rendered successfully.
              </span>
              <span className="text-xs text-muted-foreground">
                Code length:{" "}
                <strong className="text-foreground">{input.length}</strong>
              </span>
            </div>
          </StatusMessage>
        )}
      </div>
    </ToolPageLayout>
  );
}
