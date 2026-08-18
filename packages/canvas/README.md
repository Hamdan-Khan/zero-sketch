# Canvas

The base canvas package, exports the canvas component with all the canvas functionality.

```jsx
import { Canvas } from "@zero-sketch/canvas";

function App() {
  const canvasState = { edges: [], nodes: [] };
  return <Canvas canvasState={canvasState} />;
}

export default App;
```

## Todos

- [x] add locking nodes functionality
- [x] add custom context menu on right click
- [x] add keyboard shortcuts in root component
- [x] improve context-menu (right click) wroking i.e. it should auto-select the node on which right click is performed, should not open when clicked on non canvas elements (toolbar, etc.)
- [x] make import of icons (nodes/edges) pluggable
- [x] if context menu is opened over a selected nodes group, its options (such as edge type, animation, arrow, etc.) should affect all the edges inside the selection.
- [x] if context menu is opened outside a selection,it should be un-selected
- [x] clicking a node on the toolbar should drop it in the middle of the screen
- [x] add labels on edges
- [x] fix multi nodes on ctrl+v paste
- [x] remove barrel imports for components
- [x] export as png, svg and .zerosketch
- [x] add labels to standard nodes
- [ ] optimize undo/redo history state
- [ ] configure rolldown code splitting
- [ ] add error boundary
- [ ] fix svg export renderer
- [ ] audit ui components and apply memo to prevent re-renders when parent `<CanvasElement />` re-renders during canvas pan/zoom or dragging.
- [ ] audit custom hooks to avoid reactive zustand subscriptions for rapidly changing state. access state on demand via `useCanvasStoreApi()`.
- [ ] pass zerosketch version as part of the diagram share blob in case we update its schema later on and need to maintain backward compatibility

### UX (later)

- [ ] improve node dragging semantics i.e. nodes should appear as a canvas element while dragged from the toolbar, instead of being like a picture of the node element.
- [ ] fix layering (z indexes)
