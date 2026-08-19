import { sanitizeCanvasElements } from "@/lib/utils";
import { useCanvasStore } from "@/store/CanvasStoreProvider";
import { CanvasStoreState } from "@/store/store";
import { ReactFlow, ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { useLibraryRegistryStore } from "@zero-sketch/models";
import { useLayoutEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useShallow } from "zustand/shallow";
import { CanvasGrid } from "../canvas/CanvasGrid";
import { edgeTypes } from "../edges/EdgeTypes";
import { createNodeTypes } from "../nodes/createNodeTypes";

export interface ExportReadyPayload {
  flowEl: HTMLElement;
  width: number;
  height: number;
}

interface ExportRendererProps {
  onReady: (payload: ExportReadyPayload) => void;
}

const selector = (state: CanvasStoreState) => ({
  nodes: state.nodes,
  edges: state.edges,
  exportOptions: state.exportOptions,
});

export const EXPORT_CANVAS_GRID_ID = "export";

const MIN_CANVAS_DIMENSION = 100;

export function ExportRenderer({ onReady }: ExportRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { nodes, edges, exportOptions } = useCanvasStore(useShallow(selector));
  const { getNodesBounds } = useReactFlow();

  const selectedLib = useLibraryRegistryStore((s) => s.selectedLib);
  const nodeTypes = useMemo(() => createNodeTypes(selectedLib), [selectedLib]);

  // sanitize elements (remove selected / locked / transient states)
  const cleanNodes = useMemo(
    () => sanitizeCanvasElements(nodes),
    [nodes],
  );
  const cleanEdges = useMemo(
    () => sanitizeCanvasElements(edges),
    [edges],
  );

  /** diagram's bounding rect for getting its position and width/height on the canvas */
  const bounds = useMemo(
    () => getNodesBounds(cleanNodes),
    [cleanNodes, getNodesBounds],
  );
  const { padding, showGrid, background } = exportOptions;

  // add padding to the diagram's bounding rect to calculate total width
  //  and height of the diagram
  const contentWidth = bounds.width + padding * 2;
  const contentHeight = bounds.height + padding * 2;

  const canvasWidth = Math.max(Math.ceil(contentWidth), MIN_CANVAS_DIMENSION);
  const canvasHeight = Math.max(Math.ceil(contentHeight), MIN_CANVAS_DIMENSION);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    // .react-flow contains both the background grid & viewport
    const flowEl = container.querySelector(".react-flow") as HTMLElement | null;
    const viewportEl = container.querySelector(
      ".react-flow__viewport",
    ) as HTMLElement | null;
    if (!flowEl || !viewportEl) {
      return;
    }

    // calculate extra offset if canvas was expanded (when it was less than 100px)
    const offsetX = (canvasWidth - contentWidth) / 2;
    const offsetY = (canvasHeight - contentHeight) / 2;

    // translate viewport to the diagram content (centered) on the canvas
    // equal padding on all sides is added outwards
    const tx = Math.round(-bounds.x + padding + offsetX);
    const ty = Math.round(-bounds.y + padding + offsetY);
    viewportEl.style.transform = `translate(${tx}px, ${ty}px) scale(1)`;

    // two animation frames: first lets the transform commit, second lets any node internals render
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // pass flow element and computed dimensions
        onReady({ flowEl, width: canvasWidth, height: canvasHeight });
      });
    });
  }, [
    cleanNodes.length,
    bounds.x,
    bounds.y,
    padding,
    canvasWidth,
    canvasHeight,
    onReady,
    contentHeight,
    contentWidth,
  ]);

  const bgColor = background === "white" ? "#ffffff" : undefined;

  return createPortal(
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        top: 0,
        left: "-99999px", // outside visible viewport
        width: canvasWidth,
        height: canvasHeight,
        pointerEvents: "none",
        zIndex: -1,
        overflow: "hidden",
      }}
    >
      <ReactFlowProvider>
        <ReactFlow
          nodes={cleanNodes}
          edges={cleanEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={false}
          panOnScroll={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          preventScrolling={false}
          proOptions={{ hideAttribution: true }}
          style={{
            width: canvasWidth,
            height: canvasHeight,
            backgroundColor: bgColor,
          }}
        >
          {showGrid && <CanvasGrid id={EXPORT_CANVAS_GRID_ID} />}
        </ReactFlow>
      </ReactFlowProvider>
    </div>,
    document.body,
  );
}
