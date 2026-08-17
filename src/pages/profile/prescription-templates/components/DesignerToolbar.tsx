import { Button } from "@heroui/react";
import { FiRefreshCw, FiSave } from "react-icons/fi";
import type { DesignerToolbarProps } from "../../../../types/prescription";

const DesignerToolbar: React.FC<DesignerToolbarProps> = ({
  hasUnsavedChanges,
  isSaving,
  isCustomTemplate,
  onSave,
  onReset,
}) => (
  <div className="sticky top-0 z-20 rounded-2xl border border-line bg-surface/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden="true"
          className={`h-2 w-2 shrink-0 rounded-full ${
            hasUnsavedChanges ? "bg-warning" : "bg-success"
          }`}
        />
        <p className="truncate text-[12px] text-text-muted">
          {hasUnsavedChanges ? (
            <span className="font-medium text-text">Unsaved changes</span>
          ) : isCustomTemplate ? (
            "Saved — this is your active design"
          ) : (
            "Using the default design"
          )}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          size="sm"
          variant="bordered"
          className="h-10 border-line text-[12px] lg:h-8"
          startContent={<FiRefreshCw size={12} />}
          onPress={onReset}
        >
          Reset
        </Button>
        <Button
          size="sm"
          className="h-10 bg-primary text-[12px] font-semibold text-white lg:h-8"
          startContent={<FiSave size={12} />}
          onPress={onSave}
          isLoading={isSaving}
          isDisabled={!hasUnsavedChanges}
        >
          Save
        </Button>
      </div>
    </div>
  </div>
);

export default DesignerToolbar;
