import { Button } from "@heroui/react";
import { FiCheck } from "react-icons/fi";

type UploadReportPreviewViewProps = {
  pdfPreviewUrl: string;
  pageCount: number;
  isProcessing: boolean;
  backToEdit: () => void;
  discardAll: () => void;
  processAndSave: () => void;
};

const pillCancel =
  "h-12 px-10 rounded-full border border-emerald-700/60 text-emerald-800 bg-white";
const pillPrimary =
  "h-12 rounded-full bg-emerald-700 text-white hover:bg-emerald-800";

const UploadReportPreviewView = ({
  pdfPreviewUrl,
  pageCount,
  isProcessing,
  backToEdit,
  discardAll,
  processAndSave,
}: UploadReportPreviewViewProps) => (
  <>
    <div className="mb-4">
      <h3 className="text-lg font-semibold text-slate-900">PDF Preview</h3>
      <p className="text-sm text-slate-500">
        {pageCount} page{pageCount > 1 ? "s" : ""} • Review before saving
      </p>
    </div>

    <div
      className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
      style={{ height: 520 }}
    >
      <iframe src={pdfPreviewUrl} className="h-full w-full" title="PDF Preview" />
    </div>

    <div className="mt-6 flex items-center justify-between gap-4">
      <Button radius="full" variant="bordered" className={pillCancel} onPress={backToEdit}>
        Back to Edit
      </Button>

      <div className="flex gap-3">
        <Button radius="full" variant="flat" color="danger" onPress={discardAll}>
          Discard All
        </Button>

        <Button
          radius="full"
          className={`${pillPrimary} px-10`}
          onPress={processAndSave}
          isLoading={isProcessing}
          startContent={!isProcessing && <FiCheck />}
        >
          Confirm & Save PDF
        </Button>
      </div>
    </div>
  </>
);

export default UploadReportPreviewView;
