import type { Dispatch, SetStateAction } from "react";

import PaymentModal from "../../dashboard/PaymentModal";
import { AddEditTestModal } from "../components/AddEditTestModal";
import { ConfirmRejectModal } from "../components/ConfirmRejectModal";
import { LabInvoiceModal } from "../components/LabInvoiceModal";
import type { LabTestRow } from "../labData";
import type { LabPaymentMethod } from "./types";

type InvoiceTarget = {
  appointmentTestId: string;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
} | null;

type DepartmentOption = {
  label: string;
  value: string;
};

type LabTestsModalsProps = {
  rejectOpen: boolean;
  rejectRow: LabTestRow | null;
  rejectReason: string;
  isRejecting: boolean;
  setRejectOpen: Dispatch<SetStateAction<boolean>>;
  setRejectRow: Dispatch<SetStateAction<LabTestRow | null>>;
  setRejectReason: Dispatch<SetStateAction<string>>;
  onRejectConfirm: () => void;

  paymentOpen: boolean;
  paymentRow: LabTestRow | null;
  payMethod: LabPaymentMethod;
  isPaying: boolean;
  setPaymentOpen: Dispatch<SetStateAction<boolean>>;
  setPaymentRow: Dispatch<SetStateAction<LabTestRow | null>>;
  setPayMethod: Dispatch<SetStateAction<LabPaymentMethod>>;
  onPayConfirm: () => void;

  invoiceTarget: InvoiceTarget;
  setInvoiceTarget: Dispatch<SetStateAction<InvoiceTarget>>;

  isEditModalOpen: boolean;
  onEditModalOpenChange: () => void;
  setEditingCatalogTestId: Dispatch<SetStateAction<string | null>>;
  editName: string;
  editTestCode: string;
  editDepartmentId: string;
  editSampleType: string;
  editPrice: string;
  editStatus: "active" | "deactive";
  setEditName: Dispatch<SetStateAction<string>>;
  setEditTestCode: Dispatch<SetStateAction<string>>;
  setEditDepartmentId: Dispatch<SetStateAction<string>>;
  setEditSampleType: Dispatch<SetStateAction<string>>;
  setEditPrice: Dispatch<SetStateAction<string>>;
  setEditStatus: Dispatch<SetStateAction<"active" | "deactive">>;
  departmentOptions: DepartmentOption[];
  isUpdatingCatalogTest: boolean;
  onSaveCatalogTest: () => void;
};

export function LabTestsModals({
  rejectOpen,
  rejectRow,
  rejectReason,
  isRejecting,
  setRejectOpen,
  setRejectRow,
  setRejectReason,
  onRejectConfirm,
  paymentOpen,
  paymentRow,
  payMethod,
  isPaying,
  setPaymentOpen,
  setPaymentRow,
  setPayMethod,
  onPayConfirm,
  invoiceTarget,
  setInvoiceTarget,
  isEditModalOpen,
  onEditModalOpenChange,
  setEditingCatalogTestId,
  editName,
  editTestCode,
  editDepartmentId,
  editSampleType,
  editPrice,
  editStatus,
  setEditName,
  setEditTestCode,
  setEditDepartmentId,
  setEditSampleType,
  setEditPrice,
  setEditStatus,
  departmentOptions,
  isUpdatingCatalogTest,
  onSaveCatalogTest,
}: LabTestsModalsProps) {
  const resetReject = () => {
    setRejectOpen(false);
    setRejectRow(null);
    setRejectReason("");
  };

  const resetCatalogEdit = () => {
    setEditingCatalogTestId(null);
    setEditName("");
    setEditTestCode("");
    setEditDepartmentId("");
    setEditSampleType("");
    setEditPrice("");
    setEditStatus("active");
  };

  const closeCatalogEdit = () => {
    onEditModalOpenChange();
    resetCatalogEdit();
  };

  return (
    <>
      <ConfirmRejectModal
        isOpen={rejectOpen}
        row={rejectRow}
        reason={rejectReason}
        isLoading={isRejecting}
        onReasonChange={setRejectReason}
        onOpenChange={(open) => {
          setRejectOpen(open);
          if (!open) {
            setRejectRow(null);
            setRejectReason("");
          }
        }}
        onCancel={resetReject}
        onConfirm={onRejectConfirm}
      />

      <PaymentModal
        isOpen={paymentOpen}
        onOpenChange={(open) => {
          setPaymentOpen(open);
          if (!open) setPaymentRow(null);
        }}
        paymentRow={paymentRow}
        payMethod={payMethod}
        setPayMethod={setPayMethod}
        isLoading={isPaying}
        onCancel={() => {
          setPaymentOpen(false);
          setPaymentRow(null);
        }}
        onConfirm={onPayConfirm}
      />

      <LabInvoiceModal
        isOpen={Boolean(invoiceTarget)}
        onOpenChange={(open) => {
          if (!open) setInvoiceTarget(null);
        }}
        appointmentTestId={invoiceTarget?.appointmentTestId}
        invoiceId={invoiceTarget?.invoiceId}
        invoiceNumber={invoiceTarget?.invoiceNumber}
      />

      <AddEditTestModal
        isOpen={isEditModalOpen}
        mode="edit"
        name={editName}
        testCode={editTestCode}
        departmentId={editDepartmentId}
        sampleType={editSampleType}
        price={editPrice}
        status={editStatus}
        departments={departmentOptions}
        isSaving={isUpdatingCatalogTest}
        alertMessage="Price required. Please add the price of this test."
        disableDetails={true}
        onOpenChange={(open) => {
          onEditModalOpenChange();
          if (!open) resetCatalogEdit();
        }}
        onNameChange={setEditName}
        onTestCodeChange={setEditTestCode}
        onDepartmentChange={setEditDepartmentId}
        onSampleTypeChange={setEditSampleType}
        onPriceChange={setEditPrice}
        onStatusChange={setEditStatus}
        onCancel={closeCatalogEdit}
        onSubmit={onSaveCatalogTest}
      />
    </>
  );
}
