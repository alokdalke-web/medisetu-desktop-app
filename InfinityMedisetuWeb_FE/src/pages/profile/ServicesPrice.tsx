import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Spinner,
  addToast,
} from "@heroui/react";
import React from "react";
import { useNavigate } from "react-router";

import EditButton from "../../components/shared/EditButton";
import ProfilePageHeader from "../../components/shared/ProfilePageHeader";
import service from "../../../public/assets/icons/service.svg";

import { useGetDoctorQuery, useToggleServiceMutation } from "../../redux/api/doctorApi";
import { FiPlus, FiSlash, FiRefreshCw } from "react-icons/fi";

import { useUnsavedChanges } from "../../context/UnsavedChangesContext";

type UiService = {
  id?: string;
  serviceName: string;
  price: number | string;
  currency: string;
  durationDays: number;
  additionalServices?: string;
  durationMonths: number | string;
  canBeBookedByPatient?: boolean;
};

const toNumberSafe = (v: any, fallback = 0) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const ServicesPrice: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useGetDoctorQuery();
  const [toggleService, { isLoading: isToggling }] = useToggleServiceMutation();

  const { setDirty } = useUnsavedChanges();
  React.useEffect(() => {
    setDirty(false);
  }, [setDirty]);

  const base: any = data?.result ?? {};
  const apiServices: any[] = Array.isArray(base.services) ? base.services : [];

  const sortedServices = [...apiServices].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  });

  const hasServices = sortedServices.length > 0;

  const normalizeService = (svc: any): UiService => ({
    id: svc.id ? String(svc.id) : undefined,
    serviceName: svc.serviceName ?? "",
    price: typeof svc.price === "number" ? svc.price : Number(svc.price) || 0,
    currency: svc.currency || "INR",
    additionalServices: svc.additionalServices || "",
    durationDays: toNumberSafe(svc.durationDays ?? svc.durationDay ?? 0, 0),
    durationMonths: svc.durationMonths ?? svc.durationMonth ?? "",
    canBeBookedByPatient: svc.canBeBookedByPatient,
  });

  const fmt = (v: any) =>
    v === null || v === undefined || v === "" ? "—" : String(v);

  const handleOpenAdd = () => navigate("new");

  const handleOpenEdit = (svc: any) => {
    const ui = normalizeService(svc);
    if (ui.id) navigate(`edit/${ui.id}`);
  };

  const handleToggleService = async (serviceId: string, isDeleted: boolean) => {
    const action = isDeleted ? "enable" : "disable";
    try {
      await toggleService({ serviceId, action }).unwrap();
      addToast({
        title: isDeleted ? "Service enabled" : "Service disabled",
        description: isDeleted ? "Service has been re-enabled successfully." : "Service has been disabled successfully.",
        color: "success",
      });
    } catch {
      addToast({ title: "Error", description: `Failed to ${action} service. Please try again.`, color: "danger" });
    }
  };

  return (
    <>
      <ProfilePageHeader
        icon={<img src={service} alt="" className="w-4" />}
        title="Services & Pricing"
        actions={
          <>
            <Button
              startContent={<FiPlus />}
              color="primary"
              variant="solid"
              onPress={handleOpenAdd}
              isDisabled={isLoading}
              size="sm"
              className="rounded-lg px-4 text-xs font-medium"
            >
              {hasServices ? "Add Service" : "Add First Service"}
            </Button>
          </>
        }
      />

      {/* Content */}
      <div className="px-4 py-4 sm:px-6 sm:py-5 [&_.border-slate-200]:dark:border-[#273244] [&_.bg-slate-50]:dark:bg-[#0f1728] [&_.text-slate-700]:dark:text-slate-200 [&_.text-slate-500]:dark:text-slate-400 [&_.text-slate-900]:dark:text-white [&_.bg-white]:dark:bg-[#111726]">
        {isLoading && !hasServices && (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            <Spinner size="sm" />
            <span>Loading services…</span>
          </div>
        )}

        {!isLoading && !hasServices && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-xs text-slate-500">
            <div className="font-medium text-slate-700">No services added yet</div>
            <p className="mt-1">
              Click <span className="font-semibold">"Add First Service"</span> to create your first consultation or package.
            </p>
          </div>
        )}

        {hasServices && (
          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sortedServices.map((svc, index) => {
              const ui = normalizeService(svc);
              const isDisabled = Boolean(svc.isDeleted);
              const months = ui.durationMonths;
              const days = ui.durationDays;
              const durationLabel =
                months !== "" && months !== null && months !== undefined
                  ? `${months} month${Number(months) > 1 ? "s" : ""}`
                  : days > 0
                    ? `${days} day${days > 1 ? "s" : ""}`
                    : "—";

              return (
                <Card
                  key={ui.id ?? index}
                  shadow="sm"
                  className={[
                    "h-full rounded-2xl border border-default-200 shadow-sm",
                    "transition-all hover:-translate-y-0.5 hover:shadow-md",
                    isDisabled ? "bg-gray-50 opacity-60" : "bg-white",
                  ].join(" ")}
                >
                  <CardHeader className="flex items-center justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[15px] font-semibold text-default-900 sm:text-[16px]">
                        {fmt(ui.serviceName)}
                      </h3>
                      {isDisabled && (
                        <span className="rounded-lg bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-600">
                          Disabled
                        </span>
                      )}
                      {!isDisabled && (
                        <span className={`rounded-lg px-2 py-0.5 text-[10px] font-medium ${ui.canBeBookedByPatient !== false ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {ui.canBeBookedByPatient !== false ? "Bookable by Patient" : "Staff Only"}
                        </span>
                      )}
                    </div>
                    {!isDisabled && (
                      <EditButton text="Edit" onPress={() => handleOpenEdit(svc)} disabled={isLoading} />
                    )}
                  </CardHeader>

                  <CardBody>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-default-200 bg-white px-3 py-2.5 sm:px-4 sm:py-3">
                        <div className="text-[14px] font-semibold">{fmt(ui.currency)} {fmt(ui.price)}</div>
                        <div className="mt-0.5 text-[11px] text-primary">Price</div>
                      </div>
                      <div className="rounded-xl border border-default-200 bg-white px-3 py-2.5 sm:px-4 sm:py-3">
                        <div className="text-[14px] font-semibold">{durationLabel}</div>
                        <div className="mt-0.5 text-[11px] text-primary">Duration</div>
                      </div>
                    </div>
                    {ui.additionalServices && (
                      <p className="mt-3 text-[12px] leading-snug text-default-600">{ui.additionalServices}</p>
                    )}
                  </CardBody>

                  <CardFooter className="flex items-center justify-between border-t border-default-100 px-4 py-2">
                    <span className="text-[10px] text-slate-400">
                      Updated: {svc.updatedAt ? new Date(svc.updatedAt).toLocaleDateString() : svc.createdAt ? new Date(svc.createdAt).toLocaleDateString() : "—"}
                    </span>
                    {ui.id && (
                      <Button
                        size="sm"
                        variant="light"
                        isDisabled={isToggling}
                        onPress={() => handleToggleService(ui.id!, isDisabled)}
                        startContent={isDisabled ? <FiRefreshCw size={14} /> : <FiSlash size={14} />}
                        className={isDisabled ? "text-green-600 text-xs font-medium" : "text-red-500 text-xs font-medium"}
                      >
                        {isDisabled ? "Re-enable" : "Disable"}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {isError && (
          <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
            Failed to load services.
          </div>
        )}
      </div>
    </>
  );
};

export default ServicesPrice;
