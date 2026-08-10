import { useHistory } from "@/hooks/useHistory";
import { useCanvasStore } from "@/store/CanvasStoreProvider";
import { useNodeId } from "@xyflow/react";
import type { NodeHandleConfig } from "@zero-sketch/models";
import { useCallback, useRef, useState } from "react";
import { CommonNodeWrapper } from "../CommonNodeWrapper";
import { CanvasNodeData } from "../createNodeTypes";
import { GenericGroup } from "./GenericGroup";

export interface GroupWrapperProps {
  data: CanvasNodeData;
  handles?: NodeHandleConfig[];
  selected?: boolean;
  width?: number;
  height?: number;
  title?: string;
}

export const GroupWrapper = ({
  data,
  handles,
  selected,
  width,
  height,
  title,
}: GroupWrapperProps) => {
  const nodeId = useNodeId();
  const setNodes = useCanvasStore((s) => s.setNodes);
  const { commit } = useHistory();

  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(title ?? "");
  const isCancelingRef = useRef(false);

  const startEditing = useCallback(() => {
    setInputValue(title ?? "");
    setIsEditing(true);
  }, [title]);

  const handleSave = useCallback(() => {
    if (isCancelingRef.current) {
      isCancelingRef.current = false;
      return;
    }

    if (nodeId) {
      const trimmed = inputValue.trim();
      commit();
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id !== nodeId) {
            return n;
          }

          return {
            ...n,
            data: {
              ...n.data,
              title: trimmed,
            },
          };
        }),
      );
    }
    setIsEditing(false);
  }, [nodeId, inputValue, commit, setNodes]);

  const handleCancel = useCallback(() => {
    isCancelingRef.current = true;
    setInputValue(title ?? "");
    setIsEditing(false);
  }, [title]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  return (
    <CommonNodeWrapper
      type="group"
      handles={handles}
      selected={selected}
      onAddLabel={startEditing}
      className="relative w-full h-full"
      style={{
        width: width || 400,
        height: height || 300,
      }}
      minWidth={200}
      minHeight={150}
      resizerBorderWidth={0.8}
    >
      <GenericGroup
        data={data}
        displayLabel={title ?? data.label ?? ""}
        isEditing={isEditing}
        inputValue={inputValue}
        onInputChange={setInputValue}
        onStartEditing={startEditing}
        onSave={handleSave}
        onKeyDown={handleKeyDown}
      />
    </CommonNodeWrapper>
  );
};
