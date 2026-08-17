import type React from "react";
import type { Control } from "react-hook-form";

export type ProfileUpdateRequestModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestSubmitted?: () => void;
};

export type FormInputProps = {
  control: Control<any>;
  icon?: React.ReactNode;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  isDisabled?: boolean;
  isOptional?: boolean;
  label: React.ReactNode;
  maxLength?: number;
  name: string;
  pattern?: string;
  placeholder?: string;
  rules?: any;
  type?: string;
};
