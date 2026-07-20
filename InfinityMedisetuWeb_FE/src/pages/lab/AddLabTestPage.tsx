import { addToast, Button, Input, Select, SelectItem, Spinner } from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { FiCheck, FiEdit3, FiSettings, FiX } from "react-icons/fi";
import { useNavigate } from "react-router";

import {
  useCreateLabTestMutation,
  useGetLabDepartmentsQuery,
  useGetLabTestsQuery,
  type LabDepartmentDto,
} from "../../redux/api/labApi";
import { useGetActiveReportTemplatesQuery } from "../../redux/api/labAssistantApi";
import { LabTemplateFieldsManager } from "./components/LabTemplateFieldsManager";

type LabTestStatus = "active" | "deactive";

const SAMPLE_TYPES = [
  "Blood",
  "Urine",
  "Saliva",
  "Sputum",
  "Stool",
  "Swab",
  "Semen",
  "Serum",
  "Plasma",
  "CSF (Cerebrospinal Fluid)",
  "Biopsy/Tissue",
  "Hair",
  "Nail",
  "Sweat",
  "Other",
];

function getDepartmentId(department: LabDepartmentDto) {
  return String(department.id ?? department._id ?? "").trim();
}

function getDepartmentName(department: LabDepartmentDto) {
  return String(
    department.departmentName ?? department.name ?? "Department",
  ).trim();
}

function getFriendlyTestError(err: any) {
  const raw =
    err?.data?.message ||
    err?.data?.error ||
    err?.error?.message ||
    err?.message ||
    "";
  const lower = String(raw).toLowerCase();
  const statusCode = Number(err?.status ?? err?.originalStatus ?? 0);

  if (
    statusCode === 409 ||
    lower.includes("duplicate") ||
    lower.includes("already") ||
    lower.includes("exist") ||
    lower.includes("conflict")
  ) {
    return "This test already exists in this department.";
  }

  return raw || "Something went wrong";
}

function normalizeCode(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .replace(/__+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getReportTemplateId(template: any) {
  return String(template?.id ?? template?.templateId ?? template?._id ?? "").trim();
}

function getReportTemplateName(template: any) {
  return String(
    template?.templateName ?? template?.name ?? template?.testName ?? "Report Template",
  ).trim();
}

const inputClassNames = {
  label: "font-semibold text-slate-500",
  input: "text-sm placeholder:text-slate-400/80 placeholder:font-normal",
  inputWrapper:
    "h-14 border-slate-200 bg-slate-50/40 px-4 shadow-none transition-colors hover:border-primary/40 hover:bg-white group-data-[focus=true]:border-primary/50 group-data-[focus=true]:bg-white group-data-[focus=true]:ring-4 group-data-[focus=true]:ring-primary/10",
};

const selectTriggerClass =
  "h-14 border-slate-200 bg-slate-50/40 px-4 shadow-none transition-colors hover:border-primary/40 hover:bg-white data-[focus=true]:border-primary/50 data-[open=true]:border-primary/50 data-[open=true]:bg-white data-[open=true]:ring-4 data-[open=true]:ring-primary/10";

const AddLabTestPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [testCode, setTestCode] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [sampleType, setSampleType] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<LabTestStatus>("active");
  const [createdTestId, setCreatedTestId] = useState<string | null>(null);

  const { data: departments = [], isLoading: isDepartmentsLoading } =
    useGetLabDepartmentsQuery();
  const { data: allTestsData } = useGetLabTestsQuery({
    limit: 100,
    search: name.trim() || undefined,
  });
  const {
    data: reportTemplatesResponse,
    isFetching: isTemplatesFetching,
    refetch: refetchReportTemplates,
  } = useGetActiveReportTemplatesQuery();
  const [createLabTest, { isLoading: isSaving }] = useCreateLabTestMutation();

  const departmentOptions = useMemo(
    () =>
      departments
        .map((department) => ({
          value: getDepartmentId(department),
          label: getDepartmentName(department),
        }))
        .filter((department) => Boolean(department.value)),
    [departments],
  );

  const duplicateTest = useMemo(() => {
    if (!name.trim() || !departmentId || createdTestId) return null;

    const selectedDepartmentName =
      departmentOptions.find((option) => option.value === departmentId)?.label ??
      "";

    return (allTestsData?.data ?? []).find((test) => {
      const existingName = test.testName ?? test.name ?? "";
      const sameName =
        existingName.trim().toLowerCase() === name.trim().toLowerCase();
      const existingDepartmentId = String(test.departmentId ?? "").trim();
      const existingDepartmentName = String(
        test.departmentName ?? test.category ?? "",
      )
        .trim()
        .toLowerCase();
      const sameDepartment = existingDepartmentId
        ? existingDepartmentId === departmentId
        : existingDepartmentName === selectedDepartmentName.toLowerCase();

      return sameName && sameDepartment;
    });
  }, [
    allTestsData?.data,
    createdTestId,
    departmentId,
    departmentOptions,
    name,
  ]);

  const matchingMasterTest = useMemo(() => {
    if (!name.trim()) return null;

    for (const department of departments) {
      const test = department.tests?.find(
        (item) =>
          String(item.name ?? "").trim().toLowerCase() ===
          name.trim().toLowerCase(),
      );
      if (test) return { test, departmentId: getDepartmentId(department) };
    }

    return null;
  }, [departments, name]);

  useEffect(() => {
    if (!matchingMasterTest) return;

    setDepartmentId(matchingMasterTest.departmentId);
    if (matchingMasterTest.test.code) {
      setTestCode(matchingMasterTest.test.code);
    }
    if (matchingMasterTest.test.sampleType) {
      setSampleType(matchingMasterTest.test.sampleType);
    }
  }, [matchingMasterTest]);

  const reportTemplates = useMemo(
    () =>
      Array.isArray(reportTemplatesResponse?.data)
        ? reportTemplatesResponse.data
        : [],
    [reportTemplatesResponse?.data],
  );

  const matchingReportTemplate = useMemo(() => {
    const normalizedName = normalizeCode(name);
    if (!normalizedName) return null;

    const candidateCodes = new Set(
      matchingMasterTest
        ? [
            normalizeCode(testCode),
            normalizeCode(matchingMasterTest.test.code),
            normalizedName,
          ].filter(Boolean)
        : [`CUSTOM_${normalizedName}`],
    );

    const byCode = reportTemplates.find((template: any) => {
      const code = normalizeCode(template?.templateCode ?? template?.code);
      return code && candidateCodes.has(code);
    });
    if (byCode && getReportTemplateId(byCode)) return byCode;

    const byName = reportTemplates.find((template: any) => {
      const templateName = normalizeCode(
        template?.templateName ?? template?.name ?? template?.testName,
      );
      return templateName === normalizedName;
    });

    return byName && getReportTemplateId(byName) ? byName : null;
  }, [matchingMasterTest, name, reportTemplates, testCode]);

  const reportTemplateId = matchingReportTemplate
    ? getReportTemplateId(matchingReportTemplate)
    : "";

  const closePage = () => navigate("/lab/queue");

  const handleSubmit = async () => {
    if (createdTestId) {
      closePage();
      return;
    }

    const parsedPrice = Number(price);

    if (!name.trim()) {
      addToast({ title: "Name required", color: "warning" });
      return;
    }
    if (!departmentId) {
      addToast({ title: "Department required", color: "warning" });
      return;
    }

    if (duplicateTest) {
      const existingId = String(duplicateTest.id ?? duplicateTest._id ?? "");
      if (!existingId) {
        addToast({
          title: "Existing test id unavailable",
          color: "danger",
        });
        return;
      }

      setCreatedTestId(existingId);
      addToast({
        title: "Test already available",
        description: "The existing catalog test will be used.",
        color: "success",
      });
      await refetchReportTemplates();
      return;
    }

    if (!sampleType) {
      addToast({ title: "Sample type required", color: "warning" });
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      addToast({ title: "Enter valid price", color: "warning" });
      return;
    }

    try {
      const payload = {
        testName: name.trim(),
        ...(testCode.trim() ? { testCode: testCode.trim() } : {}),
        departmentId,
        sampleType,
        price: parsedPrice,
        status,
        ...(matchingMasterTest?.test.id
          ? { masterTestId: matchingMasterTest.test.id }
          : {}),
      };
      const created = await createLabTest(payload).unwrap();

      setCreatedTestId(
        String(created.id ?? created._id ?? `created-${Date.now()}`),
      );
      addToast({
        title: "Test details saved",
        description: matchingMasterTest
          ? "You can now manage its report fields below."
          : "The custom test was added successfully.",
        color: "success",
      });
      await refetchReportTemplates();
    } catch (err) {
      addToast({
        title: "Failed",
        description: getFriendlyTestError(err),
        color: "danger",
      });
    }
  };

  return (
    <div className="mx-auto w-full ">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
        <header className="border-b border-slate-100 px-5 py-5 sm:px-8 sm:py-6">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-lg text-primary ring-1 ring-primary/15">
              <FiEdit3 />
            </div>
            <div>
              <h1 className="text-xl font-black leading-6 text-slate-950 sm:text-2xl">
                Add Lab Test
              </h1>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 sm:text-sm">
                Keep test details accurate for doctor assignments and billing.
              </p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 px-5 py-6 sm:grid-cols-2 sm:px-8 sm:py-8">
          <div className="sm:col-span-2">
            <Input
              label="Test Name"
              placeholder="Enter test name"
              value={name}
              onValueChange={setName}
              radius="full"
              variant="bordered"
              isDisabled={isSaving || Boolean(createdTestId)}
              classNames={inputClassNames}
            />
            {duplicateTest && (
              <p className="mt-2 px-3 text-xs font-semibold text-emerald-700">
                This test is already available in the selected department. Save
                will use the existing catalog entry.
              </p>
            )}
          </div>

          <Input
            label="Test Code"
            placeholder="Enter test code (optional, e.g. CBC)"
            value={testCode}
            onValueChange={setTestCode}
            radius="full"
            variant="bordered"
            isDisabled={
              isSaving || Boolean(createdTestId) || Boolean(matchingMasterTest)
            }
            classNames={inputClassNames}
          />

          <Input
            label="Price"
            placeholder="Eg: 500"
            value={price}
            onValueChange={(value) => {
              const cleaned = value.replace(/[^0-9]/g, "");
              if (cleaned.length <= 5) setPrice(cleaned);
            }}
            radius="full"
            variant="bordered"
            inputMode="numeric"
            isDisabled={isSaving || Boolean(createdTestId)}
            startContent={
              <span className="text-sm font-bold text-slate-500">₹</span>
            }
            classNames={inputClassNames}
          />

          <Select
            label="Department"
            placeholder="Select department"
            radius="full"
            variant="bordered"
            isDisabled={
              isSaving ||
              Boolean(createdTestId) ||
              isDepartmentsLoading ||
              Boolean(matchingMasterTest)
            }
            selectedKeys={departmentId ? new Set([departmentId]) : new Set([])}
            onSelectionChange={(keys) => {
              if (keys === "all") return;
              setDepartmentId(
                (Array.from(keys)[0] as string | undefined) ?? "",
              );
            }}
            classNames={{
              label: "font-semibold text-slate-500",
              value: departmentId
                ? "text-sm font-semibold text-slate-950"
                : "text-sm font-normal text-slate-400",
              trigger: selectTriggerClass,
            }}
          >
            {departmentOptions.map((option) => (
              <SelectItem key={option.value} textValue={option.label}>
                {option.label}
              </SelectItem>
            ))}
          </Select>

          <Select
            label="Sample Type"
            placeholder="Select sample type"
            radius="full"
            variant="bordered"
            isDisabled={
              isSaving || Boolean(createdTestId) || Boolean(matchingMasterTest)
            }
            selectedKeys={sampleType ? new Set([sampleType]) : new Set([])}
            onSelectionChange={(keys) => {
              if (keys === "all") return;
              setSampleType((Array.from(keys)[0] as string | undefined) ?? "");
            }}
            classNames={{
              label: "font-semibold text-slate-500",
              value: sampleType
                ? "text-sm font-semibold text-slate-950"
                : "text-sm font-normal text-slate-400",
              trigger: selectTriggerClass,
            }}
          >
            {SAMPLE_TYPES.map((type) => (
              <SelectItem key={type} textValue={type}>
                {type}
              </SelectItem>
            ))}
          </Select>

          <div className="sm:col-span-2">
            <Select
              label="Status"
              placeholder="Select status"
              radius="full"
              variant="bordered"
              isDisabled={isSaving || Boolean(createdTestId)}
              selectedKeys={new Set([status])}
              onSelectionChange={(keys) => {
                if (keys === "all") return;
                setStatus(
                  (Array.from(keys)[0] as LabTestStatus | undefined) ??
                    "active",
                );
              }}
              classNames={{
                label: "font-semibold text-slate-500",
                value: "text-sm font-semibold text-slate-950",
                trigger: selectTriggerClass,
              }}
            >
              <SelectItem key="active" textValue="Active">
                Active
              </SelectItem>
              <SelectItem key="deactive" textValue="Deactive">
                Deactive
              </SelectItem>
            </Select>
          </div>
        </div>

        <footer className="flex flex-col-reverse justify-end gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-5 sm:flex-row sm:px-8">
          <Button
            variant="bordered"
            radius="full"
            onPress={closePage}
            isDisabled={isSaving}
            startContent={<FiX className="text-sm" />}
            className="h-10 min-w-[104px] border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 shadow-sm"
          >
            Cancel
          </Button>
          <Button
            color="primary"
            radius="full"
            onPress={handleSubmit}
            isLoading={isSaving}
            startContent={!isSaving && <FiCheck className="text-sm" />}
            className="h-10 min-w-[104px] bg-primary px-6 text-sm font-bold text-white shadow-[0_12px_24px_rgba(10,108,116,0.22)]"
          >
            {createdTestId ? "Done" : "Save Test Details"}
          </Button>
        </footer>
      </section>

      <div className="mt-5">
        {reportTemplateId ? (
          <LabTemplateFieldsManager
            templateId={reportTemplateId}
            templateName={getReportTemplateName(matchingReportTemplate)}
            isReadOnly={!createdTestId}
          />
        ) : (
          <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-8 text-center shadow-[0_18px_50px_rgba(15,23,42,0.05)] sm:px-8">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-xl text-primary">
              {isTemplatesFetching ? <Spinner size="sm" /> : <FiSettings />}
            </span>
            <h2 className="mt-4 text-lg font-black text-slate-950">
              Manage Report Fields
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-500">
              {!name.trim()
                ? "Enter a test name to find its existing report parameters."
                : createdTestId
                  ? "This custom test is saved. Its report template will become available when the test receives a patient order; the current backend does not provide a catalog-level template creation API."
                  : matchingMasterTest
                    ? "Looking for this test's report template and parameters."
                    : "This is a new custom test. The current backend creates its report template only after the test receives a patient order."}
            </p>
          </section>
        )}
      </div>

      {isDepartmentsLoading && (
        <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
          <Spinner size="sm" /> Loading departments
        </div>
      )}
    </div>
  );
};

export default AddLabTestPage;
