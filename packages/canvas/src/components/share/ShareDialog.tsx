import { useUploadDiagram } from "@/lib/api/hooks";
import { BASE_URL } from "@/lib/constants";
import { encrypt, exportKey, generateKey } from "@/lib/crypto";
import { useCanvasStoreApi } from "@/store/CanvasStoreProvider";
import { Button, ClipboardText, Dialog, Text } from "@cloudflare/kumo";
import { X } from "lucide-react";
import { nanoid } from "nanoid";
import { useState } from "react";

interface ShareDialogProps {
  open: boolean;
  setIsOpen: (open: boolean) => void;
}

export const ShareDialog = ({ open, setIsOpen }: ShareDialogProps) => {
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      setShareUrl(null);
    }
    setIsOpen(newOpen);
  };

  const { getState } = useCanvasStoreApi();

  const { mutateAsync: uploadDiagram, isPending } = useUploadDiagram();

  const handleShareDiagram = async () => {
    try {
      // get the current diagram from the store's state
      const { nodes, edges, grid } = getState();
      const diagram = { nodes, edges, grid };
      const plainText = JSON.stringify(diagram);

      // generate symm encryption key
      const key = await generateKey();
      const b64Key = await exportKey(key);

      // encrypt the diagram
      const { iv, ciphertext } = await encrypt(key, plainText);

      // combine the initialization vector with the cipher text
      const combined = new Uint8Array(iv.length + ciphertext.length);
      combined.set(iv, 0);
      combined.set(ciphertext, iv.length);

      const encryptedBlob = new Blob([combined], {
        type: "application/octet-stream",
      });
      // create a url safe if for the diagram
      const id = nanoid();

      await uploadDiagram({ file: encryptedBlob, id });

      const url = `${BASE_URL}/?diagram=${id}#${b64Key}`;
      setShareUrl(url);
    } catch (error) {
      console.error("Failed to share diagram:", error);
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
        <Dialog.Description>
          <Text variant="secondary" size="sm">
            {shareUrl
              ? "Anyone with this link can view the end-to-end encrypted diagram."
              : "Share your diagram with others to view."}
          </Text>
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
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="primary"
              onClick={handleShareDiagram}
              loading={isPending}
            >
              Share
            </Button>
          </div>
        )}
      </Dialog>
    </Dialog.Root>
  );
};
