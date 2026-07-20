import {
  Button,
  Chip,
  Skeleton,
  Tooltip,
  useDisclosure,
} from "@heroui/react";
import React, { useState } from "react";
import { FiEdit2, FiPlus, FiPackage } from "react-icons/fi";
import DataTable from "../../../components/shared/DataTable";
import {
  useGetSubscriptionPlansQuery,
  type Plan,
} from "../../../redux/api/subscriptionApi";
import CreatePlanModal from "./CreatePlanModal";

import PageHeader from "../../../components/common/PageHeader";
import { useAppLoader } from "../../../components/common/AppLoaderContext";

const SubscriptionPlans: React.FC = () => {
  const { data, isLoading } = useGetSubscriptionPlansQuery();
  useAppLoader(isLoading);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const columns = [
    { key: "name", label: "Plan Name" },
    { key: "slug", label: "Slug" },
    { key: "price", label: "Price" },
    { key: "features", label: "Features" },
    { key: "createdAt", label: "Created At" },
    { key: "actions", label: "Actions" },
  ];

  const formattedRows =
    data?.plans?.map((plan) => ({
      ...plan,
      id: plan.id,
    })) || [];

  const handleEdit = (plan: Plan) => {
    setSelectedPlan(plan);
    onOpen();
  };

  const renderCell = (row: any, columnKey: React.Key) => {
    const plan = data?.plans?.find((p) => p.id === row.id) || (row as Plan);
    switch (columnKey) {
      case "name":
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold text-sm">
              {plan.name?.charAt(0)?.toUpperCase() || "P"}
            </div>
            <div>
              <p className="font-medium text-slate-900">{plan.name}</p>
              <p className="text-xs text-slate-400 line-clamp-1">{plan.description}</p>
            </div>
          </div>
        );
      case "slug":
        return (
          <Chip size="sm" variant="flat" color="default" className="text-xs">
            {plan.slug}
          </Chip>
        );
      case "price":
        return (
          <div>
            <span className="font-semibold text-slate-800">
              {plan.currency} {Number(plan.price)?.toLocaleString("en-IN")}
            </span>
            {Number(plan.price) === 0 && (
              <Chip size="sm" variant="flat" color="success" className="ml-2 text-xs">
                Free
              </Chip>
            )}
          </div>
        );
      case "features":
        return (
          <div className="flex items-center gap-1">
            <FiPackage className="text-slate-400" size={14} />
            <span className="text-sm text-slate-600">
              {plan.features?.length || 0} features
            </span>
          </div>
        );
      case "createdAt":
        return (
          <span className="text-sm text-slate-500">
            {new Date(plan.createdAt).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        );
      case "actions":
        return (
          <div className="flex items-center gap-2">
            <Tooltip content="Edit Plan">
              <Button
                isIconOnly
                size="sm"
                variant="light"
                className="text-slate-500 hover:text-primary"
                onClick={() => handleEdit(plan)}
              >
                <FiEdit2 size={16} />
              </Button>
            </Tooltip>
          </div>
        );
      default:
        return (row as any)[columnKey as string] ?? "—";
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-56 rounded-lg" />
            <Skeleton className="h-4 w-80 rounded-lg mt-2" />
          </div>
          <Skeleton className="h-10 w-40 rounded-lg" />
        </div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <PageHeader title="Subscription Plans" description="Manage subscription plans and their features for the platform." />

        <Button
          color="primary"
          startContent={<FiPlus />}
          onClick={() => {
            setSelectedPlan(null);
            onOpen();
          }}
          isDisabled
          className="font-medium"
        >
          Create New Plan
        </Button>
      </div>

      {formattedRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-4">
            <FiPackage className="text-slate-400" size={28} />
          </div>
          <h3 className="text-lg font-medium text-slate-700">No plans yet</h3>
          <p className="text-sm text-slate-400 mt-1">
            Create your first subscription plan to get started.
          </p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={formattedRows}
          isLoading={isLoading}
          renderCell={renderCell}
          onRowAction={(key) => {
            const plan = data?.plans?.find((p) => p.id === key);
            if (plan) handleEdit(plan);
          }}
        />
      )}

      <CreatePlanModal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        editData={selectedPlan}
      />
    </div>
  );
};

export default SubscriptionPlans;
