import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  addToast,
} from "@heroui/react";
import { FiUpload } from "react-icons/fi";

interface BulkUploadModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  type: "medicine" | "stock" | "supplier";
  onUpload: (file: File) => Promise<any>;
  isUploading: boolean;
}

const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onOpenChange,
  title,
  type,
  onUpload,
  isUploading,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    show: boolean;
    data?: any;
  }>({ show: false });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset modal state when closed
  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setUploadResult({ show: false });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [isOpen]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validExtensions = [".xlsx", ".xls", ".csv"];
      const fileExtension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

      if (!validExtensions.includes(fileExtension)) {
        addToast({
          title: "Error",
          description: "Please upload a valid Excel or CSV file",
          color: "danger",
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      addToast({
        title: "Error",
        description: "Please select a file to upload",
        color: "danger",
      });
      return;
    }

    try {
      const data = await onUpload(selectedFile);

      setUploadResult({
        show: true,
        data,
      });

      let toastColor: "success" | "warning" | "danger" = "success";
      let message = "";

      if (type === "medicine" || type === "supplier") {
        const { totalInserted = 0, totalUpdated = 0, totalSkipped = 0, totalErrors = 0 } = data || {};
        if (totalInserted > 0 && totalUpdated === 0 && totalErrors === 0 && totalSkipped === 0) {
          message = `Successfully imported ${totalInserted} ${type === "medicine" ? "medicines" : "suppliers"}`;
        } else if (totalUpdated > 0 && totalInserted === 0 && totalErrors === 0) {
          message = `Successfully updated ${totalUpdated} ${type === "medicine" ? "medicines" : "suppliers"}`;
        } else {
          message = `Inserted: ${totalInserted}, Updated: ${totalUpdated}, Skipped: ${totalSkipped}, Errors: ${totalErrors}`;
          toastColor = totalErrors > 0 ? "warning" : "success";
        }
      } else if (type === "stock") {
        const { totalStocks = 0, totalMedicines = 0, totalErrors = 0 } = data || {};
        if (totalStocks > 0 && totalErrors === 0) {
          message = `Successfully imported ${totalStocks} stock entries with ${totalMedicines} medicines`;
        } else if (totalErrors > 0 && totalStocks === 0) {
          message = `Import failed with ${totalErrors} error(s)`;
          toastColor = "danger";
        } else {
          message = `Imported: ${totalStocks} stocks, ${totalMedicines} medicines, Errors: ${totalErrors}`;
          toastColor = totalErrors > 0 ? "warning" : "success";
        }
      }

      addToast({
        title: "Import Complete",
        description: message,
        color: toastColor,
      });
    } catch (error: any) {
      addToast({
        title: "Error",
        description: error?.data?.message || `Failed to import ${type === "medicine" ? "medicines" : type === "supplier" ? "suppliers" : "stock"}`,
        color: "danger",
      });
    }
  };

  const renderInstructions = () => {
    if (type === "medicine") {
      return (
        <div className="bg-blue-50 p-3 rounded-lg dark:bg-slate-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            📌 Please ensure your file follows the sample template format.
            Download the sample template to see the required columns.
          </p>
        </div>
      );
    }

    if (type === "supplier") {
      return (
        <div className="bg-blue-50 p-3 rounded-lg dark:bg-slate-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            📌 Please ensure your file follows the supplier sample template format. Download the sample template to see the required columns.
          </p>
        </div>
      );
    }

    if (type === "stock") {
      return (
        <div className="space-y-4">
          <div className="bg-blue-50 p-3 rounded-lg dark:bg-slate-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              📌 <strong>Important Instructions:</strong>
            </p>
            <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 list-disc list-inside space-y-1">
              <li>Download the sample template to see the required format</li>
              <li>Stock Number is used to group multiple medicines into one purchase</li>
              <li>Same Stock Number across rows = Same purchase entry</li>
              <li>Medicine names must exactly match existing medicines in your inventory</li>
              <li>Batch numbers must be unique per medicine</li>
              <li>Expiry date must be a future date</li>
              <li>Payment Status: paid, pending, or partial</li>
            </ul>
          </div>

          <div className="bg-yellow-50 p-3 rounded-lg dark:bg-amber-950/30">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ <strong>Note:</strong> If a batch already exists for a medicine,
              the quantity will be added to the existing stock. If the batch is new,
              a new stock entry will be created.
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderSummary = () => {
    const data = uploadResult.data;

    if (type === "medicine" || type === "supplier") {
      const isMedicine = type === "medicine";
      const insertedList = isMedicine ? data?.insertedMedicines : data?.insertedSuppliers;
      const updatedList = isMedicine ? data?.updatedMedicines : data?.updatedSuppliers;
      const skippedList = isMedicine ? data?.skippedMedicines : data?.skippedSuppliers;
      const labelPlural = isMedicine ? "Medicines" : "Suppliers";

      return (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg dark:bg-slate-800">
            <h3 className="font-semibold mb-2 text-slate-800 dark:text-white">Import Summary</h3>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {data?.totalInserted || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Inserted</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {data?.totalUpdated || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Updated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {data?.totalSkipped || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Skipped</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {data?.totalErrors || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Errors</div>
              </div>
            </div>

            {insertedList?.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  Inserted {labelPlural}:
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside max-h-40 overflow-y-auto">
                  {insertedList.slice(0, 5).map((name: string, idx: number) => (
                    <li key={idx}>{name}</li>
                  ))}
                  {insertedList.length > 5 && (
                    <li>...and {insertedList.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}

            {updatedList?.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  Updated {labelPlural}:
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside max-h-40 overflow-y-auto">
                  {updatedList.slice(0, 10).map((name: string, idx: number) => (
                    <li key={idx}>{name}</li>
                  ))}
                  {updatedList.length > 10 && (
                    <li>...and {updatedList.length - 10} more</li>
                  )}
                </ul>
              </div>
            )}

            {skippedList?.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                  Skipped {labelPlural}:
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside max-h-40 overflow-y-auto">
                  {skippedList.slice(0, 10).map((name: string, idx: number) => (
                    <li key={idx}>{name}</li>
                  ))}
                  {skippedList.length > 10 && (
                    <li>...and {skippedList.length - 10} more</li>
                  )}
                </ul>
              </div>
            )}

            {data?.errors?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Errors:</p>
                <ul className="text-sm text-red-500 dark:text-red-400 list-disc list-inside max-h-40 overflow-y-auto">
                  {data.errors.map((error: string, idx: number) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (type === "stock") {
      return (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg dark:bg-slate-800">
            <h3 className="font-semibold mb-2 text-slate-800 dark:text-white">Import Summary</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {data?.totalStocks || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Stock Entries</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {data?.totalMedicines || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Medicines Added</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {data?.totalErrors || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Errors</div>
              </div>
            </div>

            {data?.insertedStocks?.length ? (
              <div className="mb-3">
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  Inserted Stock Entries:
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside max-h-40 overflow-y-auto">
                  {data.insertedStocks.slice(0, 5).map((name: string, idx: number) => (
                    <li key={idx}>{name}</li>
                  ))}
                  {data.insertedStocks.length > 5 && (
                    <li>...and {data.insertedStocks.length - 5} more</li>
                  )}
                </ul>
              </div>
            ) : null}

            {data?.insertedMedicines?.length ? (
              <div className="mb-3">
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  Inserted Medicines:
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside max-h-40 overflow-y-auto">
                  {data.insertedMedicines.slice(0, 5).map((name: string, idx: number) => (
                    <li key={idx}>{name}</li>
                  ))}
                  {data.insertedMedicines.length > 5 && (
                    <li>...and {data.insertedMedicines.length - 5} more</li>
                  )}
                </ul>
              </div>
            ) : null}

            {data?.errors?.length ? (
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Errors:</p>
                <ul className="text-sm text-red-500 dark:text-red-400 list-disc list-inside max-h-40 overflow-y-auto">
                  {data.errors.map((error: string, idx: number) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl" scrollBehavior="inside">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="text-slate-800 dark:text-white">{title}</ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                {!uploadResult.show ? (
                  <>
                    <div className="border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-lg p-6 text-center">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="bulk-upload-modal-file"
                      />
                      <label
                        htmlFor="bulk-upload-modal-file"
                        className="cursor-pointer flex flex-col items-center gap-2"
                      >
                        <FiUpload className="text-4xl text-gray-400 dark:text-gray-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                          {selectedFile ? selectedFile.name : "Click to select Excel/CSV file"}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          Supported formats: .xlsx, .xls, .csv
                        </span>
                      </label>
                    </div>
                    {renderInstructions()}
                  </>
                ) : (
                  renderSummary()
                )}
              </div>
            </ModalBody>
            <ModalFooter>
              {!uploadResult.show ? (
                <>
                  <Button variant="light" onPress={onClose} className="text-slate-600 dark:text-slate-300">
                    Cancel
                  </Button>
                  <Button
                    color="primary"
                    onPress={handleUpload}
                    isLoading={isUploading}
                    isDisabled={!selectedFile}
                  >
                    Upload
                  </Button>
                </>
              ) : (
                <Button
                  color="primary"
                  onPress={() => {
                    setUploadResult({ show: false });
                    setSelectedFile(null);
                    onClose();
                  }}
                >
                  Close
                </Button>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default BulkUploadModal;
