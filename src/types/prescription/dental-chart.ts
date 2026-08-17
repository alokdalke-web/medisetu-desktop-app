export type ToothAdditionalInformation = Record<string, string>;

export type ToothType =
  | "molar"
  | "premolar"
  | "canine"
  | "central-incisor"
  | "lateral-incisor";

export type ToothGeometry = {
  /** Silhouette of the whole tooth: crown only for the upper arch, crown + root for the lower. */
  path: string;
  /** Fissures/mamelon creases drawn on top of the crown. */
  innerPaths: string[];
};

export type DentalChartProps = {
  value: ToothAdditionalInformation;
  onChange: (next: ToothAdditionalInformation) => void;
  disabled?: boolean;
};

export type ToothNoteModalProps = {
  isOpen: boolean;
  toothKey: string | null;
  initialNote: string;
  disabled?: boolean;
  onSave: (toothKey: string, note: string) => void;
  onRemove: (toothKey: string) => void;
  onClose: () => void;
};
