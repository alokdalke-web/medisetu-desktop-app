import React, { useMemo, useEffect } from "react";
import { Spinner, addToast, useDisclosure } from "@heroui/react";
import { FiPlus } from "react-icons/fi";

import { useGetAllClinicsQuery } from "../../../redux/api/clinicApi";
import {
  useGetLabsByClinicIdQuery,
  type LabDto,
} from "../../../redux/api/labApi";

import AddNewLabCard from "../components/lab/AddNewLabCard";
import type { Lab, UIStatus } from "../components/lab/labTypes";
import LabCard from "../components/lab/LabCard.tsx";
import CreateLabModal from "../components/lab/CreateLabModal.tsx";

const   LabManagementTabContent: React.FC = () => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  /* ---------------- Clinic API ---------------- */
  const {
    data: clinicRes,
    isFetching: clinicLoading,
    error: clinicError,
  } = useGetAllClinicsQuery(undefined as any);

  /* 🔔 Clinic error toast */
  useEffect(() => {
    if (clinicError) {
      const msg =
        (clinicError as any)?.data?.message || "Failed to load clinic details";

      addToast({
        title: "Error",
        description: msg,
        color: "danger",
      });
    }
  }, [clinicError]);

  /* ---------------- ClinicId resolve ---------------- */
  const clinicId = useMemo(() => {
    const d: any = clinicRes;

    const id =
      d?.clinic?.id ||
      d?.clinic?._id ||
      d?.result?.clinic?.id ||
      d?.result?.clinic?._id ||
      (Array.isArray(d?.result)
        ? d?.result?.[0]?._id || d?.result?.[0]?.id
        : null) ||
      (Array.isArray(d) ? d?.[0]?._id || d?.[0]?.id : null);

    return (id ?? "").toString();
  }, [clinicRes]);

  /* ---------------- Labs API ---------------- */
  const {
    data: labsRes,
    isFetching: labsLoading,
    error: labsError,
  } = useGetLabsByClinicIdQuery(clinicId, {
    skip: !clinicId,
  });

  /* 🔔 Labs error toast */
  useEffect(() => {
    if (labsError) {
      const msg = (labsError as any)?.data?.message || "Failed to load labs";

      addToast({
        title: "Error",
        description: msg,
        color: "danger",
      });
    }
  }, [labsError]);

  /* ---------------- Labs normalize ---------------- */
  const labs: Lab[] = useMemo(() => {
    const arr: LabDto[] = labsRes ?? [];

    return arr
      .filter((x: any) => x?.deletedAt == null)
      .map((x, idx) => ({
        id: (x.id || x._id || String(idx)) as string,
        name: x.name || "—",
        address: x.address || "—",
        status: ((x.labStatus || "Active") as UIStatus) || "Active",
        contactNo: x.contactNo || "",
        email: x.email || "",
      }));
  }, [labsRes]);

  /* ---------------- Open modal handler ---------------- */
  const handleOpen = () => {
    if (clinicLoading) {
      addToast({
        title: "Please wait",
        description: "Clinic details load ho rahi hai…",
        color: "primary",
      });
      return;
    }

    if (!clinicId) {
      addToast({
        title: "Clinic ID not found",
        description: "Clinic API se clinicId nahi aa raha.",
        color: "danger",
      });
      return;
    }

    onOpen();
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[16px] sm:text-[18px] font-semibold text-slate-900 dark:text-white">
          Total Labs{" "}
          <span className="text-primary">({labs.length})</span>
        </div>
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-primary-active"
        >
          <FiPlus className="text-[14px]" />
          Add Lab
        </button>
      </div>

      {labsLoading ? (
        <div className="flex items-center justify-center py-10">
          <Spinner />
        </div>
      ) : (
        // ✅ Better breakpoints: mobile 1, small 2, large 3, xl 4
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
          {labs.map((lab) => (
            <LabCard key={lab.id} lab={lab} />
          ))}

          <AddNewLabCard id="tour-add-lab-btn" onClick={handleOpen} />
        </div>
      )}

      {clinicId && (
        <CreateLabModal
          isOpen={isOpen}
          onOpenChange={onOpenChange}
          clinicId={clinicId}
        />
      )}
    </div>
  );
};

const LabManagementTab: React.FC = () => {
  return <LabManagementTabContent />;
};

export default LabManagementTab;
