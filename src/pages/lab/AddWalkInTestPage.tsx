import {
  addToast,
  Button,
  Input,
  Select,
  SelectItem,
  Spinner,
} from "@heroui/react";
import { useMemo, useState } from "react";
import {
  FiArrowDown,
  FiCheck,
  FiClipboard,
  FiSearch,
  FiUserPlus,
  FiX,
} from "react-icons/fi";
import { useNavigate } from "react-router";

import { useGetLabTestsQuery, type LabTestDto } from "../../redux/api/labApi";
import {
  getLabApiErrorMessage,
  useCreateIndependentAppointmentTestsMutation,
  type CreateIndependentAppointmentTestsPayload,
} from "../../redux/api/labAssistantApi";
import { LabScreenInfoTooltip } from "./components/LabScreenInfoTooltip";

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
  status: string;
  source: string;
  searchText: string;
};

const LAB_CATALOG_PICKER_LIMIT = 1000;
const NAME_MAX_LENGTH = 20;
const genderOptions: WalkInGender[] = ["Male", "Female", "Other"];

const inputClassNames = {
  label: "pb-1 text-xs font-semibold text-slate-700",
  input: "text-sm placeholder:text-slate-400/80 placeholder:font-normal",
  inputWrapper:
    "h-12 border-slate-200 bg-slate-50/40 px-4 shadow-none transition-colors hover:border-primary/40 hover:bg-white group-data-[focus=true]:border-primary/50 group-data-[focus=true]:bg-white group-data-[focus=true]:ring-4 group-data-[focus=true]:ring-primary/10",
  errorMessage: "text-[11px] font-medium",
};

const selectTriggerClass =
  "h-12 border-slate-200 bg-slate-50/40 px-4 shadow-none transition-colors hover:border-primary/40 hover:bg-white data-[focus=true]:border-primary/50 data-[open=true]:border-primary/50 data-[open=true]:bg-white data-[open=true]:ring-4 data-[open=true]:ring-primary/10";

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

  return trimmed.replace(/^(?:dr\.?\s+|dr\.(?=\S)|doctor\s+)/i, "").trim();
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
      const category = String(
        test.departmentName ?? test.category ?? "",
      ).trim();
      const sampleType = String(test.sampleType ?? "").trim();
      const price = Number(test.price);
      const code = String(
        test.testCode ??
          test.masterTest?.testCode ??
          test.masterTest?.code ??
          "",
      ).trim();
      const status = String(test.status ?? "active").trim();
      const source = String(test.source ?? "master").trim();

      return {
        id,
        name,
        code,
        category,
        sampleType,
        price: Number.isFinite(price) ? price : null,
        status,
        source,
        searchText: [name, code, category, sampleType].join(" ").toLowerCase(),
      };
    });
}

function formatTableLabel(value?: string | null, fallback = "-") {
  const text = String(value ?? "").trim();
  if (!text) return fallback;

  return text
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusBadgeClass(status: string) {
  const normalizedStatus = status.toLowerCase();
  if (normalizedStatus === "active") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }
  if (normalizedStatus === "deactive" || normalizedStatus === "inactive") {
    return "bg-rose-50 text-rose-700 ring-rose-100";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function getSourceBadgeClass(source: string) {
  return source.toLowerCase() === "custom"
    ? "bg-indigo-50 text-indigo-700 ring-indigo-100"
    : "bg-slate-100 text-slate-600 ring-slate-200";
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
  const selectedVisibleTestCount = visibleTestIds.filter((testId) =>
    selectedTestSet.has(testId),
  ).length;
  const areAllVisibleTestsSelected =
    visibleTestIds.length > 0 &&
    selectedVisibleTestCount === visibleTestIds.length;
  const areSomeVisibleTestsSelected =
    selectedVisibleTestCount > 0 && !areAllVisibleTestsSelected;
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

  const toggleVisibleTests = () => {
    clearError("testIds");
    setSelectedTestIds((current) => {
      const next = new Set(current);
      if (areAllVisibleTestsSelected) {
        visibleTestIds.forEach((testId) => next.delete(testId));
      } else {
        visibleTestIds.forEach((testId) => next.add(testId));
      }
      return Array.from(next);
    });
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

  return (
    <div id="tour-lab-walkin-page" className="mx-auto w-full">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0">
            <h1 className="text-[24px] font-semibold leading-tight tracking-tight text-slate-950 dark:text-white md:text-[26px]">
              Add Walk-in Test
            </h1>
          </div>
          <LabScreenInfoTooltip
            title="Add Walk-in Test"
            description="Use this screen when a patient comes directly to the lab without a doctor-assigned request. Enter patient and referring doctor details, select one or more catalog tests, then create the lab orders."
            items={[
              "Only active catalog tests can be selected for the walk-in order.",
              "Created walk-in tests move into the lab queue for payment, sample tracking, result entry, and report upload.",
            ]}
            placement="right"
            guideSection="lab"
            linkLabel="Read full lab guide"
          />
        </div>
      </div>

      <main className="space-y-5">
        <section
          id="tour-lab-walkin-patient"
          className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
        >
          <header className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2">
              <FiUserPlus className="text-emerald-700" />
              <h2 className="text-base font-semibold text-slate-950">
                Patient Details
              </h2>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6">
            <Input
              label="Patient Name"
              labelPlacement="outside"
              placeholder="name"
              value={patientName}
              onValueChange={(value) => {
                setPatientName(normalizeNameInput(value));
                clearError("patientName");
              }}
              radius="lg"
              variant="bordered"
              isDisabled={isSaving}
              isInvalid={Boolean(errors.patientName)}
              errorMessage={errors.patientName}
              classNames={inputClassNames}
            />

            <Input
              label="Mobile Number"
              labelPlacement="outside"
              placeholder="mobile no."
              value={patientMobile}
              onValueChange={(value) => {
                setPatientMobile(normalizeMobile(value));
                clearError("patientMobile");
              }}
              radius="lg"
              variant="bordered"
              inputMode="tel"
              isDisabled={isSaving}
              isInvalid={Boolean(errors.patientMobile)}
              errorMessage={errors.patientMobile}
              classNames={inputClassNames}
            />

            <Input
              label="Age"
              labelPlacement="outside"
              placeholder="age"
              value={patientAge}
              onValueChange={(value) => {
                setPatientAge(normalizeAge(value));
                clearError("patientAge");
              }}
              radius="lg"
              variant="bordered"
              inputMode="numeric"
              isDisabled={isSaving}
              isInvalid={Boolean(errors.patientAge)}
              errorMessage={errors.patientAge}
              classNames={inputClassNames}
            />

            <Select
              label="Gender"
              labelPlacement="outside"
              placeholder="Select gender"
              radius="lg"
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
                label: inputClassNames.label,
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
                labelPlacement="outside"
                placeholder="Dr name"
                value={doctorName}
                onValueChange={(value) => {
                  setDoctorName(normalizeNameInput(value));
                  clearError("doctorName");
                }}
                radius="lg"
                variant="bordered"
                isDisabled={isSaving}
                isInvalid={Boolean(errors.doctorName)}
                errorMessage={errors.doctorName}
                classNames={inputClassNames}
              />
            </div>
          </div>
        </section>

        <section
          id="tour-lab-walkin-tests"
          className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
        >
          <header className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FiClipboard className="text-emerald-700" />
                  <h2 className="text-base font-semibold text-slate-950">
                    Test Selection
                  </h2>
                </div>
                <p className="mt-1 text-[11px] font-medium text-slate-500">
                  Choose the tests to keep for this walk-in request.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative w-full sm:w-[300px]">
                  <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[17px] text-slate-400" />
                  <input
                    type="text"
                    value={testSearch}
                    onChange={(event) => setTestSearch(event.target.value)}
                    placeholder="Search tests"
                    disabled={isSaving}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm font-medium text-slate-900 outline-none transition hover:border-emerald-200 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  {testSearch && (
                    <button
                      type="button"
                      aria-label="Clear test search"
                      onClick={() => setTestSearch("")}
                      disabled={isSaving}
                      className="absolute right-3 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    >
                      <FiX className="text-sm" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectVisibleTests}
                    disabled={
                      isSaving ||
                      areAllVisibleTestsSelected ||
                      !visibleTestIds.length
                    }
                    className="rounded-xl border border-emerald-100 bg-white px-3 py-1.5 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={clearSelectedTests}
                    disabled={isSaving || !selectedTestIds.length}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
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

          <div className="min-h-[370px]">
            {isCatalogLoading ? (
              <div className="flex min-h-[370px] items-center justify-center gap-2 text-sm font-semibold text-slate-500">
                <Spinner size="sm" />
                <span>Loading tests...</span>
              </div>
            ) : isCatalogError ? (
              <div className="flex min-h-[370px] flex-col items-center justify-center gap-3 px-4 text-center">
                <span className="text-sm font-semibold text-slate-500">
                  Failed to load tests.
                </span>
                <Button
                  size="sm"
                  variant="bordered"
                  radius="full"
                  onPress={() => refetchCatalog()}
                  className="border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700"
                >
                  Retry
                </Button>
              </div>
            ) : filteredTests.length === 0 ? (
              <div className="flex min-h-[370px] items-center justify-center px-4 text-center text-sm font-semibold text-slate-500">
                No tests found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="max-h-[420px] min-w-[940px] overflow-y-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80">
                        <th className="sticky top-0 z-10 w-12 bg-slate-50/95 px-4 py-3">
                          <input
                            type="checkbox"
                            aria-label="Select visible tests"
                            checked={areAllVisibleTestsSelected}
                            disabled={isSaving || !visibleTestIds.length}
                            ref={(element) => {
                              if (element) {
                                element.indeterminate =
                                  areSomeVisibleTestsSelected;
                              }
                            }}
                            onChange={toggleVisibleTests}
                            className="h-4 w-4 rounded border-slate-300 text-emerald-700 accent-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </th>
                        <th className="sticky top-0 z-10 bg-slate-50/95 px-4 py-3 text-[11px] font-semibold text-slate-600">
                          <span className="flex items-center gap-1">
                            Test Name
                            <FiArrowDown className="text-xs text-slate-500" />
                          </span>
                        </th>
                        <th className="sticky top-0 z-10 bg-slate-50/95 px-4 py-3 text-[11px] font-semibold text-slate-600">
                          Test Code
                        </th>
                        <th className="sticky top-0 z-10 bg-slate-50/95 px-4 py-3 text-[11px] font-semibold text-slate-600">
                          Department
                        </th>
                        <th className="sticky top-0 z-10 bg-slate-50/95 px-4 py-3 text-[11px] font-semibold text-slate-600">
                          Sample Type
                        </th>
                        <th className="sticky top-0 z-10 bg-slate-50/95 px-4 py-3 text-[11px] font-semibold text-slate-600">
                          Price
                        </th>
                        <th className="sticky top-0 z-10 bg-slate-50/95 px-4 py-3 text-[11px] font-semibold text-slate-600">
                          Status
                        </th>
                        <th className="sticky top-0 z-10 bg-slate-50/95 px-4 py-3 text-[11px] font-semibold text-slate-600">
                          Source
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTests.map((test) => {
                        const isSelected = selectedTestSet.has(test.id);

                        return (
                          <tr
                            key={test.id}
                            onClick={() => {
                              if (!isSaving) toggleTest(test.id);
                            }}
                            className={`cursor-pointer border-b border-slate-100 transition-colors last:border-b-0 hover:bg-emerald-50/30 ${
                              isSelected ? "bg-emerald-50/40" : "bg-white"
                            }`}
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                aria-label={`Select ${test.name}`}
                                checked={isSelected}
                                disabled={isSaving}
                                onClick={(event) => event.stopPropagation()}
                                onChange={() => toggleTest(test.id)}
                                className="h-4 w-4 rounded border-slate-300 text-emerald-700 accent-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <span className="block max-w-[260px] truncate text-[12px] font-semibold text-slate-700">
                                {test.name}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-[12px] font-semibold text-slate-700">
                              {test.code || "-"}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-[12px] font-semibold text-slate-700">
                              {test.category || "-"}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-[12px] font-semibold text-slate-700">
                              {test.sampleType || "-"}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-[12px] font-semibold text-slate-900">
                              {formatCurrency(test.price)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              <span
                                className={`inline-flex rounded-xl px-2.5 py-1 text-[10px] font-semibold ring-1 ${getStatusBadgeClass(test.status)}`}
                              >
                                {formatTableLabel(test.status)}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              <span
                                className={`inline-flex rounded-xl px-2.5 py-1 text-[10px] font-semibold ring-1 ${getSourceBadgeClass(test.source)}`}
                              >
                                {formatTableLabel(test.source)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <footer className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                {selectedTests.length} selected
              </span>
              <span className="rounded-lg bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                Total {formatCurrency(totalAmount)}
              </span>
            </div>

            <Button
              onPress={handleSubmit}
              isLoading={isSaving}
              startContent={!isSaving && <FiCheck className="text-sm" />}
              className="h-11 bg-primary px-6 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(4,120,87,0.22)] hover:bg-emerald-800"
            >
              Create Lab Tests
            </Button>
          </footer>
        </section>
      </main>
    </div>
  );
};

export default AddWalkInTestPage;
