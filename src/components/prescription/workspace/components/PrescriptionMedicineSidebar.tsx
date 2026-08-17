import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Tooltip,
} from "@heroui/react";
import React from "react";
import { FiClock, FiGlobe, FiPlus, FiSearch, FiSidebar, FiStar, FiX } from "react-icons/fi";
import PrescriptionsHistory from "../../../../pages/patient/PrescriptionsHistory";
import {
  extractAnyId,
  extractAnyName,
  extractAnyStrength,
  highlightHtml,
  normalizeKey,
} from "../helpers/medicineMappers";
import { useDoseMemory } from "../hooks/useDoseMemory";
import { useFavoriteMedicines } from "../hooks/useFavoriteMedicines";
import { useGlobalMedicineSearch } from "../hooks/useGlobalMedicineSearch";
import GlobalMedicineResults from "./search/GlobalMedicineResults";
import MedicineResultRow from "./search/MedicineResultRow";
import { buildRowId } from "./search/rowUtils";
import { MEDICINE_SEARCH_INPUT_ID } from "../helpers/domIds";
import type { PrescriptionMedicineSidebarProps } from "../../../../types/prescription";

const LISTBOX_ID = "rx-medicine-results";

/**
 * Medicine search + picker for the prescription workspace.
 *
 * Composes the search input, the results panel and the inline dose row. The
 * behavioural contract with the workspace is unchanged — `addMedicineDirect`,
 * `removeMedicineDirect` and `createGlobalMedicineDirect` are still the only
 * ways a medicine enters or leaves the prescription.
 */
const PrescriptionMedicineSidebar: React.FC<
  PrescriptionMedicineSidebarProps
> = ({
  query,
  setQuery,
  canEditPrescription,
  lockMessage,
  isSearchActive,
  onSearchFocus,
  onSearchClose,
  onKeyDownSearch,
  queryReady,
  medicinesLoading,
  medicinesError,
  filteredMedicines,
  debouncedQuery,
  highlight,
  setHighlight,
  openAddNew,
  createGlobalMedicineDirect,
  isCreatingGlobalMedicine = false,
  autoConfigureMedicineName,
  onAutoConfigureMedicineHandled,
  refetchMedicines,
  topUsedLoading,
  topUsedIsError,
  refetchTopUsed,
  topUsedMedicines,
  isAlreadySelected,
  canonicalizeMedicineId,
  addMedicineDirect,
  removeMedicineDirect,
  toggleFavorite,
  showToast,
  isPrescriptionHistoryOpen,
  setIsPrescriptionHistoryOpen,
  rxHistory,
  isRxHistoryLoading,
  patient,
  doctor,
  clinic,
  showStockAvailability = false,
  stockAvailabilityByName,
  stockCacheLoading = false,
  doctorId,
  parsedQuick,
  parsedTokens = [],
  onOpenFavourite,
  onOpenClinical,
  favouriteName,
}) => {
  const pickerRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const { recall, remember } = useDoseMemory(doctorId ?? "");

  const {
    isFavorite,
    toggle: onToggleFavorite,
    quickMedicines,
  } = useFavoriteMedicines({
    topUsedMedicines,
    canEdit: canEditPrescription,
    toggleFavorite,
    refetchTopUsed,
    showToast,
    canonicalizeMedicineId,
  });

  /**
   * Explicit opt-in to the shared drug database.
   *
   * The database is only consulted when the clinic's own list can't answer the
   * query, or when the doctor asks for it — searching it on every keystroke
   * fired a request per search and pushed catalogue rows (which have to be
   * saved to the clinic before use) alongside medicines already on the shelf.
   * Reset whenever the query changes so the opt-in never leaks into the next
   * search.
   */
  const [databaseRequested, setDatabaseRequested] = React.useState(false);

  React.useEffect(() => {
    setDatabaseRequested(false);
  }, [debouncedQuery]);

  const hasClinicMatches = filteredMedicines.length > 0;
  const shouldSearchDatabase =
    queryReady && !medicinesLoading && (!hasClinicMatches || databaseRequested);

  const {
    visibleItems: globalItems,
    loading: globalLoading,
    error: globalError,
    loadMore: loadMoreGlobal,
  } = useGlobalMedicineSearch(
    debouncedQuery,
    shouldSearchDatabase,
    filteredMedicines,
  );

  const showPicker = isSearchActive;
  const showQuickMedicines = showPicker && !queryReady;

  /**
   * The list the keyboard cursor walks. Only the search results are navigable:
   * the workspace's `onKeyDownSearch` indexes into `filteredMedicines`, so
   * highlighting a favourites row would point Enter at the wrong medicine.
   */
  const navigableList = React.useMemo(
    () => (queryReady ? filteredMedicines : []),
    [queryReady, filteredMedicines],
  );

  const rowPrefix = queryReady ? "search" : "quick";

  // Favourites/recents drop anything already prescribed, matching the search
  // results (which are filtered upstream in the workspace).
  const availableQuickMedicines = React.useMemo(
    () =>
      quickMedicines.filter((m) => {
        const rawId = extractAnyId(m);
        const rawName = extractAnyName(m);
        const cid = canonicalizeMedicineId(
          rawId,
          rawName,
          extractAnyStrength(m),
        );
        return !isAlreadySelected({ id: cid, name: rawName, medicineId: rawId });
      }),
    [quickMedicines, canonicalizeMedicineId, isAlreadySelected],
  );

  const visibleList = queryReady ? filteredMedicines : availableQuickMedicines;

  // Keep the cursor inside the list whenever the results change under it.
  React.useEffect(() => {
    if (navigableList.length === 0) return;
    setHighlight((h) => Math.min(Math.max(h, 0), navigableList.length - 1));
  }, [navigableList.length, setHighlight]);

  const activeRowId = React.useMemo(() => {
    const active = navigableList[highlight];
    if (!active) return undefined;
    return buildRowId(rowPrefix, extractAnyName(active));
  }, [navigableList, highlight, rowPrefix]);

  // Scroll the keyboard cursor into view without stealing focus from the input.
  React.useEffect(() => {
    if (!activeRowId) return;
    document
      .getElementById(activeRowId)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeRowId]);

  /**
   * After adding, clear the query but keep the picker open and focused so the
   * next medicine is one uninterrupted "type, Enter" away. Previously this
   * closed the picker, forcing a click back into the field per medicine.
   */
  const returnToSearch = React.useCallback(() => {
    setQuery("");
    setHighlight(0);
    inputRef.current?.focus();
  }, [setQuery, setHighlight]);

  /**
   * The zero-panel path: add straight away, resolving the dose from — in order
   * — anything typed on the same line ("1-1-1 5d af"), this doctor's last dose
   * for this medicine, their most recent dose overall, then the plain default.
   */
  const addWithDefaults = React.useCallback(
    (medicine: unknown) => {
      const name = extractAnyName(medicine);
      const strength = extractAnyStrength(medicine);
      const { draft: recalled } = recall(name, strength);
      const resolved = { ...recalled, ...parsedQuick };

      addMedicineDirect(medicine, resolved);
      remember(name, strength, resolved);
      returnToSearch();
    },
    [addMedicineDirect, parsedQuick, recall, remember, returnToSearch],
  );

  /**
   * Enter adds the highlighted row. Owned here rather than in the workspace's
   * `onKeyDownSearch` because resolving the dose needs the memory above; every
   * other key still delegates to the workspace handler.
   */
  const handleSearchKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && queryReady) {
        const picked = navigableList[highlight];
        if (picked) {
          e.preventDefault();
          addWithDefaults(picked);
          return;
        }
      }
      onKeyDownSearch(e);
    },
    [addWithDefaults, highlight, navigableList, onKeyDownSearch, queryReady],
  );

  // Dismiss the picker on an outside press.
  React.useEffect(() => {
    if (!showPicker) return;

    const handleOutsidePress = (event: MouseEvent | TouchEvent) => {
      if (!pickerRef.current) return;
      if (!(event.target instanceof Node)) return;
      if (!pickerRef.current.contains(event.target)) onSearchClose();
    };

    document.addEventListener("mousedown", handleOutsidePress);
    document.addEventListener("touchstart", handleOutsidePress);

    return () => {
      document.removeEventListener("mousedown", handleOutsidePress);
      document.removeEventListener("touchstart", handleOutsidePress);
    };
  }, [onSearchClose, showPicker]);

  // A medicine created via "Add new" comes back here to have its dose set.
  React.useEffect(() => {
    const targetName = normalizeKey(autoConfigureMedicineName || "");
    if (!targetName || !queryReady || filteredMedicines.length === 0) return;

    const match =
      filteredMedicines.find(
        (m) => normalizeKey(extractAnyName(m)) === targetName,
      ) ??
      filteredMedicines.find((m) => {
        const nameKey = normalizeKey(extractAnyName(m));
        return nameKey.includes(targetName) || targetName.includes(nameKey);
      });

    if (!match) return;

    const rawId = extractAnyId(match);
    const rawName = extractAnyName(match);
    const cid = canonicalizeMedicineId(
      rawId,
      rawName,
      extractAnyStrength(match),
    );

    // A medicine the doctor just created is one they intend to prescribe, so
    // add it outright. This used to open a dose panel; the dose now comes from
    // the same resolution chain as every other add, and stays editable on the
    // medicine's card.
    if (!isAlreadySelected({ id: cid, name: rawName, medicineId: rawId })) {
      addWithDefaults(match);
    }

    onAutoConfigureMedicineHandled?.();
  }, [
    addWithDefaults,
    autoConfigureMedicineName,
    canonicalizeMedicineId,
    filteredMedicines,
    isAlreadySelected,
    onAutoConfigureMedicineHandled,
    queryReady,
  ]);

  const renderRow = (medicine: unknown, index: number) => {
    const rawId = extractAnyId(medicine);
    const rawName = extractAnyName(medicine);
    const rawStrength = extractAnyStrength(medicine);
    const cid = canonicalizeMedicineId(rawId, rawName, rawStrength);
    const alreadyAdded = isAlreadySelected({ id: cid, name: rawName });
    const rowId = buildRowId(rowPrefix, rawName);
    const nameKey = normalizeKey(rawName);

    return (
      <MedicineResultRow
        key={rowId}
        medicine={medicine}
        rowId={rowId}
        name={rawName}
        strength={rawStrength}
        highlightedNameHtml={
          queryReady ? highlightHtml(rawName, query) : undefined
        }
        isActive={queryReady && index === highlight}
        alreadyAdded={alreadyAdded}
        isFavorite={isFavorite(medicine)}
        canEdit={canEditPrescription}
        lockMessage={lockMessage}
        onActivate={() => addWithDefaults(medicine)}
        onRemove={() => removeMedicineDirect(medicine)}
        onToggleFavorite={() => void onToggleFavorite(medicine)}
        onHover={() => queryReady && setHighlight(index)}
        showStock={showStockAvailability}
        stockQuantity={stockAvailabilityByName?.get(nameKey)}
        stockKnown={
          !stockCacheLoading && !!stockAvailabilityByName?.has(nameKey)
        }
        stockLoading={stockCacheLoading}
      />
    );
  };

  return (
    <>
      <div className="relative z-30 shrink-0 border-b border-line px-3 py-2.5 sm:px-4">
        <div className="flex items-center gap-2">
          <div ref={pickerRef} className="relative min-w-0 flex-1">
            <Tooltip
              content={lockMessage}
              isDisabled={canEditPrescription}
              placement="top"
            >
              <div className={!canEditPrescription ? "cursor-not-allowed" : ""}>
                <Input
                  ref={inputRef}
                  /* Stable hook for "Add medicine" elsewhere on the page to
                     focus this field. Must not be keyed off placeholder text,
                     which changes with copy edits. */
                  id={MEDICINE_SEARCH_INPUT_ID}
                  role="combobox"
                  aria-expanded={showPicker}
                  aria-controls={LISTBOX_ID}
                  aria-activedescendant={activeRowId}
                  aria-autocomplete="list"
                  startContent={
                    <FiSearch className="h-4 w-4 text-text-subtle" />
                  }
                  isDisabled={!canEditPrescription}
                  endContent={
                    query ? (
                      <button
                        type="button"
                        aria-label="Clear search"
                        onClick={() => {
                          setQuery("");
                          inputRef.current?.focus();
                        }}
                        className="rounded-full p-0.5 hover:bg-surface-muted"
                      >
                        <FiX className="h-3.5 w-3.5 text-text-subtle" />
                      </button>
                    ) : null
                  }
                  placeholder="e.g. DOLO 650 1-1-1 5d af  — ↑↓ choose, Enter add"
                  value={query}
                  onValueChange={(v) => setQuery((v ?? "").toUpperCase())}
                  onFocus={onSearchFocus}
                  onKeyDown={handleSearchKeyDown}
                  radius="lg"
                  size="sm"
                  classNames={{
                    inputWrapper:
                      "h-10 border border-line bg-surface shadow-none transition-colors hover:border-primary/40",
                    input:
                      "text-[13px] text-text placeholder:text-text-subtle",
                  }}
                />
              </div>
            </Tooltip>

            {/* Live read-back of the one-line syntax, so the doctor can see what
                Enter will do without opening anything. Replaces the five-field
                dose panel for the fast path. */}
            {showPicker && parsedTokens.length > 0 && (
              <div
                aria-live="polite"
                className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]"
              >
                <span className="font-semibold text-text-subtle">Will add:</span>
                {parsedTokens.map((token) => (
                  <span
                    key={`${token.kind}-${token.label}`}
                    className="rounded-md bg-primary/10 px-1.5 py-0.5 font-semibold text-primary"
                  >
                    {token.label}
                  </span>
                ))}
              </div>
            )}

            {showPicker && (
              <div
                onScroll={(e) => {
                  const el = e.currentTarget;
                  if (
                    el.scrollHeight - el.scrollTop <=
                    el.clientHeight + 20
                  ) {
                    void loadMoreGlobal();
                  }
                }}
                className={[
                  "absolute left-0 -right-12 top-full z-50 mt-1.5 h-fit rounded-2xl border border-line bg-surface px-2.5 py-2.5 shadow-xl shadow-black/10 sm:-right-16",
                  "overflow-y-auto overscroll-contain [scrollbar-width:thin]",
                  "max-h-[calc(100vh-160px)] sm:max-h-[340px]",
                ].join(" ")}
              >
                {queryReady ? (
                  <div className="space-y-2">
                    {medicinesLoading && (
                      <p className="px-2 py-3 text-sm text-text-muted">
                        Searching your clinic’s medicines…
                      </p>
                    )}

                    {!medicinesLoading && !!medicinesError && (
                      <div className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                        Failed to load medicines.
                        <button
                          type="button"
                          className="ml-2 underline"
                          onClick={() => refetchMedicines()}
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    {!medicinesLoading && !medicinesError && (
                      <>
                        {hasClinicMatches && (
                          <section
                            aria-label="Your clinic’s medicines"
                            className="rounded-xl border border-line bg-surface p-2"
                          >
                            {/* One compact line instead of an icon tile with a
                                title and a hint stacked beside it. */}
                            <header className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
                              <h3 className="min-w-0 truncate text-[11px] font-bold uppercase tracking-wide text-text-muted">
                                Your clinic’s medicines
                                <span className="ml-1.5 font-semibold normal-case tracking-normal text-text-subtle">
                                  ({filteredMedicines.length}) · Enter adds
                                </span>
                              </h3>
                            </header>

                            <div
                              id={LISTBOX_ID}
                              role="listbox"
                              aria-label="Clinic medicine results"
                              className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3"
                            >
                              {filteredMedicines.map(renderRow)}
                            </div>
                          </section>
                        )}

                        {/* No clinic match: one quiet line, not a full-width
                            "0 results" card stacked on a dashed empty panel.
                            The database matches below are the actual answer. */}
                        {!hasClinicMatches && (
                          <div className="flex flex-col gap-2 rounded-xl border border-dashed border-line bg-surface-muted px-3 py-2.5 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
                            <span className="min-w-0">
                              Nothing saved in your clinic for{" "}
                              <b className="text-text">
                                {debouncedQuery.trim()}
                              </b>
                            </span>
                            <Tooltip
                              content={lockMessage}
                              isDisabled={canEditPrescription}
                              placement="top"
                            >
                              <span className="inline-flex shrink-0">
                                <Button
                                  size="sm"
                                  radius="sm"
                                  variant="light"
                                  className="h-8 rounded-lg font-semibold text-primary"
                                  startContent={
                                    <FiPlus className="h-3.5 w-3.5" />
                                  }
                                  onPress={() => {
                                    if (!canEditPrescription) return;
                                    openAddNew(debouncedQuery.trim());
                                  }}
                                  isDisabled={!canEditPrescription}
                                >
                                  Add new medicine
                                </Button>
                              </span>
                            </Tooltip>
                          </div>
                        )}

                        {/* Opt-in trigger — the clinic answered the query, so
                            the database stays unqueried until asked for. */}
                        {hasClinicMatches && !databaseRequested && (
                          <button
                            type="button"
                            onClick={() => setDatabaseRequested(true)}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line px-3 py-2 text-xs font-semibold text-text-muted transition hover:border-primary/40 hover:text-primary"
                          >
                            <FiGlobe className="h-3.5 w-3.5" />
                            Also search the drug database
                          </button>
                        )}

                        {shouldSearchDatabase && (
                        <GlobalMedicineResults
                          items={globalItems}
                          loading={globalLoading}
                          error={globalError}
                          showEmptyMessage
                          canEdit={canEditPrescription}
                          isCreating={isCreatingGlobalMedicine}
                          onAdd={createGlobalMedicineDirect}
                          title={
                            hasClinicMatches
                              ? "Other available medicines"
                              : "Matches in the drug database"
                          }
                          subtitle="Adding one saves it to your clinic first"
                        />
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <h3 className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
                      Favourite / recent
                    </h3>

                    {topUsedLoading && (
                      <p className="px-2 py-3 text-sm text-text-muted">
                        Loading medicines…
                      </p>
                    )}

                    {!topUsedLoading && topUsedIsError && (
                      <div className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                        Failed to load medicines.
                        <button
                          type="button"
                          className="ml-2 underline"
                          onClick={() => refetchTopUsed()}
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    {showQuickMedicines &&
                      !topUsedLoading &&
                      !topUsedIsError &&
                      (visibleList.length > 0 ? (
                        <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                          {visibleList.map(renderRow)}
                        </div>
                      ) : (
                        <p className="rounded-xl border border-line bg-surface px-3 py-2 text-[13px] font-medium text-text-muted">
                          {quickMedicines.length > 0
                            ? "All your favourite medicines are already in this prescription — type to search for more."
                            : "No favourite or recent medicines yet."}
                        </p>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Favourite-prescription trigger, sat beside the history button now
              that the Prescription Summary header that used to hold it is gone. */}
          {onOpenFavourite && (
            <Tooltip
              content={
                favouriteName?.trim()
                  ? `Favourite: ${favouriteName}`
                  : "Save as favourite prescription"
              }
              placement="top"
            >
              <span className="inline-flex">
                <Button
                  isIconOnly
                  radius="sm"
                  variant="flat"
                  size="sm"
                  aria-label="Save as favourite prescription"
                  onPress={onOpenFavourite}
                  isDisabled={!canEditPrescription}
                  className={[
                    "h-10 w-10 shrink-0 rounded-lg border shadow-none disabled:cursor-not-allowed disabled:opacity-40",
                    favouriteName?.trim()
                      ? "border-warning/40 bg-warning/15 text-warning"
                      : "border-line bg-surface text-text-muted hover:bg-surface-muted",
                  ].join(" ")}
                >
                  <FiStar
                    className={[
                      "h-4 w-4",
                      favouriteName?.trim() ? "fill-current" : "",
                    ].join(" ")}
                  />
                </Button>
              </span>
            </Tooltip>
          )}

          {/* Clinical drawer trigger. Lives in the toolbar rather than floating
              over the workspace, where it sat on top of the table's row
              actions. */}
          {onOpenClinical && (
            <Tooltip content="Clinical details" placement="top">
              <span className="inline-flex">
                <Button
                  isIconOnly
                  radius="sm"
                  variant="flat"
                  size="sm"
                  aria-label="Open clinical details"
                  onPress={onOpenClinical}
                  className="h-10 w-10 shrink-0 rounded-lg border border-line bg-surface shadow-none hover:bg-surface-muted"
                >
                  <FiSidebar className="h-4 w-4 text-text-muted" />
                </Button>
              </span>
            </Tooltip>
          )}

          <Tooltip
            content={
              rxHistory.length > 0 ? "Prescription history" : "No history yet"
            }
            placement="top"
          >
            <span className="inline-flex">
              <Button
                isIconOnly
                radius="sm"
                variant="flat"
                size="sm"
                aria-label="Open prescription history"
                className="h-10 w-10 shrink-0 rounded-lg border border-line bg-surface shadow-none hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
                onPress={() => setIsPrescriptionHistoryOpen(true)}
                isDisabled={rxHistory.length === 0}
              >
                <FiClock className="h-4 w-4 text-text-muted" />
              </Button>
            </span>
          </Tooltip>
        </div>
      </div>

      <Modal
        isOpen={isPrescriptionHistoryOpen}
        onOpenChange={setIsPrescriptionHistoryOpen}
        size="5xl"
        scrollBehavior="inside"
        classNames={{
          base: "rounded-2xl border border-line bg-surface text-text",
          body: "p-0 bg-surface",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="border-b border-line px-5 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-text">
                    Prescription History
                  </h2>
                  <p className="text-sm text-text-muted">
                    View all previous prescriptions
                  </p>
                </div>
              </ModalHeader>

              <ModalBody className="bg-surface px-5 py-4">
                <PrescriptionsHistory
                  items={rxHistory}
                  loading={isRxHistoryLoading}
                  patient={patient}
                  doctor={doctor}
                  clinic={clinic}
                />
              </ModalBody>

              <ModalFooter className="border-t border-line px-5 py-3">
                <Button
                  radius="sm"
                  variant="bordered"
                  size="sm"
                  className="h-9 rounded-lg border-line text-[13px] font-semibold text-text"
                  onPress={onClose}
                >
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default PrescriptionMedicineSidebar;
