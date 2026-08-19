import { ShareDiagram } from "@/components/share/ShareDiagram";
import { CanvasStoreProvider } from "@/store/CanvasStoreProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeStore } from "../utils/utils";

vi.unmock("zustand");

describe("ShareDiagram", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Share trigger button and opens ShareDialog on click", () => {
    const store = makeStore();
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <CanvasStoreProvider store={store}>
          <ShareDiagram />
        </CanvasStoreProvider>
      </QueryClientProvider>,
    );

    const shareButton = screen.getByRole("button", { name: "Share" });
    expect(shareButton).toBeInTheDocument();

    // Dialog title should not be visible before clicking
    expect(screen.queryByText("Share Diagram")).not.toBeInTheDocument();

    // Click to open dialog
    fireEvent.click(shareButton);

    expect(screen.getByText("Share Diagram")).toBeInTheDocument();
  });
});
