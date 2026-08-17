import { Button, ModalFooter } from "@heroui/react";

type QuickAddPatientFooterProps = {
  isCreating: boolean;
  onCancel: () => void;
};

const QuickAddPatientFooter = ({
  isCreating,
  onCancel,
}: QuickAddPatientFooterProps) => {
  return (
    <ModalFooter className="shrink-0 border-t border-slate-100 bg-white px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] sm:px-6 sm:py-4">
      <div className="grid w-full grid-cols-2 gap-3">
        <Button
          type="button"
          variant="light"
          onPress={onCancel}
          isDisabled={isCreating}
          className="h-11 w-full rounded-full border border-slate-200 bg-white font-semibold text-slate-700"
        >
          Cancel
        </Button>

        <Button
          color="primary"
          type="submit"
          isLoading={isCreating}
          className="h-11 w-full rounded-full font-bold shadow-md shadow-primary/20"
        >
          Add Patient
        </Button>
      </div>
    </ModalFooter>
  );
};

export default QuickAddPatientFooter;
