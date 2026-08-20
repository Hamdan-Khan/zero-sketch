import { useUploadDiagram } from "@/lib/api/hooks";
import { BASE_URL, TURNSTILE_SITE_KEY } from "@/lib/constants";
import { encrypt, exportKey, generateKeyFromPlainText } from "@/lib/crypto";
import { sanitizeCanvasElements } from "@/lib/utils";
import { useCanvasStoreApi } from "@/store/CanvasStoreProvider";
import { Button, ClipboardText, Dialog } from "@cloudflare/kumo";
import { Lock, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useStore } from "zustand";
import { TurnstileWidget } from "./TurnstileWidget";

interface ShareDialogProps {
  open: boolean;
  setIsOpen: (open: boolean) => void;
}

export const ShareDialog = ({ open, setIsOpen }: ShareDialogProps) => {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      setShareUrl(null);
      setIsVerifying(false);
    }
    setIsOpen(newOpen);
  };

  const store = useCanvasStoreApi();
  const hasContent = useStore(
    store,
    (s) => s.nodes.length > 0 || s.edges.length > 0,
  );
  const { mutateAsync: uploadDiagram, isPending } = useUploadDiagram();

  const isTurnstileConfigured = Boolean(TURNSTILE_SITE_KEY);
  const isBusy = isPending || isVerifying;

  const performUpload = async (token: string | null = null) => {
    try {
      const { nodes, edges, grid } = store.getState();
      if (nodes.length === 0 && edges.length === 0) {
        toast.error("Cannot share an empty diagram.");
        return;
      }
      const diagram = {
        nodes: sanitizeCanvasElements(nodes),
        edges: sanitizeCanvasElements(edges),
        grid,
      };
      const plainText = JSON.stringify(diagram);

      // generate symm encryption key
      const { key, iv } = await generateKeyFromPlainText(plainText);
      const b64Key = await exportKey(key);

      // encrypt the diagram
      const ciphertext = await encrypt(key, iv, plainText);

      // combine the initialization vector with the cipher text
      const combined = new Uint8Array(iv.length + ciphertext.length);
      combined.set(iv, 0);
      combined.set(ciphertext, iv.length);

      const encryptedBlob = new Blob([combined], {
        type: "application/octet-stream",
      });

      const { id } = await uploadDiagram({
        file: encryptedBlob,
        token,
      });

      const url = new URL(BASE_URL);
      url.searchParams.set("diagram", id);
      url.hash = b64Key;
      setShareUrl(url.toString());
    } catch (error) {
      console.error("Failed to share diagram:", error);
      toast.error("Failed to share diagram. Please try again.", {
        duration: 6000,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleShareClick = () => {
    const { nodes, edges } = store.getState();
    if (nodes.length === 0 && edges.length === 0) {
      toast.error("Cannot share an empty diagram.");
      return;
    }
    if (isTurnstileConfigured) {
      setIsVerifying(true);
    } else {
      performUpload(null);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog size="base" className="p-4">
        <div className="mb-3 flex items-start justify-between gap-4">
          <Dialog.Title className="text-lg font-semibold">
            Share Diagram
          </Dialog.Title>
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
          {shareUrl
            ? "Anyone with this link can view the end-to-end encrypted diagram."
            : "Share your diagram with others to view."}
        </Dialog.Description>

        {shareUrl ? (
          <div className="mt-4">
            <ClipboardText
              text={shareUrl}
              size="base"
              tooltip={{ text: "Copy link", copiedText: "Link copied!" }}
            />
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {isVerifying && isTurnstileConfigured && (
              <div className="flex justify-center">
                <TurnstileWidget
                  siteKey={TURNSTILE_SITE_KEY!}
                  action="share_diagram"
                  onSuccess={(token) => performUpload(token)}
                  onError={() => {
                    toast.error("Bot verification failed. Please try again.");
                    setIsVerifying(false);
                  }}
                />
              </div>
            )}
            <div className="flex justify-center gap-2">
              <div className="mt-1.5 flex gap-1.5 text-sm text-kumo-subtle">
                <Lock className="size-3.5 shrink-0 mt-1" />
                <span>
                  End-to-end encrypted. We can't see what you're sharing.
                </span>
              </div>
              <Button
                variant="primary"
                onClick={handleShareClick}
                loading={isBusy}
                disabled={isBusy || !hasContent}
              >
                Share
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </Dialog.Root>
  );
};
