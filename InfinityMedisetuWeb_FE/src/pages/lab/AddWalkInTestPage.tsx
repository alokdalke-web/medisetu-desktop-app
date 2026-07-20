import { addToast, Button, Input, Select, SelectItem, Spinner } from "@heroui/react";
import { useMemo, useState } from "react";
import {
  FiCheck,
  FiClipboard,
  FiCreditCard,
  FiSearch,
  FiUserPlus,
  FiX,
} from "react-icons/fi";
import { useNavigate } from "react-router";

import {
  useGetLabTestsQuery,
  type LabTestDto,
} from "../../redux/api/labApi";
import {
  getLabApiErrorMessage,
  useCreateIndependentAppointmentTestsMutation,
  type CreateIndependentAppointmentTestsPayload,
} from "../../redux/api/labAssistantApi";

type WalkInGender = "Male" | "Female" | "Other";

type WalkInFormErrors = Partial<{
  patientName: string;
  patientMobile: string;
  patientAge: string;
  patientGender: string;
  doctorName: string;
  testIds: string;
}>;

type CatalogTestOption = {
  id: string;
  name: string;
  code: string;
  category: string;
  sampleType: string;
  price: number | null;
  searchText: string;
};

const LAB_CATALOG_PICKER_LIMIT = 1000;
const NAME_MAX_LENGTH = 20;
const genderOptions: WalkInGender[] = ["Male", "Female", "Other"];

const inputClassNames = {
  label: "font-semibold text-slate-500",
  input: "text-sm placeholder:text-slate-400/80 placeholder:font-normal",
  inputWrapper:
    "h-14 border-slate-200 bg-slate-50/40 px-4 shadow-none transition-colors hover:border-primary/40 hover:bg-white group-data-[focus=true]:border-primary/50 group-data-[focus=true]:bg-white group-data-[focus=true]:ring-4 group-data-[focus=true]:ring-primary/10",
  errorMessage: "text-[11px] font-semibold",
};

const selectTriggerClass =
  "h-14 border-slate-200 bg-slate-50/40 px-4 shadow-none transition-colors hover:border-primary/40 hover:bg-white data-[focus=true]:border-primary/50 data-[open=true]:border-primary/50 data-[open=true]:bg-white data-[open=true]:ring-4 data-[open=true]:ring-primary/10";

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

function normalizeNameInput(value: string) {
  return value
    .replace(/[^A-Za-z\s]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^\s+/, "")
    .slice(0, NAME_MAX_LENGTH);
}

function isValidName(value: string) {
  const trimmed = value.trim();
  return /^[A-Za-z]+(?: [A-Za-z]+)*$/.test(trimmed);
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
  return name ? `Dr ${name}` : "";
}

function formatCurrency(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "Rs 0";
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
      const category = String(test.departmentName ?? test.category ?? "").trim();
      const sampleType = String(test.sampleType ?? "").trim();
      const price = Number(test.price);
      const code = String(test.testCode ?? "").trim();

      return {
        id,
        name,
        code,
        category,
        sampleType,
        price: Number.isFinite(price) ? price : null,
        searchText: [name, code, category, sampleType].join(" ").toLowerCase(),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function getSampleTypeColor(type?: string | null) {
  const t = String(type ?? "").toLowerCase();
  if (t.includes("blood") || t.includes("serum")) {
    return "bg-rose-50 text-rose-700 border-rose-100/50";
  }
  if (t.includes("urine")) {
    return "bg-amber-50 text-amber-700 border-amber-100/50";
  }
  if (t.includes("stool")) {
    return "bg-orange-50 text-orange-700 border-orange-100/50";
  }
  if (t.includes("sputum") || t.includes("saliva")) {
    return "bg-sky-50 text-sky-700 border-sky-100/50";
  }
  return "bg-emerald-50/70 text-emerald-800 border-emerald-100";
}

const AddWalkInTestPage = () => {
  const navigate = useNavigate();
  const [patientName, setPatientName] = useState("");
  const [patientMobile, setPatientMobile] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientGender, setPatientGender] = useState<WalkInGender | "">("");
  const [doctorName, setDoctorName] = useState("");
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [testSearch, setTestSearch] = useState("");
  const [errors, setErrors] = useState<WalkInFormErrors>({});

  const labCatalogQueryArgs = useMemo(
    () => ({
      page: 1,
      limit: LAB_CATALOG_PICKER_LIMIT,
      status: "active",
      sortBy: "name" as const,
      sortOrder: "asc" as const,
    }),
    [],
  );

  const {
    data: labCatalogResponse,
    isLoading: isCatalogLoading,
    isError: isCatalogError,
    refetch: refetchCatalog,
  } = useGetLabTestsQuery(labCatalogQueryArgs);

  const [createIndependentTests, { isLoading: isSaving }] =
    useCreateIndependentAppointmentTestsMutation();

  const catalogOptions = useMemo(
    () => buildCatalogOptions(labCatalogResponse?.data ?? []),
    [labCatalogResponse?.data],
  );
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
  const visibleTestIds = useMemo(
    () => filteredTests.map((test) => test.id),
    [filteredTests],
  );
  const areAllVisibleTestsSelected =
    visibleTestIds.length > 0 &&
    visibleTestIds.every((testId) => selectedTestSet.has(testId));
  const totalAmount = selectedTests.reduce(
    (sum, test) => sum + (test.price ?? 0),
    0,
  );

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

  const selectVisibleTests = () => {
    clearError("testIds");
    setSelectedTestIds((current) => {
      const next = new Set(current);
      visibleTestIds.forEach((testId) => next.add(testId));
      return Array.from(next);
    });
  };

  const clearSelectedTests = () => {
    setSelectedTestIds([]);
  };

  const validate = () => {
    const nextErrors: WalkInFormErrors = {};
    const normalizedMobile = normalizeMobile(patientMobile);
    const age = Number(patientAge);

    const normalizedPatientName = patientName.trim();
    const normalizedDoctorName = getDoctorNameWithoutPrefix(doctorName);

    if (!normalizedPatientName) {
      nextErrors.patientName = "Patient name is required.";
    } else if (
      normalizedPatientName.length > NAME_MAX_LENGTH ||
      !isValidName(normalizedPatientName)
    ) {
      nextErrors.patientName = `Use letters only, max ${NAME_MAX_LENGTH} characters.`;
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

    if (!normalizedDoctorName) {
      nextErrors.doctorName = "Referring doctor name is required.";
    } else if (
      normalizedDoctorName.length > NAME_MAX_LENGTH ||
      !isValidName(normalizedDoctorName)
    ) {
      nextErrors.doctorName = `Use letters only, max ${NAME_MAX_LENGTH} characters.`;
    }

    if (selectedTestIds.length === 0) {
      nextErrors.testIds = "Select at least one test.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildPayload = (): CreateIndependentAppointmentTestsPayload => ({
    testIds: selectedTestIds,
    patientName: normalizeNameInput(patientName).trim(),
    patientMobile: normalizeMobile(patientMobile),
    patientAge: Number(patientAge),
    patientGender,
    doctorName: normalizeDoctorName(normalizeNameInput(doctorName)),
  });

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      const payload = buildPayload();
      const response = await createIndependentTests(payload).unwrap();
      const createdCount = Number(response.count ?? payload.testIds.length);

      addToast({
        title: "Walk-in tests created",
        description: `${createdCount} lab ${
          createdCount === 1 ? "test is" : "tests are"
        } ready in the queue.`,
        color: "success",
      });

      navigate("/lab/all-tests");
    } catch (err) {
      addToast({
        title: "Unable to create walk-in tests",
        description: getLabApiErrorMessage(
          err,
          "Could not create lab tests for this walk-in patient.",
        ),
        color: "danger",
      });
    }
  };

  const summaryPatientDetails = [
    { label: "Patient", value: patientName.trim() || "Not added" },
    { label: "Mobile", value: patientMobile || "Not added" },
    {
      label: "Age / Gender",
      value:
        patientAge || patientGender
          ? `${patientAge || "-"} / ${patientGender || "-"}`
          : "Not added",
    },
    {
      label: "Doctor",
      value: normalizeDoctorName(doctorName) || "Not added",
    },
  ];

  return (
    <div id="tour-lab-walkin-page" className="mx-auto w-full">
 

      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-emerald-50 text-xl text-emerald-700 ring-1 ring-emerald-100">
            <FiUserPlus />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold leading-7 text-slate-950">
              Add Walk-in Test
            </h1>
        
          </div>
        </div>

        
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="space-y-5">
          <section id="tour-lab-walkin-patient" className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-2">
                <FiUserPlus className="text-emerald-700" />
                <h2 className="text-base font-black text-slate-950">
                  Patient Details
                </h2>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6">
              <Input
                label="Patient Name"
                placeholder="name"
                value={patientName}
                onValueChange={(value) => {
                  setPatientName(normalizeNameInput(value));
                  clearError("patientName");
                }}
                radius="full"
                variant="bordered"
                isDisabled={isSaving}
                isInvalid={Boolean(errors.patientName)}
                errorMessage={errors.patientName}
                classNames={inputClassNames}
              />

              <Input
                label="Mobile Number"
                placeholder="mobile no."
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
                classNames={inputClassNames}
              />

              <Input
                label="Age"
                placeholder="age"
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
                classNames={inputClassNames}
              />

              <Select
                label="Gender"
                placeholder="Select gender"
                radius="full"
                variant="bordered"
                isDisabled={isSaving}
                selectedKeys={patientGender ? new Set([patientGender]) : new Set([])}
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
                  label: "font-semibold text-slate-500",
                  value: patientGender
                    ? "text-sm font-semibold text-slate-950"
                    : "text-sm font-normal text-slate-400",
                  trigger: selectTriggerClass,
                  errorMessage: "text-[11px] font-semibold",
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
                  placeholder="Dr name"
                  value={doctorName}
                  onValueChange={(value) => {
                    setDoctorName(normalizeNameInput(value));
                    clearError("doctorName");
                  }}
                  radius="full"
                  variant="bordered"
                  isDisabled={isSaving}
                  isInvalid={Boolean(errors.doctorName)}
                  errorMessage={errors.doctorName}
                  classNames={inputClassNames}
                />
              </div>
            </div>
          </section>

          <section id="tour-lab-walkin-tests" className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <FiClipboard className="text-emerald-700" />
                    <h2 className="text-base font-black text-slate-950">
                      Test Selection
                    </h2>
                  </div>
                  <p className="mt-1 text-[11px] font-semibold text-slate-500">
                    Choose the tests to keep for this walk-in request.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative w-full sm:w-[280px]">
                    <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[17px] text-slate-400" />
                    <input
                      type="text"
                      value={testSearch}
                      onChange={(event) => setTestSearch(event.target.value)}
                      placeholder="Search tests"
                      disabled={isSaving}
                      className="h-10 w-full rounded-full border border-slate-200 bg-white pl-10 pr-10 text-sm font-medium text-slate-900 outline-none transition hover:border-emerald-200 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
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

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectVisibleTests}
                      disabled={isSaving || areAllVisibleTestsSelected || !visibleTestIds.length}
                      className="rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={clearSelectedTests}
                      disabled={isSaving || !selectedTestIds.length}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
              {errors.testIds && (
                <p className="mt-2 text-[11px] font-semibold text-danger">
                  {errors.testIds}
                </p>
              )}
            </header>

            <div className="min-h-[360px]">
              {isCatalogLoading ? (
                <div className="flex min-h-[360px] items-center justify-center gap-2 text-sm font-semibold text-slate-500">
                  <Spinner size="sm" />
                  <span>Loading tests...</span>
                </div>
              ) : isCatalogError ? (
                <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 px-4 text-center">
                  <span className="text-sm font-semibold text-slate-500">
                    Failed to load tests.
                  </span>
                  <Button
                    size="sm"
                    variant="bordered"
                    radius="full"
                    onPress={() => refetchCatalog()}
                    className="border-slate-200 bg-white px-4 text-xs font-bold text-slate-700"
                  >
                    Retry
                  </Button>
                </div>
              ) : filteredTests.length === 0 ? (
                <div className="flex min-h-[360px] items-center justify-center px-4 text-center text-sm font-semibold text-slate-500">
                  No tests found.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 bg-slate-50/40 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                  {filteredTests.map((test) => {
                    const isSelected = selectedTestSet.has(test.id);
                    // const meta = [test.code, test.category].filter(Boolean);

                    return (
                      <button
                        key={test.id}
                        type="button"
                        onClick={() => toggleTest(test.id)}
                        disabled={isSaving}
                        className={`flex min-h-[76px] w-full flex-col justify-between rounded-lg border p-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60 ${
                          isSelected
                            ? "border-emerald-300 bg-emerald-50/70 shadow-xs"
                            : "border-slate-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/20"
                        }`}
                      >
                        <span className="flex min-w-0 items-start gap-2 w-full">
                          <span
                            className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border text-[9px] ${
                              isSelected
                                ? "border-emerald-700 bg-emerald-700 text-white"
                                : "border-slate-300 bg-white text-transparent"
                            }`}
                          >
                            <FiCheck />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-2 text-[11px] font-bold leading-snug text-slate-800">
                              {test.name}
                            </span>
                          </span>
                        </span>

                        <span className="mt-1.5 flex items-center justify-between gap-2 w-full">
                          <span className="shrink-0 text-[11px] font-black text-slate-900">
                            {formatCurrency(test.price)}
                          </span>
                          {test.sampleType && (
                            <span className={`shrink-0 flex items-center rounded-md text-[9px] px-1.5 py-0.5 font-bold border ${getSampleTypeColor(test.sampleType)}`}>
                              {test.sampleType}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </main>

        <aside id="tour-lab-walkin-summary" className="xl:sticky xl:top-5 xl:self-start">
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <FiCreditCard className="text-emerald-700" />
                <h2 className="text-base font-black text-slate-950">
                  Request Summary
                </h2>
              </div>
            </header>

            <div className="space-y-4 px-5 py-5">
              <div className="space-y-3">
                {summaryPatientDetails.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0"
                  >
                    <span className="text-xs font-bold uppercase text-slate-400">
                      {item.label}
                    </span>
                    <span className="max-w-[190px] text-right text-sm font-bold text-slate-800">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50/70 p-4">
                <span className="text-sm font-black text-slate-950">
                  Selected Tests
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-emerald-700 ring-1 ring-emerald-100">
                  {selectedTests.length}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50/70 p-4">
                <span className="text-sm font-bold">Total</span>
                <span className="text-sm font-black">
                  {formatCurrency(totalAmount)}
                </span>
              </div>

              <Button
                radius="full"
                fullWidth
                onPress={handleSubmit}
                isLoading={isSaving}
                startContent={!isSaving && <FiCheck className="text-sm" />}
                className="h-11 bg-primary text-sm font-bold text-white shadow-[0_12px_24px_rgba(4,120,87,0.22)] hover:bg-emerald-800"
              >
                Create Lab Tests
              </Button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default AddWalkInTestPage;
