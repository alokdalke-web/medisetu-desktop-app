import { addToast, useDisclosure } from "@heroui/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  useCreateLabTestMutation,
  useDeleteLabTestMutation,
  useGetLabDepartmentsQuery,
  useGetLabTestsQuery,
  useUpdateLabTestMutation,
  type LabDepartmentDto,
  type LabTestsSortBy,
  type LabTestsStatsOption,
} from "../../redux/api/labApi";
import {
  getLabApiErrorMessage,
  useLazyGetActiveReportTemplatesQuery,
  useLazyGetLabResultTemplateQuery,
  useLazyGetLabTemplateParametersQuery,
} from "../../redux/api/labAssistantApi";
import { DeleteLabTestDialog } from "./lab-queue/DeleteLabTestDialog";
import { LabQueueCatalogView } from "./lab-queue/LabQueueCatalogView";
import { LabQueueFormView } from "./lab-queue/LabQueueFormView";
import type { LabTestStatus, Row, SortKey } from "./lab-queue/types";
import {
  findMatchingTemplate,
  firstNonEmptyText,
  formatListPreview,
  getDepartmentOption,
  getFriendlyTestError,
  getSourceLabel,
  getStatsOptionLabel,
  getStatsOptionValue,
  getTemplateList,
  getTestDepartmentId,
  getTestDepartmentName,
  getUniqueOptions,
  normalizeCode,
  normalizeStatus,
  pageSizeOptions,
  pickLabOrderId,
  pickTemplateId,
  pickTemplateName,
  pickTestId,
} from "./lab-queue/utils";

const LabQueue = () => {
  const [showForm, setShowForm] = useState(false);
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onOpenChange: onDeleteOpenChange,
  } = useDisclosure();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [sampleTypeFilter, setSampleTypeFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search.trim());
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    if (!pageSizeOptions.includes(pageSize)) {
      setPageSize(10);
      setPage(1);
    }
  }, [pageSize]);

  const labTestsQueryArgs = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: debouncedSearch || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      departmentId: departmentFilter !== "all" ? departmentFilter : undefined,
      sampleType: sampleTypeFilter !== "all" ? sampleTypeFilter : undefined,
      sortBy: sortKey ?? undefined,
      sortOrder: sortKey ? sortDirection : undefined,
    }),
    [
      debouncedSearch,
      departmentFilter,
      page,
      pageSize,
      sampleTypeFilter,
      sortDirection,
      sortKey,
      statusFilter,
    ],
  );

  const { data, isLoading, isFetching, isError, refetch } =
    useGetLabTestsQuery(labTestsQueryArgs);
  const { data: validationData } = useGetLabTestsQuery(
    { page: 1, limit: 1000 },
    { skip: !showForm },
  );
  const { data: departments = [], isFetching: isDepartmentsFetching } =
    useGetLabDepartmentsQuery();
  const [createLabTest, { isLoading: isCreating }] = useCreateLabTestMutation();
  const [updateLabTest, { isLoading: isUpdating }] = useUpdateLabTestMutation();
  const [deleteLabTest, { isLoading: isDeleting }] =
    useDeleteLabTestMutation();
  const [triggerGetTemplates] = useLazyGetActiveReportTemplatesQuery();
  const [triggerGetParams] = useLazyGetLabTemplateParametersQuery();
  const [loadResultTemplate] = useLazyGetLabResultTemplateQuery();

  const [mode, setMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [testCode, setTestCode] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  const [sampleType, setSampleType] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<LabTestStatus>("active");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState("");
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [templateWorkspace, setTemplateWorkspace] = useState<{
    templateId: string;
    templateName: string;
    testName: string;
    appointmentTestId?: string;
    initialTemplate?: any;
    initialParameters?: any[];
  } | null>(null);
  const [templateResolveMessage, setTemplateResolveMessage] = useState("");
  const [isResolvingTemplate, setIsResolvingTemplate] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search.trim());
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    if (!pageSizeOptions.includes(pageSize)) {
      setPageSize(10);
      setPage(1);
    }
  }, [pageSize]);

  const allTests = useMemo(() => data?.data ?? [], [data?.data]);
  const validationTests = useMemo(
    () => validationData?.data ?? allTests,
    [allTests, validationData?.data],
  );

  const isCurrentEditingTest = useCallback((test: any) => {
    if (!editingId) return false;
    return [test?.id, test?._id].some((id) => String(id ?? "") === editingId);
  }, [editingId]);

  const duplicateTest = useMemo(() => {
    if (!name.trim()) return null;
    return validationTests.find((test) => {
      if (isCurrentEditingTest(test)) return false;
      const existingName = test.testName ?? test.name ?? "";
      return existingName.trim().toLowerCase() === name.trim().toLowerCase();
    });
  }, [isCurrentEditingTest, name, validationTests]);

  const duplicateCodeTest = useMemo(() => {
    const normalizedTestCode = normalizeCode(testCode);
    if (!normalizedTestCode) return null;

    return validationTests.find((test) => {
      if (isCurrentEditingTest(test)) return false;
      return normalizeCode(test.testCode ?? "") === normalizedTestCode;
    });
  }, [isCurrentEditingTest, testCode, validationTests]);

  const nameError = useMemo(() => {
    if (!duplicateTest) return "";
    const departmentName =
      duplicateTest.departmentName ?? duplicateTest.category ?? "Department";
    return `This test is already in your lab under ${departmentName} department.`;
  }, [duplicateTest]);

  const codeError = useMemo(() => {
    if (!duplicateCodeTest) return "";
    const existingName =
      duplicateCodeTest.testName ?? duplicateCodeTest.name ?? "another test";
    const departmentName =
      duplicateCodeTest.departmentName ?? duplicateCodeTest.category ?? "Department";
    return `Test code already used by ${existingName} under ${departmentName}. Please use a unique test code.`;
  }, [duplicateCodeTest]);

  useEffect(() => {
    if (mode !== "add" || !name.trim()) return;

    for (const department of departments) {
      const matchingTest = department.tests?.find(
        (test) =>
          String(test.name ?? "").trim().toLowerCase() ===
          name.trim().toLowerCase(),
      );
      if (matchingTest) {
        const nextDepartmentId = String(department.id ?? department._id ?? "").trim();
        setDepartmentId(nextDepartmentId);
        if (matchingTest.code) setTestCode(matchingTest.code);
        if (matchingTest.sampleType) setSampleType(matchingTest.sampleType);
        break;
      }
    }
  }, [departments, mode, name]);

  const rows: Row[] = useMemo(() => {
    const tests = Array.isArray(allTests) ? allTests : [];
    return tests.map((test: any, index: number) => ({
      key: String(test.id ?? test._id ?? index),
      id: test.id ?? test._id,
      name: test.testName ?? test.name ?? "-",
      testCode: test.testCode ?? "",
      masterTestId: firstNonEmptyText(
        test.masterTestId,
        test.masterTest?.id,
        test.masterTest?._id,
      ),
      templateId: pickTemplateId(test) || null,
      reportTemplateId: firstNonEmptyText(test.reportTemplateId) || null,
      resultTemplateId: firstNonEmptyText(test.resultTemplateId) || null,
      labOrderId: firstNonEmptyText(test.labOrderId) || null,
      appointmentTestId: firstNonEmptyText(test.appointmentTestId) || null,
      templateName: pickTemplateName(test, test.testName ?? test.name ?? "-"),
      departmentId: getTestDepartmentId(test),
      departmentName: getTestDepartmentName(test),
      sampleType: test.sampleType ?? "-",
      price: Number(test.price ?? 0),
      status: normalizeStatus(test.status),
      source: getSourceLabel(test.source),
      raw: test,
    }));
  }, [allTests]);

  const stats = data?.stats;

  const departmentNameToId = useMemo(() => {
    const map = new Map<string, string>();

    rows.forEach((row) => {
      if (row.departmentName && row.departmentId) {
        map.set(row.departmentName, row.departmentId);
      }
    });

    return map;
  }, [rows]);

  const statsDepartmentLabels = useMemo(
    () =>
      (stats?.departments ?? [])
        .map(getStatsOptionLabel)
        .filter((label) => label && label !== "-"),
    [stats?.departments],
  );

  const statsSampleTypeLabels = useMemo(
    () =>
      (stats?.sampleTypes ?? [])
        .map(getStatsOptionLabel)
        .filter((label) => label && label !== "-"),
    [stats?.sampleTypes],
  );

  const catalogStats = useMemo(() => {
    const fallbackDepartmentLabels = rows
      .map((row) => row.departmentName)
      .filter((label) => label && label !== "-");
    const fallbackSampleTypeLabels = rows
      .map((row) => row.sampleType)
      .filter((label) => label && label !== "-");
    const customTestCount = rows.filter((row) => row.source === "Custom").length;
    const masterTestCount = rows.filter((row) => row.source === "Master").length;

    return {
      totalTests: stats?.totalTests ?? data?.pagination?.totalRecords ?? rows.length,
      departmentCount:
        stats?.departmentCount ??
        (statsDepartmentLabels.length ||
          getUniqueOptions(fallbackDepartmentLabels).length),
      departmentPreview: formatListPreview(
        statsDepartmentLabels.length
          ? statsDepartmentLabels
          : fallbackDepartmentLabels,
      ),
      sampleTypeCount:
        stats?.sampleTypeCount ??
        (statsSampleTypeLabels.length ||
          getUniqueOptions(fallbackSampleTypeLabels).length),
      sampleTypePreview: formatListPreview(
        statsSampleTypeLabels.length
          ? statsSampleTypeLabels
          : fallbackSampleTypeLabels,
      ),
      customTestCount,
      sourcePreview: `${masterTestCount} master ${masterTestCount === 1 ? "test" : "tests"}`,
    };
  }, [
    data?.pagination?.totalRecords,
    rows,
    stats?.departmentCount,
    stats?.priceRange?.max,
    stats?.priceRange?.min,
    stats?.sampleTypeCount,
    stats?.totalTests,
    statsDepartmentLabels,
    statsSampleTypeLabels,
  ]);

  const catalogDepartmentFilterOptions = useMemo(() => {
    const optionMap = new Map<string, { label: string; value: string }>();

    departments.forEach((department) => {
      const option = getDepartmentOption(department);
      if (option) optionMap.set(option.value, option);
    });

    (stats?.departments ?? []).forEach((department) => {
      const label = getStatsOptionLabel(department);
      if (!label) return;

      const alreadyHasLabel = Array.from(optionMap.values()).some(
        (option) => option.label === label,
      );
      if (alreadyHasLabel) return;

      const fallbackValue = departmentNameToId.get(label) ?? label;
      const value = getStatsOptionValue(department, fallbackValue);
      if (value) optionMap.set(value, { value, label });
    });

    const options = Array.from(optionMap.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    );

    return [{ label: "All", value: "all" }, ...options];
  }, [departmentNameToId, departments, stats?.departments]);

  const sampleTypeFilterOptions = useMemo(() => {
    const optionMap = new Map<string, { label: string; value: string }>();
    const addOption = (rawLabel: unknown, rawValue?: unknown) => {
      const label = String(rawLabel ?? "").trim();
      const value = String(rawValue ?? label).trim();
      if (!label || label === "-" || !value || value === "-") return;
      optionMap.set(value, { value, label });
    };

    (stats?.sampleTypes ?? []).forEach((sampleTypeOption) => {
      const label = getStatsOptionLabel(sampleTypeOption);
      const value = getStatsOptionValue(sampleTypeOption, label);
      addOption(label, value);
    });

    departments.forEach((department) => {
      department.tests?.forEach((test) => addOption(test.sampleType));
    });

    rows.forEach((row) => addOption(row.sampleType));

    const options = Array.from(optionMap.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    );

    return [{ label: "All", value: "all" }, ...options];
  }, [departments, rows, stats?.sampleTypes]);

  const pagination = data?.pagination;
  const totalRows = pagination?.totalRecords ?? rows.length;
  const totalPages = Math.max(1, pagination?.totalPages ?? 1);
  const currentPage = pagination?.currentPage ?? page;
  const firstResult = totalRows === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastResult =
    totalRows === 0 ? 0 : Math.min(totalRows, firstResult + rows.length - 1);
  const visibleRows = rows;
  const visiblePageNumbers = useMemo(() => {
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const halfWindow = Math.floor(maxVisiblePages / 2);
    const start = Math.max(
      1,
      Math.min(page - halfWindow, totalPages - maxVisiblePages + 1),
    );

    return Array.from({ length: maxVisiblePages }, (_, index) => start + index);
  }, [page, totalPages]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const isCustomTest = useMemo(() => {
    if (mode === "edit") {
      const editingRow = rows.find((row) => row.id === editingId);
      return editingRow?.source === "Custom";
    }
    if (!name.trim() || !departmentId.trim()) return false;
    const selectedDepartment = departments.find(
      (department) =>
        String(department.id ?? department._id ?? "").trim() ===
        departmentId.trim(),
    );
    const matchingMasterTest = selectedDepartment?.tests?.find(
      (test) =>
        String(test.name ?? "").trim().toLowerCase() ===
        name.trim().toLowerCase(),
    );
    return !matchingMasterTest;
  }, [departmentId, departments, editingId, mode, name, rows]);

  const shouldDisableDetails = useMemo(() => {
    if (mode === "edit") {
      const editingRow = rows.find((row) => row.id === editingId);
      return editingRow?.source !== "Custom";
    }
    if (!name.trim()) return false;
    for (const department of departments) {
      const matchingTest = department.tests?.find(
        (test) =>
          String(test.name ?? "").trim().toLowerCase() ===
          name.trim().toLowerCase(),
      );
      if (matchingTest) return true;
    }
    return false;
  }, [departments, editingId, mode, name, rows]);

  const departmentOptions = useMemo(
    () =>
      departments
        .map(getDepartmentOption)
        .filter((department): department is { label: string; value: string } =>
          Boolean(department),
        ),
    [departments],
  );

  const resetPageForQueryChange = () => setPage(1);
  const updatePageSize = (nextPageSize: number) => {
    setPageSize(nextPageSize);
    resetPageForQueryChange();
  };
  const updateStatusFilter = (nextStatus: string) => {
    setStatusFilter(nextStatus);
    resetPageForQueryChange();
  };
  const updateDepartmentFilter = (nextDepartment: string) => {
    setDepartmentFilter(nextDepartment);
    resetPageForQueryChange();
  };
  const updateSampleTypeFilter = (nextSampleType: string) => {
    setSampleTypeFilter(nextSampleType);
    resetPageForQueryChange();
  };

  const resetForm = () => {
    setName("");
    setTestCode("");
    setDepartmentId("");
    setSampleType("");
    setPrice("");
    setStatus("active");
    setCustomFields([]);
    setTemplateWorkspace(null);
    setTemplateResolveMessage("");
    setIsResolvingTemplate(false);
    setHasSaved(false);
  };

  const resolveTemplateForLabTest = async ({
    savedTest,
    testName,
    testCode,
    masterTestId,
    showMissingMessage = true,
  }: {
    savedTest: any;
    testName: string;
    testCode?: string;
    masterTestId?: string;
    showMissingMessage?: boolean;
  }) => {
    setIsResolvingTemplate(true);
    setTemplateResolveMessage("");

    try {
      const orderId = pickLabOrderId(savedTest);

      if (orderId) {
        const orderTemplate = await loadResultTemplate({
          appointmentTestId: orderId,
        }).unwrap();

        if (orderTemplate?.id) {
          setTemplateWorkspace({
            templateId: orderTemplate.id,
            templateName:
              orderTemplate.templateName || `${testName} Result Template`,
            testName: orderTemplate.testName || testName,
            appointmentTestId: orderId,
            initialTemplate: orderTemplate,
            initialParameters: orderTemplate.parameters ?? [],
          });
          return;
        }
      }

      let templateId = pickTemplateId(savedTest);
      let resolvedTemplateName = pickTemplateName(savedTest, testName);

      if (!templateId) {
        const templatesResponse = await triggerGetTemplates().unwrap();
        const matchedTemplate = findMatchingTemplate(
          getTemplateList(templatesResponse),
          { testName, testCode, masterTestId },
        );

        if (matchedTemplate) {
          templateId = pickTemplateId(matchedTemplate);
          resolvedTemplateName = pickTemplateName(matchedTemplate, testName);
        }
      }

      if (templateId) {
        setTemplateWorkspace({
          templateId,
          templateName: resolvedTemplateName,
          testName,
          initialTemplate: null,
          initialParameters: [],
        });
        return;
      }

      setTemplateWorkspace(null);
      if (showMissingMessage) {
        setTemplateResolveMessage(
          "Result template ID was not returned after save. Please return templateId/reportTemplateId from Add Test save response.",
        );
      }
    } catch (err) {
      setTemplateWorkspace(null);
      if (showMissingMessage) {
        setTemplateResolveMessage(
          getLabApiErrorMessage(err, "Could not resolve the result template."),
        );
      }
    } finally {
      setIsResolvingTemplate(false);
    }
  };

  const openAddModal = () => {
    setMode("add");
    setEditingId(null);
    resetForm();
    setShowForm(true);
  };

  const openEditModal = (row: Row) => {
    if (!row.id) {
      addToast({
        title: "Missing id",
        description: "This row does not have a test id.",
        color: "danger",
      });
      return;
    }

    setMode("edit");
    setEditingId(row.id);
    setName(row.name);
    setTestCode(row.testCode ?? "");

    setDepartmentId(row.departmentId);

    setSampleType(row.sampleType === "-" ? "" : row.sampleType);
    setPrice(String(row.price));
    setStatus(row.status);
    setCustomFields([]);
    setTemplateWorkspace(null);
    setTemplateResolveMessage("");

    if (row.source === "Custom" || row.source === "custom") {
      triggerGetTemplates()
        .unwrap()
        .then((response) => {
          const normalizedName = normalizeCode(row.name);
          const matchedTemplate = response.data?.find(
            (template: any) =>
              template.code === `CUSTOM_${normalizedName}` ||
              normalizeCode(template.name) === normalizedName,
          );
          if (matchedTemplate) {
            return triggerGetParams({ templateId: matchedTemplate.id }).unwrap();
          }
          return undefined;
        })
        .then((params) => {
          if (!params) return;
          setCustomFields(
            params.map((parameter: any) => ({
              id: parameter.id || parameter.parameterId,
              parameterName: parameter.parameterName,
              inputType: parameter.inputType || "text",
              unit: parameter.unit === "-" ? "" : parameter.unit,
              referenceRange:
                parameter.referenceRange === "-" ? "" : parameter.referenceRange,
              isRequired: parameter.isRequired || false,
              sortOrder: parameter.sortOrder || 10,
            })),
          );
        })
        .catch((err) => {
          console.error("Failed to fetch custom parameters:", err);
        });
    }

    setShowForm(true);
    void resolveTemplateForLabTest({
      savedTest: row.raw ?? row,
      testName: row.name,
      testCode: row.testCode,
      masterTestId: row.masterTestId,
      showMissingMessage: false,
    });
  };

  const isSaving = isCreating || isUpdating || isResolvingTemplate;

  const onSubmit = async () => {
    if (nameError) {
      addToast({
        title: "Test already exists",
        description: nameError,
        color: "danger",
      });
      return;
    }

    if (codeError) {
      addToast({
        title: "Test code already in use",
        description: codeError,
        color: "danger",
      });
      return;
    }

    const parsedPrice = Number(price);

    if (!name.trim()) {
      addToast({ title: "Name required", color: "warning" });
      return;
    }

    if (!departmentId.trim()) {
      addToast({ title: "Department required", color: "warning" });
      return;
    }

    if (!sampleType.trim()) {
      addToast({ title: "Sample type required", color: "warning" });
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      addToast({ title: "Enter valid price", color: "warning" });
      return;
    }

    const selectedDepartment = departments.find(
      (department) =>
        String(department.id ?? department._id ?? "").trim() ===
        departmentId.trim(),
    );
    const matchingMasterTest = selectedDepartment?.tests?.find(
      (test) =>
        String(test.name ?? "").trim().toLowerCase() ===
        name.trim().toLowerCase(),
    );

    const payload = {
      testName: name.trim(),
      sampleType: sampleType.trim(),
      price: parsedPrice,
      status,
      ...(testCode.trim() ? { testCode: testCode.trim() } : {}),
      departmentId: departmentId.trim(),
      ...(matchingMasterTest ? { masterTestId: matchingMasterTest.id } : {}),
      ...(isCustomTest ? { customFields } : {}),
    };

    try {
      let savedTest: any;

      if (mode === "add") {
        savedTest = await createLabTest(payload).unwrap();
        const savedId = pickTestId(savedTest);
        if (savedId) {
          setMode("edit");
          setEditingId(savedId);
        }

        addToast({
          title: "Added",
          description: "Lab test created successfully. Result fields are ready.",
          color: "success",
        });
        setHasSaved(true);
      } else {
        if (!editingId) {
          addToast({ title: "Missing test id", color: "danger" });
          return;
        }

        savedTest = await updateLabTest({
          id: editingId,
          body: payload,
        }).unwrap();

        addToast({
          title: "Updated",
          description: "Lab test updated successfully. Result fields are ready.",
          color: "success",
        });
        setHasSaved(true);
      }

      await resolveTemplateForLabTest({
        savedTest,
        testName: payload.testName,
        testCode: payload.testCode,
        masterTestId: firstNonEmptyText(
          matchingMasterTest?.id,
          matchingMasterTest?._id,
        ),
      });

      refetch();
    } catch (err: any) {
      addToast({
        title: "Failed",
        description: getFriendlyTestError(err),
        color: "danger",
      });
    }
  };

  const onConfirmDelete = async () => {
    if (!deletingId) return;

    try {
      await deleteLabTest(deletingId).unwrap();

      addToast({
        title: "Deleted",
        description: "Lab test deleted successfully.",
        color: "success",
      });
      setDeletingId(null);
      setDeletingName("");
      refetch();
      onDeleteOpenChange();
    } catch (err: any) {
      addToast({
        title: "Delete failed",
        description: getFriendlyTestError(err),
        color: "danger",
      });
    }
  };

  const requestDelete = (row: Row) => {
    if (!row.id) {
      addToast({
        title: "Missing id",
        description: "This row does not have a test id.",
        color: "danger",
      });
      return;
    }

    setDeletingId(row.id);
    setDeletingName(row.name || "this test");
    onDeleteOpen();
  };

  const clearSearch = () => {
    setSearch("");
    setDebouncedSearch("");
    resetPageForQueryChange();
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      resetPageForQueryChange();
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
    resetPageForQueryChange();
  };

  const closeForm = () => {
    resetForm();
    setMode("add");
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div
      id="tour-lab-catalog-page"
      className="mx-auto flex w-full min-w-0 max-w-full flex-col gap-5 overflow-x-hidden"
    >
      {showForm ? (
        <LabQueueFormView
          mode={mode}
          name={name}
          testCode={testCode}
          departmentId={departmentId}
          sampleType={sampleType}
          price={price}
          status={status}
          departments={departmentOptions}
          isSaving={isSaving}
          hasSaved={hasSaved}
          nameError={nameError}
          codeError={codeError}
          disableDetails={shouldDisableDetails}
          isResolvingTemplate={isResolvingTemplate}
          templateResolveMessage={templateResolveMessage}
          templateWorkspace={templateWorkspace}
          onNameChange={setName}
          onTestCodeChange={setTestCode}
          onDepartmentChange={setDepartmentId}
          onSampleTypeChange={setSampleType}
          onPriceChange={setPrice}
          onStatusChange={setStatus}
          onCancel={closeForm}
          onSubmit={onSubmit}
        />
      ) : (
        <LabQueueCatalogView
          isFetching={isFetching}
          isLoading={isLoading}
          isError={isError}
          search={search}
          statusFilter={statusFilter}
          departmentFilter={departmentFilter}
          sampleTypeFilter={sampleTypeFilter}
          departmentFilterOptions={catalogDepartmentFilterOptions}
          sampleTypeFilterOptions={sampleTypeFilterOptions}
          addDisabled={isDepartmentsFetching && departmentOptions.length === 0}
          catalogStats={catalogStats}
          sortKey={sortKey}
          sortDirection={sortDirection}
          visibleRows={visibleRows}
          firstResult={firstResult}
          lastResult={lastResult}
          totalRows={totalRows}
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          visiblePageNumbers={visiblePageNumbers}
          onSearchChange={setSearch}
          onClearSearch={clearSearch}
          onStatusFilterChange={updateStatusFilter}
          onDepartmentFilterChange={updateDepartmentFilter}
          onSampleTypeFilterChange={updateSampleTypeFilter}
          onAddTest={openAddModal}
          onRetry={() => {
            void refetch();
          }}
          onSort={toggleSort}
          onEditRow={openEditModal}
          onDeleteRow={requestDelete}
          onPageChange={setPage}
          onPageSizeChange={updatePageSize}
        />
      )}

      {isDeleteOpen && (
        <DeleteLabTestDialog
          deletingName={deletingName}
          isDeleting={isDeleting}
          onCancel={() => {
            setDeletingId(null);
            setDeletingName("");
            onDeleteOpenChange();
          }}
          onConfirm={onConfirmDelete}
        />
      )}
    </div>
  );
};

export default LabQueue;
