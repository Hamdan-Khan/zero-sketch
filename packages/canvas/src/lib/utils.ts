import { type ExportFormat } from "@/hooks/useCanvasExport";
import { Edge, Node } from "@xyflow/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * downloads an image or a file from a data URL
 */
export const downloadFile = (
  dataUrl: string,
  fileName: string,
  format: ExportFormat,
) => {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = fileName.endsWith(`.${format}`)
    ? fileName
    : `${fileName}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(dataUrl);
};

/**
 * removes canvas runtime interaction states (selected, dragging, resizing) from the list of nodes / edges
 *
 * to use before export / saving / sharing
 */
export const sanitizeCanvasElements = <T extends Node | Edge>(
  elements: T[],
): T[] => {
  return elements.map((element) => ({
    ...element,
    selected: false,
    dragging: false,
    resizing: false,
    // reset to default if any lock related property is enabled
    draggable: true,
    resizable: true,
    deletable: true,
    connectable: true,
    selectable: true,
    focusable: true,
  }));
};
