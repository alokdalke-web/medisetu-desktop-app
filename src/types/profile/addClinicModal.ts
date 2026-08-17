export type AddClinicProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  onSubsModalOpen?: () => void;
};
