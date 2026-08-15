import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LibraryRegistry, RegisteredEdges } from "@zero-sketch/models";
import { Canvas } from "../src/components/canvas/Canvas";
import { createCanvasStore } from "../src/store/store";

export const PlayGround = () => {
  const canvasState = createCanvasStore({
    nodes: [],
    edges: [],
    selectedEdgeType: RegisteredEdges.SMOOTHSTEP,
  });
  const libUrl = import.meta.env.VITE_LIBRARY_URL;
  const registry = new LibraryRegistry({ url: libUrl });
  const queryClient = new QueryClient({ defaultOptions: { queries: {} } });

  return (
    <QueryClientProvider client={queryClient}>
      <Canvas libraryRegistry={registry} canvasState={canvasState} />;
    </QueryClientProvider>
  );
};
