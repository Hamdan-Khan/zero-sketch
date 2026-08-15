import { Button } from "@cloudflare/kumo";
import { Share2 } from "lucide-react";
import { memo, useState } from "react";
import { ShareDialog } from "./ShareDialog";

const ShareDiagramComponent = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  return (
    <>
      <Button
        variant="primary"
        icon={<Share2 size={16} />}
        className="fixed top-5 right-6 z-10"
        onClick={() => setIsDialogOpen(true)}
      >
        Share
      </Button>
      <ShareDialog open={isDialogOpen} setIsOpen={setIsDialogOpen} />
    </>
  );
};

export const ShareDiagram = memo(ShareDiagramComponent);
