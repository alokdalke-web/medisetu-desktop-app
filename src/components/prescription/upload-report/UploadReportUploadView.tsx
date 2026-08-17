import { Button } from "@heroui/react";
import type React from "react";
import {
  FiCamera,
  FiExternalLink,
  FiFileText,
  FiUpload,
} from "react-icons/fi";
import { ScannerSessionBridgeCard } from "../../prescription-scanner";
import { formatBytes } from "./helpers";

type UploadReportUploadViewProps = {
  title: string;
  pickedFiles: File[];
  countdown: number;
  otp: string;
  phoneLink: string;
  qrCodeUrl: string;
  scannerError: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPicked: React.ChangeEventHandler<HTMLInputElement>;
  handleDrop: React.DragEventHandler<HTMLDivElement>;
  resetScanner: () => void;
  setCameraMode: () => void;
  handleClose: () => void;
  onSave: () => void;
  saveDisabled?: boolean;
  isSaving?: boolean;
};

const pillCancel =
  "h-12 px-10 rounded-full border border-emerald-700/60 text-emerald-800 bg-white";
const pillPrimary =
  "h-12 rounded-full bg-emerald-700 text-white hover:bg-emerald-800";

const UploadReportUploadView = ({
  title,
  pickedFiles,
  countdown,
  otp,
  phoneLink,
  qrCodeUrl,
  scannerError,
  inputRef,
  onPicked,
  handleDrop,
  resetScanner,
  setCameraMode,
  handleClose,
  onSave,
  saveDisabled,
  isSaving,
}: UploadReportUploadViewProps) => (
  <>
    <div className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
      <FiUpload className="text-[16px]" />
    </div>

    <div className="mt-2 text-center text-[20px] font-semibold text-slate-900">
      {title}
    </div>

    <div className="mt-3">
      <div className="mb-1.5 text-xs font-semibold text-slate-900">Report</div>

      <div
        className="rounded-xl border border-dashed border-gray-300 bg-white px-3 py-4 text-center sm:px-4 sm:py-4"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <FiUpload className="mx-auto mb-2 text-[21px] opacity-60" />

        <div className="text-[13px] leading-snug text-slate-800">
          Drag your file(s) here, or{" "}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="font-semibold text-slate-900 underline underline-offset-4"
          >
            browse
          </button>
        </div>

        <div className="mt-1 text-[11px] leading-snug text-slate-500">
          Support JPG, PNG, JPEG, PDF • Multiple images supported
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 border-t border-gray-200" />
          <span className="text-[11px] text-gray-400">OR</span>
          <div className="flex-1 border-t border-gray-200" />
        </div>

        <button
          type="button"
          onClick={setCameraMode}
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-primary hover:bg-primary/20"
        >
          <FiCamera className="text-base" />
          <span className="text-xs font-semibold">Take Photo with Camera</span>
        </button>

        {!pickedFiles.length && (
          <div className="mx-auto mt-3 w-full max-w-[276px] sm:max-w-[300px] [&>*]:!w-full [&>*]:!max-w-full [&>*]:!rounded-xl [&>*]:!p-3 [&_h3]:!text-base [&_p]:!text-xs [&_p]:!leading-snug [&_img]:!h-[145px] [&_img]:!w-[145px] sm:[&_img]:!h-[155px] sm:[&_img]:!w-[155px] [&_canvas]:!h-[145px] [&_canvas]:!w-[145px] sm:[&_canvas]:!h-[155px] sm:[&_canvas]:!w-[155px] [&_button]:!h-8 [&_button]:!text-xs">
            <ScannerSessionBridgeCard
              countdown={countdown}
              otp={otp}
              phoneLink={phoneLink}
              qrCodeUrl={qrCodeUrl}
              onNewSession={resetScanner}
            />

            {scannerError && (
              <p className="mt-2 text-xs text-danger">{scannerError}</p>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,image/*"
          multiple
          className="hidden"
          onChange={onPicked}
        />

        {pickedFiles.length > 0 && (
          <div className="mt-3 flex items-center justify-between rounded-lg bg-gray-100 px-3 py-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <FiFileText className="shrink-0 text-base text-red-500" />
              <div className="truncate">
                <div className="truncate text-xs font-medium text-gray-800">
                  {pickedFiles[0].name}
                </div>
                <div className="text-[11px] text-gray-500">
                  {formatBytes(pickedFiles[0].size)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <FiExternalLink
                onClick={() =>
                  window.open(URL.createObjectURL(pickedFiles[0]), "_blank")
                }
                className="cursor-pointer text-gray-600 hover:text-black"
              />
            </div>
          </div>
        )}
      </div>
    </div>

    <div className="mt-4 grid grid-cols-2 gap-3 sm:flex sm:items-center sm:justify-center sm:gap-4">
      <Button
        radius="full"
        variant="bordered"
        className={`${pillCancel} h-10 w-full sm:w-[120px]`}
        onPress={handleClose}
        isDisabled={!!isSaving}
      >
        Cancel
      </Button>

      <Button
        radius="full"
        className={`${pillPrimary} h-10 w-full sm:w-[180px]`}
        onPress={onSave}
        isDisabled={saveDisabled ?? !pickedFiles.length}
        isLoading={!!isSaving}
      >
        Save Report
      </Button>
    </div>
  </>
);

export default UploadReportUploadView;
