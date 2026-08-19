import {
  ExportReadyPayload,
  ExportRenderer,
} from "@/components/export/ExportRenderer";
import { renderToNativeSvg } from "@/lib/svgExport";
import { downloadFile, sanitizeCanvasElements } from "@/lib/utils";
import {
  CanvasStoreContext,
  useCanvasStore,
} from "@/store/CanvasStoreProvider";
import { CanvasStoreState } from "@/store/store";
import { Edge, Node, useReactFlow, Viewport } from "@xyflow/react";
import { FILE_EXTENSIONS, PROJECT_VERSION } from "@zero-sketch/common";
import { toPng } from "html-to-image";
import { useCallback, useContext } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/shallow";

export type ExportBackground = "white" | "transparent";
export type ExportScale = 1 | 2 | 3;
export type ExportFormat = FILE_EXTENSIONS;

/** zero-sketch project file schema for export / import */
export type ProjectFile = {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
  version: string;
};

export interface ExportOptions {
  background: ExportBackground;
  scale: ExportScale;
  padding: number;
  showGrid: boolean;
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  background: "white",
  scale: 1,
  padding: 40,
  showGrid: true,
};

/**
 * module level state for temporarily storing the resolve function of the
 * promise in `captureImage`.
 *
 * We basically mount the export renderer as a cloned DOM element for a clean
 * snapshot of the canvas when `captureImage` is called. The renderer takes a few
 * render cycles to: mount, render nodes, edges, and finally signal its readiness.
 *
 * In the meantime, this state is used to resolve the promise when the renderer
 * is finally ready.
 */
let pendingResolve: ((payload: ExportReadyPayload) => void) | null = null;

const selector = (s: CanvasStoreState) => ({
  isExporting: s.isExporting,
});

export const useCanvasExport = () => {
  const { isExporting } = useCanvasStore(useShallow(selector));
  const storeApi = useContext(CanvasStoreContext)!;
  const { toObject } = useReactFlow();

  /**
   * called by export renderer when it has finished mounting.
   *
   * it resolves the promise that `captureImage` function is awaiting by returning the
   * react flow HTML element and computed dimensions
   */
  const onRendererReady = useCallback((payload: ExportReadyPayload) => {
    // it currently holds the `resolve` function of the captureImage promise
    pendingResolve?.(payload);
    // after resolving the promise, we flush it to prepare for the next capture
    pendingResolve = null;
  }, []);

  /**
   * mounts the renderer, waits for it to signal readiness, then captures and returns a data URL
   */
  const captureImage = useCallback(
    async (
      format: ExportFormat = FILE_EXTENSIONS.PNG,
    ): Promise<string | null> => {
      const { setIsExporting, exportOptions: expOptions } = storeApi.getState();

      setIsExporting(true);

      let payload: ExportReadyPayload;
      try {
        const { promise, resolve } =
          Promise.withResolvers<ExportReadyPayload>();
        pendingResolve = resolve;
        payload = await promise;
      } catch {
        setIsExporting(false);
        return null;
      }

      const { scale, background } = expOptions;
      const bgColor = background === "white" ? "#ffffff" : undefined;
      const { flowEl, width, height } = payload;

      let dataUrl: string | null = null;
      try {
        if (format === FILE_EXTENSIONS.PNG) {
          dataUrl = await toPng(flowEl, {
            width,
            height,
            backgroundColor: bgColor,
            pixelRatio: scale,
            style: {
              width: `${width}px`,
              height: `${height}px`,
            },
          });
        } else if (format === FILE_EXTENSIONS.SVG) {
          dataUrl = renderToNativeSvg(flowEl, width, height, bgColor);
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to capture diagram");
      }

      setIsExporting(false);
      return dataUrl;
    },
    [storeApi],
  );

  /** downloads the diagram as a PNG file */
  const exportAsPng = useCallback(
    async (fileName: string) => {
      const dataUrl = await captureImage(FILE_EXTENSIONS.PNG);
      if (!dataUrl) {
        toast.error("Failed to export diagram");
        return;
      }

      try {
        downloadFile(dataUrl, fileName, FILE_EXTENSIONS.PNG);
        toast.success("Diagram exported as png successfully");
      } catch (error) {
        console.error(error);
        toast.error("Failed to export diagram");
      }
    },
    [captureImage],
  );

  /** downloads the diagram as a SVG file */
  const exportAsSvg = useCallback(
    async (fileName: string) => {
      const dataUrl = await captureImage(FILE_EXTENSIONS.SVG);
      if (!dataUrl) {
        toast.error("Failed to export diagram");
        return;
      }

      try {
        downloadFile(dataUrl, fileName, FILE_EXTENSIONS.SVG);
        toast.success("Diagram exported as svg successfully");
      } catch (error) {
        console.error(error);
        toast.error("Failed to export diagram");
      }
    },
    [captureImage],
  );

  const exportAsProject = useCallback(
    (fileName: string = "diagram") => {
      try {
        const flow = toObject();
        const flowObj: ProjectFile = {
          ...flow,
          nodes: sanitizeCanvasElements(flow.nodes),
          edges: sanitizeCanvasElements(flow.edges),
          version: PROJECT_VERSION,
          // reset viewport
          viewport: { x: 0, y: 0, zoom: 1 },
        };

        const blob = new Blob([JSON.stringify(flowObj)], {
          type: "application/json",
        });
        const dataUrl = URL.createObjectURL(blob);
        downloadFile(dataUrl, fileName, FILE_EXTENSIONS.PROJECT);
        toast.success("Project saved successfully");
      } catch (error) {
        console.error(error);
        toast.error("Failed to save project");
      }
    },
    [toObject],
  );

  /**
   * mounts the export renderer only while a capture is under way
   */
  const ExportCanvas = isExporting ? (
    <ExportRenderer onReady={onRendererReady} />
  ) : null;

  return {
    captureImage,
    exportAsPng,
    exportAsSvg,
    exportAsProject,
    ExportCanvas,
  };
};
