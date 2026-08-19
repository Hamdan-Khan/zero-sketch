import { cn, downloadFile, sanitizeCanvasElements } from "@/lib/utils";
import { FILE_EXTENSIONS } from "@zero-sketch/common";
import { describe, expect, it, vi } from "vitest";

describe("lib/utils", () => {
  describe("cn", () => {
    it("merges class names correctly", () => {
      expect(cn("px-2 py-1", "bg-blue-500", { "text-white": true })).toBe(
        "px-2 py-1 bg-blue-500 text-white",
      );
    });
  });

  describe("downloadFile", () => {
    it("creates an anchor element and triggers download", () => {
      const clickSpy = vi.fn();
      const mockAnchor = {
        href: "",
        download: "",
        click: clickSpy,
      } as unknown as HTMLAnchorElement;

      vi.spyOn(document, "createElement").mockReturnValue(mockAnchor);
      vi.spyOn(document.body, "appendChild").mockImplementation(
        () => mockAnchor,
      );
      vi.spyOn(document.body, "removeChild").mockImplementation(
        () => mockAnchor,
      );
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(vi.fn());

      downloadFile(
        "data:image/png;base64,123",
        "my-canvas",
        FILE_EXTENSIONS.PNG,
      );

      expect(mockAnchor.download).toBe("my-canvas.png");
      expect(clickSpy).toHaveBeenCalled();
    });

    it("does not duplicate file extension if fileName already has it", () => {
      const clickSpy = vi.fn();
      const mockAnchor = {
        href: "",
        download: "",
        click: clickSpy,
      } as unknown as HTMLAnchorElement;

      vi.spyOn(document, "createElement").mockReturnValue(mockAnchor);
      vi.spyOn(document.body, "appendChild").mockImplementation(
        () => mockAnchor,
      );
      vi.spyOn(document.body, "removeChild").mockImplementation(
        () => mockAnchor,
      );
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(vi.fn());

      downloadFile(
        "data:image/png;base64,123",
        "my-canvas.png",
        FILE_EXTENSIONS.PNG,
      );

      expect(mockAnchor.download).toBe("my-canvas.png");
      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe("sanitizeCanvasElements", () => {
    it("sets selected, dragging, and resizing to false on all nodes and preserves core properties", () => {
      const nodes = [
        {
          id: "1",
          position: { x: 10, y: 20 },
          data: { label: "Node 1" },
          selected: true,
          dragging: true,
          resizing: true,
          type: "rectangle",
        },
        {
          id: "2",
          position: { x: 30, y: 40 },
          data: { label: "Node 2" },
          selected: false,
          type: "custom",
        },
      ];

      const result = sanitizeCanvasElements(nodes);

      expect(result).toHaveLength(2);
      expect(result[0].selected).toBe(false);
      expect(result[0].dragging).toBe(false);
      expect(result[0].resizing).toBe(false);
      expect(result[1].selected).toBe(false);
      expect(result[1].dragging).toBe(false);
      expect(result[1].resizing).toBe(false);
      expect(result[0].id).toBe("1");
      expect(result[0].position).toEqual({ x: 10, y: 20 });
      expect(result[0].data).toEqual({ label: "Node 1" });
      expect(result[0].type).toBe("rectangle");
    });

    it("sets selected, dragging, and resizing to false on all edges and preserves other properties", () => {
      const edges = [
        {
          id: "e1-2",
          source: "1",
          target: "2",
          selected: true,
          animated: true,
          label: "Flow",
        },
      ];

      const result = sanitizeCanvasElements(edges);

      expect(result).toHaveLength(1);
      expect(result[0].selected).toBe(false);
      expect((result[0] as unknown as { dragging: boolean }).dragging).toBe(
        false,
      );
      expect((result[0] as unknown as { resizing: boolean }).resizing).toBe(
        false,
      );
      expect(result[0].id).toBe("e1-2");
      expect(result[0].source).toBe("1");
      expect(result[0].target).toBe("2");
      expect(result[0].animated).toBe(true);
      expect(result[0].label).toBe("Flow");
    });

    it("resets lockedness properties (draggable, resizable, deletable, connectable, selectable, focusable) to true on nodes", () => {
      const lockedNodes = [
        {
          id: "locked-1",
          position: { x: 0, y: 0 },
          data: {},
          selected: true,
          draggable: false,
          resizable: false,
          deletable: false,
          connectable: false,
          selectable: false,
          focusable: false,
        },
      ];

      const result = sanitizeCanvasElements(lockedNodes);

      expect(result).toHaveLength(1);
      expect(result[0].selected).toBe(false);
      expect(result[0].draggable).toBe(true);
      expect(result[0].resizable).toBe(true);
      expect(result[0].deletable).toBe(true);
      expect(result[0].connectable).toBe(true);
      expect(result[0].selectable).toBe(true);
      expect(result[0].focusable).toBe(true);
    });

    it("does not mutate the original input array or objects (immutability)", () => {
      const originalNode = {
        id: "1",
        position: { x: 0, y: 0 },
        data: {},
        selected: true,
        dragging: true,
        draggable: false,
      };
      const originalArray = [originalNode];

      const result = sanitizeCanvasElements(originalArray);

      expect(result).not.toBe(originalArray);
      expect(result[0]).not.toBe(originalNode);
      expect(originalNode.selected).toBe(true);
      expect(originalNode.dragging).toBe(true);
      expect(originalNode.draggable).toBe(false);
      expect(result[0].selected).toBe(false);
      expect(result[0].dragging).toBe(false);
      expect(result[0].draggable).toBe(true);
    });

    it("handles empty arrays", () => {
      const result = sanitizeCanvasElements([]);
      expect(result).toEqual([]);
    });
  });
});
