import { LibraryIcon } from "@/components/toolbar/library-dropdown/LibraryIcon";
import {
  GROUP_CONTAINER_CLASS_ID,
  GROUP_LABEL_CLASS_ID,
} from "@zero-sketch/common";
import { CanvasNodeData } from "../createNodeTypes";

export interface GenericGroupProps {
  data: CanvasNodeData;
  displayLabel: string;
  isEditing: boolean;
  inputValue: string;
  onInputChange: (value: string) => void;
  onStartEditing: () => void;
  onSave: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const GenericGroup = ({
  data,
  displayLabel,
  isEditing,
  inputValue,
  onInputChange,
  onStartEditing,
  onSave,
  onKeyDown,
}: GenericGroupProps) => {
  return (
    <div
      className={`w-full h-full border border-dashed border-dim-border rounded-xl p-2.5 relative bg-dim ${GROUP_CONTAINER_CLASS_ID}`}
    >
      <div
        className={`absolute -top-3 left-5 bg-dim border border-dim-border rounded-2xl px-2 py-1 font-bold text-sm pointer-events-auto flex items-center gap-1 ${GROUP_LABEL_CLASS_ID}`}
        style={{ color: data?.color || "var(--color-secondary)" }}
      >
        {data?.icon ? (
          <LibraryIcon
            icon={data?.icon}
            className="w-5 h-5 text-text drop-shadow-sm"
          />
        ) : null}
        {isEditing ? (
          <input
            autoFocus
            onFocus={(e) => e.currentTarget.select()}
            type="text"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={onSave}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder={data.label ?? "Label..."}
            className="text-sm font-bold bg-surface border border-border/40 rounded px-1.5 py-0 outline-none focus:border-primary/50 transition-colors"
            style={{ minWidth: 80, width: "max-content", color: "inherit" }}
          />
        ) : (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onStartEditing();
            }}
            className="cursor-pointer hover:opacity-80 transition-opacity select-none whitespace-nowrap"
            title={displayLabel}
          >
            {displayLabel}
          </span>
        )}
      </div>
    </div>
  );
};
