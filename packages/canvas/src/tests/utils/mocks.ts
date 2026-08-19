import { type Mock, vi } from "vitest";

// xyflow mocks
export const mockGetEdge: Mock = vi.fn();
export const mockGetEdges: Mock = vi.fn();
export const mockGetIntersectingNodes: Mock = vi.fn();
export const mockGetInternalNode: Mock = vi.fn();
export const mockGetNodes: Mock = vi.fn();
export const mockGetNodesBounds: Mock = vi.fn();
export const mockScreenToFlowPosition: Mock = vi.fn((pos) => pos);
export const mockSetEdges: Mock = vi.fn();
export const mockSetNodes: Mock = vi.fn();
export const mockSetViewport: Mock = vi.fn();
export const mockFitView: Mock = vi.fn();

// zustand mocks
export const mockOnConnect: Mock = vi.fn();

// sonner mocks
export const mockToast: Mock & { error: Mock; success: Mock } = Object.assign(
  vi.fn(),
  {
    error: vi.fn(),
    success: vi.fn(),
  },
);
