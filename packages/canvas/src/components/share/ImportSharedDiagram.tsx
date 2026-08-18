import { useHistory } from "@/hooks/useHistory";
import { useFetchDiagram } from "@/lib/api/hooks";
import { decrypt, ENCRYPTION_IV_LENGTH, importKey } from "@/lib/crypto";
import { useCanvasStoreApi } from "@/store/CanvasStoreProvider";
import { Button, Dialog } from "@cloudflare/kumo";
import { useReactFlow } from "@xyflow/react";
import { AlertCircle, AlertTriangle, ImportIcon, X } from "lucide-react";
import { memo, useState } from "react";
import { toast } from "sonner";

type SharedLinkInfo = { diagramId: string; encryptionKey: string };

const getInitialSharedDiagram = (): SharedLinkInfo | null => {
  if (typeof window === "undefined") return null;

  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("diagram");
  const key = window.location.hash.replace(/^#/, "").trim();

  if (id && key) {
    return { diagramId: id, encryptionKey: key };
  }

  return null;
};

const ImportSharedDiagramComponent = () => {
  const [sharedInfo] = useState<SharedLinkInfo | null>(getInitialSharedDiagram);
  const [isOpen, setIsOpen] = useState(Boolean(sharedInfo));
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptionError, setDecryptionError] = useState<string | null>(null);

  const { commit } = useHistory();
  const { getState } = useCanvasStoreApi();
  const { fitView } = useReactFlow();

  const diagramId = sharedInfo?.diagramId || null;
  const encryptionKey = sharedInfo?.encryptionKey || null;

  const {
    data: blob,
    isLoading: isFetchingBlob,
    isError: isFetchError,
  } = useFetchDiagram(diagramId);

  const handleClose = (open: boolean) => {
    if (!open) {
      // clear url parameters & hash when dismissed
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
    setIsOpen(open);
  };

  const handleImport = async () => {
    if (!blob || !encryptionKey) return;

    setIsDecrypting(true);
    setDecryptionError(null);

    try {
      // slice iv and ciphertext from the combined blob, first 12 bytes are iv
      const buffer = new Uint8Array(await blob.arrayBuffer());
      const iv = buffer.slice(0, ENCRYPTION_IV_LENGTH);
      const ciphertext = buffer.slice(ENCRYPTION_IV_LENGTH);

      // import symmetric key and decrypt payload
      const key = await importKey(encryptionKey);
      const plainText = await decrypt(key, iv, ciphertext);
      const diagram = JSON.parse(plainText);

      if (!diagram || typeof diagram !== "object") {
        throw new Error("Invalid diagram data structure");
      }

      // update store state with imported canvas data
      const { setNodes, setEdges, setGrid } = getState();
      // snapshot current state for undo
      commit();

      if (Array.isArray(diagram.nodes)) {
        setNodes(diagram.nodes);
      }
      if (Array.isArray(diagram.edges)) {
        setEdges(diagram.edges);
      }
      if (typeof diagram.grid === "boolean") {
        setGrid(diagram.grid);
      }

      // center imported diagram in viewport
      fitView({ padding: 0.2, duration: 300 });

      // clean url query and hash
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", window.location.pathname);
      }

      toast.success("Diagram imported successfully");
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to import shared diagram:", error);
      const msg =
        "Failed to decrypt diagram. The secret key may be invalid or the data was corrupted.";
      setDecryptionError(msg);
      toast.error(msg);
    } finally {
      setIsDecrypting(false);
    }
  };

  if (!isOpen) return null;

  // render error if diagram not found on R2 storage
  if (isFetchError) {
    return (
      <Dialog.Root open={isOpen} onOpenChange={handleClose}>
        <Dialog size="base" className="p-4">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-6 text-kumo-danger" />
              <Dialog.Title className="text-xl font-semibold">
                Diagram Not Found
              </Dialog.Title>
            </div>
            <Dialog.Close
              aria-label="Close"
              render={(props) => (
                <Button
                  {...props}
                  variant="secondary"
                  shape="square"
                  size="sm"
                  icon={<X className="size-4" />}
                  aria-label="Close"
                />
              )}
            />
          </div>
          <Dialog.Description className="text-sm text-kumo-subtle">
            The requested diagram could not be found. It may have been expired,
            deleted, or the share URL is incorrect.
          </Dialog.Description>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleClose(false)}>
              Dismiss
            </Button>
          </div>
        </Dialog>
      </Dialog.Root>
    );
  }

  const isLoading = isFetchingBlob || isDecrypting;

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleClose}>
      <Dialog size="base" className="p-4">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <ImportIcon className="size-6 text-kumo-warning" />
            <Dialog.Title className="text-xl font-semibold">
              Import Shared Diagram
            </Dialog.Title>
          </div>
          <Dialog.Close
            aria-label="Close"
            render={(props) => (
              <Button
                {...props}
                variant="secondary"
                shape="square"
                size="sm"
                icon={<X className="size-4" />}
                aria-label="Close"
              />
            )}
          />
        </div>

        <Dialog.Description className="text-sm text-kumo-subtle">
          Importing this diagram will replace your current workspace. Any
          unsaved changes on your canvas will be lost.
        </Dialog.Description>

        {decryptionError && (
          <div className="mt-3 flex items-start gap-2 rounded-md bg-kumo-danger/10 p-2.5 text-xs text-kumo-danger">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <span>{decryptionError}</span>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => handleClose(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleImport}
            loading={isLoading}
            disabled={!blob || isLoading}
          >
            Import and Replace
          </Button>
        </div>
      </Dialog>
    </Dialog.Root>
  );
};

export const ImportSharedDiagram = memo(ImportSharedDiagramComponent);
