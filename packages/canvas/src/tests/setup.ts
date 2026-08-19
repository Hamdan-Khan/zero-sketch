import { CanvasStoreState } from "@/store/store";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { RegisteredEdges } from "@zero-sketch/models";
import "fake-indexeddb/auto";
import { webcrypto } from "node:crypto";
import { afterEach, vi } from "vitest";
import { StoreApi } from "zustand";

if (!globalThis.crypto || !globalThis.crypto.subtle) {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    writable: true,
    configurable: true,
  });
}

// eslint-disable-next-line no-extend-native
Uint8Array.prototype.toBase64 ??= function () {
  return Buffer.from(this).toString("base64url");
};
Uint8Array.fromBase64 ??= function (b64: string) {
  return new Uint8Array(Buffer.from(b64, "base64url"));
};

afterEach(() => {
  cleanup();
});

type Selector = (state: Partial<CanvasStoreState>) => Partial<CanvasStoreState>;

vi.mock("zustand", async (importOriginal) => {
  const actual = await importOriginal<typeof import("zustand")>();
  const { mockSetNodes, mockSetEdges } = await import("./utils/mocks");
  return {
    ...actual,
    useStore: (store: StoreApi<CanvasStoreState>, selector: Selector) =>
      store?.getState
        ? selector(store.getState())
        : selector({
            nodes: [],
            edges: [],
            history: { past: [], future: [] },
            commit: vi.fn(),
            undo: vi.fn(),
            redo: vi.fn(),
            setNodes: mockSetNodes,
            setEdges: mockSetEdges,
            globalEdgeType: RegisteredEdges.STRAIGHT,
            globalEdgeAnimated: false,
            globalEdgeMarkerEnd: undefined,
            setGlobalEdgeType: vi.fn(),
            setGlobalEdgeAnimated: vi.fn(),
            setGlobalEdgeMarkerEnd: vi.fn(),
            isInteractive: true,
            grid: true,
          }),
  };
});

vi.mock("sonner", async () => {
  const { mockToast } = await import("./utils/mocks");
  return { toast: mockToast };
});

vi.mock("@xyflow/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@xyflow/react")>();
  const {
    mockGetEdge,
    mockGetEdges,
    mockGetIntersectingNodes,
    mockGetInternalNode,
    mockGetNodes,
    mockGetNodesBounds,
    mockScreenToFlowPosition,
    mockSetEdges,
    mockSetNodes,
    mockSetViewport,
    mockFitView,
  } = await import("./utils/mocks");

  return {
    ...actual,
    EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) =>
      children,
    useReactFlow: () => ({
      getEdge: mockGetEdge,
      getEdges: mockGetEdges,
      getIntersectingNodes: mockGetIntersectingNodes,
      getInternalNode: mockGetInternalNode,
      getNodes: mockGetNodes,
      getNodesBounds: mockGetNodesBounds,
      screenToFlowPosition: mockScreenToFlowPosition,
      setEdges: mockSetEdges,
      setNodes: mockSetNodes,
      setViewport: mockSetViewport,
      fitView: mockFitView,
      toObject: vi.fn(() => ({
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      })),
    }),
  };
});
