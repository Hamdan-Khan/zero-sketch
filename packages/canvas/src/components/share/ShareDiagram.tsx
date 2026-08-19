import { useCanvasStoreApi } from "@/store/CanvasStoreProvider";
import { Button } from "@cloudflare/kumo";
import { Share2 } from "lucide-react";
import { memo, useState } from "react";
import { useStore } from "zustand";
import { ShareDialog } from "./ShareDialog";

const ShareDiagramComponent = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const store = useCanvasStoreApi();
  const hasContent = useStore(
    store,
    (s) => s.nodes.length > 0 || s.edges.length > 0,
  );

  return (
    <>
      <Button
        variant="primary"
        icon={<Share2 size={16} />}
        className="fixed top-5 right-6 z-10"
        onClick={() => setIsDialogOpen(true)}
        disabled={!hasContent}
      >
        Share
      </Button>
      <ShareDialog open={isDialogOpen} setIsOpen={setIsDialogOpen} />
    </>
  );
};

export const ShareDiagram = memo(ShareDiagramComponent);
