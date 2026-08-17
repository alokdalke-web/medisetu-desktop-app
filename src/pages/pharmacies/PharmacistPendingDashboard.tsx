// src/pages/pharmacies/PharmacistPendingDashboard.tsx
import React from "react";
import { useNavigate } from "react-router";
import { Button, Spinner, useDisclosure, addToast } from "@heroui/react";
import { FiCheckCircle, FiClock, FiPlus, FiEye, FiLock, FiShield, FiUsers } from "react-icons/fi";
import { BsCapsule, BsTruck } from "react-icons/bs";
import { 
  useGetAllMedicinesQuery, 
  useGetAllSuppliersQuery,
  useAddMedicineMutation,
  useAddSupplierMutation
} from "../../redux/api/pharmaciesApi";
import { useGetMfaStatusQuery } from "../../redux/api/mfaApi";
import MedicineFormModal from "./component/MedicineFormModal";
import SupplierFormModal from "./component/SupplierFormModal";

const PharmacistPendingDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Modals disclosure
  const {
    isOpen: isMedicineOpen,
    onOpen: onOpenMedicine,
    onOpenChange: onMedicineOpenChange,
  } = useDisclosure();

  const {
    isOpen: isSupplierOpen,
    onOpen: onOpenSupplier,
    onOpenChange: onSupplierOpenChange,
  } = useDisclosure();

  // 1. Fetch Medicines count (check if at least one medicine exists)
  const { data: medicinesData, isLoading: medicinesLoading, refetch: refetchMedicines } = useGetAllMedicinesQuery({
    pageNumber: 1,
    pageSize: 1,
  });

  // 2. Fetch Suppliers count (check if at least one supplier exists)
  const { data: suppliersData, isLoading: suppliersLoading, refetch: refetchSuppliers } = useGetAllSuppliersQuery({
    pageNumber: 1,
    pageSize: 1,
  });

  // 3. Fetch MFA status
  const { data: mfaData, isLoading: mfaLoading } = useGetMfaStatusQuery();

  // Mutations
  const [addMedicine, { isLoading: isAddingMedicine }] = useAddMedicineMutation();
  const [addSupplier, { isLoading: isAddingSupplier }] = useAddSupplierMutation();

  const isLoading = medicinesLoading || suppliersLoading || mfaLoading;

  const medicineAdded = !!(medicinesData?.pagination?.totalRecords && medicinesData.pagination.totalRecords > 0);
  const supplierAdded = !!(suppliersData?.pagination?.totalRecords && suppliersData.pagination.totalRecords > 0);
  const mfaEnabled = !!mfaData?.data?.mfaEnabled;

  // Progress performance calculation
  let completedTasksCount = 0;
  if (medicineAdded) completedTasksCount++;
  if (supplierAdded) completedTasksCount++;
  if (mfaEnabled) completedTasksCount++;

  const totalTasks = 3;
  const progressPercent = Math.round((completedTasksCount / totalTasks) * 100);

  const handleAddMedicineSubmit = async (data: any) => {
    try {
      await addMedicine(data).unwrap();
      addToast({
        title: "Success",
        description: "Medicine added successfully",
        color: "success",
      });
      refetchMedicines();
    } catch (err: any) {
      addToast({
        title: "Error",
        description: err?.data?.message || "Failed to add medicine",
        color: "danger",
      });
    }
  };

  const handleAddSupplierSubmit = async (data: any) => {
    try {
      await addSupplier(data).unwrap();
      addToast({
        title: "Success",
        description: "Supplier added successfully",
        color: "success",
      });
      refetchSuppliers();
    } catch (err: any) {
      addToast({
        title: "Error",
        description: err?.data?.message || "Failed to add supplier",
        color: "danger",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[70vh] w-full flex-col items-center justify-center gap-4">
        <Spinner size="lg" color="primary" />
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Loading your setup progress...</p>
      </div>
    );
  }

  return (
    <div className="w-full px-0 py-8 space-y-8 animate-fadeIn">
      {/* Header section */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-[#0a6c74] dark:text-[#9be7dc] md:text-3xl">
          Setup Center
        </h1>
        <p className="text-sm text-[#677294] dark:text-slate-300 md:text-base">
          Complete these steps to set up your clinic and start managing your practice smoothly.
        </p>
      </div>

      {/* Progress Card */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-[#273244] dark:bg-[#111726]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-base font-bold text-slate-800 dark:text-white">
            Your Setup Progress
          </h2>
          <span className="text-sm font-bold text-[#0a6c74] dark:text-[#9be7dc]">
            {progressPercent}% Completed ({completedTasksCount} of {totalTasks})
          </span>
        </div>
        {/* Progress bar wrapper */}
        <div className="relative w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#0a6c74] dark:bg-[#0a6c74] transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Setup Cards Grid - Covers full width */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
        
        {/* Medicine Setup Card */}
        <div className="flex flex-col justify-between p-6 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all duration-300 dark:border-[#273244] dark:bg-[#111726]">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 dark:bg-[#0a6c74]/10">
                <BsCapsule className="h-6 w-6 text-[#0a6c74] dark:text-[#9be7dc]" />
              </div>
              {medicineAdded ? (
                <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-full text-xs font-semibold">
                  <FiCheckCircle className="h-3.5 w-3.5" /> Completed
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-2.5 py-1 rounded-full text-xs font-semibold">
                  <FiClock className="h-3.5 w-3.5 animate-spin" /> Pending
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Add Medicine</h3>
              <p className="text-xs leading-relaxed text-[#677294] dark:text-slate-400">
                Create a medicine profile with composition, categories, and HSN details.
              </p>
            </div>
          </div>

          <div className="pt-6">
            {medicineAdded ? (
              <Button
                className="w-full font-semibold bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-white dark:border-slate-700"
                onPress={() => navigate("/pharmacy/medicines")}
              >
                <FiEye className="mr-2 h-4 w-4" /> View Medicine
              </Button>
            ) : (
              <Button
                className="w-full font-semibold bg-[#0a6c74] text-white hover:bg-[#085a61]"
                onPress={onOpenMedicine}
              >
                <FiPlus className="mr-2 h-4 w-4" /> Start Setup
              </Button>
            )}
          </div>
        </div>

        {/* Supplier Setup Card */}
        <div className="flex flex-col justify-between p-6 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all duration-300 dark:border-[#273244] dark:bg-[#111726]">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/20">
                <BsTruck className="h-6 w-6 text-blue-600" />
              </div>
              {supplierAdded ? (
                <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-full text-xs font-semibold">
                  <FiCheckCircle className="h-3.5 w-3.5" /> Completed
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-2.5 py-1 rounded-full text-xs font-semibold">
                  <FiClock className="h-3.5 w-3.5 animate-spin" /> Pending
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Add Supplier</h3>
              <p className="text-xs leading-relaxed text-[#677294] dark:text-slate-400">
                Add your pharmacy supplier partners to manage stocks and invoices.
              </p>
            </div>
          </div>

          <div className="pt-6">
            {supplierAdded ? (
              <Button
                className="w-full font-semibold bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-white dark:border-slate-700"
                onPress={() => navigate("/pharmacy/suppliers")}
              >
                <FiEye className="mr-2 h-4 w-4" /> View Supplier
              </Button>
            ) : (
              <Button
                className="w-full font-semibold bg-[#0a6c74] text-white hover:bg-[#085a61]"
                onPress={onOpenSupplier}
              >
                <FiPlus className="mr-2 h-4 w-4" /> Start Setup
              </Button>
            )}
          </div>
        </div>

        {/* Security / MFA Setup Card */}
        <div className="flex flex-col justify-between p-6 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all duration-300 dark:border-[#273244] dark:bg-[#111726]">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/20">
                <FiShield className="h-6 w-6 text-violet-600" />
              </div>
              {mfaEnabled ? (
                <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-full text-xs font-semibold">
                  <FiCheckCircle className="h-3.5 w-3.5" /> Completed
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-2.5 py-1 rounded-full text-xs font-semibold">
                  <FiClock className="h-3.5 w-3.5 animate-spin" /> Pending
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Security & Access</h3>
              <p className="text-xs leading-relaxed text-[#677294] dark:text-slate-400">
                Enable multi-factor authentication (MFA) to secure your account.
              </p>
            </div>
          </div>

          <div className="pt-6">
            <Button
              className="w-full font-semibold bg-[#0a6c74] text-white hover:bg-[#085a61]"
              onPress={() => navigate("/profile/security")}
            >
              {mfaEnabled ? "Manage MFA" : "Start Setup"}
            </Button>
          </div>
        </div>

      </div>

      {/* Admin Approval Setup Card - Rendered below cards in a single full-width card */}
      <div className="w-full p-6 rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-[#273244] dark:bg-[#111726] flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/20 shrink-0">
            <FiUsers className="h-6 w-6 text-amber-600" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Admin Approval Status</h3>
            <p className="text-sm leading-relaxed text-[#677294] dark:text-slate-400">
              Your access will be active after your approval of your admin profile.
            </p>
          </div>
        </div>
        <Button
          className="w-full md:w-auto font-semibold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700"
          isDisabled
        >
          <FiLock className="mr-2 h-4 w-4" /> Awaiting Approval
        </Button>
      </div>

      {/* ── Medicine Form Modal ── */}
      <MedicineFormModal
        isOpen={isMedicineOpen}
        onOpenChange={onMedicineOpenChange}
        initialData={null}
        onSubmit={handleAddMedicineSubmit}
        isLoading={isAddingMedicine}
      />

      {/* ── Supplier Form Modal ── */}
      <SupplierFormModal
        isOpen={isSupplierOpen}
        onOpenChange={onSupplierOpenChange}
        initialData={null}
        onSubmit={handleAddSupplierSubmit}
        isLoading={isAddingSupplier}
      />

    </div>
  );
};

export default PharmacistPendingDashboard;
