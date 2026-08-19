import { ShareDialog } from "@/components/share/ShareDialog";
import { api } from "@/lib/api/api";
import { BASE_URL } from "@/lib/constants";
import { CanvasStoreProvider } from "@/store/CanvasStoreProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockToast } from "../utils/mocks";
import { makeEdge, makeNode, makeStore } from "../utils/utils";

vi.unmock("zustand");

const renderShareDialog = ({
  open = true,
  setIsOpen = vi.fn(),
  store = makeStore(
    [makeNode("node-1", { selected: true })],
    [makeEdge("edge-1", "node-1", "node-2", { selected: true })],
  ),
} = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <CanvasStoreProvider store={store}>
          <ShareDialog open={open} setIsOpen={setIsOpen} />
        </CanvasStoreProvider>
      </QueryClientProvider>,
    ),
    setIsOpen,
    store,
  };
};

describe("ShareDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not render dialog content when open is false", () => {
    renderShareDialog({ open: false });
    expect(screen.queryByText("Share Diagram")).not.toBeInTheDocument();
  });

  it("renders dialog when open is true", () => {
    renderShareDialog({ open: true });
    expect(screen.getByText("Share Diagram")).toBeInTheDocument();
    expect(
      screen.getByText("Share your diagram with others to view."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();
  });

  it("disables Share button inside dialog when store is empty", () => {
    const store = makeStore([], []);
    renderShareDialog({ open: true, store });

    const shareButton = screen.getByRole("button", { name: "Share" });
    expect(shareButton).toBeDisabled();
  });

  it("performs end-to-end encryption and upload when Share is clicked", async () => {
    const mockPost = vi.fn().mockReturnValue({
      json: vi.fn().mockResolvedValue({
        message: "Success",
        success: true,
        id: "shared-diagram-id-456",
      }),
    });
    vi.spyOn(api, "post").mockImplementation(mockPost);

    renderShareDialog({ open: true });

    const shareButton = screen.getByRole("button", { name: "Share" });
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledTimes(1);
    });

    const [endpoint, options] = mockPost.mock.calls[0];
    expect(endpoint).toBe("diagram/upload");
    expect(options.body).toBeInstanceOf(FormData);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Anyone with this link can view the end-to-end encrypted diagram.",
        ),
      ).toBeInTheDocument();
    });

    const shareLink = screen.getByText(
      new RegExp(
        `^${BASE_URL}/?\\?diagram=shared-diagram-id-456#[A-Za-z0-9_-]+$`,
      ),
    );
    expect(shareLink).toBeInTheDocument();
  });

  it("shows error toast when upload fails", async () => {
    vi.spyOn(api, "post").mockImplementation(() => {
      throw new Error("Network upload failure");
    });

    renderShareDialog({ open: true });

    const shareButton = screen.getByRole("button", { name: "Share" });
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        "Failed to share diagram. Please try again.",
      );
    });
  });

  it("calls setIsOpen(false) when close button is clicked", () => {
    const setIsOpen = vi.fn();
    renderShareDialog({ open: true, setIsOpen });

    const closeButton = screen.getAllByRole("button", { name: "Close" })[0];
    fireEvent.click(closeButton);

    expect(setIsOpen).toHaveBeenCalledWith(false);
  });
});
