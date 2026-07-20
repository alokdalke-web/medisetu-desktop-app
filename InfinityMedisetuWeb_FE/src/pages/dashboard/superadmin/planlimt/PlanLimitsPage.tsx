import {
  addToast,
  Button,
  Chip,
  Input,
  Switch,
  Tab,
  Tabs,
  Tooltip,
  useDisclosure,
  ButtonGroup,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import React, { useEffect, useMemo, useState } from "react";
import {
  FiEdit2,
  FiSave,
  FiX,
  FiBox,
  FiUsers,
  FiDollarSign,
  FiGrid,
  FiCheck,
  FiFileText,
  FiBell,
  FiMessageSquare,
  FiUser,
  FiDatabase,
  FiCreditCard,
  FiActivity,
  FiPlusSquare,
  FiTrendingUp,
  FiPieChart,
  FiInfo,
  FiArrowUpRight,
} from "react-icons/fi";
import {
  useGetAllPlanLimitsQuery,
  useBulkUpdatePlanLimitsMutation,
  type BulkUpdateLimitDto,
  type PlanWithLimits,
} from "../../../../redux/api/planLimitsApi";
import EditLimitModal from "../EditLimitModal";
import UsageInsights from "./UsageInsights";
import UpgradeOpportunities from "./UpgradeOpportunities";
import { useAppLoader } from "../../../../components/common/AppLoaderContext";
import AppLoader from "../../../../components/common/AppLoader";

interface StatsCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  color?: "primary" | "success" | "warning" | "secondary";
  trend?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  description,
  icon,
  color = "primary",
  trend,
}) => {
  const styles = {
    primary: {
      card: "border-slate-100 bg-white",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    success: {
      card: "border-slate-100 bg-white",
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
    },
    warning: {
      card: "border-slate-100 bg-white",
      iconBg: "bg-orange-50",
      iconColor: "text-orange-500",
    },
    secondary: {
      card: "border-slate-100 bg-white",
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
    },
  };

  return (
    <div
      className={`
        rounded-2xl border shadow-sm
        p-4 sm:p-5 lg:p-2 2xl:p-6 bg-white
        transition-all duration-200
        hover:shadow-md
        ${styles[color].card}
      `}
    >
      <div className="flex items-center gap-3 xl:gap-4">
        <div
          className={`
            flex h-10 w-10 sm:h-5 sm:w-5 lg:h-10 lg:w-10 2xl:h-14 2xl:w-14 shrink-0 items-center justify-center
            rounded-xl xl:rounded-2xl
            ${styles[color].iconBg}
            ${styles[color].iconColor}
          `}
        >
          <div className="text-lg 2xl:text-2xl lg:text-sm">{icon}</div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider truncate">
            {title}
          </p>

          <h3 className="mt-0.5 text-lg sm:text-sm 2xl:text-xl font-bold text-slate-800 truncate">
            {value}
          </h3>

          <p className="mt-0.5 text-[10px] sm:text-xs text-slate-500 flex items-center gap-1 truncate">
            {trend && (
              <span className="text-emerald-600 font-semibold flex items-center gap-0.5 shrink-0">
                <FiArrowUpRight /> {trend}
              </span>
            )}
            <span className="truncate">{description}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Feature metadata ────────────────────────────────────────────────────────

const NUMERIC_FEATURES = new Set([
  "doctor_accounts",
  "receptionist_accounts",
  "whatsapp_messages_per_month",
  "storage_months",
  "payment_history_months",
]);

const FEATURE_STYLE_MAP: Record<string, { icon: React.ReactNode; colorClass: string }> = {
  smart_prescriptions: {
    icon: <FiFileText size={18} />,
    colorClass: "bg-purple-50 text-purple-600",
  },
  priority_support: {
    icon: <FiBell size={18} />,
    colorClass: "bg-blue-50 text-blue-600",
  },
  whatsapp_messages_per_month: {
    icon: <FiMessageSquare size={18} />,
    colorClass: "bg-emerald-50 text-emerald-600",
  },
  doctor_accounts: {
    icon: <FiUser size={18} />,
    colorClass: "bg-emerald-50 text-emerald-600",
  },
  receptionist_accounts: {
    icon: <FiUsers size={18} />,
    colorClass: "bg-emerald-50 text-emerald-600",
  },
  storage_months: {
    icon: <FiDatabase size={18} />,
    colorClass: "bg-teal-50 text-teal-600",
  },
  payment_history_months: {
    icon: <FiCreditCard size={18} />,
    colorClass: "bg-emerald-50 text-emerald-600",
  },
  lab_integration: {
    icon: <FiActivity size={18} />,
    colorClass: "bg-blue-50 text-blue-600",
  },
  pharmacy_integration: {
    icon: <FiPlusSquare size={18} />,
    colorClass: "bg-purple-50 text-purple-600",
  },
  dashboard_full_access: {
    icon: <FiTrendingUp size={18} />,
    colorClass: "bg-purple-50 text-purple-600",
  },
  reports_analytics: {
    icon: <FiPieChart size={18} />,
    colorClass: "bg-purple-50 text-purple-600",
  },
  reports: {
    icon: <FiPieChart size={18} />,
    colorClass: "bg-purple-50 text-purple-600",
  },
  pharmacy: {
    icon: <FiPlusSquare size={18} />,
    colorClass: "bg-purple-50 text-purple-600",
  },
  labs: {
    icon: <FiActivity size={18} />,
    colorClass: "bg-blue-50 text-blue-600",
  },
  appointments: {
    icon: <FiFileText size={18} />,
    colorClass: "bg-blue-50 text-blue-600",
  },
  patients: {
    icon: <FiUsers size={18} />,
    colorClass: "bg-emerald-50 text-emerald-600",
  },
};

function getFeatureStyle(key: string) {
  return (
    FEATURE_STYLE_MAP[key] || {
      icon: <FiGrid size={18} />,
      colorClass: "bg-slate-50 text-slate-600",
    }
  );
}

function isNumericFeature(featureKey: string) {
  return NUMERIC_FEATURES.has(featureKey);
}

function formatFeatureLabel(featureKey: string) {
  return featureKey
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

interface EditableLimit {
  id: string;
  featureKey: string;
  limitValue: number | null;
  isUnlimited: boolean;
  enabled: boolean;
  description: string;
}

const PlanLimitsPage: React.FC = () => {
  const { data: planLimitsResponse, isLoading, isError } = useGetAllPlanLimitsQuery();
  useAppLoader(isLoading);
  const [bulkUpdate, { isLoading: isSaving }] = useBulkUpdatePlanLimitsMutation();

  const [activeMainTab, setActiveMainTab] = useState<string>("comparison");
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [editableLimits, setEditableLimits] = useState<EditableLimit[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  // Edit modal state
  const { isOpen: isEditOpen, onOpen: onEditOpen, onOpenChange: onEditOpenChange } = useDisclosure();
  const [editingLimit, setEditingLimit] = useState<EditableLimit | null>(null);
  const plans = useMemo(() => planLimitsResponse?.data ?? [], [planLimitsResponse?.data]);
  const hasPlans = plans.length > 0;

  // Set default selected plan when data loads
  useEffect(() => {
    if (plans.length > 0 && !selectedPlanId) {
      setSelectedPlanId(plans[0].planId);
    }
  }, [plans, selectedPlanId]);

  // Sync editable limits when plan selection changes
  const selectedPlan = useMemo(
    () => plans.find((p) => p.planId === selectedPlanId),
    [plans, selectedPlanId]
  );

  useEffect(() => {
    if (selectedPlan) {
      setEditableLimits(
        selectedPlan.limits?.map((l) => ({
          id: l.id,
          featureKey: l.featureKey,
          limitValue: l.limitValue,
          isUnlimited: l.isUnlimited,
          enabled: l.enabled,
          description: l.description,
        })) ?? []
      );
      setIsDirty(false);
    } else {
      setEditableLimits([]);
      setIsDirty(false);
    }
  }, [selectedPlan]);

  const comparisonFeatures = useMemo(() => {
    const featureMap = new Map<string, { key: string; label: string; subtext: string; icon: React.ReactNode; colorClass: string }>();

    plans.forEach((plan) => {
      plan.limits?.forEach((limit) => {
        if (!featureMap.has(limit.featureKey)) {
          const style = getFeatureStyle(limit.featureKey);
          featureMap.set(limit.featureKey, {
            key: limit.featureKey,
            label: formatFeatureLabel(limit.featureKey),
            subtext: limit.description || "Feature access limit configuration",
            ...style,
          });
        }
      });
    });

    return Array.from(featureMap.values());
  }, [plans]);
  const hasComparisonFeatures = comparisonFeatures.length > 0;

  const statsList = useMemo<StatsCardProps[]>(() => {
    const stats = planLimitsResponse?.stats;
    return [
      {
        title: "Total Plans",
        value: stats?.totalPlans ?? 0,
        description: "Active subscription plans",
        icon: <FiBox />,
        color: "primary",
      },
      {
        title: "Total Subscribers",
        value: stats?.totalSubscribers ?? 0,
        description: "Across all plans",
        icon: <FiUsers />,
        color: "success",
      },
      {
        title: "Monthly Recurring Revenue",
        value: new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(stats?.monthlyRecurringRevenue ?? 0),
        description: "Current billing period",
        icon: <FiDollarSign />,
        color: "warning",
      },
      {
        title: "Features Managed",
        value: stats?.totalFeaturesManaged ?? 0,
        description: "Total platform features",
        icon: <FiGrid />,
        color: "secondary",
      },
    ];
  }, [planLimitsResponse?.stats]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleToggleEnabled = (index: number, value: boolean) => {
    setEditableLimits((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], enabled: value };
      return updated;
    });
    setIsDirty(true);
  };

  const handleToggleUnlimited = (index: number, value: boolean) => {
    setEditableLimits((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], isUnlimited: value };
      return updated;
    });
    setIsDirty(true);
  };

  const handleLimitValueChange = (index: number, value: string) => {
    const numValue = value === "" ? null : parseInt(value, 10);
    setEditableLimits((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        limitValue: numValue !== null && isNaN(numValue) ? prev[index].limitValue : numValue,
      };
      return updated;
    });
    setIsDirty(true);
  };

  const handleDiscard = () => {
    if (selectedPlan) {
      setEditableLimits(
        selectedPlan.limits.map((l) => ({
          id: l.id,
          featureKey: l.featureKey,
          limitValue: l.limitValue,
          isUnlimited: l.isUnlimited,
          enabled: l.enabled,
          description: l.description,
        }))
      );
      setIsDirty(false);
    }
  };

  const handleSaveAll = async () => {
    if (!selectedPlanId) return;

    const limits: BulkUpdateLimitDto[] = editableLimits.map((l) => ({
      featureKey: l.featureKey,
      limitValue: l.limitValue,
      isUnlimited: l.isUnlimited,
      enabled: l.enabled,
      description: l.description,
    }));

    try {
      await bulkUpdate({ planId: selectedPlanId, limits }).unwrap();
      addToast({
        title: "Success",
        description: `Plan limits updated successfully for "${selectedPlan?.planName}"`,
        color: "success",
      });
      setIsDirty(false);
    } catch (error: any) {
      addToast({
        title: "Error",
        description: error?.data?.message || "Failed to update plan limits",
        color: "danger",
      });
    }
  };

  const handleEditClick = (limit: EditableLimit, planId: string) => {
    setSelectedPlanId(planId);
    setEditingLimit(limit);
    onEditOpen();
  };

  const handleEditSave = (updated: EditableLimit) => {
    setEditableLimits((prev) =>
      prev.map((l) => (l.featureKey === updated.featureKey ? updated : l))
    );
  };

  const renderPlanCell = (plan: PlanWithLimits, featureKey: string) => {
    const limit = plan.limits?.find((l) => l.featureKey === featureKey);
    if (!limit) {
      return (
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <FiX size={14} />
          </div>
          <span className="text-xs text-slate-500 mt-1.5 font-medium">Not Included</span>
        </div>
      );
    }

    const isNumeric = NUMERIC_FEATURES.has(featureKey);

    if (!isNumeric) {
      if (limit.enabled) {
        return (
          <div className="flex flex-col items-center justify-center text-center">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-white">
              <FiCheck size={14} />
            </div>
            <span className="text-xs text-slate-700 mt-1.5 font-medium">Included</span>
          </div>
        );
      } else {
        return (
          <div className="flex flex-col items-center justify-center text-center">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <FiX size={14} />
            </div>
            <span className="text-xs text-slate-500 mt-1.5 font-medium">Not Included</span>
          </div>
        );
      }
    }

    // Numeric features
    let boldText = "";
    let subText = "";

    if (limit.isUnlimited) {
      boldText = "Unlimited";
      subText =
        featureKey === "whatsapp_messages_per_month"
          ? "Unlimited messages"
          : featureKey === "storage_months"
            ? "Retention"
            : featureKey === "payment_history_months"
              ? "History"
              : "Per clinic";
    } else if (!limit.enabled || limit.limitValue === 0) {
      boldText = "0";
      subText =
        featureKey === "whatsapp_messages_per_month"
          ? "No messages"
          : featureKey === "storage_months"
            ? "Retention"
            : featureKey === "payment_history_months"
              ? "History"
              : "Per clinic";
    } else {
      if (featureKey === "storage_months" || featureKey === "payment_history_months") {
        const limitValue = limit.limitValue ?? 0;
        boldText = `${limitValue} Month${limitValue > 1 ? "s" : ""}`;
      } else {
        boldText = (limit.limitValue ?? 0).toLocaleString();
      }
      subText =
        featureKey === "whatsapp_messages_per_month"
          ? "Messages"
          : featureKey === "storage_months"
            ? "Retention"
            : featureKey === "payment_history_months"
              ? "History"
              : "Per clinic";
    }

    const isGreenText =
      limit.isUnlimited ||
      (limit.limitValue !== null && limit.limitValue > 0 && limit.enabled);

    return (
      <div className="text-center flex flex-col items-center">
        <span className={`text-sm font-bold ${isGreenText ? "text-green-600" : "text-slate-800"}`}>
          {boldText}
        </span>
        <span className="text-xs text-slate-400 font-medium mt-0.5">
          {subText}
        </span>
      </div>
    );
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <AppLoader />
      </div>
    );
  }

  if (isError || !planLimitsResponse) {
    return (
      <div className="flex h-96 items-center justify-center text-slate-500">
        Failed to load plan limits. Please try again.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full space-y-6">
      {/* Page Title Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-[28px] font-bold tracking-tight text-slate-900">
            Plan Limits
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Manage feature limits and access controls for each subscription plan.
          </p>
        </div>
        {/* <div className="flex items-center gap-3">
          <Button variant="bordered" size="md" className="bg-white text-slate-700 font-semibold" startContent={<FiDownload />}>
            Export
          </Button>
          <Button color="primary" size="md" className="bg-[#0f6257] hover:bg-[#0c4e45] text-white font-semibold" startContent={<FiPlus />}>
            Create New Plan
          </Button>
        </div> */}
      </div>

      {/* Stats Cards grid - OUTSIDE of the main white card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
        {statsList.map((item) => (
          <StatsCard
            key={item.title}
            title={item.title}
            value={item.value}
            description={item.description}
            icon={item.icon}
            color={item.color as any}
            trend={item.trend}
          />
        ))}
      </div>

      {/* Main Container Grid layout */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-2 2xl:gap-6 items-start">
        {/* Left Column: Table container (xl:col-span-3) */}
        <div className="xl:col-span-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {/* Main Card Header & View Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <Tabs
              aria-label="Navigation modes"
              selectedKey={activeMainTab}
              onSelectionChange={(key) => setActiveMainTab(key as string)}
              variant="underlined"
              classNames={{
                tabList: "gap-6 border-b-0 p-0",
                tab: "text-base font-semibold px-0 py-2 h-auto text-slate-500 data-[selected=true]:text-emerald-700",
                cursor: "bg-emerald-700 h-0.5",
              }}
            >
              <Tab key="comparison" title="Plan Comparison" />
              <Tab key="advanced" title="Advanced Settings" />
            </Tabs>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>View as:</span>
              <ButtonGroup size="sm" variant="flat" radius="full">
                <Button
                  className={
                    activeMainTab === "comparison"
                      ? "bg-[#0f6257] text-white font-semibold"
                      : "bg-slate-100 text-slate-700"
                  }
                  onPress={() => setActiveMainTab("comparison")}
                >
                  Comparison
                </Button>
                <Button
                  className={
                    activeMainTab === "advanced"
                      ? "bg-[#0f6257] text-white font-semibold"
                      : "bg-slate-100 text-slate-700"
                  }
                  onPress={() => setActiveMainTab("advanced")}
                >
                  Table
                </Button>
              </ButtonGroup>
            </div>
          </div>

          {activeMainTab === "comparison" ? (
            /* Plan Comparison View */
            <div>
              {!hasPlans || !hasComparisonFeatures ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-12 text-center">
                  <FiGrid className="mb-3 text-slate-300" size={32} />
                  <p className="text-sm font-semibold text-slate-700">
                    {!hasPlans ? "No plans available" : "No plan limits configured"}
                  </p>
                  <p className="mt-1 max-w-md text-sm text-slate-500">
                    {!hasPlans
                      ? "Plan comparison will appear once plans are returned by the API."
                      : "Feature rows will appear once at least one returned plan includes limits."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto pb-1 [scrollbar-width:thin] [scrollbar-color:#9ca3af_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-400 hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
                      <table className="w-full min-w-[760px] table-auto text-left">
                        <thead className="border-b border-slate-100 bg-slate-50/80">
                          <tr>
                            <th className="min-w-[280px] px-5 py-4 text-[13px] font-bold text-slate-600">
                              Feature
                            </th>
                            {plans.map((plan) => (
                              <th
                                key={plan.planId}
                                className="min-w-[180px] px-5 py-4 text-center text-[13px] font-bold text-slate-600"
                              >
                                <span className="uppercase tracking-wider">
                                  {plan.planName}
                                </span>
                              </th>
                            ))}
                            <th className="min-w-[110px] px-5 py-4 text-center text-[13px] font-bold text-slate-600">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {comparisonFeatures.map((feat) => (
                            <tr
                              key={feat.key}
                              className="transition-colors hover:bg-slate-50/70"
                            >
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-4">
                                  <div
                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${feat.colorClass}`}
                                  >
                                    {feat.icon}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-slate-800">
                                      {feat.label}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                      {feat.subtext}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {plans.map((plan) => (
                                <td key={plan.planId} className="px-5 py-4 text-center">
                                  {renderPlanCell(plan, feat.key)}
                                </td>
                              ))}

                              <td className="px-5 py-4 text-center">
                                <Dropdown placement="bottom-end">
                                  <DropdownTrigger>
                                    <Button
                                      isIconOnly
                                      size="sm"
                                      variant="light"
                                      className="hover:bg-slate-100 rounded-full"
                                    >
                                      <FiEdit2 className="text-slate-500" size={16} />
                                    </Button>
                                  </DropdownTrigger>
                                  <DropdownMenu
                                    aria-label="Select Plan to Edit"
                                    onAction={(key) => {
                                      const plan = plans.find((p) => p.planId === key);
                                      const limit = plan?.limits?.find((l) => l.featureKey === feat.key);
                                      if (limit && plan) {
                                        handleEditClick(
                                          {
                                            id: limit.id,
                                            featureKey: limit.featureKey,
                                            limitValue: limit.limitValue,
                                            isUnlimited: limit.isUnlimited,
                                            enabled: limit.enabled,
                                            description: limit.description,
                                          },
                                          plan.planId
                                        );
                                      }
                                    }}
                                  >
                                    {plans
                                      .filter((p) => p.limits?.some((l) => l.featureKey === feat.key))
                                      .map((p) => (
                                        <DropdownItem key={p.planId}>
                                          Edit {p.planName}
                                        </DropdownItem>
                                      ))}
                                  </DropdownMenu>
                                </Dropdown>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
                    <span>
                      Showing {comparisonFeatures.length} of {comparisonFeatures.length} features
                    </span>
                    <FiInfo size={14} className="text-slate-400" />
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Advanced Settings View (Granular per-plan setup) */
            <div className="mt-6">
              {/* Plan Tabs */}
              <Tabs
                aria-label="Plan tabs"
                selectedKey={selectedPlanId}
                onSelectionChange={(key) => {
                  if (isDirty) {
                    const confirm = window.confirm(
                      "You have unsaved changes. Discard and switch plans?"
                    );
                    if (!confirm) return;
                  }
                  setSelectedPlanId(key as string);
                }}
                variant="underlined"
                classNames={{
                  tabList: "gap-6 border-b border-slate-200",
                  tab: "text-sm font-medium",
                  cursor: "bg-primary",
                }}
              >
                {plans.map((plan) => (
                  <Tab key={plan.planId} title={plan.planName} />
                ))}
              </Tabs>

              {/* Unsaved changes banner */}
              {isDirty && (
                <div className="mt-4 flex items-center justify-between rounded-xl border border-warning-200 bg-warning-50 px-4 py-3">
                  <p className="text-sm font-medium text-warning-700">
                    You have unsaved changes
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="flat"
                      color="default"
                      startContent={<FiX size={14} />}
                      onPress={handleDiscard}
                    >
                      Discard
                    </Button>
                    <Button
                      size="sm"
                      color="primary"
                      startContent={<FiSave size={14} />}
                      isLoading={isSaving}
                      onPress={handleSaveAll}
                    >
                      Save All Changes
                    </Button>
                  </div>
                </div>
              )}

              {/* Limits Table */}
              <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto pb-1 [scrollbar-width:thin] [scrollbar-color:#9ca3af_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-400 hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
                  <table className="w-full min-w-[780px] table-fixed text-left">
                    <thead className="border-b border-slate-100 bg-slate-50/80">
                      <tr>
                        <th className="w-[30%] px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-600">
                          Feature
                        </th>
                        <th className="w-[13%] px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-600">
                          Type
                        </th>
                        <th className="w-[18%] px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-600">
                          Limit Value
                        </th>
                        <th className="w-[13%] px-5 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-600">
                          Unlimited
                        </th>
                        <th className="w-[13%] px-5 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-600">
                          Enabled
                        </th>
                        <th className="w-[13%] px-5 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-600">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {editableLimits.map((limit, index) => {
                        const isNumeric = isNumericFeature(limit.featureKey);
                        return (
                          <tr
                            key={limit.featureKey}
                            className={`transition-colors ${!limit.enabled ? "bg-slate-50/60 opacity-60" : "hover:bg-slate-50/70"
                              }`}
                          >
                            {/* Feature */}
                            <td className="px-5 py-4">
                              <div>
                                <p className="text-sm font-medium text-slate-800">
                                  {limit.description || formatFeatureLabel(limit.featureKey)}
                                </p>
                                <p className="text-xs text-slate-400 font-mono mt-0.5">
                                  {limit.featureKey}
                                </p>
                              </div>
                            </td>

                            {/* Type */}
                            <td className="px-5 py-4">
                              <Chip
                                size="sm"
                                variant="flat"
                                color={isNumeric ? "success" : "secondary"}
                                classNames={{ content: "text-xs font-medium" }}
                              >
                                {isNumeric ? "Numeric" : "Boolean"}
                              </Chip>
                            </td>

                            {/* Limit Value */}
                            <td className="px-5 py-4">
                              {isNumeric ? (
                                <div className="flex items-center gap-2">
                                  {limit.isUnlimited ? (
                                    <Chip
                                      size="sm"
                                      variant="flat"
                                      color="primary"
                                      classNames={{ content: "text-xs font-bold" }}
                                    >
                                      ∞ Unlimited
                                    </Chip>
                                  ) : (
                                    <Input
                                      type="number"
                                      size="sm"
                                      variant="bordered"
                                      className="w-24"
                                      value={limit.limitValue?.toString() ?? ""}
                                      isDisabled={!limit.enabled || limit.isUnlimited}
                                      onValueChange={(val) => handleLimitValueChange(index, val)}
                                      classNames={{
                                        inputWrapper: "min-h-[36px] h-9",
                                        input: "text-sm",
                                      }}
                                    />
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </td>

                            {/* Unlimited */}
                            <td className="px-5 py-4 text-center">
                              {isNumeric ? (
                                <Switch
                                  size="sm"
                                  isSelected={limit.isUnlimited}
                                  isDisabled={!limit.enabled}
                                  onValueChange={(val) => handleToggleUnlimited(index, val)}
                                />
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </td>

                            {/* Enabled */}
                            <td className="px-5 py-4 text-center">
                              <Switch
                                size="sm"
                                color="success"
                                isSelected={limit.enabled}
                                onValueChange={(val) => handleToggleEnabled(index, val)}
                              />
                            </td>

                            {/* Actions */}
                            <td className="px-5 py-4 text-center">
                              <Tooltip content="Edit details">
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="light"
                                  onPress={() => handleEditClick(limit, selectedPlanId)}
                                >
                                  <FiEdit2 className="text-slate-500" size={16} />
                                </Button>
                              </Tooltip>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {editableLimits.length === 0 && (
                <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
                  No limits configured for this plan.
                </div>
              )}

              {/* Bottom save button (always visible when dirty) */}
              {isDirty && (
                <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                  <Button
                    variant="flat"
                    color="default"
                    startContent={<FiX size={14} />}
                    onPress={handleDiscard}
                  >
                    Discard Changes
                  </Button>
                  <Button
                    color="primary"
                    startContent={<FiSave size={14} />}
                    isLoading={isSaving}
                    onPress={handleSaveAll}
                  >
                    Save All Changes
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Sidebar (lg:col-span-1) */}
        <div className="space-y-2">
          <UsageInsights />
          <UpgradeOpportunities />
        </div>
      </div>

      {/* Edit single limit modal */}
      <EditLimitModal
        isOpen={isEditOpen}
        onOpenChange={onEditOpenChange}
        limit={editingLimit}
        planId={selectedPlanId}
        onSave={handleEditSave}
      />
    </div>
  );
};

export default PlanLimitsPage;
