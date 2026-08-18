import { useHistory } from "@/hooks/useHistory";
import { useFetchDiagram } from "@/lib/api/hooks";
import { decrypt, ENCRYPTION_IV_LENGTH, importKey } from "@/lib/crypto";
import { useCanvasStoreApi } from "@/store/CanvasStoreProvider";
import { Button, Dialog } from "@cloudflare/kumo";
import { useReactFlow } from "@xyflow/react";
import { ImportIcon, X } from "lucide-react";
import { memo, useState } from "react";
import { toast } from "sonner";

const getInitialSharedDiagram = () => {
  if (typeof window === "undefined") {
    return { diagramId: null, encryptionKey: null, isOpen: false };
  }

  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("diagram");
  const key = window.location.hash.replace(/^#/, "");

  if (id && key) {
    return { diagramId: id, encryptionKey: key, isOpen: true };
  }

  return { diagramId: null, encryptionKey: null, isOpen: false };
};

const ImportSharedDiagramComponent = () => {
  const [{ diagramId, encryptionKey, isOpen: initialOpen }] = useState(
    getInitialSharedDiagram,
  );
  const { commit } = useHistory();
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [isDecrypting, setIsDecrypting] = useState(false);

  const { getState } = useCanvasStoreApi();
  const { fitView } = useReactFlow();
  const {
    data: blob,
    isLoading: isFetchingBlob,
    isError: isFetchError,
  } = useFetchDiagram(diagramId);

  const handleClose = (open: boolean) => {
    if (!open) {
      // clear url parameters when dismissed
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
    setIsOpen(open);
  };

  const handleImport = async () => {
    if (!blob || !encryptionKey) return;

    setIsDecrypting(true);
    try {
      // slice iv and ciphertext from the combined blob, first 12 bytes are iv
      const buffer = new Uint8Array(await blob.arrayBuffer());
      const iv = buffer.slice(0, ENCRYPTION_IV_LENGTH);
      const ciphertext = buffer.slice(ENCRYPTION_IV_LENGTH);

      // import symmetric key and decrypt payload
      const key = await importKey(encryptionKey);
      const plainText = await decrypt(key, iv, ciphertext);
      const diagram = JSON.parse(plainText);

      // update store state with imported canvas data
      const { setNodes, setEdges, setGrid } = getState();
      // snapshot current state before applying imported one
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
      console.error("failed to import shared diagram:", error);
      toast.error("Failed to decrypt and load diagram");
    } finally {
      setIsDecrypting(false);
    }
  };

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
            disabled={!blob || isFetchError}
          >
            Import and Replace
          </Button>
        </div>
      </Dialog>
    </Dialog.Root>
  );
};

export const ImportSharedDiagram = memo(ImportSharedDiagramComponent);
