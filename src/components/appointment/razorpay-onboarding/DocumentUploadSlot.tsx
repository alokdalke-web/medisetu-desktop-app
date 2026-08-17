import React, { useRef, useState } from "react";
import { Spinner } from "@heroui/react";
import { FiUploadCloud, FiCheckCircle, FiFile } from "react-icons/fi";
import {
  ACCEPTED_DOCUMENT_HINT,
  ACCEPTED_DOCUMENT_INPUT_ACCEPT,
  MAX_DOCUMENT_SIZE_BYTES,
} from "./wizardConfig";

interface DocumentUploadSlotProps {
  label: string;
  isUploaded: boolean;
  fileName?: string | null;
  isUploading: boolean;
  isDisabled?: boolean;
  onSelectFile: (file: File) => void;
}

const DocumentUploadSlot: React.FC<DocumentUploadSlotProps> = ({
  label,
  isUploaded,
  fileName,
  isUploading,
  isDisabled,
  onSelectFile,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [sizeError, setSizeError] = useState<string | null>(null);

  const busy = isUploading || isDisabled;

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      setSizeError("File exceeds the 5MB limit.");
      return;
    }
    setSizeError(null);
    onSelectFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (busy) return;
    handleFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </label>
      <div
        className={`relative flex h-[76px] w-full items-center gap-3 rounded-xl border border-dashed px-3.5 transition-colors
          ${busy ? "cursor-not-allowed opacity-70" : "cursor-pointer"}
          ${dragActive ? "border-[#0A6C74] bg-[#F0FDFD] dark:bg-[#0A6C74]/10" : isUploaded ? "border-green-300 bg-green-50 dark:border-green-900/50 dark:bg-green-950/20" : "border-slate-300 bg-white dark:border-[#38445a] dark:bg-[#0f1728]"}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !busy && inputRef.current?.click()}
      >
        {isUploading ? (
          <Spinner size="sm" color="primary" />
        ) : isUploaded ? (
          <FiCheckCircle className="text-green-600 dark:text-green-400 shrink-0" size={20} />
        ) : (
          <FiUploadCloud className="text-[#0A6C74] shrink-0" size={20} />
        )}

        <div className="min-w-0">
          {isUploaded ? (
            <>
              <p className="text-[12px] font-medium text-green-700 dark:text-green-400 truncate flex items-center gap-1">
                <FiFile size={12} className="shrink-0" />
                {fileName || "Uploaded"}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Click or drop to replace
              </p>
            </>
          ) : (
            <>
              <p className="text-[12px] font-medium text-slate-700 dark:text-slate-200">
                Click to upload or drag & drop
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {ACCEPTED_DOCUMENT_HINT}
              </p>
            </>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_DOCUMENT_INPUT_ACCEPT}
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {sizeError && <p className="text-[11px] text-red-500">{sizeError}</p>}
    </div>
  );
};

export default DocumentUploadSlot;
