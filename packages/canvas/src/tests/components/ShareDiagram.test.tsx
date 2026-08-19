import { ShareDiagram } from "@/components/share/ShareDiagram";
import { CanvasStoreProvider } from "@/store/CanvasStoreProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeNode, makeStore } from "../utils/utils";

vi.unmock("zustand");

describe("ShareDiagram", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createQueryClient = () =>
    new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

  it("disables the Share button when canvas has no nodes and no edges", () => {
    const store = makeStore([], []);
    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <CanvasStoreProvider store={store}>
          <ShareDiagram />
        </CanvasStoreProvider>
      </QueryClientProvider>,
    );

    const shareButton = screen.getByRole("button", { name: "Share" });
    expect(shareButton).toBeInTheDocument();
    expect(shareButton).toBeDisabled();

    // Dialog title should not be visible
    expect(screen.queryByText("Share Diagram")).not.toBeInTheDocument();

    // Click should not open dialog
    fireEvent.click(shareButton);
    expect(screen.queryByText("Share Diagram")).not.toBeInTheDocument();
  });

  it("enables Share button when canvas has nodes and opens ShareDialog on click", () => {
    const store = makeStore([makeNode("node-1")]);
    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <CanvasStoreProvider store={store}>
          <ShareDiagram />
        </CanvasStoreProvider>
      </QueryClientProvider>,
    );

    const shareButton = screen.getByRole("button", { name: "Share" });
    expect(shareButton).toBeInTheDocument();
    expect(shareButton).not.toBeDisabled();

    // Dialog title should not be visible before clicking
    expect(screen.queryByText("Share Diagram")).not.toBeInTheDocument();

    // Click to open dialog
    fireEvent.click(shareButton);

    expect(screen.getByText("Share Diagram")).toBeInTheDocument();
  });
});
