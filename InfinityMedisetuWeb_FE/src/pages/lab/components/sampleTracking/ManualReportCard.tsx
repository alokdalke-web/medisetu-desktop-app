import { motion } from "framer-motion";
import {
  FiDownload,
  FiEye,
  FiFileText,
  FiUploadCloud,
} from "react-icons/fi";

export function ManualReportCard({
  canUpload,
  fileUrl,
  isUploading,
  onUploadClick,
}: {
  canUpload: boolean;
  fileUrl: string | null;
  isUploading: boolean;
  onUploadClick: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
            <FiFileText />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-950">
              Scanned Report
            </h2>
            {fileUrl ? (
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex max-w-full items-center gap-2 truncate text-xs font-bold text-primary hover:text-primary-active"
              >
                <FiDownload className="shrink-0" />
                <span className="truncate">Download uploaded report PDF</span>
              </a>
            ) : (
              <p className="mt-1 text-xs font-medium text-slate-500">
                Upload a scanned or manually prepared PDF for this test.
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {fileUrl && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100"
            >
              <FiEye />
              Preview
            </a>
          )}

          <button
            type="button"
            onClick={onUploadClick}
            disabled={!canUpload || isUploading}
            className={[
              "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60",
              canUpload
                ? "bg-primary text-white shadow-sm hover:bg-primary-active hover:shadow-md focus:ring-primary/20"
                : "border border-slate-200 bg-slate-50 text-slate-400",
            ].join(" ")}
          >
            <FiUploadCloud />
            {isUploading ? "Uploading..." : fileUrl ? "Replace Report" : "Upload Report"}
          </button>
        </div>
      </div>
    </motion.section>
  );
}
