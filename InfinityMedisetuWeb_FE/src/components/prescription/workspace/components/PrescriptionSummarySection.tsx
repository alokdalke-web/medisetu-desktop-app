import {
  Button,
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Tooltip,
} from "@heroui/react";
import React, { useEffect, useRef, useState } from "react";
import {
  FiCheck,
  FiCheckCircle,
  FiChevronDown,
  FiEdit2,
  FiFileText,
  FiPlus,
  FiStar,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { EmptyPrescriptionSummary } from "../../PrescriptionWorkspaceUi";
import {
  buildDosePattern,
  buildScheduleText,
  calcTotalDoses,
} from "../helpers/doseHelpers";
import { syncDetailsWithDose } from "../helpers/medicineMappers";
import type { Dose, SelectedMed } from "../types";
import PrescriptionEditorCard from "./PrescriptionEditorCard";
import {
  useDeleteFavouritePrescriptionMutation,
  useGetFavouritePrescriptionsByDoctorIdQuery,
} from "../../../../redux/api/reportApi";

const getDaysFromDuration = (duration?: string) => {
  const match = String(duration ?? "").match(/\d+/);
  return match ? Number(match[0]) : 1;
};

const makeDoseFromFavourite = (medicine: any): Dose =>
  ({
    morning: true,
    noon: false,
    night: true,
    days: getDaysFromDuration(medicine?.duration),
    frequency: "daily",
    dailyDays: getDaysFromDuration(medicine?.duration),
  }) as Dose;

/** Compact one-line summary shown for medicines that are not currently being edited. */
const CollapsedMedRow: React.FC<{
  med: SelectedMed;
  index: number;
  canEdit: boolean;
  isFavorite: boolean;
  onExpand: () => void;
  onRemove: () => void;
  onToggleFavorite?: () => void;
}> = ({ med, index, canEdit, isFavorite, onExpand, onRemove, onToggleFavorite }) => {
  const d = med.details || {};
  const name = (d.medicineName || med.name || "Medicine").trim();
  const form = String(d.form ?? "").trim();
  const pattern = buildDosePattern(med.dose);
  const scheduleText = buildScheduleText(med.dose);
  const doses = Math.max(0, calcTotalDoses(med.dose));
  const food = String(d.notes ?? "").trim();

  const summaryBits = [pattern && pattern !== "0-0-0" ? pattern : null, scheduleText, food]
    .filter(Boolean)
    .join("  •  ");

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onExpand}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onExpand();
        }
      }}
      className="group flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition hover:border-teal-300 hover:bg-teal-50/40 dark:border-[#273244] dark:bg-[#111726] dark:hover:border-[#46beae]/40 dark:hover:bg-[#0f2925]/20"
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-teal-50 text-[13px] font-bold text-teal-700 dark:bg-[#123730] dark:text-[#9be7dc]">
        {index}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-[14px] font-bold text-slate-900 dark:text-white">{name}</span>
          {form && <span className="shrink-0 text-[11px] font-medium text-slate-400 dark:text-slate-500">{form}</span>}
        </div>
        <div className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {summaryBits || "Tap to set schedule"}
        </div>
      </div>

      <span className="hidden shrink-0 whitespace-nowrap text-[11px] font-bold text-teal-700 dark:text-[#46beae] sm:block">
        {String(doses || 0).padStart(2, "0")} doses
      </span>

      {onToggleFavorite && (
        <button
          type="button"
          disabled={!canEdit}
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          className={[
            "grid h-7 w-7 shrink-0 place-items-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-50",
            isFavorite
              ? "border-amber-200 bg-amber-50 text-amber-500 dark:border-amber-700 dark:bg-amber-950/40"
              : "border-slate-200 bg-white text-slate-400 hover:border-amber-200 hover:text-amber-500 dark:border-[#273244] dark:bg-[#0f1728] dark:text-slate-500",
          ].join(" ")}
          aria-label={isFavorite ? "Remove from favourites" : "Add to favourites"}
        >
          <FiStar className={isFavorite ? "h-3.5 w-3.5 fill-current" : "h-3.5 w-3.5"} />
        </button>
      )}

      <button
        type="button"
        disabled={!canEdit}
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-500 transition hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-200 dark:hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={`Remove ${name}`}
      >
        <FiX className="h-3.5 w-3.5" />
      </button>

      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-400 group-hover:bg-teal-100/60 group-hover:text-teal-700 dark:text-slate-500 dark:group-hover:bg-[#123730] dark:group-hover:text-[#9be7dc]">
        <FiEdit2 className="h-3.5 w-3.5" />
      </span>
    </div>
  );
};

const PrescriptionSummarySection: React.FC<{
  selectedMeds: SelectedMed[];
  emptyPrescriptionImg: string;
  hasSavedReportCard: boolean;
  canEditPrescription: boolean;
  setSelectedMeds: React.Dispatch<React.SetStateAction<SelectedMed[]>>;
  setHasSavedReportCard: React.Dispatch<React.SetStateAction<boolean>>;
  updateMedAt: (idx: number, next: SelectedMed) => void;
  updateMedDosage: (idx: number, dosage: string) => void;
  favoritePrescriptionName: string;
  setFavoritePrescriptionName: React.Dispatch<React.SetStateAction<string>>;
  doctorId?: string;
  onMedicineUnselect?: (medicineId: string) => void;
  isMedicineFavorite?: (medicine: SelectedMed) => boolean;
  onToggleMedicineFavorite?: (medicine: SelectedMed) => void;
}> = ({
  selectedMeds,
  emptyPrescriptionImg,
  hasSavedReportCard,
  canEditPrescription,
  setSelectedMeds,
  setHasSavedReportCard,
  updateMedAt,
  updateMedDosage,
  favoritePrescriptionName,
  setFavoritePrescriptionName,
  doctorId,
  onMedicineUnselect,
  isMedicineFavorite,
  onToggleMedicineFavorite,
}) => {
    // Accordion: doctors configure dose while selecting in the dropdown, so
    // medicines land as compact collapsed rows. Any row can be expanded to edit;
    // multiple can stay open at once (no forced single-open collapse).
    const keyOf = (m: SelectedMed, idx: number) =>
      String((m as any)?.id ?? (m as any)?.details?.medicineId ?? (m as any)?.name ?? idx);

    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());

    const toggleExpanded = (k: string, open: boolean) =>
      setExpandedKeys((s) => {
        const next = new Set(s);
        if (open) next.add(k);
        else next.delete(k);
        return next;
      });

    const [showFavoriteInput, setShowFavoriteInput] = useState(false);
    const [selectedFavouriteId, setSelectedFavouriteId] = useState("");
    const [isFavouriteDropdownOpen, setIsFavouriteDropdownOpen] =
      useState(false);
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [, setFavoritePrescriptionDraftName] = useState("");
    const favouriteDropdownRef = useRef<HTMLDivElement | null>(null);

    const {
      data: favouritePrescriptionRes,
      isLoading: favouritePrescriptionLoading,
    } = useGetFavouritePrescriptionsByDoctorIdQuery(doctorId ?? "", {
      skip: !doctorId,
    });

    const [deleteFavouritePrescription, { isLoading: deletingFavourite }] =
      useDeleteFavouritePrescriptionMutation();

    const favouritePrescriptions =
      (favouritePrescriptionRes as any)?.data?.favourites ?? [];

    const selectedFavourite = favouritePrescriptions.find(
      (item: any) => item.id === selectedFavouriteId,
    );

    useEffect(() => {
      if (!isFavouriteDropdownOpen) return;

      const handleOutsidePress = (event: MouseEvent | TouchEvent) => {
        if (!favouriteDropdownRef.current) return;
        if (!(event.target instanceof Node)) return;
        if (!favouriteDropdownRef.current.contains(event.target)) {
          setIsFavouriteDropdownOpen(false);
        }
      };

      document.addEventListener("mousedown", handleOutsidePress);
      document.addEventListener("touchstart", handleOutsidePress);

      return () => {
        document.removeEventListener("mousedown", handleOutsidePress);
        document.removeEventListener("touchstart", handleOutsidePress);
      };
    }, [isFavouriteDropdownOpen]);

    const clearFavouritePrescriptionSelection = () => {
      setSelectedFavouriteId("");
      setFavoritePrescriptionName("");
      setSelectedMeds([]);
      setShowFavoriteInput(false);
      setHasSavedReportCard(false);
      setIsFavouriteDropdownOpen(false);
    };

    const handleFavouritePrescriptionSelect = (favouriteId: string) => {
      setSelectedFavouriteId(favouriteId);
      setIsFavouriteDropdownOpen(false);

      const selectedFav = favouritePrescriptions.find(
        (item: any) => item.id === favouriteId,
      );

      if (!selectedFav) return;

      const favouriteMeds: SelectedMed[] = (selectedFav.medicine ?? []).map(
        (medicine: any) => {
          const dose = makeDoseFromFavourite(medicine);

          return {
            id: String(medicine?.medicineId ?? ""),
            name: String(medicine?.medicineName ?? ""),
            image: null,
            dose,
            details: {
              medicineId: String(medicine?.medicineId ?? ""),
              medicineName: String(medicine?.medicineName ?? ""),
              dosage: String(medicine?.dosage ?? ""),
              duration: String(medicine?.duration ?? ""),
              frequency: String(medicine?.frequency ?? ""),
              medicineCount: String(medicine?.medicineCount ?? ""),
              notes: String(medicine?.notes ?? ""),
              composition: "N/A",
              strength: "",
              manufacturer: "N/A",
              marketer: "",
              imageUrl: "",
              uses: {},
              form: String(medicine?.form ?? medicine?.medicine?.form ?? ""),
            },
          } as SelectedMed;
        },
      );

      setSelectedMeds(favouriteMeds);
      setFavoritePrescriptionName(selectedFav.favouritePrescriptionName ?? "");
      setHasSavedReportCard(false);
    };

    const handleDeleteFavouritePrescription = async () => {
      if (!selectedFavouriteId) return;

      try {
        await deleteFavouritePrescription(selectedFavouriteId).unwrap();

        setSelectedFavouriteId("");
        setFavoritePrescriptionName("");
        setSelectedMeds([]);
        setShowFavoriteInput(false);
        setShowDeleteConfirmModal(false);
        setHasSavedReportCard(false);
      } catch (err) {
        console.error("Failed to delete favourite prescription", err);
      }
    };

    const handleRemoveMedicine = (medicine: SelectedMed, index: number) => {
      if (!canEditPrescription) return;

      setSelectedMeds((prev) => {
        const next = prev.filter((_, i) => i !== index);

        if (next.length === 0) {
          setSelectedFavouriteId("");
          setFavoritePrescriptionName("");
          setShowFavoriteInput(false);
        }

        return next;
      });

      onMedicineUnselect?.(medicine.id);
      setHasSavedReportCard(false);
    };

    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white dark:bg-[#111726]">
        <div className="shrink-0 border-b border-slate-100 px-4 py-3 dark:border-[#273244] sm:px-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-2.5">
              <Tooltip content="Prescription summary" placement="top">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700 dark:bg-[#1a3a35] dark:text-[#9be7dc]">
                  <FiFileText className="h-4 w-4" />
                </span>
              </Tooltip>

              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  Prescription Summary
                </div>
                <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-white">
                  {selectedMeds.length > 0
                    ? `${selectedMeds.length} medicine${selectedMeds.length > 1 ? "s" : ""
                    } added`
                    : "Add medicines to create prescription"}
                </p>
              </div>
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {favouritePrescriptions.length > 0 && (
                <div
                  ref={favouriteDropdownRef}
                  className="relative min-w-[240px] max-w-full"
                >
                  <button
                    type="button"
                    disabled={!canEditPrescription || favouritePrescriptionLoading}
                    onClick={() => setIsFavouriteDropdownOpen((prev) => !prev)}
                    aria-expanded={isFavouriteDropdownOpen}
                    className={[
                      "h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white py-0 pl-4 text-left text-xs font-bold text-slate-700 shadow-sm outline-none transition",
                      "hover:border-teal-200 hover:bg-teal-50/30 focus:border-teal-300 focus:ring-2 focus:ring-teal-100",
                      "dark:border-[#273244] dark:bg-[#151c2d] dark:text-white dark:hover:bg-[#172235] dark:focus:border-[#46beae]/60 dark:focus:ring-[#46beae]/20",
                      "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:disabled:bg-[#111726] dark:disabled:text-white",
                      selectedFavouriteId ? "pr-16" : "pr-9",
                    ].join(" ")}
                  >
                    <span className="block truncate">
                      {favouritePrescriptionLoading
                        ? "Loading favourites..."
                        : selectedFavourite?.favouritePrescriptionName ||
                        "Choose favourite prescription"}
                    </span>
                  </button>

                  <FiChevronDown
                    className={[
                      "pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 transition dark:text-white",
                      isFavouriteDropdownOpen ? "rotate-180" : "",
                    ].join(" ")}
                  />

                  {selectedFavouriteId && (
                    <button
                      type="button"
                      disabled={!canEditPrescription || deletingFavourite}
                      onClick={(event) => {
                        event.stopPropagation();
                        setIsFavouriteDropdownOpen(false);
                        setShowDeleteConfirmModal(true);
                      }}
                      className="absolute right-9 top-1/2 grid -translate-y-1/2 place-items-center rounded-full p-1 text-red-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Delete favourite prescription"
                    >
                      <FiTrash2 size={13} />
                    </button>
                  )}

                  {isFavouriteDropdownOpen && (
                    <div className="absolute right-0 z-50 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70 dark:border-[#273244] dark:bg-[#111726] dark:shadow-black/30">
                      <button
                        type="button"
                        onClick={clearFavouritePrescriptionSelection}
                        className={[
                          "flex h-9 w-full items-center justify-between gap-2 rounded-lg px-3 text-left text-xs font-bold transition",
                          !selectedFavouriteId
                            ? "bg-teal-50 text-teal-700"
                            : "text-slate-600 hover:bg-slate-50 dark:text-white dark:hover:bg-[#151c2d]",
                        ].join(" ")}
                      >
                        <span className="truncate">
                          Choose favourite prescription
                        </span>
                        {!selectedFavouriteId && (
                          <FiCheck className="h-4 w-4 shrink-0" />
                        )}
                      </button>

                      {favouritePrescriptions.map((item: any) => {
                        const isSelected = item.id === selectedFavouriteId;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() =>
                              handleFavouritePrescriptionSelect(item.id)
                            }
                            className={[
                              "mt-1 flex h-9 w-full items-center justify-between gap-2 rounded-lg px-3 text-left text-xs font-semibold transition",
                              isSelected
                                ? "bg-teal-50 text-teal-700"
                                : "text-slate-700 hover:bg-slate-50 dark:text-white dark:hover:bg-[#151c2d]",
                            ].join(" ")}
                          >
                            <span className="truncate">
                              {item.favouritePrescriptionName}
                            </span>
                            {isSelected && (
                              <FiCheck className="h-4 w-4 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {selectedMeds.length > 0 && (
                <>
                  {favoritePrescriptionName.trim() && (
                    <div className="hidden max-w-[180px] items-center gap-1.5 rounded-full border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-700 shadow-sm sm:inline-flex">
                      <span className="truncate">{favoritePrescriptionName}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setFavoritePrescriptionDraftName(favoritePrescriptionName);
                      setShowFavoriteInput(true);
                    }}
                    className={[
                      "grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-all duration-200",
                      showFavoriteInput || favoritePrescriptionName.trim()
                        ? "border-amber-200 bg-amber-50 text-amber-500 shadow-sm"
                        : "border-slate-200 bg-white text-slate-400 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-500",
                    ].join(" ")}
                    title={
                      favoritePrescriptionName.trim()
                        ? `Favourite: ${favoritePrescriptionName}`
                        : "Add favorite prescription name"
                    }
                  >
                    <FiStar
                      size={18}
                      className={
                        showFavoriteInput || favoritePrescriptionName.trim()
                          ? "fill-amber-400"
                          : ""
                      }
                    />
                  </button>
                </>
              )}

              {hasSavedReportCard && (
                <Chip
                  size="sm"
                  variant="flat"
                  className="h-8 shrink-0 bg-teal-50 px-3 text-xs font-bold text-teal-700"
                  startContent={<FiCheckCircle size={14} />}
                >
                  Saved
                </Chip>
              )}
            </div>
          </div>
        </div>

        <div className="no-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 pb-24 sm:px-5">
          {selectedMeds.length === 0 ? (
            <div className="h-full min-h-0 overflow-hidden rounded-2xl border border-dashed border-teal-100 bg-white px-2 py-4 dark:border-[#46beae]/30 dark:bg-[#111726] sm:px-4 sm:py-5">
              <EmptyPrescriptionSummary imageSrc={emptyPrescriptionImg} />
            </div>
          ) : (
            <>
              <div className="min-w-0 space-y-2 py-1">
                {selectedMeds.map((m, idx) => {
                  const k = keyOf(m, idx);
                  const isExpanded = expandedKeys.has(k);

                  if (!isExpanded) {
                    return (
                      <CollapsedMedRow
                        key={`${m.id}-${idx}`}
                        med={m}
                        index={idx + 1}
                        canEdit={canEditPrescription}
                        isFavorite={isMedicineFavorite?.(m) ?? false}
                        onExpand={() => toggleExpanded(k, true)}
                        onRemove={() => handleRemoveMedicine(m, idx)}
                        onToggleFavorite={
                          onToggleMedicineFavorite
                            ? () => onToggleMedicineFavorite(m)
                            : undefined
                        }
                      />
                    );
                  }

                  return (
                    <div
                      key={`${m.id}-${idx}`}
                      className="rounded-xl ring-1 ring-teal-200/70 dark:ring-[#46beae]/25"
                    >
                      <PrescriptionEditorCard
                        index={idx + 1}
                        med={m}
                        canEdit={canEditPrescription}
                        isFavorite={isMedicineFavorite?.(m) ?? false}
                        onCollapse={() => toggleExpanded(k, false)}
                        onToggleFavorite={
                          onToggleMedicineFavorite
                            ? () => onToggleMedicineFavorite(m)
                            : undefined
                        }
                        onRemove={() => handleRemoveMedicine(m, idx)}
                        onDoseChange={(updater: (d: Dose) => Dose) => {
                          if (!canEditPrescription) return;

                          const nextDose = updater(m.dose);
                          const next: SelectedMed = {
                            ...m,
                            dose: nextDose,
                            details: syncDetailsWithDose(m, nextDose),
                          };

                          updateMedAt(idx, next);
                        }}
                        onFoodChange={(v) => {
                          if (!canEditPrescription) return;

                          const next: SelectedMed = {
                            ...m,
                            details: { ...(m.details || {}), notes: v },
                          };

                          updateMedAt(idx, next);
                        }}
                        onDosageChange={(v) => {
                          if (!canEditPrescription) return;

                          updateMedDosage(idx, v);
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Add Another Medicine button */}
              {canEditPrescription && (
                <div className="mt-2 px-1">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 h-8 rounded-lg border border-dashed border-slate-300 bg-white px-3 text-[12px] font-semibold text-teal-700 transition-colors hover:border-teal-400 hover:bg-teal-50 dark:border-[#38445a] dark:bg-transparent dark:text-[#46beae] dark:hover:border-[#46beae]/50 dark:hover:bg-[#0f2925]/40"
                    onClick={() => {
                      const searchInput = document.querySelector<HTMLInputElement>('[placeholder*="Search medicine"]');
                      if (searchInput) {
                        searchInput.focus();
                        searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
                      }
                    }}
                  >
                    <FiPlus className="h-3.5 w-3.5" />
                    Add medicine
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <Modal
          isOpen={showFavoriteInput && selectedMeds.length > 0}
          onOpenChange={setShowFavoriteInput}
          placement="center"
          backdrop="blur"
        >
          <ModalContent className="overflow-hidden rounded-[28px]">
            {(onClose) => (
              <>
                <ModalHeader className="border-b border-slate-100 bg-gradient-to-br from-amber-50 via-white to-emerald-50 px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-amber-100 bg-amber-50 text-amber-500 shadow-sm">
                      <FiStar
                        size={20}
                        className={
                          favoritePrescriptionName.trim()
                            ? "fill-amber-400"
                            : ""
                        }
                      />
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-base font-bold leading-6 text-slate-900">
                        Add Favourite Prescription
                      </h3>
                    </div>
                  </div>
                </ModalHeader>

                <ModalBody className="px-5 py-4">
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-3 py-2.5">
                    <p className="text-xs font-semibold leading-5 text-amber-700">
                      Note: This favourite prescription will be saved only after
                      you click Complete Prescription.
                    </p>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <label className="block text-xs font-bold text-slate-700">
                        Favourite Prescription Name
                      </label>

                      {/* <span className="shrink-0 text-[11px] font-semibold text-slate-400">
                {favoritePrescriptionName.length}/50 characters
              </span> */}
                    </div>

                    <input
                      type="text"
                      value={favoritePrescriptionName}
                      onChange={(e) => {
                        setFavoritePrescriptionName(e.target.value);
                        setHasSavedReportCard(false);
                      }}
                      placeholder="e.g., Fever prescription, Cold & cough, Diabetes follow-up"
                      maxLength={50}
                      disabled={!canEditPrescription}
                      autoFocus
                      className="h-12 w-full rounded-2xl border border-emerald-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                    />
                  </div>
                </ModalBody>

                <ModalFooter className="border-t border-slate-100 bg-slate-50/70 px-5 py-4">
                  <Button
                    variant="bordered"
                    radius="full"
                    onPress={onClose}
                    className="border-slate-200 px-5 font-semibold text-slate-600"
                  >
                    Cancel
                  </Button>

                  <Button
                    radius="full"
                    className="bg-teal-600 px-6 font-bold text-white shadow-sm hover:bg-teal-700"
                    onPress={onClose}
                    isDisabled={!canEditPrescription}
                  >
                    Done
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        <Modal
          isOpen={showDeleteConfirmModal}
          onOpenChange={setShowDeleteConfirmModal}
          placement="center"
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="text-slate-900">
                  Delete Favourite Prescription?
                </ModalHeader>

                <ModalBody>
                  <p className="text-sm text-slate-600">
                    Are you sure you want to delete{" "}
                    <span className="font-semibold text-slate-900">
                      {selectedFavourite?.favouritePrescriptionName ??
                        "this favourite prescription"}
                    </span>
                    ?
                  </p>
                </ModalBody>

                <ModalFooter>
                  <Button
                    variant="bordered"
                    radius="full"
                    onPress={onClose}
                    isDisabled={deletingFavourite}
                  >
                    No
                  </Button>

                  <Button
                    color="danger"
                    radius="full"
                    onPress={handleDeleteFavouritePrescription}
                    isLoading={deletingFavourite}
                  >
                    Yes, Delete
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      </div>
    );
  };

export default PrescriptionSummarySection;
