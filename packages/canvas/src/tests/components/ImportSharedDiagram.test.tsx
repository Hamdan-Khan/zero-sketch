import { ImportSharedDiagram } from "@/components/share/ImportSharedDiagram";
import { encrypt, exportKey, generateKeyFromPlainText } from "@/lib/crypto";
import { CanvasStoreProvider } from "@/store/CanvasStoreProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockFitView, mockToast } from "../utils/mocks";
import { makeEdge, makeNode, makeStore } from "../utils/utils";

vi.unmock("zustand");

const setUrlState = (pathWithSearchAndHash: string) => {
  History.prototype.replaceState.call(
    window.history,
    null,
    "",
    pathWithSearchAndHash || "/",
  );
};

const renderImportDialog = (store = makeStore()) => {
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
          <ImportSharedDiagram />
        </CanvasStoreProvider>
      </QueryClientProvider>,
    ),
    store,
  };
};

describe("ImportSharedDiagram", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setUrlState("/");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setUrlState("/");
  });

  it("does not render dialog if URL lacks diagram param or hash key", () => {
    setUrlState("/");

    renderImportDialog();

    expect(screen.queryByText("Import Shared Diagram")).not.toBeInTheDocument();
  });

  it("renders 'Diagram Not Found' error dialog when diagram fetch fails (404)", async () => {
    setUrlState("/?diagram=missing-diagram-id#someFakeSecretKey123");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 404, statusText: "Not Found" }),
    );

    const replaceStateSpy = vi.spyOn(window.history, "replaceState");

    renderImportDialog();

    await waitFor(() => {
      expect(screen.getByText("Diagram Not Found")).toBeInTheDocument();
    });
    expect(
      screen.getByText(/The requested diagram could not be found/i),
    ).toBeInTheDocument();

    const dismissButton = screen.getByRole("button", { name: "Dismiss" });
    fireEvent.click(dismissButton);

    expect(replaceStateSpy).toHaveBeenCalledWith(
      null,
      "",
      window.location.pathname,
    );
  });

  it("successfully decrypts diagram, populates store, calls fitView, cleans URL, and toasts success", async () => {
    const importedNodes = [
      makeNode("imported-1", {
        position: { x: 50, y: 80 },
        data: { label: "Imported Node" },
      }),
    ];
    const importedEdges = [makeEdge("imported-e1", "imported-1", "imported-2")];
    const rawDiagram = {
      nodes: importedNodes,
      edges: importedEdges,
      grid: true,
    };
    const jsonString = JSON.stringify(rawDiagram);

    const { key, iv } = await generateKeyFromPlainText(jsonString);
    const b64Key = await exportKey(key);
    const ciphertext = await encrypt(key, iv, jsonString);

    const combined = new Uint8Array(iv.length + ciphertext.length);
    combined.set(iv, 0);
    combined.set(ciphertext, iv.length);

    setUrlState(`/?diagram=valid-diagram-123#${b64Key}`);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(combined, { status: 200 }),
    );

    const replaceStateSpy = vi.spyOn(window.history, "replaceState");

    const initialStore = makeStore([makeNode("old-node")], []);
    renderImportDialog(initialStore);

    await waitFor(() => {
      expect(screen.getByText("Import Shared Diagram")).toBeInTheDocument();
    });

    await waitFor(() => {
      const button = screen.getByRole("button", {
        name: /Import and Replace/i,
      });
      expect(button).not.toBeDisabled();
    });

    const importButton = screen.getByRole("button", {
      name: /Import and Replace/i,
    });

    fireEvent.click(importButton);

    await waitFor(() => {
      expect(initialStore.getState().nodes).toEqual(importedNodes);
    });
    expect(initialStore.getState().edges).toEqual(importedEdges);
    expect(initialStore.getState().grid).toBe(true);

    expect(mockFitView).toHaveBeenCalledWith({ padding: 0.2, duration: 300 });

    expect(replaceStateSpy).toHaveBeenCalledWith(
      null,
      "",
      window.location.pathname,
    );
    expect(mockToast.success).toHaveBeenCalledWith(
      "Diagram imported successfully",
    );
  });

  it("handles decryption failure with error message and toast when key is invalid or ciphertext corrupted", async () => {
    const { key: keyA, iv } = await generateKeyFromPlainText("secret data");
    const ciphertext = await encrypt(keyA, iv, "secret data");
    const combined = new Uint8Array(iv.length + ciphertext.length);
    combined.set(iv, 0);
    combined.set(ciphertext, iv.length);

    const { key: keyB } = await generateKeyFromPlainText("different data");
    const wrongB64Key = await exportKey(keyB);

    setUrlState(`/?diagram=diag-corrupted#${wrongB64Key}`);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(new Blob([combined]), { status: 200 }),
    );

    renderImportDialog();

    await waitFor(() => {
      expect(screen.getByText("Import Shared Diagram")).toBeInTheDocument();
    });

    await waitFor(() => {
      const button = screen.getByRole("button", {
        name: /Import and Replace/i,
      });
      expect(button).not.toBeDisabled();
    });

    const importButton = screen.getByRole("button", {
      name: /Import and Replace/i,
    });

    fireEvent.click(importButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Failed to decrypt diagram. The secret key may be invalid or the data was corrupted.",
        ),
      ).toBeInTheDocument();
    });

    expect(mockToast.error).toHaveBeenCalledWith(
      "Failed to decrypt diagram. The secret key may be invalid or the data was corrupted.",
    );
  });

  it("clears URL parameters and closes dialog when Cancel is clicked", async () => {
    setUrlState("/?diagram=cancel-diag#validKeyHash");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(new Blob(["data"]), { status: 200 }),
    );

    const replaceStateSpy = vi.spyOn(window.history, "replaceState");

    renderImportDialog();

    await waitFor(() => {
      expect(screen.getByText("Import Shared Diagram")).toBeInTheDocument();
    });

    await waitFor(() => {
      const button = screen.getByRole("button", { name: "Cancel" });
      expect(button).not.toBeDisabled();
    });

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelButton);

    expect(replaceStateSpy).toHaveBeenCalledWith(
      null,
      "",
      window.location.pathname,
    );
  });
});
