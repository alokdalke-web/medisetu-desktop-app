import React, { useEffect, useRef, useState } from "react";
import { useLocation, useOutletContext } from "react-router";
import { useUpdateDoctorPreferencesMutation } from "../../redux/api/prescriptionPreferenceApi";
import { useGetDoctorPreferencesQuery } from "../../redux/api/medicineApi";
import {
  Card,
  CardBody,
  Button,
  Spinner,
  addToast,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
} from "@heroui/react";
import Tooltip from "../../components/shared/Tooltip";
import {
  FiSave,
  FiRefreshCw,
  FiList,
  FiPlus,
  FiTrash2,
  FiMenu,
  FiEye,
  FiX,
} from "react-icons/fi";
import ProfilePageHeader from "../../components/shared/ProfilePageHeader";
import note from "../../../public/assets/icons/note-icon.svg";
import PrescriptionDetails, {
  emptyPrescriptionDetails,
} from "../../components/prescription/PrescriptionDetails";

type PreferenceState = {
  headerOrder: string[];
  habitList: string[];
  surgerySuggestedList: string[];
  allergyList: string[];
  diagnosisList: string[];
  dietarySuggestionsList: string[];
};

type ListSectionKey =
  | "habitList"
  | "surgerySuggestedList"
  | "allergyList"
  | "diagnosisList"
  | "dietarySuggestionsList";

type OutletContextType = {
  doctorId: string;
};

const emptyPreferences: PreferenceState = {
  headerOrder: [],
  habitList: [],
  surgerySuggestedList: [],
  allergyList: [],
  diagnosisList: [],
  dietarySuggestionsList: [],
};

const sectionTitles: Record<ListSectionKey, string> = {
  habitList: "Habits",
  surgerySuggestedList: "Surgery Suggested",
  allergyList: "Allergy List",
  diagnosisList: "Diagnosis List",
  dietarySuggestionsList: "Dietary Suggestions List",
};

const ALL_AVAILABLE_HEADERS = [
  "Pathology Test Name",
  "Advice",
  "Dietary Suggestions",
  "Habits",
  "Vitals",
  "Allergy",
  "Diagnosis",
  "Surgery Suggested",
  "Visiting Days",
  "Follow-Up (days)",
];

const SECTION_TOOLTIPS: Record<string, string> = {
  "Pathology Test Name":
    "Shows the pathology tests section where added diagnostic tests will appear in the prescription.",
  Advice:
    "Shows the advice section for doctor recommendations, care instructions, and patient guidance.",
  "Dietary Suggestions":
    "Shows the dietary suggestions section for food-related instructions and nutrition advice.",
  Habits:
    "Shows the habits section to capture lifestyle factors such as smoking, alcohol, or tobacco use.",
  Vitals:
    "Shows the vitals section for health measurements like BP, pulse, temperature, SpO₂, height, and weight.",
  Allergy:
    "Shows the allergy section to record medicine, food, latex, or other patient allergies.",
  Diagnosis:
    "Shows the diagnosis section where selected medical conditions or findings are displayed.",
  "Surgery Suggested":
    "Shows the surgery suggested section for procedures or surgical recommendations, if needed.",
  "Visiting Days":
    "Shows the visiting days section where follow-up visit dates can be selected.",
  "Follow-Up (days)":
    "Shows the follow-up section to define the number of days and next follow-up date.",
};

const PrescriptionPreference: React.FC = () => {
  const location = useLocation();
  const { doctorId } = useOutletContext<OutletContextType>();

  const [preferences, setPreferences] =
    useState<PreferenceState>(emptyPreferences);

  const [newValues, setNewValues] = useState<Record<ListSectionKey, string>>({
    habitList: "",
    surgerySuggestedList: "",
    allergyList: "",
    diagnosisList: "",
    dietarySuggestionsList: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const touchDraggedIndexRef = useRef<number | null>(null);
  const touchDragOverIndexRef = useRef<number | null>(null);

  const [updateDoctorPreferences, { isLoading: isSaving }] =
    useUpdateDoctorPreferencesMutation();

  const {
    data: doctorPreferencesResponse,
    isLoading: isPreferencesLoading,
    isFetching: isPreferencesFetching,
    refetch,
  } = useGetDoctorPreferencesQuery(doctorId, {
    skip: !doctorId,
    refetchOnMountOrArgChange: true,
  });

  const isButtonLoading = isSaving || isSubmitting;

  useEffect(() => {
    if (location.pathname === "/profile/prescription-preference" && doctorId) {
      refetch();
    }
  }, [location.pathname, doctorId, refetch]);

  useEffect(() => {
    const result = doctorPreferencesResponse?.result;

    if (!result) {
      setPreferences(emptyPreferences);
      return;
    }

    setPreferences({
      headerOrder: Array.isArray(result.headerOrder) ? result.headerOrder : [],
      habitList: Array.isArray(result.habitList) ? result.habitList : [],
      surgerySuggestedList: Array.isArray(result.surgerySuggestedList)
        ? result.surgerySuggestedList
        : [],
      allergyList: Array.isArray(result.allergyList) ? result.allergyList : [],
      diagnosisList: Array.isArray(result.diagnosisList)
        ? result.diagnosisList
        : [],
      dietarySuggestionsList: Array.isArray(result.dietarySuggestionsList)
        ? result.dietarySuggestionsList
        : [],
    });
  }, [doctorPreferencesResponse]);

  const resetDragState = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    touchDraggedIndexRef.current = null;
    touchDragOverIndexRef.current = null;
  };

  const handleDragDrop = (fromIndex: number, toIndex: number) => {
    if (isButtonLoading) return;
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || toIndex < 0) return;
    if (
      fromIndex >= preferences.headerOrder.length ||
      toIndex >= preferences.headerOrder.length
    ) {
      return;
    }

    setPreferences((prev) => {
      const updated = [...prev.headerOrder];
      const [movedItem] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, movedItem);

      return {
        ...prev,
        headerOrder: updated,
      };
    });
  };

  const getTouchOverIndex = (clientY: number) => {
    const validItems = itemRefs.current.filter(Boolean) as HTMLDivElement[];

    if (!validItems.length) return null;

    for (let index = 0; index < itemRefs.current.length; index += 1) {
      const element = itemRefs.current[index];

      if (!element) continue;

      const rect = element.getBoundingClientRect();

      if (clientY >= rect.top && clientY <= rect.bottom) {
        return index;
      }
    }

    const firstElement = validItems[0];
    const lastElement = validItems[validItems.length - 1];

    if (clientY < firstElement.getBoundingClientRect().top) {
      return 0;
    }

    if (clientY > lastElement.getBoundingClientRect().bottom) {
      return itemRefs.current.length - 1;
    }

    return null;
  };

  const handleTouchStart = (
    e: React.TouchEvent<HTMLDivElement>,
    index: number,
  ) => {
    if (isButtonLoading) return;

    touchDraggedIndexRef.current = index;
    touchDragOverIndexRef.current = index;
    setDraggedIndex(index);
    setDragOverIndex(index);

    e.currentTarget.classList.add("scale-[0.99]");
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isButtonLoading) return;
    if (touchDraggedIndexRef.current === null) return;

    const touch = e.touches[0];

    if (!touch) return;

    const nextIndex = getTouchOverIndex(touch.clientY);

    if (nextIndex !== null && nextIndex !== touchDragOverIndexRef.current) {
      touchDragOverIndexRef.current = nextIndex;
      setDragOverIndex(nextIndex);
    }

    e.preventDefault();
  };

  const handleTouchEnd = () => {
    const fromIndex = touchDraggedIndexRef.current;
    const toIndex = touchDragOverIndexRef.current;

    if (fromIndex !== null && toIndex !== null) {
      handleDragDrop(fromIndex, toIndex);
    }

    resetDragState();
  };

  const toggleHeaderItem = (header: string, isSelected: boolean) => {
    if (isButtonLoading) return;

    setPreferences((prev) => {
      if (isSelected) {
        if (!prev.headerOrder.includes(header)) {
          return {
            ...prev,
            headerOrder: [...prev.headerOrder, header],
          };
        }
        return prev;
      }

      if (prev.headerOrder.length <= 1) {
        addToast({
          title: "Cannot Remove",
          description: "At least one section must remain selected.",
          color: "warning",
        });
        return prev;
      }

      return {
        ...prev,
        headerOrder: prev.headerOrder.filter((item) => item !== header),
      };
    });
  };

  const updateNewValue = (key: ListSectionKey, value: string) => {
    if (isButtonLoading) return;

    setNewValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const formatDietarySuggestion = (value: string): string => {
    const trimmed = value.trim();

    if (!trimmed) return trimmed;

    if (trimmed.endsWith(".")) {
      return trimmed;
    }

    return `${trimmed}.`;
  };

  const addListItem = (key: ListSectionKey) => {
    if (isButtonLoading) return;

    let value = newValues[key].trim();

    if (!value) return;

    if (key === "dietarySuggestionsList") {
      value = formatDietarySuggestion(value);
    }

    setPreferences((prev) => {
      const alreadyExists = prev[key].some(
        (item) => item.toLowerCase() === value.toLowerCase(),
      );

      if (alreadyExists) return prev;

      return {
        ...prev,
        [key]: [...prev[key], value],
      };
    });

    setNewValues((prev) => ({
      ...prev,
      [key]: "",
    }));
  };

  const removeListItem = (key: ListSectionKey, itemIndex: number) => {
    if (isButtonLoading) return;

    setPreferences((prev) => {
      const currentList = prev[key];

      if (currentList.length <= 1) {
        addToast({
          title: "Cannot Remove",
          description: `At least one ${sectionTitles[key].toLowerCase()} option must remain.`,
          color: "warning",
        });
        return prev;
      }

      return {
        ...prev,
        [key]: currentList.filter((_, index) => index !== itemIndex),
      };
    });
  };

  const handleInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    key: ListSectionKey,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addListItem(key);
    }
  };

  const handleSave = async (closePreview = false) => {
    if (isButtonLoading || !doctorId) return;

    setIsSubmitting(true);

    try {
      await updateDoctorPreferences({
        doctorId,
        data: preferences,
      }).unwrap();

      await refetch();

      addToast({
        title: "Success",
        description: "Prescription preferences saved successfully!",
        color: "success",
      });

      if (closePreview) {
        setIsPreviewOpen(false);
      }
    } catch {
      addToast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        color: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetToDefault = async () => {
    if (isButtonLoading) return;

    try {
      const { data } = await refetch();
      const result = data?.result;

      if (result) {
        setPreferences({
          headerOrder: Array.isArray(result.headerOrder)
            ? result.headerOrder
            : [],
          habitList: Array.isArray(result.habitList) ? result.habitList : [],
          surgerySuggestedList: Array.isArray(result.surgerySuggestedList)
            ? result.surgerySuggestedList
            : [],
          allergyList: Array.isArray(result.allergyList)
            ? result.allergyList
            : [],
          diagnosisList: Array.isArray(result.diagnosisList)
            ? result.diagnosisList
            : [],
          dietarySuggestionsList: Array.isArray(result.dietarySuggestionsList)
            ? result.dietarySuggestionsList
            : [],
        });

        addToast({
          title: "Success",
          description: "Preferences reset to saved state.",
          color: "success",
        });
      }
    } catch (error) {
      console.error("Failed to reset preferences:", error);
    }
  };

  const handleOpenPreview = () => {
    if (!doctorId || isButtonLoading) return;

    setPreviewRefreshKey((prev) => prev + 1);
    setIsPreviewOpen(true);
  };

  const isInitialLoading = isPreferencesLoading || isPreferencesFetching;

  return (
    <>
      <Card className="overflow-hidden rounded-2xl shadow-none dark:bg-[#111726]">
        <ProfilePageHeader
          icon={<img src={note} alt="" className="w-4" />}
          title="Prescription Preferences"
          actions={
            <>
              <Button
                variant="bordered"
                size="sm"
                startContent={<FiRefreshCw />}
                onPress={handleResetToDefault}
                isDisabled={isButtonLoading}
                className="whitespace-nowrap"
              >
                Reset to Default
              </Button>

              <Button
                variant="bordered"
                size="sm"
                startContent={<FiEye />}
                onPress={handleOpenPreview}
                isDisabled={isButtonLoading || !doctorId}
                className="whitespace-nowrap"
              >
                Preview Form
              </Button>

              <Button
                size="sm"
                className="whitespace-nowrap bg-primary text-white"
                startContent={<FiSave />}
                onPress={() => handleSave(false)}
                isLoading={isButtonLoading}
              >
                {isButtonLoading ? "Saving..." : "Save Preferences"}
              </Button>
            </>
          }
        />

        <CardBody className="p-3 sm:p-6 [&_.text-default-900]:dark:text-white [&_.text-default-600]:dark:text-slate-400 [&_.text-default-500]:dark:text-slate-400 [&_.bg-default-50]:dark:bg-[#0f1728]">
          {" "}
          {isInitialLoading && doctorId && (
            <div className="flex min-h-[520px] items-center justify-center">
              <Spinner size="lg" />
            </div>
          )}
          {!isInitialLoading && !doctorId && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
              Doctor ID not available.
            </div>
          )}
          {!isInitialLoading && doctorId && (
            <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
              {" "}
              <div className="space-y-6 lg:col-span-1">
                <div className="rounded-xl bg-default-50 p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-default-900">
                    <FiList className="text-primary" />
                    Available Sections
                  </h3>
                  <p className="mb-3 text-xs text-default-500">
                    Select which sections to show in the prescription
                  </p>

                  <div className="space-y-2">
                    {ALL_AVAILABLE_HEADERS.map((header) => {
                      const isSelected =
                        preferences.headerOrder.includes(header);

                      return (
                        <label
                          key={header}
                          className="flex cursor-pointer items-center gap-2 rounded-lg p-2 transition hover:bg-default-100"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) =>
                              toggleHeaderItem(header, e.target.checked)
                            }
                            disabled={isButtonLoading}
                            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-teal-500"
                          />

                          <Tooltip
                            content={
                              <div className="max-w-[220px] text-[11px] leading-4 text-slate-700">
                                {SECTION_TOOLTIPS[header]}
                              </div>
                            }
                            placement="top"
                            showArrow
                            delay={120}
                            closeDelay={80}
                            offset={10}
                            classNames={{
                              content:
                                "rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg",
                            }}
                          >
                            <span className="inline-flex w-fit text-sm text-default-700">
                              {header}
                            </span>
                          </Tooltip>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="lg:col-span-2">
                <div className="h-full rounded-xl bg-default-50 p-4">
                  <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-default-900">
                    <FiList className="text-primary" />
                    Selected Sections (in order)
                  </h3>
                  <p className="mb-4 text-xs text-default-500">
                    Drag and drop sections to change the order
                  </p>

                  {preferences.headerOrder.length > 0 ? (
                    <div className="space-y-3">
                      {preferences.headerOrder.map((item, index) => {
                        const isDragging = draggedIndex === index;
                        const isDragOver = dragOverIndex === index;

                        return (
                          <div
                            key={item}
                            ref={(element) => {
                              itemRefs.current[index] = element;
                            }}
                            draggable={!isButtonLoading}
                            onDragStart={(e) => {
                              setDraggedIndex(index);
                              e.dataTransfer.effectAllowed = "move";
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();

                              if (dragOverIndex !== index) {
                                setDragOverIndex(index);
                              }

                              e.dataTransfer.dropEffect = "move";
                            }}
                            onDrop={(e) => {
                              e.preventDefault();

                              if (draggedIndex !== null) {
                                handleDragDrop(draggedIndex, index);
                              }

                              resetDragState();
                            }}
                            onDragEnd={resetDragState}
                            onTouchStart={(e) => handleTouchStart(e, index)}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            onTouchCancel={resetDragState}
                            className={`flex cursor-grab touch-none select-none items-center justify-between rounded-xl border bg-white p-3 transition-all active:cursor-grabbing ${isDragging
                                ? "border-teal-400 opacity-70 shadow-md"
                                : "border-slate-200"
                              } ${isDragOver
                                ? "border-teal-400 ring-2 ring-teal-300"
                                : ""
                              }`}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="shrink-0 text-slate-400">
                                <FiMenu size={18} />
                              </div>

                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                                {index + 1}
                              </div>

                              <span className="min-w-0 truncate text-sm font-medium text-slate-800">
                                {item}
                              </span>
                            </div>

                            <span className="hidden shrink-0 text-xs text-slate-400 sm:block">
                              Drag to reorder
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-default-500">
                      <p>No sections selected.</p>
                      <p className="mt-1 text-xs">
                        Please select at least one section from the left panel.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              {(Object.keys(sectionTitles) as ListSectionKey[]).map((key) => (
                <div key={key} className="lg:col-span-3">
                  <div className="rounded-2xl bg-default-50 p-3 sm:rounded-xl sm:p-4">
                    <div className="mb-3 sm:mb-4">
                      <h3 className="flex items-center gap-2 text-[13px] font-semibold text-default-900 sm:text-sm">
                        <FiPlus className="shrink-0 text-primary" />
                        <span className="min-w-0 leading-tight">
                          {sectionTitles[key]}
                        </span>
                      </h3>

                      <p className="mt-1 text-[11px] leading-4 text-default-500 sm:text-xs">
                        Add or remove available options. At least one option
                        must remain.
                      </p>
                    </div>

                    <div className="mb-3 sm:mb-4">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                        <input
                          type="text"
                          value={newValues[key]}
                          onChange={(e) => updateNewValue(key, e.target.value)}
                          onKeyDown={(e) => handleInputKeyDown(e, key)}
                          placeholder={`Add ${sectionTitles[key].toLowerCase()}`}
                          disabled={isButtonLoading}
                          className="h-10 min-w-0 rounded-xl border border-slate-300 px-3 text-sm outline-none transition focus:border-teal-400 disabled:cursor-not-allowed disabled:bg-slate-100 sm:h-auto sm:px-4 sm:py-2"
                        />

                        <button
                          type="button"
                          onClick={() => addListItem(key)}
                          disabled={isButtonLoading}
                          className="h-10 shrink-0 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50 sm:h-auto sm:px-4 sm:py-2"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {preferences[key].length > 0 ? (
                      <div className="flex flex-wrap gap-2 sm:gap-2.5">
                        {preferences[key].map((item, index) => (
                          <div
                            key={`${item}-${index}`}
                            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-[12px] leading-4 text-slate-800 shadow-[0_1px_0_rgba(15,23,42,0.03)] sm:gap-2 sm:px-3 sm:py-2 sm:text-sm"
                          >
                            <span className="whitespace-nowrap">{item}</span>

                            <button
                              type="button"
                              onClick={() => removeListItem(key, index)}
                              disabled={isButtonLoading}
                              className={`shrink-0 rounded-full p-1 transition hover:bg-red-50 ${preferences[key].length <= 1
                                  ? "cursor-not-allowed opacity-50"
                                  : ""
                                }`}
                              title={
                                preferences[key].length <= 1
                                  ? "Cannot remove the last item"
                                  : "Remove"
                              }
                            >
                              <FiTrash2 size={12} className="text-red-500" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">No items found.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Modal
        isOpen={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        placement="center"
        scrollBehavior="inside"
        size="5xl"
        hideCloseButton
        classNames={{
          wrapper: "items-center justify-center p-2 sm:p-4",
          base: "w-[98vw] max-w-[1680px] h-[92vh] max-h-[92vh] rounded-[28px] overflow-hidden",
          body: "p-0 flex-1 min-h-0",
          header: "p-0 shrink-0",
          closeButton: "hidden",
        }}
      >
        <ModalContent>
          <>
            <ModalHeader className="shrink-0 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
              <div className="flex w-full items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold leading-tight text-slate-900 sm:text-2xl">
                    Prescription Layout Preview
                  </h2>
                </div>

                <div className="ml-auto flex shrink-0 items-center gap-2">
                  <Button
                    className="bg-primary text-white"
                    startContent={<FiSave />}
                    onPress={() => handleSave(true)}
                    isLoading={isButtonLoading}
                    isDisabled={isButtonLoading || !doctorId}
                  >
                    {isButtonLoading ? "Saving..." : "Save Preferences"}
                  </Button>

                  <Button
                    isIconOnly
                    variant="bordered"
                    onPress={() => setIsPreviewOpen(false)}
                    aria-label="Close preview"
                    className="rounded-lg border-slate-200 text-slate-600"
                  >
                    <FiX />
                  </Button>
                </div>
              </div>
            </ModalHeader>

            <ModalBody className="bg-slate-100">
              <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,1.60fr)_minmax(300px,0.68fr)]">
                <div className="min-h-0 border-b border-slate-200 bg-slate-50 lg:border-b-0 lg:border-r">
                  <div className="h-full overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
                    <div className="mx-auto max-w-[1120px]">
                      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
                        <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="mb-4 rounded-full bg-primary/10 px-4 py-3 text-center text-sm font-semibold text-primary">
                            Prescription Sections
                          </div>

                          <div className="space-y-3">
                            {preferences.headerOrder.length > 0 ? (
                              preferences.headerOrder.map((item, index) => (
                                <div
                                  key={item}
                                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3"
                                >
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold text-slate-900">
                                      {item}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                      Position {index + 1}
                                    </div>
                                  </div>

                                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                                    {index + 1}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                                No sections selected yet
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <h3 className="text-[30px] font-semibold leading-tight text-slate-900">
                                Prescription Summary
                              </h3>
                              <p className="mt-1 text-sm text-slate-500">
                                Sample layout idea for the prescription screen
                              </p>
                            </div>

                            <div className="inline-flex w-fit rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                              Preview
                            </div>
                          </div>

                          <div className="rounded-[26px] border border-slate-200 bg-white p-5">
                            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <div className="text-[18px] font-semibold text-slate-900">
                                  Sample Medicine
                                </div>
                                <div className="mt-1 text-sm text-slate-500">
                                  This side is illustrative only
                                </div>
                              </div>

                              <div className="inline-flex w-fit rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                                Preview
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                              <div>
                                <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  Schedule
                                </div>

                                <div className="mb-5 flex flex-wrap gap-2">
                                  <span className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
                                    1 Morn
                                  </span>
                                  <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600">
                                    1 Noon
                                  </span>
                                  <span className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
                                    1 Evng
                                  </span>
                                </div>

                                <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  Timing
                                </div>

                                <div className="mb-5 flex flex-wrap gap-2">
                                  <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600">
                                    Before Food
                                  </span>
                                  <span className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
                                    After Food
                                  </span>
                                  <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600">
                                    Empty stomach
                                  </span>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                                  Morning &amp; Night • 7 days • After Food
                                </div>
                              </div>

                              <div>
                                <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  Frequency &amp; Duration
                                </div>

                                <div className="mb-4 inline-flex rounded-full bg-slate-100 p-1">
                                  <span className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900 shadow-sm">
                                    Daily
                                  </span>
                                  <span className="px-5 py-2 text-sm font-medium text-slate-500">
                                    Weekly
                                  </span>
                                  <span className="px-5 py-2 text-sm font-medium text-slate-500">
                                    Custom
                                  </span>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
                                  Duration / custom medicine summary can be
                                  shown here when real prescription medicine
                                  data is passed from the editor screen.
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                            Note: this left area is only a visual idea. Real
                            medicine summary is available in the prescription
                            editor where selected medicines exist.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="min-h-0 bg-white">
                  <div className="flex h-full min-h-0 flex-col">
                    <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3 sm:px-3 sm:py-4">
                      <div className="mx-auto w-full max-w-[420px]">
                        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-2.5 sm:p-3">
                          <PrescriptionDetails
                            key={previewRefreshKey}
                            value={emptyPrescriptionDetails}
                            variant="withoutComplaints"
                            layout="panel"
                            doctorId={doctorId}
                            addedTests={[]}
                            onChange={() => { }}
                            disabled={false}
                            previewPreferences={{
                              headerOrder: preferences.headerOrder,
                              habitList: preferences.habitList,
                              allergyList: preferences.allergyList,
                              diagnosisList: preferences.diagnosisList,
                              surgerySuggestedList:
                                preferences.surgerySuggestedList,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ModalBody>
          </>
        </ModalContent>
      </Modal>
    </>
  );
};

export default PrescriptionPreference;
