import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader
} from "@heroui/react";
import React from "react";
import { FiEdit3, FiFileText } from "react-icons/fi";
import type { PrescriptionDetailsValue } from "../../../PrescriptionDetails";
import { EmptyPrescriptionSummary } from "../../../PrescriptionWorkspaceUi";
import {
  extractAnyId,
  extractAnyName,
  extractAnyStrength,
  makeMedKey,
  syncDetailsWithDose,
} from "../../helpers/medicineMappers";
import type { Dose, PrescriptionWorkspaceProps, SelectedMed } from "../../types";
import PrescriptionEditorCard from "../PrescriptionEditorCard";
import PrescriptionMedicineSidebar from "../PrescriptionMedicineSidebar";
import PrescriptionRightPanel from "../PrescriptionRightPanel";

const CompletedPrescriptionEditModal: React.FC<{
  editModal: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
  };
  emptyPrescriptionImg: string;
  editQuery: string;
  setEditQuery: React.Dispatch<React.SetStateAction<string>>;
  editFocused: boolean;
  setEditFocused: React.Dispatch<React.SetStateAction<boolean>>;
  onKeyDownSearchEdit: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  topUsedLoading: boolean;
  topUsedIsError: boolean;
  topUsedMedicines: any[];
  refetchTopUsed: () => any;
  toggleFavorite: any;
  showToast: (msg: string) => void;
  isAlreadySelectedEdit: (m: {
    id?: any;
    name?: any;
    medicineId?: any;
  }) => boolean;
  canonicalizeMedicineId: (
    rawId: string,
    name?: string,
    strength?: string,
  ) => string;
  addMedicineDirectEdit: (m: any) => void;
  editQueryReady: boolean;
  editMedicinesLoading: boolean;
  editMedicinesError: any;
  refetchEditMedicines: () => any;
  editFilteredMedicines: any[];
  openAddNew: (
    nameForPrefill?: string,
    compositionForPrefill?: string,
    manufacturerForPrefill?: string,
  ) => void;
  createGlobalMedicineDirect?: (item: {
    medicine_name?: string;
    composition?: string;
    manufacturer_name?: string;
  }) => Promise<void> | void;
  isCreatingGlobalMedicine?: boolean;
  autoConfigureMedicineName?: string | null;
  onAutoConfigureMedicineHandled?: () => void;
  editSelectedMeds: SelectedMed[];
  setEditSelectedMeds: React.Dispatch<React.SetStateAction<SelectedMed[]>>;
  editDetails: PrescriptionDetailsValue;
  handleEditDetailsChange: (next: PrescriptionDetailsValue) => void;
  updateEditMedAt: (idx: number, next: SelectedMed) => void;
  onAddTest?: () => void;
  addedTests?: string[];
  resolvedDoctorId: string;
  rxHistory?: any[];
  isRxHistoryLoading?: boolean;
  patient?: PrescriptionWorkspaceProps["patient"];
  doctor?: PrescriptionWorkspaceProps["doctor"];
  clinic?: PrescriptionWorkspaceProps["clinic"];
  savingReportCard: boolean;
  editSaveInProgress: boolean;
  saveEditChanges: () => Promise<void> | void;
  showStockAvailability?: boolean;
  stockAvailabilityByName?: Map<string, number>;
  stockCacheLoading?: boolean;
}> = ({
  editModal,
  emptyPrescriptionImg,
  editQuery,
  setEditQuery,
  editFocused,
  setEditFocused,
  onKeyDownSearchEdit,
  topUsedLoading,
  topUsedIsError,
  topUsedMedicines,
  refetchTopUsed,
  toggleFavorite,
  showToast,
  isAlreadySelectedEdit,
  canonicalizeMedicineId,
  addMedicineDirectEdit,
  editQueryReady,
  editMedicinesLoading,
  editMedicinesError,
  refetchEditMedicines,
  editFilteredMedicines,
  openAddNew,
  createGlobalMedicineDirect,
  isCreatingGlobalMedicine = false,
  autoConfigureMedicineName,
  onAutoConfigureMedicineHandled,
  editSelectedMeds,
  setEditSelectedMeds,
  editDetails,
  handleEditDetailsChange,
  updateEditMedAt,
  onAddTest,
  addedTests,
  resolvedDoctorId,
  rxHistory = [],
  isRxHistoryLoading = false,
  patient,
  doctor,
  clinic,
  savingReportCard,
  editSaveInProgress,
  saveEditChanges,
  showStockAvailability = false,
  stockAvailabilityByName,
  stockCacheLoading = false,
}) => {
    const [isPrescriptionHistoryOpen, setIsPrescriptionHistoryOpen] =
      React.useState(false);

    const isSaving = savingReportCard || editSaveInProgress;

    const removeMedicineDirectEdit = React.useCallback(
      (m: any) => {
        const rawId = extractAnyId(m);
        const rawName = extractAnyName(m);
        const rawStrength = extractAnyStrength(m);
        const medId = canonicalizeMedicineId(rawId, rawName, rawStrength);
        const targetKey = makeMedKey({ id: medId, name: rawName });

        if (!targetKey) return;

        setEditSelectedMeds((prev) =>
          prev.filter((selected) => {
            const selectedName =
              selected.details?.medicineName || selected.name || "";
            const selectedStrength = selected.details?.strength || "";
            const selectedId = canonicalizeMedicineId(
              String(selected.details?.medicineId ?? selected.id ?? ""),
              String(selectedName),
              String(selectedStrength),
            );

            return (
              makeMedKey({ id: selectedId, name: selectedName }) !== targetKey
            );
          }),
        );
      },
      [canonicalizeMedicineId, setEditSelectedMeds],
    );

    return (
      <Modal
        isOpen={editModal.isOpen}
        onOpenChange={editModal.onOpenChange}
        placement="center"
        scrollBehavior="normal"
        size="5xl"
        shouldCloseOnInteractOutside={() => false}
        classNames={{
          wrapper: "!overflow-hidden p-2 sm:p-4",
          base: [
            "rounded-2xl sm:rounded-[28px] !m-0",
            "!w-full sm:!w-[96vw] !max-w-[1500px]",
            "!h-[97vh] !max-h-[97vh] sm:!h-[90vh] sm:!max-h-[90vh]",
            "flex flex-col !overflow-hidden",
            "border border-slate-200 dark:border-[#273244]",
          ].join(" "),
          body: "p-0 flex-1 min-h-0 !overflow-hidden",
          header: "p-0 shrink-0",
          footer: "p-0 shrink-0",
          closeButton:
            "top-3 right-3 sm:top-5 sm:right-5 z-20 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-[#1e293b]",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              {/* ─── Header ─────────────────────────────────────────── */}
              <ModalHeader className="border-b border-slate-200 px-4 pt-4 pb-3 pr-12 dark:border-[#273244] sm:px-8 sm:pt-6 sm:pb-4 sm:pr-16">
                <div className="flex w-full items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/20 sm:h-10 sm:w-10">
                    <FiEdit3 className="h-4.5 w-4.5 text-primary sm:h-5 sm:w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white sm:text-xl">
                      Edit Prescription
                    </h2>
                    <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                      {editSelectedMeds.length > 0
                        ? `${editSelectedMeds.length} medicine${editSelectedMeds.length > 1 ? "s" : ""} • Modify dosage, add or remove medicines`
                        : "Search and add medicines to update the prescription"}
                    </p>
                  </div>
                </div>
              </ModalHeader>

              {/* ─── Body ───────────────────────────────────────────── */}
              <ModalBody className="px-2 py-3 sm:px-6 sm:py-4 flex-1 min-h-0 !overflow-hidden">
                <div className="grid h-full min-h-0 grid-cols-1 gap-3 lg:grid-cols-12 lg:gap-4">
                  {/* Left: Medicine Search + Prescription Cards */}
                  <div className="col-span-1 flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-[#273244] dark:bg-[#111726] lg:col-span-9 lg:rounded-2xl">
                    {/* Medicine Sidebar (Search + Top Used) */}
                    <PrescriptionMedicineSidebar
                      query={editQuery}
                      setQuery={setEditQuery}
                      canEditPrescription={true}
                      lockMessage=""
                      isSearchActive={editFocused}
                      onSearchFocus={() => setEditFocused(true)}
                      onSearchClose={() => setEditFocused(false)}
                      onKeyDownSearch={onKeyDownSearchEdit}
                      queryReady={editQueryReady}
                      medicinesLoading={editMedicinesLoading}
                      medicinesError={editMedicinesError}
                      filteredMedicines={editFilteredMedicines}
                      debouncedQuery={editQuery}
                      openAddNew={openAddNew}
                      createGlobalMedicineDirect={createGlobalMedicineDirect}
                      isCreatingGlobalMedicine={isCreatingGlobalMedicine}
                      autoConfigureMedicineName={autoConfigureMedicineName}
                      onAutoConfigureMedicineHandled={onAutoConfigureMedicineHandled}
                      refetchMedicines={refetchEditMedicines}
                      topUsedLoading={topUsedLoading}
                      topUsedIsError={topUsedIsError}
                      refetchTopUsed={refetchTopUsed}
                      topUsedMedicines={topUsedMedicines}
                      isAlreadySelected={isAlreadySelectedEdit}
                      canonicalizeMedicineId={canonicalizeMedicineId}
                      addMedicineDirect={addMedicineDirectEdit}
                      removeMedicineDirect={removeMedicineDirectEdit}
                      toggleFavorite={toggleFavorite}
                      showToast={showToast}
                      isPrescriptionHistoryOpen={isPrescriptionHistoryOpen}
                      setIsPrescriptionHistoryOpen={setIsPrescriptionHistoryOpen}
                      rxHistory={rxHistory}
                      isRxHistoryLoading={isRxHistoryLoading}
                      patient={patient}
                      doctor={doctor}
                      clinic={clinic}
                      showStockAvailability={showStockAvailability}
                      stockAvailabilityByName={stockAvailabilityByName}
                      stockCacheLoading={stockCacheLoading}
                    />

                    {/* Prescription Summary / Editor Cards */}
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white dark:bg-[#111726]">

                      {/* Medicine Cards / Empty State */}
                      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/70 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 dark:[scrollbar-color:#334155_transparent] dark:[&::-webkit-scrollbar-thumb]:bg-[#334155] sm:px-5 sm:py-4">
                        {editSelectedMeds.length === 0 ? (
                          <div className="min-h-[280px] sm:min-h-[360px] overflow-hidden rounded-xl border border-dashed border-teal-100 bg-white px-2 py-4 dark:border-[#46beae]/30 dark:bg-[#111726] sm:rounded-2xl sm:px-4 sm:py-5 [&_img]:mx-auto [&_img]:h-auto [&_img]:max-w-full [&_svg]:max-w-full">
                            <EmptyPrescriptionSummary
                              imageSrc={emptyPrescriptionImg}
                            />
                          </div>
                        ) : (
                          <div className="min-w-0 space-y-2.5 py-1 sm:space-y-3">
                            {editSelectedMeds.map((m, idx) => (
                              <PrescriptionEditorCard
                                key={`${m.id}-${idx}`}
                                index={idx + 1}
                                med={m}
                                canEdit={true}
                                onRemove={() => {
                                  setEditSelectedMeds((prev) =>
                                    prev.filter((_, i) => i !== idx),
                                  );
                                }}
                                onDoseChange={(updater: (d: Dose) => Dose) => {
                                  const nextDose = updater(m.dose);
                                  const next: SelectedMed = {
                                    ...m,
                                    dose: nextDose,
                                    details: syncDetailsWithDose(m, nextDose),
                                  };
                                  updateEditMedAt(idx, next);
                                }}
                                onFoodChange={(v) => {
                                  const next: SelectedMed = {
                                    ...m,
                                    details: {
                                      ...(m.details || {}),
                                      notes: v,
                                    },
                                  };
                                  updateEditMedAt(idx, next);
                                }}
                                onDosageChange={(v) => {
                                  const next: SelectedMed = {
                                    ...m,
                                    details: {
                                      ...(m.details || {}),
                                      dosage: v,
                                    },
                                  };
                                  updateEditMedAt(idx, next);
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Details Panel (hidden on mobile, shown on lg+) */}
                  <div className="col-span-1 hidden h-full min-h-0 lg:col-span-3 lg:block">
                    <PrescriptionRightPanel
                      details={editDetails}
                      onChange={handleEditDetailsChange}
                      canEditPrescription={true}
                      lockMessage=""
                      onAddTest={onAddTest}
                      addedTests={addedTests}
                      resolvedDoctorId={resolvedDoctorId}
                    />
                  </div>
                </div>
              </ModalBody>

              {/* ─── Footer ─────────────────────────────────────────── */}
              <ModalFooter className="border-t border-slate-200 px-4 pb-4 pt-3 dark:border-[#273244] sm:px-8 sm:pb-6 sm:pt-4">
                <div className="flex w-full items-center justify-between gap-3">
                  {/* Medicine count badge */}
                  <div className="hidden text-[13px] font-medium text-slate-500 dark:text-slate-400 sm:block">
                    {editSelectedMeds.length > 0 && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1 text-primary dark:bg-primary/20">
                        <FiFileText className="h-3.5 w-3.5" />
                        {editSelectedMeds.length} medicine{editSelectedMeds.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-3">
                    <Button
                      radius="sm"
                      variant="bordered"
                      onPress={onClose}
                      isDisabled={isSaving}
                      className="h-10 min-w-[100px] rounded-lg border-slate-200 text-sm font-medium text-slate-700 dark:border-[#334155] dark:text-slate-300 sm:h-11 sm:min-w-[120px]"
                    >
                      Cancel
                    </Button>

                    <Button
                      radius="sm"
                      color="primary"
                      onPress={async () => {
                        await saveEditChanges();
                      }}
                      isDisabled={isSaving || editSelectedMeds.length === 0}
                      isLoading={isSaving}
                      className="h-10 min-w-[140px] rounded-lg text-sm font-semibold shadow-sm sm:h-11 sm:min-w-[160px]"
                    >
                      {isSaving ? "Saving…" : "Save Changes"}
                    </Button>
                  </div>
                </div>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    );
  };

export default CompletedPrescriptionEditModal;
