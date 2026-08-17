import React from "react";
import AppButton from "../../../components/shared/AppButton";

type SectionSaveBarProps = {
  onSave: () => void;
  onReset?: () => void;
  isSaving?: boolean;
  isResetting?: boolean;
  saveLabel?: string;
  resetLabel?: string;
};

const SectionSaveBar: React.FC<SectionSaveBarProps> = ({
  onSave,
  onReset,
  isSaving = false,
  isResetting = false,
  saveLabel = "Save Changes",
  resetLabel = "Reset",
}) => (
  <div className="mt-4 flex items-center justify-end gap-2 border-t border-line pt-4">
    {onReset && (
      <AppButton
        text={isResetting ? "Resetting..." : resetLabel}
        buttonVariant="outlined"
        onPress={onReset}
        isDisabled={isResetting}
        className="text-[12px] h-9"
      />
    )}
    <AppButton
      text={isSaving ? "Saving..." : saveLabel}
      buttonVariant="primary"
      onPress={onSave}
      isDisabled={isSaving}
      className="text-[12px] h-9"
    />
  </div>
);

export default SectionSaveBar;
