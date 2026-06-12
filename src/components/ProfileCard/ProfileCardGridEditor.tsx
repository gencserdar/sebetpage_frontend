import { useState } from "react";
import { canPlace } from "./gridUtils";
import ProfileCardGrid from "./ProfileCardGrid";
import { ProfileWidget, WidgetType } from "./types";
import WidgetPickerSheet from "./WidgetPickerSheet";

interface ProfileCardGridEditorProps {
  widgets: ProfileWidget[];
  onAddWidget: (type: WidgetType, at?: { x: number; y: number }) => void;
  onRemoveWidget: (id: string) => void;
  onUpdateWidget: (id: string, patch: Partial<ProfileWidget>) => void;
}

export default function ProfileCardGridEditor({
  widgets,
  onAddWidget,
  onRemoveWidget,
  onUpdateWidget,
}: ProfileCardGridEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingCell, setPendingCell] = useState<{ x: number; y: number } | null>(null);

  const openPickerAt = (x: number, y: number) => {
    setPendingCell({ x, y });
    setPickerOpen(true);
  };

  const handleSelectBlock = (type: WidgetType) => {
    onAddWidget(type, pendingCell ?? undefined);
    setPendingCell(null);
  };

  const handleMoveWidget = (id: string, x: number, y: number) => {
    const widget = widgets.find((item) => item.id === id);
    if (!widget) return;
    if (!canPlace(widgets, x, y, widget.w, widget.h, id)) return;
    onUpdateWidget(id, { x, y });
  };

  const handleResizeWidget = (
    id: string,
    patch: { x: number; y: number; w: number; h: number }
  ) => {
    const widget = widgets.find((item) => item.id === id);
    if (!widget) return;
    if (!canPlace(widgets, patch.x, patch.y, patch.w, patch.h, id)) return;
    onUpdateWidget(id, patch);
  };

  return (
    <div className="mb-6 min-w-0 max-w-full">
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5 lg:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-white">Canvas</h3>
          {widgets.length > 0 && (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="shrink-0 rounded-lg border border-indigo-400/30 bg-indigo-500/10 px-3 py-1.5 text-sm text-indigo-200 transition hover:bg-indigo-500/20"
            >
              Add block
            </button>
          )}
        </div>

        <div className="indigo-scrollbar -mx-1 flex max-w-full justify-center overflow-x-auto px-1 py-1">
          <ProfileCardGrid
            widgets={widgets}
            mode="edit"
            onCellClick={openPickerAt}
            onRemoveWidget={onRemoveWidget}
            onMoveWidget={handleMoveWidget}
            onResizeWidget={handleResizeWidget}
          />
        </div>
      </div>

      <WidgetPickerSheet
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setPendingCell(null);
        }}
        onSelect={handleSelectBlock}
      />
    </div>
  );
}
