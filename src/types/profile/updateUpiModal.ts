export type UpdateUpiModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentUpiIds: string[];
  userType: string;
  clinicId?: string;
  onSaved: () => void;
};
