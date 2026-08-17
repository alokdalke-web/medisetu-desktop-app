import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Spinner,
} from "@heroui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FiCheck, FiSearch, FiUserPlus, FiX } from "react-icons/fi";

import type { LabTestDto } from "../../../redux/api/labApi";
import type { CreateIndependentAppointmentTestsPayload } from "../../../redux/api/labAssistantApi";

type WalkInGender = "Male" | "Female" | "Other";

type WalkInFormErrors = Partial<{
  patientName: string;
  patientMobile: string;
  patientAge: string;
  patientGender: string;
  doctorName: string;
  testIds: string;
}>;

type AddWalkInTestModalProps = {
  isOpen: boolean;
  tests: LabTestDto[];
  isCatalogLoading: boolean;
  isCatalogError: boolean;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onRetryCatalog: () => void;
  onSubmit: (
    payload: CreateIndependentAppointmentTestsPayload,
  ) => Promise<void>;
};

type CatalogTestOption = {
  id: string;
  name: string;
  category: string;
  sampleType: string;
  price: number | null;
  searchText: string;
};

const fieldLabelClass = "pb-1 text-xs font-bold text-slate-600";
const fieldInputClass =
  "h-12 border-slate-200 bg-white px-4 shadow-none transition-colors hover:border-slate-300 group-data-[focus=true]:border-primary/50 group-data-[focus=true]:ring-4 group-data-[focus=true]:ring-primary/10";
const fieldTextClass =
  "text-sm font-medium text-slate-900 placeholder:text-slate-400";
const selectTriggerClass =
  "h-12 border-slate-200 bg-white px-4 shadow-none transition-colors hover:border-slate-300 data-[focus=true]:border-primary/50 data-[open=true]:border-primary/50 data-[open=true]:ring-4 data-[open=true]:ring-primary/10";

const genderOptions: WalkInGender[] = ["Male", "Female", "Other"];

function getTestId(test: LabTestDto) {
  return String(test.id ?? test._id ?? "").trim();
}

function getTestName(test: LabTestDto) {
  return String(test.name ?? test.testName ?? "Untitled test").trim();
}

function normalizeMobile(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

function normalizeAge(value: string) {
  const digits = value.replace(/\D/g, "");
  const normalizedDigits = digits.replace(/^0+/, "");
  const sliced = normalizedDigits.slice(0, 3);
  if (!sliced) return "";

  const age = Number(sliced);
  if (!Number.isFinite(age)) return "";
  if (age > 100) return "100";

  return sliced;
}

function getDoctorNameWithoutPrefix(value: string) {
  const trimmed = value.trim();
  if (/^(dr\.?|doctor)$/i.test(trimmed)) return "";

  return trimmed
    .replace(/^(?:dr\.?\s+|dr\.(?=\S)|doctor\s+)/i, "")
    .trim();
}

function normalizeDoctorName(value: string) {
  const name = getDoctorNameWithoutPrefix(value);
  return name ? `Dr. ${name}` : "";
}

function formatTestPrice(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "";
  return `Rs ${value.toLocaleString("en-IN")}`;
}

function buildCatalogOptions(tests: LabTestDto[]): CatalogTestOption[] {
  return tests
    .filter((test) => {
      const id = getTestId(test);
      const status = String(test.status ?? "active").toLowerCase();
      return Boolean(id) && status !== "deactive";
    })
    .map((test) => {
      const id = getTestId(test);
      const name = getTestName(test);
      const category = String(test.departmentName ?? test.category ?? "")
        .trim();
      const sampleType = String(test.sampleType ?? "").trim();
      const price = Number(test.price);
      const code = String(test.testCode ?? "").trim();

      return {
        id,
        name,
        category,
        sampleType,
        price: Number.isFinite(price) ? price : null,
        searchText: [name, code, category, sampleType]
          .join(" ")
          .toLowerCase(),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function AddWalkInTestModal({
  isOpen,
  tests,
  isCatalogLoading,
  isCatalogError,
  isSaving,
  onOpenChange,
  onRetryCatalog,
  onSubmit,
}: AddWalkInTestModalProps) {
  const [patientName, setPatientName] = useState("");
  const [patientMobile, setPatientMobile] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientGender, setPatientGender] = useState<WalkInGender | "">("");
  const [doctorName, setDoctorName] = useState("");
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [testSearch, setTestSearch] = useState("");
  const [errors, setErrors] = useState<WalkInFormErrors>({});

  const catalogOptions = useMemo(() => buildCatalogOptions(tests), [tests]);
  const selectedTestSet = useMemo(
    () => new Set(selectedTestIds),
    [selectedTestIds],
  );
  const selectedTests = useMemo(
    () =>
      selectedTestIds
        .map((id) => catalogOptions.find((test) => test.id === id))
        .filter((test): test is CatalogTestOption => Boolean(test)),
    [catalogOptions, selectedTestIds],
  );
  const filteredTests = useMemo(() => {
    const query = testSearch.trim().toLowerCase();
    if (!query) return catalogOptions;
    return catalogOptions.filter((test) => test.searchText.includes(query));
  }, [catalogOptions, testSearch]);

  const resetForm = useCallback(() => {
    setPatientName("");
    setPatientMobile("");
    setPatientAge("");
    setPatientGender("");
    setDoctorName("");
    setSelectedTestIds([]);
    setTestSearch("");
    setErrors({});
  }, []);

  useEffect(() => {
    if (!isOpen) resetForm();
  }, [isOpen, resetForm]);

  const clearError = (key: keyof WalkInFormErrors) => {
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const toggleTest = (testId: string) => {
    clearError("testIds");
    setSelectedTestIds((current) =>
      current.includes(testId)
        ? current.filter((id) => id !== testId)
        : [...current, testId],
    );
  };

  const validate = () => {
    const nextErrors: WalkInFormErrors = {};
    const normalizedMobile = normalizeMobile(patientMobile);
    const age = Number(patientAge);

    if (!patientName.trim()) {
      nextErrors.patientName = "Patient name is required.";
    }

    if (!normalizedMobile) {
      nextErrors.patientMobile = "Mobile number is required.";
    } else if (!/^\d{10}$/.test(normalizedMobile)) {
      nextErrors.patientMobile = "Enter a valid 10-digit mobile number.";
    }

    if (!patientAge.trim()) {
      nextErrors.patientAge = "Age is required.";
    } else if (!Number.isInteger(age) || age <= 0 || age > 100) {
      nextErrors.patientAge = "Enter age between 1 and 100.";
    }

    if (!patientGender) {
      nextErrors.patientGender = "Gender is required.";
    }

    if (!getDoctorNameWithoutPrefix(doctorName)) {
      nextErrors.doctorName = "Referring doctor name is required.";
    }

    if (selectedTestIds.length === 0) {
      nextErrors.testIds = "Select at least one test.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    await onSubmit({
      testIds: selectedTestIds,
      patientName: patientName.trim(),
      patientMobile: normalizeMobile(patientMobile),
      patientAge: Number(patientAge),
      patientGender,
      doctorName: normalizeDoctorName(doctorName),
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (isSaving) return;
    onOpenChange(open);
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      placement="center"
      backdrop="opaque"
      size="3xl"
      scrollBehavior="inside"
      classNames={{
        backdrop: "bg-slate-950/45 backdrop-blur-[2px]",
        base: "w-[calc(100%-2rem)] max-w-[820px] overflow-hidden rounded-lg border border-white/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.26)]",
        closeButton:
          "right-5 top-5 h-8 w-8 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-4 focus-visible:ring-slate-200",
      }}
    >
      <ModalContent>
        <ModalHeader className="px-6 pb-4 pt-6 sm:px-7">
          <div className="flex min-w-0 items-center gap-3 pr-8">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-lg text-primary ring-1 ring-primary/15">
              <FiUserPlus />
            </div>
            <div className="min-w-0">
              <span className="block text-[20px] font-black leading-6 text-slate-950">
                Add Walk-in Patient Tests
              </span>
            </div>
          </div>
        </ModalHeader>

        <ModalBody className="flex flex-col gap-5 px-6 py-3 sm:px-7">
          <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            <Input
              label="Patient Name"
              labelPlacement="outside"
              placeholder="John Doe"
              value={patientName}
              onValueChange={(value) => {
                setPatientName(value);
                clearError("patientName");
              }}
              radius="full"
              variant="bordered"
              isDisabled={isSaving}
              isInvalid={Boolean(errors.patientName)}
              errorMessage={errors.patientName}
              classNames={{
                label: fieldLabelClass,
                input: fieldTextClass,
                inputWrapper: fieldInputClass,
                errorMessage: "text-[11px] font-medium",
              }}
            />

            <Input
              label="Mobile Number"
              labelPlacement="outside"
              placeholder="eg. 972735647"
              value={patientMobile}
              onValueChange={(value) => {
                setPatientMobile(normalizeMobile(value));
                clearError("patientMobile");
              }}
              radius="full"
              variant="bordered"
              inputMode="tel"
              isDisabled={isSaving}
              isInvalid={Boolean(errors.patientMobile)}
              errorMessage={errors.patientMobile}
              classNames={{
                label: fieldLabelClass,
                input: fieldTextClass,
                inputWrapper: fieldInputClass,
                errorMessage: "text-[11px] font-medium",
              }}
            />

            <Input
              label="Age"
              labelPlacement="outside"
              placeholder="eg. 35"
              value={patientAge}
              onValueChange={(value) => {
                setPatientAge(normalizeAge(value));
                clearError("patientAge");
              }}
              radius="full"
              variant="bordered"
              inputMode="numeric"
              isDisabled={isSaving}
              isInvalid={Boolean(errors.patientAge)}
              errorMessage={errors.patientAge}
              classNames={{
                label: fieldLabelClass,
                input: fieldTextClass,
                inputWrapper: fieldInputClass,
                errorMessage: "text-[11px] font-medium",
              }}
            />

            <Select
              label="Gender"
              labelPlacement="outside"
              placeholder="Select gender"
              radius="full"
              variant="bordered"
              isDisabled={isSaving}
              selectedKeys={
                patientGender ? new Set([patientGender]) : new Set([])
              }
              isInvalid={Boolean(errors.patientGender)}
              errorMessage={errors.patientGender}
              onSelectionChange={(keys) => {
                if (keys === "all") return;
                const value =
                  (Array.from(keys)[0] as WalkInGender | undefined) ?? "";
                setPatientGender(value);
                clearError("patientGender");
              }}
              classNames={{
                label: fieldLabelClass,
                value: `text-sm ${
                  patientGender
                    ? "font-semibold text-slate-950"
                    : "font-normal text-slate-400"
                }`,
                trigger: selectTriggerClass,
                errorMessage: "text-[11px] font-medium",
              }}
              popoverProps={{
                classNames: {
                  content: "p-1.5 border border-slate-200 bg-white rounded-xl shadow-xl shadow-slate-200/70",
                },
              }}
              listboxProps={{
                itemClasses: {
                  base: [
                    "flex min-h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition data-[hover=true]:bg-slate-50 data-[hover=true]:text-slate-900",
                    "text-slate-700",
                    "data-[selected=true]:bg-teal-50 data-[selected=true]:text-teal-700 data-[selected=true]:font-semibold",
                  ].join(" "),
                  title: "font-semibold text-[13px]",
                  selectedIcon: "text-teal-700 h-4 w-4 shrink-0",
                },
              }}
            >
              {genderOptions.map((gender) => (
                <SelectItem key={gender} textValue={gender}>
                  {gender}
                </SelectItem>
              ))}
            </Select>

            <div className="sm:col-span-2">
              <Input
                label="Referring Doctor Name"
                labelPlacement="outside"
                placeholder="Dr. Smith"
                value={doctorName}
                onValueChange={(value) => {
                  setDoctorName(normalizeDoctorName(value));
                  clearError("doctorName");
                }}
                radius="full"
                variant="bordered"
                isDisabled={isSaving}
                isInvalid={Boolean(errors.doctorName)}
                errorMessage={errors.doctorName}
                classNames={{
                  label: fieldLabelClass,
                  input: fieldTextClass,
                  inputWrapper: fieldInputClass,
                  errorMessage: "text-[11px] font-medium",
                }}
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0 flex-1">
                <label className={fieldLabelClass}>Tests</label>
                <div className="relative mt-1">
                  <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[17px] text-slate-400" />
                  <input
                    type="text"
                    value={testSearch}
                    onChange={(event) => setTestSearch(event.target.value)}
                    placeholder="Search tests"
                    disabled={isSaving}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-10 text-sm font-medium text-slate-900 outline-none transition hover:border-slate-300 placeholder:text-slate-400 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  {testSearch && (
                    <button
                      type="button"
                      aria-label="Clear test search"
                      onClick={() => setTestSearch("")}
                      disabled={isSaving}
                      className="absolute right-3 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    >
                      <FiX className="text-sm" />
                    </button>
                  )}
                </div>
              </div>

              <span className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">
                {selectedTestIds.length} selected
              </span>
            </div>

            {errors.testIds && (
              <p className="mt-2 text-[11px] font-medium text-danger">
                {errors.testIds}
              </p>
            )}

            {selectedTests.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedTests.map((test) => (
                  <button
                    key={test.id}
                    type="button"
                    onClick={() => toggleTest(test.id)}
                    disabled={isSaving}
                    className="inline-flex min-h-8 max-w-full items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary transition hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="truncate">{test.name}</span>
                    <FiX className="shrink-0 text-sm" />
                  </button>
                ))}
              </div>
            )}

            <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white">
              {isCatalogLoading ? (
                <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm font-semibold text-slate-500">
                  <Spinner size="sm" />
                  <span>Loading tests...</span>
                </div>
              ) : isCatalogError ? (
                <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
                  <span className="text-sm font-semibold text-slate-500">
                    Failed to load tests.
                  </span>
                  <Button
                    size="sm"
                    variant="bordered"
                    radius="full"
                    onPress={() => onRetryCatalog()}
                    className="border-slate-200 bg-white px-4 text-xs font-bold text-slate-700"
                  >
                    Retry
                  </Button>
                </div>
              ) : filteredTests.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm font-semibold text-slate-500">
                  No tests found.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredTests.map((test) => {
                    const isSelected = selectedTestSet.has(test.id);
                    const meta = [
                      test.category,
                      test.sampleType,
                      formatTestPrice(test.price),
                    ].filter(Boolean);

                    return (
                      <button
                        key={test.id}
                        type="button"
                        onClick={() => toggleTest(test.id)}
                        disabled={isSaving}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span
                          className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border text-[12px] ${
                            isSelected
                              ? "border-primary bg-primary text-white"
                              : "border-slate-300 bg-white text-transparent"
                          }`}
                        >
                          <FiCheck />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-slate-900">
                            {test.name}
                          </span>
                          {meta.length > 0 && (
                            <span className="mt-0.5 block truncate text-xs font-medium text-slate-500">
                              {meta.join(" | ")}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ModalBody>

        <ModalFooter className="justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4 sm:px-7">
          <Button
            variant="bordered"
            radius="full"
            onPress={() => handleOpenChange(false)}
            isDisabled={isSaving}
            startContent={<FiX className="text-sm" />}
            className="h-10 min-w-[108px] border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50"
          >
            Cancel
          </Button>
          <Button
            color="primary"
            radius="full"
            onPress={handleSubmit}
            isLoading={isSaving}
            startContent={!isSaving && <FiCheck className="text-sm" />}
            className="h-10 min-w-[148px] bg-primary px-6 text-sm font-bold text-white shadow-[0_12px_24px_rgba(10,108,116,0.22)] hover:bg-primary/90"
          >
            Create Lab Tests
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
