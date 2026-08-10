import { NodeComponentType, NodePropsType } from "@/components/canvas/types";
import { LibraryIcon } from "@/components/toolbar/library-dropdown/LibraryIcon";
import { Position } from "@xyflow/react";
import {
  IconType,
  LibraryManifest,
  NodeHandleConfig,
  NodeKinds,
} from "@zero-sketch/models";
import { GroupWrapper } from "./group/GroupWrapper";
import { NodeWrapper } from "./node/NodeWrapper";

export type CanvasNodeData = {
  label?: string;
  title?: string;
  color?: string;
  handles?: NodeHandleConfig[];
  icon?: IconType;
  kind?: NodeKinds;
};

export const defaultHandles: NodeHandleConfig[] = [
  { id: "top-target", type: "target", position: Position.Top },
  { id: "top-source", type: "source", position: Position.Top },
  { id: "bottom-target", type: "target", position: Position.Bottom },
  { id: "bottom-source", type: "source", position: Position.Bottom },
  { id: "left-target", type: "target", position: Position.Left },
  { id: "left-source", type: "source", position: Position.Left },
  { id: "right-target", type: "target", position: Position.Right },
  { id: "right-source", type: "source", position: Position.Right },
];

// oxlint-disable-next-line react/only-export-components
const NodeComponent = (props: NodePropsType<CanvasNodeData>) => {
  if (props.data?.kind === "group") {
    const handles = props.data?.handles || defaultHandles;
    return (
      <GroupWrapper
        selected={props.selected}
        handles={handles}
        width={props.width}
        height={props.height}
        title={props.data?.title}
        data={props.data}
      />
    );
  }

  const handles = props.data?.handles || defaultHandles;
  const icon = props.data?.icon;

  return (
    <NodeWrapper
      selected={props.selected}
      handles={handles}
      width={props.width}
      height={props.height}
      title={props.data?.title}
    >
      <LibraryIcon
        icon={icon}
        className="w-full h-full text-text drop-shadow-sm"
      />
    </NodeWrapper>
  );
};

/**
 * creates a dynamic nodeTypes map from loaded library manifest,
 * with a fallback for nodes whose libraries are not loaded at the moment.
 */
export const createNodeTypes = (
  selectedLib: LibraryManifest | null,
): Record<string, NodeComponentType<CanvasNodeData>> => {
  const nodeTypes: Record<string, NodeComponentType<CanvasNodeData>> = {};

  const allNodes = selectedLib?.nodes || [];

  for (const libNode of allNodes) {
    nodeTypes[libNode.id] = NodeComponent;
  }

  // wrap the map with a proxy object to handle access of node types that are not
  // part of the loaded library
  return new Proxy(nodeTypes, {
    get(target, prop: string | symbol) {
      if (typeof prop === "string" && prop in target) {
        return target[prop];
      }
      return NodeComponent;
    },
  });
};
