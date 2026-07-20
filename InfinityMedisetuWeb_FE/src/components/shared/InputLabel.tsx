import React from "react";

interface InputLabelProps {
  label: React.ReactNode;
  isOptional?: boolean;
  isRequired?: boolean;
}

const InputLabel = ({ label, isOptional, isRequired }: InputLabelProps) => {
  return (
    <label className="text-[12px] font-medium font-outfit dark:text-slate-200">
      {label}

      {isRequired && !isOptional && (
        <span className="ml-1 text-red-500">*</span>
      )}
      {isOptional && (
        <span className="text-muted text-sm font-normal ml-1 dark:text-slate-400">
          (Optional)
        </span>
      )}
    </label>
  );
};

export default InputLabel;
