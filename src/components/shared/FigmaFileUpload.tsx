import { Spinner } from "@heroui/react";
import React, { useRef, useState } from "react";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { FiUploadCloud, FiX } from "react-icons/fi";

interface FigmaFileUploadProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label?: string;
  hint?: string;
  /** Primary call-to-action text inside the dropzone. Default: "Upload logo". */
  ctaText?: string;
  /** Accepted-formats line inside the dropzone. Default: "JPG, PNG, JPEG, WEBP". */
  acceptHint?: string;
  onUpload: (file: File) => Promise<string | null>;
  previewUrl?: string;
  onRemove?: () => void;
  isLoading?: boolean;
  /** Read-only: disables drop/click and hides the remove control. */
  isDisabled?: boolean;
}

const FigmaFileUpload = <T extends FieldValues>({
  name,
  control,
  label = "Clinic Logo",
  hint,
  ctaText = "Upload logo",
  acceptHint = "JPG, PNG, JPEG, WEBP",
  onUpload,
  previewUrl,
  onRemove,
  isLoading,
  isDisabled,
}: FigmaFileUploadProps<T>) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDisabled) return;
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent, onChange: (val: string) => void) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (isDisabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const url = await onUpload(file);
      if (url) onChange(url);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>, onChange: (val: string) => void) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = await onUpload(file);
      if (url) onChange(url);
    }
  };

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <label className="text-[14px] font-semibold text-[#100E1C] font-outfit dark:text-white">
              {label}
            </label>
            {hint && (
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                {hint}
              </span>
            )}
          </div>

          {!previewUrl && !field.value ? (
            <div
              className={`
                relative flex h-[92px] w-full flex-col items-center justify-center
                rounded-xl border border-dashed bg-white px-4
                transition-colors sm:flex-row sm:gap-6
                dark:bg-slate-800
                sm:h-[104px] lg:h-[clamp(92px,13dvh,112px)]
                ${isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
                ${dragActive ? "border-[#0A6C74] bg-[#F0FDFD]" : "border-[#CFCFCF]"}
              `}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={(e) => handleDrop(e, field.onChange)}
              onClick={() => !isDisabled && fileInputRef.current?.click()}
            >
              {isLoading ? (
                <Spinner size="lg" color="primary" />
              ) : (
                <>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 sm:mb-0 sm:h-12 sm:w-12">
                    <FiUploadCloud className="h-6 w-6 text-[#0A6C74] sm:h-8 sm:w-8" />
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-[13px] font-semibold text-[#100E1C] font-outfit dark:text-white">
                      {ctaText}
                    </p>
                    <p className="mt-0.5 text-[12px] font-medium text-slate-500 font-outfit dark:text-slate-400">
                      or drag & drop here
                    </p>
                    <p className="mt-1 text-[12px] font-medium text-slate-400 font-outfit">
                      {acceptHint}
                    </p>
                  </div>
                </>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isDisabled}
                onChange={(e) => handleChange(e, field.onChange)}
              />
            </div>
          ) : (
            <div className="relative flex h-[92px] w-full items-center justify-center overflow-hidden rounded-xl border border-[#ECECEC] bg-white group dark:bg-slate-800 sm:h-[104px] lg:h-[clamp(92px,13dvh,112px)]">
              <img
                src={previewUrl || field.value}
                alt="Uploaded"
                className="w-full h-full object-contain"
              />
              {!isDisabled && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      field.onChange("");
                      if (onRemove) onRemove();
                    }}
                    className="bg-white text-red-500 p-2 rounded-full hover:bg-red-50"
                  >
                    <FiX />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    />
  );
};

export default FigmaFileUpload;
