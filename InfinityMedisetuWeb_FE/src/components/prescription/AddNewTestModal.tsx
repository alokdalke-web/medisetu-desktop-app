import {
  addToast,
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
} from "@heroui/react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiCheck, FiClipboard, FiPlus, FiSearch, FiX } from "react-icons/fi";
import CompactSelectDropdown from "../shared/CompactSelectDropdown";

export type TestSelectOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

export type CreateTestInput = {
  name: string;
  category: string;
};

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;

  clinicId?: string;
  isClinicLoading?: boolean;

  title?: string;

  options: TestSelectOption[];
  values: string[];
  onValuesChange: (values: string[]) => void;
  assignedValues?: string[];

  ensureTestsLoaded?: () => void;

  onAdd: () => void;
  isAddDisabled: boolean;

  isAdding?: boolean;

  onCreateTest?: (payload: CreateTestInput) => Promise<TestSelectOption>;
  isCreatingTest?: boolean;

  categories?: { label: string; value: string }[];
};

const DEFAULT_CATEGORIES = [
  { label: "Blood", value: "Blood" },
  { label: "Urine", value: "Urine" },
  { label: "Microbiology", value: "Microbiology" },
  { label: "Serology", value: "Serology" },
  { label: "Pulmonology", value: "Pulmonology" },
  { label: "Radiology", value: "Radiology" },
  { label: "Immunology", value: "Immunology" },
  { label: "Cardiology", value: "Cardiology" },
  { label: "Histopathology", value: "Histopathology" },
  { label: "Cytology", value: "Cytology" },
  { label: "Molecular", value: "Molecular" },
  { label: "Neurology", value: "Neurology" },
  { label: "Endoscopy", value: "Endoscopy" },
  { label: "Stool", value: "Stool" },
  { label: "Urology", value: "Urology" },
  { label: "Andrology", value: "Andrology" },
];

const getOptionName = (label: string) => {
  const beforeDot = label.split("•")[0]?.trim() ?? label.trim();
  return beforeDot.replace(/\s*\(.*\)\s*$/, "").trim();
};

const MAX_RESULTS = 60;

const AddNewTestModal: React.FC<Props> = ({
  isOpen,
  onOpenChange,
  clinicId,
  isClinicLoading,
  title = "Add Pathology Test",
  options,
  values,
  onValuesChange,
  assignedValues = [],
  ensureTestsLoaded,
  onAdd,
  isAdding = false,
  onCreateTest,
  isCreatingTest = false,
  categories = DEFAULT_CATEGORIES,
}) => {
  const triggerLoad = () => {
    if (!clinicId || isClinicLoading || isAdding || isCreatingTest) return;
    ensureTestsLoaded?.();
  };

  const selectedSet = useMemo(() => new Set(values.map(String)), [values]);
  const assignedValuesSet = useMemo(() => new Set(assignedValues.map(String)), [assignedValues]);
  const selectedOptions = useMemo(() => options.filter((o) => selectedSet.has(String(o.value))), [options, selectedSet]);

  const [query, setQuery] = useState("");
  const [ddOpen, setDdOpen] = useState(false);
  const [userEdited, setUserEdited] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    triggerLoad();
    setQuery("");
    setDdOpen(false);
    setUserEdited(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setDdOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const searchQ = userEdited ? normalizedQuery : "";

  const enabledList = useMemo(() => options.filter((o) => !o.disabled && o.value !== ""), [options]);

  const filtered = useMemo(() => {
    const unassigned = enabledList.filter((o) => !assignedValuesSet.has(String(o.value)));
    if (!searchQ) return unassigned.slice(0, MAX_RESULTS);
    return unassigned
      .filter((o) => {
        const full = o.label.toLowerCase();
        const name = getOptionName(o.label).toLowerCase();
        return full.includes(searchQ) || name.includes(searchQ);
      })
      .slice(0, MAX_RESULTS);
  }, [enabledList, searchQ, assignedValuesSet]);

  const exactMatch = useMemo(() => {
    if (!searchQ) return false;
    return enabledList.some((o) => getOptionName(o.label).trim().toLowerCase() === searchQ);
  }, [enabledList, searchQ]);

  const canCreateFromQuery = userEdited && !!normalizedQuery && !exactMatch && !!onCreateTest && !!clinicId;

  const toggleValue = (id: string) => {
    const key = String(id);
    const next = new Set(values.map(String));
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onValuesChange(Array.from(next));
  };

  const removeSelectedValue = (id: string) => {
    onValuesChange(values.filter((v) => String(v) !== String(id)));
  };

  const [createOpen, setCreateOpen] = useState(false);
  const [testName, setTestName] = useState("");
  const [category, setCategory] = useState(categories?.[0]?.value ?? "Blood");

  const openCreate = () => {
    setTestName(query.trim());
    setCategory(categories?.[0]?.value ?? "Blood");
    setCreateOpen(true);
  };

  const isSaveDisabled = isCreatingTest || !testName.trim() || !category.trim();

  const handleCreate = async () => {
    if (!onCreateTest || isSaveDisabled) return;
    try {
      const created = await onCreateTest({ name: testName.trim(), category: category.trim() });
      addToast({ title: "Test created", color: "success", variant: "flat" });
      setCreateOpen(false);
      ensureTestsLoaded?.();
      onValuesChange(Array.from(new Set([...values, created.value])));
      setQuery("");
      setUserEdited(false);
      setDdOpen(false);
    } catch (e: any) {
      addToast({
        title: "Create failed",
        description: e?.data?.message || e?.message || "Something went wrong.",
        color: "danger",
        variant: "flat",
      });
    }
  };

  const selectedCount = selectedSet.size;
  const primaryLabel = selectedCount > 0
    ? `Add Pathology Test${selectedCount > 1 ? "s" : ""} (${selectedCount})`
    : "Add Pathology Test";

  const primaryDisabled = selectedCount > 0
    ? !clinicId || !!isClinicLoading || !!isAdding || !!isCreatingTest
    : !canCreateFromQuery || !!isAdding || !!isCreatingTest;

  const onPrimaryPress = () => {
    if (selectedCount > 0) { setDdOpen(false); onAdd(); }
    else if (canCreateFromQuery) openCreate();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        placement="center"
        hideCloseButton
        size="lg"
        classNames={{
          base: "rounded-2xl shadow-xl border border-slate-200 bg-white dark:border-[#38445a] dark:bg-[#111726] w-[min(520px,calc(100%-24px))] max-h-[85vh] overflow-hidden",
          body: "p-0 overflow-y-auto",
        }}
      >
        <ModalContent>
          {() => (
            <ModalBody>
              <div className="relative px-5 pt-5 pb-5 sm:px-6 sm:pt-6 sm:pb-6">
                {/* Close button */}
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition dark:text-slate-400 dark:hover:bg-[#1a2535] dark:hover:text-white"
                  aria-label="Close"
                >
                  <FiX className="h-4 w-4" />
                </button>

                {/* Header */}
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0a6c74]/10 text-[#0a6c74] dark:bg-[#46beae]/15 dark:text-[#46beae]">
                    <FiClipboard className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">{title}</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Search and select tests to add</p>
                  </div>
                </div>

                {/* Search section */}
                <div className="mt-5" ref={rootRef}>
                  <div>
                    <Input
                      value={query}
                      placeholder="Search pathology tests..."
                      radius="lg"
                      startContent={<FiSearch className="h-4 w-4 text-slate-400 shrink-0" />}
                      isDisabled={!clinicId || isClinicLoading || isAdding || isCreatingTest}
                      classNames={{
                        inputWrapper:
                          "h-10 border border-slate-200 bg-slate-50 shadow-none transition-all " +
                          "focus-within:border-[#0a6c74] focus-within:ring-2 focus-within:ring-[#0a6c74]/15 focus-within:bg-white " +
                          "dark:border-[#38445a] dark:bg-[#0b1321] dark:focus-within:border-[#46beae] dark:focus-within:ring-[#46beae]/15 dark:focus-within:bg-[#0f1728]",
                        input: "text-[13px] text-slate-800 placeholder:text-slate-400 font-medium dark:text-white dark:placeholder:text-slate-400",
                      }}
                      onClick={() => { triggerLoad(); setDdOpen(true); setUserEdited(Boolean(query.trim())); }}
                      onFocus={() => { triggerLoad(); setDdOpen(true); setUserEdited(Boolean(query.trim())); }}
                      onChange={(e) => { setQuery(e.target.value); setDdOpen(true); setUserEdited(true); }}
                    />

                    {ddOpen && (
                      <div className="mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-[#38445a] dark:bg-[#0b1321]">
                        <div className="max-h-[200px] overflow-auto p-1" style={{ scrollbarWidth: "thin" }}>
                          {filtered.length > 0 ? (
                            filtered.map((o) => (
                              <button
                                key={o.value}
                                type="button"
                                className={[
                                  "w-full rounded-lg px-3 py-2 text-left text-[13px] transition flex items-center justify-between gap-2",
                                  selectedSet.has(String(o.value))
                                    ? "bg-[#0a6c74]/8 text-[#0a6c74] font-semibold dark:bg-[#46beae]/15 dark:text-[#46beae]"
                                    : "text-slate-700 hover:bg-slate-50 dark:text-white dark:hover:bg-[#1a2535]",
                                ].join(" ")}
                                onMouseDown={(ev) => ev.preventDefault()}
                                onClick={() => { toggleValue(o.value); setQuery(""); setUserEdited(false); setDdOpen(true); }}
                              >
                                <span className="truncate">{o.label}</span>
                                {selectedSet.has(String(o.value)) ? <FiCheck className="text-[#0a6c74] dark:text-[#46beae] shrink-0 stroke-[2.5px]" /> : null}
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-4 text-center text-[12px] text-slate-400 font-medium dark:text-slate-400">
                              {userEdited ? "No matching tests found." : "No tests available."}
                            </div>
                          )}

                          {canCreateFromQuery && (
                            <div className="border-t border-slate-100 p-1 dark:border-[#273244]">
                              <button
                                type="button"
                                className="w-full rounded-lg bg-[#0a6c74]/5 hover:bg-[#0a6c74]/10 px-3 py-2.5 text-left text-[13px] font-semibold text-[#0a6c74] transition flex items-center gap-2 dark:bg-[#46beae]/10 dark:hover:bg-[#46beae]/15 dark:text-[#46beae]"
                                onMouseDown={(ev) => ev.preventDefault()}
                                onClick={openCreate}
                              >
                                <FiPlus className="h-4 w-4 shrink-0" />
                                <span className="truncate">Create "{query.trim()}"</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Selected pills */}
                  {selectedOptions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                      {selectedOptions.map((item) => (
                        <span
                          key={item.value}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#0a6c74]/20 bg-[#0a6c74]/5 px-2 py-1 text-[11px] font-semibold text-[#0a6c74] dark:border-[#46beae]/30 dark:bg-[#46beae]/10 dark:text-[#46beae]"
                        >
                          <span className="truncate max-w-[180px]">{getOptionName(item.label)}</span>
                          <button
                            type="button"
                            onClick={() => removeSelectedValue(item.value)}
                            className="grid h-4 w-4 place-items-center rounded-full hover:bg-[#0a6c74]/15 dark:hover:bg-[#46beae]/20"
                            aria-label={`Remove ${getOptionName(item.label)}`}
                          >
                            <FiX className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {!clinicId && (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                      Clinic ID not found. Please ensure clinic API is loaded.
                    </div>
                  )}
                </div>

                {/* Footer buttons */}
                <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-[#38445a]">
                  <Button
                    radius="lg"
                    variant="bordered"
                    className="h-9 px-4 border-slate-200 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-[#38445a] dark:text-white dark:hover:bg-[#1a2535]"
                    onPress={() => onOpenChange(false)}
                    isDisabled={isAdding || isCreatingTest}
                  >
                    Cancel
                  </Button>
                  <Button
                    radius="lg"
                    className={[
                      "h-9 px-5 text-[12px] font-bold transition-colors",
                      primaryDisabled
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-[#1a2535] dark:text-slate-500"
                        : "bg-[#0a6c74] text-white hover:bg-[#095a61] shadow-sm shadow-[#0a6c74]/25 dark:bg-[#46beae] dark:text-[#04231f] dark:hover:bg-[#3aa898]",
                    ].join(" ")}
                    onPress={onPrimaryPress}
                    isDisabled={primaryDisabled}
                    isLoading={isAdding || isCreatingTest}
                  >
                    {primaryLabel}
                  </Button>
                </div>
              </div>
            </ModalBody>
          )}
        </ModalContent>
      </Modal>

      {/* Create new test sub-modal */}
      <Modal
        isOpen={createOpen}
        onOpenChange={(open) => setCreateOpen(open)}
        size="md"
        placement="center"
        hideCloseButton
        classNames={{
          base: "rounded-2xl shadow-xl border border-slate-200 bg-white dark:border-[#273244] dark:bg-[#111726] w-[min(440px,calc(100%-32px))] overflow-visible",
          body: "p-0 overflow-visible",
        }}
      >
        <ModalContent>
          <ModalBody>
            <div className="px-5 pt-5 pb-5 sm:px-6 sm:pt-6 sm:pb-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Create New Test</h3>
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition dark:text-slate-500 dark:hover:bg-[#1a2535] dark:hover:text-white"
                  aria-label="Close"
                >
                  <FiX className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <label className="block">
                  <div className="mb-1.5 text-[12px] font-semibold text-slate-600 dark:text-slate-400">Test Name</div>
                  <Input
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                    placeholder="Enter test name"
                    radius="lg"
                    classNames={{
                      inputWrapper:
                        "h-10 border border-slate-200 bg-slate-50 shadow-none focus-within:border-[#0a6c74] focus-within:ring-2 focus-within:ring-[#0a6c74]/15 focus-within:bg-white dark:border-[#273244] dark:bg-[#0f1728] dark:focus-within:border-[#46beae]",
                      input: "text-[13px] text-slate-800 font-medium dark:text-white",
                    }}
                  />
                </label>

                <div className="block">
                  <div className="mb-1.5 text-[12px] font-semibold text-slate-600 dark:text-slate-400">Category</div>
                  <CompactSelectDropdown
                    ariaLabel="Category"
                    value={category}
                    onChange={setCategory}
                    options={categories}
                    triggerClassName="h-10 rounded-lg px-3 text-[13px] font-medium text-slate-800 dark:text-white"
                    menuClassName="top-[calc(100%+6px)] rounded-xl p-1.5"
                    optionClassName="min-h-8 rounded-lg text-[13px]"
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-[#273244]">
                <Button
                  radius="lg"
                  variant="bordered"
                  className="h-9 px-4 border-slate-200 text-[12px] font-semibold text-slate-600 dark:border-[#273244] dark:text-slate-300"
                  onPress={() => setCreateOpen(false)}
                  isDisabled={isCreatingTest}
                >
                  Cancel
                </Button>
                <Button
                  radius="lg"
                  className={[
                    "h-9 px-5 text-[12px] font-bold text-white transition-colors",
                    isSaveDisabled
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-[#273244] dark:text-slate-500"
                      : "bg-[#0a6c74] hover:bg-[#095a61] shadow-sm shadow-[#0a6c74]/25 dark:bg-[#46beae] dark:text-[#04231f] dark:hover:bg-[#3aa898]",
                  ].join(" ")}
                  onPress={handleCreate}
                  isDisabled={isSaveDisabled}
                  isLoading={isCreatingTest}
                >
                  Save Test
                </Button>
              </div>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default AddNewTestModal;
