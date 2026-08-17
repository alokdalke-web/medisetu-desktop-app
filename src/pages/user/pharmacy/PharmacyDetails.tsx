import { Button, Input, Modal, Spinner, addToast, useDisclosure } from "@heroui/react";
import React, { useState } from "react";
import {
  FiCheckCircle,
  FiClock,
  FiEdit2,
  FiFileText,
  FiMapPin,
  FiPhone,
  FiPlus,
  FiTrash2,
  FiXCircle,
} from "react-icons/fi";
import { useNavigate, useParams } from "react-router";

import { useGetUserQuery } from "../../../redux/api/authApi";
import {
  useGetPharmacyByIdQuery,
  useUpdatePharmacyMutation,
  type PharmacyStatus,
} from "../../../redux/api/pharmacyApi";
import { useGetAllClinicsQuery } from "../../../redux/api/clinicApi";
import {
  useAddAdminMedicineMutation,
  useGetAdminMedicinesByPharmacyIdQuery,
  useUpdateAdminMedicineMutation,
  type AddMedicineRequest,
  type Medicine,
  type UpdateMedicineRequest,
} from "../../../redux/api/pharmaciesApi";
import { normalizeStatus } from "../../../utils/clinicSetupStatus";

// ✅ user update mutation (RTK)
import { useUpdateAddUserMutation } from "../../../redux/api/usersApi";

import AddMemberModal from "./AddMemberModal";
import AppButton from "../../../components/shared/AppButton";
import EditButton from "../../../components/shared/EditButton";
import EditPharmacyModal from "../../../components/shared/Modals/EditPharmacyModal";
import EditStaffUserModal from "../../../components/shared/Modals/EditStaffUserModal";
import PageBackNav from "../../../components/shared/PageBackNav";
import SearchField from "../../../components/shared/SearchField";
import MedicineFormModal from "../../pharmacies/component/MedicineFormModal";

/* ---------------- Metric card (mirrors LabDetails.tsx) ---------------- */

const MetricCard = ({
  title,
  value,
  icon,
  tone = "slate",
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tone?: "slate" | "green" | "amber" | "purple" | "rose";
}) => {
  const toneStyles =
    tone === "green"
      ? "bg-primary/10 text-primary ring-1 ring-primary/20"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60"
        : tone === "purple"
          ? "bg-purple-50 text-purple-700 ring-1 ring-purple-200/60"
          : tone === "rose"
            ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60"
            : "bg-slate-50 text-slate-700 ring-1 ring-slate-200/60";

  return (
    <div className="group rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
      <div className="flex items-center gap-3">
        <div
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:h-11 sm:w-11",
            toneStyles,
          ].join(" ")}
        >
          <span className="text-[16px] sm:text-[18px] leading-none">
            {icon}
          </span>
        </div>

        <div className="min-w-0">
          <div className="text-[11px] font-medium text-slate-500 sm:text-[12px]">
            {title}
          </div>
          <div className="mt-1 text-[16px] font-bold text-slate-950 sm:text-[18px]">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
};

/* Stock status coloring, mirrors PharmacistMedicines.tsx's getStockStatus */
const getStockStatus = (
  availableQuantity: number,
  reorder: number,
): { className: string; label: string } => {
  if (availableQuantity === 0) {
    return { className: "border-slate-200 bg-slate-50 text-slate-600", label: "Empty" };
  }
  if (availableQuantity <= reorder) {
    return { className: "border-red-200 bg-red-50 text-red-700", label: "Low" };
  }
  if (availableQuantity <= reorder * 3) {
    return { className: "border-amber-200 bg-amber-50 text-amber-700", label: "Medium" };
  }
  return { className: "border-primary/20 bg-primary/10 text-primary", label: "Good" };
};

/* ---------------- types ---------------- */

type EditPharmacyForm = {
  name: string;
  address: string;
  contactDigits: string; // ✅ only 10 digits
  status: PharmacyStatus; // "active" | "deactive"
};

type UserStatus = "Active" | "Inactive";

type EditUserForm = {
  id?: string;
  name: string;
  email?: string;
  mobileDigits: string; // ✅ only 10 digits
  userStatus: UserStatus;
};

function to10Digits(raw?: string) {
  const d = String(raw ?? "").replace(/\D/g, "");
  return d.length > 10 ? d.slice(-10) : d.slice(0, 10);
}

const PharmacyDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: user, isLoading: isUserLoading } = useGetUserQuery();
  const isPendingApproval = normalizeStatus(user?.userStatus) === "pending";

  const { data: clinicRes } = useGetAllClinicsQuery();

  const handleUseClinicAddress = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const clinic = (clinicRes as any)?.clinic;
    if (clinic) {
      const parts = [
        clinic.clinicAddress,
        clinic.City,
        clinic.State,
      ].filter((p) => p && String(p).trim());
      setEditAddress(parts.join(", "));
    } else {
      addToast({
        title: "Info",
        description: "Clinic address not found",
        color: "warning",
      });
    }
  };

  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);

  // Inline edit state
  const [isEditingPharmacy, setIsEditingPharmacy] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editStatus, setEditStatus] = useState<PharmacyStatus>("active");
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editTouched, setEditTouched] = useState<Record<string, boolean>>({});

  // ✅ edit pharmacy modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditPharmacyForm | null>(null);

  // ✅ edit staff user modal
  const [isUserEditOpen, setIsUserEditOpen] = useState(false);
  const [userEditForm, setUserEditForm] = useState<EditUserForm | null>(null);

  const { data, isLoading, isError, refetch } =
    useGetPharmacyByIdQuery(id ?? "", { skip: !id });

  React.useEffect(() => {
    if (!isUserLoading && isPendingApproval) {
      navigate("/users?type=Pharmacist&role=Pharmacist", { replace: true });
    }
  }, [isPendingApproval, isUserLoading, navigate]);

  // ✅ API response me mostly { success, result: { pharmacy, users } }
  const pharmacy = (data as any)?.pharmacy ?? (data as any)?.result?.pharmacy;
  const staff =
    (data as any)?.staff ??
    (data as any)?.users ??
    (data as any)?.result?.users ??
    [];

  // ✅ real id from response
  const pharmacyRealId = String(pharmacy?.id ?? id ?? "").trim();

  const [updatePharmacy, { isLoading: isUpdating }] =
    useUpdatePharmacyMutation();

  // ✅ RTK user update mutation
  const [updateAddUser, { isLoading: isUserUpdating }] =
    useUpdateAddUserMutation();

  const isActive = pharmacy?.status === "active";
  const isDeactive = pharmacy?.status === "deactive";

  const analytics = pharmacy?.analytics ?? {};
  const prescriptionsTotal = analytics?.prescriptionsTotal ?? 0;
  const prescriptionsCompleted = analytics?.prescriptionsCompleted ?? 0;
  const prescriptionsPending = analytics?.prescriptionsPending ?? 0;
  const prescriptionsRejected = analytics?.prescriptionsRejected ?? 0;

  /* ---------------- Medicine inventory ---------------- */
  const [medicinePage, setMedicinePage] = useState(1);
  const [medicineSearch, setMedicineSearch] = useState("");
  const [debouncedMedicineSearch, setDebouncedMedicineSearch] = useState("");
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const {
    isOpen: isMedicineModalOpen,
    onOpen: openMedicineModal,
    onOpenChange: onMedicineModalOpenChange,
  } = useDisclosure();

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMedicineSearch(medicineSearch);
      setMedicinePage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [medicineSearch]);

  const { data: medicinesData, isFetching: isMedicinesFetching } =
    useGetAdminMedicinesByPharmacyIdQuery(
      {
        pharmacyId: id ?? "",
        pageNumber: medicinePage,
        pageSize: 10,
        search: debouncedMedicineSearch,
      },
      { skip: !id },
    );
  const medicines = medicinesData?.data ?? [];
  const medicinesPagination = medicinesData?.pagination;

  const [addAdminMedicine, { isLoading: isAddingMedicine }] =
    useAddAdminMedicineMutation();
  const [updateAdminMedicine, { isLoading: isUpdatingMedicine }] =
    useUpdateAdminMedicineMutation();

  const handleOpenAddMedicine = () => {
    setSelectedMedicine(null);
    openMedicineModal();
  };

  const handleOpenEditMedicine = (medicine: Medicine) => {
    setSelectedMedicine(medicine);
    openMedicineModal();
  };

  const handleMedicineFormSubmit = async (
    data: AddMedicineRequest | UpdateMedicineRequest,
  ) => {
    if (!pharmacyRealId) return;
    try {
      if (selectedMedicine) {
        await updateAdminMedicine({
          pharmacyId: pharmacyRealId,
          medicineId: selectedMedicine.id,
          body: data as UpdateMedicineRequest,
        }).unwrap();
      } else {
        await addAdminMedicine({
          pharmacyId: pharmacyRealId,
          body: data as AddMedicineRequest,
        }).unwrap();
      }
      addToast({
        title: "Success",
        description: selectedMedicine ? "Medicine updated successfully" : "Medicine added successfully",
        color: "success",
      });
      setSelectedMedicine(null);
    } catch (error: any) {
      addToast({
        title: "Error",
        description: error?.data?.message || "Failed to save medicine",
        color: "danger",
      });
      throw error;
    }
  };

  const handleDeleteMedicine = async (medicine: Medicine) => {
    if (!pharmacyRealId) return;
    try {
      await updateAdminMedicine({
        pharmacyId: pharmacyRealId,
        medicineId: medicine.id,
        body: { status: "inactive" },
      }).unwrap();
      addToast({
        title: "Medicine removed",
        description: `${medicine.medicineName} marked inactive.`,
        color: "success",
      });
    } catch (error: any) {
      addToast({
        title: "Error",
        description: error?.data?.message || "Failed to remove medicine",
        color: "danger",
      });
    }
  };

  const openEdit = () => {
    if (!pharmacy) return;
    setEditName(pharmacy.name ?? "");
    setEditAddress(pharmacy.address ?? "");
    setEditContact(to10Digits(pharmacy.contactNumber));
    setEditStatus((pharmacy.status ?? "active") as PharmacyStatus);
    setEditErrors({});
    setEditTouched({});
    setIsEditingPharmacy(true);
  };

  const validateEdit = () => {
    const e: Record<string, string> = {};
    if (!editName.trim()) e.name = "Pharmacy name is required";
    if (!editAddress.trim()) e.address = "Address is required";
    if (!editContact.trim()) e.contact = "Contact number is required";
    else if (!/^[6-9]\d{9}$/.test(editContact.trim())) e.contact = "Must be Valid 10 digits";
    setEditErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleEditBlur = (field: string) => {
    setEditTouched((p) => ({ ...p, [field]: true }));
    validateEdit();
  };

  const handleSaveEdit = async () => {
    setEditTouched({ name: true, address: true, contact: true });
    if (!validateEdit()) return;
    await savePharmacy({
      name: editName.trim(),
      address: editAddress.trim(),
      contactDigits: editContact.trim(),
      status: editStatus,
    });
    setIsEditingPharmacy(false);
  };

  const closeEdit = () => {
    setIsEditingPharmacy(false);
  };

  const savePharmacy = async (data: EditPharmacyForm) => {
    const dataToSave = data;
    if (!pharmacyRealId || !dataToSave) return;

    if (dataToSave.contactDigits && dataToSave.contactDigits.length !== 10) {
      addToast({
        title: "Invalid contact",
        description: "Contact number must be exactly 10 digits.",
        color: "danger",
      });
      return;
    }

    try {
      await updatePharmacy({
        id: pharmacyRealId,
        body: {
          name: dataToSave.name.trim(),
          address: dataToSave.address.trim(),
          contactNumber: dataToSave.contactDigits.trim(),
          status: dataToSave.status,
        },
      }).unwrap();

      addToast({
        title: "Pharmacy updated",
        description: "Changes saved successfully.",
        color: "success",
      });

      closeEdit();
      refetch();
    } catch (e: any) {
      addToast({
        title: "Update failed",
        description:
          e?.data?.message || e?.message || "Unable to update pharmacy.",
        color: "danger",
      });
    }
  };

  /* ---------------- Staff user edit logic ---------------- */

  const openUserEdit = (member: any) => {
    const userId = String(member?.id ?? "").trim();
    if (!userId) return;

    setUserEditForm({
      id: userId,
      name: member?.name ?? "",
      email: member?.email ?? "",
      mobileDigits: to10Digits(member?.mobile),
      userStatus: (member?.userStatus ?? "Active") as UserStatus,
    });
    setIsUserEditOpen(true);
  };

  const closeUserEdit = () => {
    setIsUserEditOpen(false);
    setUserEditForm(null);
  };

  const saveUser = async (data: EditUserForm) => {
    const dataToSave = data;
    if (!dataToSave?.id) return;

    if (!dataToSave.name.trim()) {
      addToast({
        title: "Invalid name",
        description: "Name is required.",
        color: "danger",
      });
      return;
    }

    if (dataToSave.mobileDigits && dataToSave.mobileDigits.length !== 10) {
      addToast({
        title: "Invalid mobile",
        description: "Mobile number must be exactly 10 digits.",
        color: "danger",
      });
      return;
    }

    try {
      // ✅ CALL: /users/UpdateAdduser/${id}
      await updateAddUser({
        id: dataToSave.id,
        body: {
          name: dataToSave.name.trim(),
          email: (dataToSave.email || "").trim(),
          mobile: dataToSave.mobileDigits.trim(),
          userStatus: dataToSave.userStatus,
        },
      }).unwrap();

      addToast({
        title: "User updated",
        description: "Staff member updated successfully.",
        color: "success",
      });

      closeUserEdit();
      refetch();
    } catch (e: any) {
      addToast({
        title: "Update failed",
        description: e?.data?.message || e?.message || "Unable to update user.",
        color: "danger",
      });
    }
  };

  if (isUserLoading || isPendingApproval || isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 rounded bg-gray-200 sm:w-1/4" />
          <div className="h-64 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  if (isError || !pharmacy) {
    return (
      <div className="p-4 sm:p-6 text-center">
        <p className="text-slate-500">Pharmacy not found</p>
        <Button className="mt-4" onPress={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto w-full space-y-5">
        <PageBackNav
          backTo="/configuration"
          crumbs={[
            { label: "Configuration", to: "/configuration" },
            { label: "Pharmacy Details" },
          ]}
        />

        {/* Header — flat, no card */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-base font-bold text-white shadow-sm sm:h-12 sm:w-12">
              {(pharmacy.name ?? "P").charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[20px] font-semibold text-slate-950 dark:text-white sm:text-[24px]">
                  {pharmacy.name}
                </h1>
                <span
                  className={[
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border",
                    isActive
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "bg-red-50 text-red-700 border-red-200",
                  ].join(" ")}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-primary" : "bg-red-500"}`} />
                  {isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-slate-500 dark:text-slate-400 sm:text-[13px]">
                {pharmacy.contactNumber && (
                  <div className="flex items-center gap-1.5">
                    <FiPhone className="text-slate-400 shrink-0" size={12} />
                    <span>{pharmacy.contactNumber}</span>
                  </div>
                )}
                {pharmacy.address && (
                  <>
                    <span className="hidden h-3 w-[1px] bg-slate-200 dark:bg-slate-700 sm:inline-block" />
                    <div className="flex items-center gap-1.5">
                      <FiMapPin className="text-slate-400 shrink-0" size={12} />
                      <span className="truncate max-w-[250px]">{pharmacy.address}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Edit button */}
          <div className="shrink-0">
            <EditButton text="" onPress={openEdit} disabled={isLoading || isEditingPharmacy} />
          </div>
        </div>

        {/* Inline Edit Form */}
        {isEditingPharmacy && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-[#273244] dark:bg-[#111726]">
            <h3 className="mb-4 text-[15px] font-semibold text-slate-800 dark:text-white">
              Edit Pharmacy
            </h3>
            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                label="Pharmacy Name"
                placeholder="Enter pharmacy name"
                labelPlacement="outside"
                variant="bordered"
                radius="lg"
                value={editName}
                onValueChange={setEditName}
                onBlur={() => handleEditBlur("name")}
                isDisabled={isUpdating}
                isRequired
                isInvalid={editTouched.name && !!editErrors.name}
                errorMessage={editTouched.name ? editErrors.name : undefined}
                description="Displayed as your pharmacy name"
              />
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-slate-700 dark:text-slate-300">
                  Status <span className="text-danger">*</span>
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as PharmacyStatus)}
                  disabled={isUpdating}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[14px] text-slate-800 outline-none transition-colors hover:border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-[#273244] dark:bg-[#111726] dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="deactive">Inactive</option>
                </select>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Inactive pharmacies cannot process orders</p>
              </div>
              <Input
                label={
                  <div className="flex items-center justify-between w-full" onClick={(e) => e.stopPropagation()}>
                    <span>Address <span className="text-danger">*</span></span>
                    <button
                      type="button"
                      onClick={handleUseClinicAddress}
                      className="ms-2 text-[11px] font-medium text-primary hover:text-white border border-primary/30 bg-primary/5 hover:bg-primary rounded-full px-2.5 py-0.5 transition-all duration-200 active:scale-95 shadow-sm cursor-pointer"
                    >
                      Use Clinic Address
                    </button>
                  </div>
                }
                placeholder="Enter full address"
                labelPlacement="outside"
                variant="bordered"
                radius="lg"
                value={editAddress}
                onValueChange={setEditAddress}
                onBlur={() => handleEditBlur("address")}
                isDisabled={isUpdating}
                isRequired={false}
                isInvalid={editTouched.address && !!editErrors.address}
                errorMessage={editTouched.address ? editErrors.address : undefined}
                description="Street, area, city"
              />
              <Input
                label="Contact Number"
                placeholder="10-digit number"
                labelPlacement="outside"
                variant="bordered"
                radius="lg"
                type="tel"
                maxLength={10}
                value={editContact}
                onValueChange={(v) => setEditContact(v.replace(/\D/g, "").slice(0, 10))}
                onBlur={() => handleEditBlur("contact")}
                isDisabled={isUpdating}
                isRequired
                isInvalid={editTouched.contact && !!editErrors.contact}
                errorMessage={editTouched.contact ? editErrors.contact : undefined}
                description="10-digit Indian mobile number"
              />
            </div>
            <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4 dark:border-[#273244]">
              <AppButton
                text="Cancel"
                buttonVariant="outlined"
                onPress={() => setIsEditingPharmacy(false)}
                isDisabled={isUpdating}
              />
              <AppButton
                text={isUpdating ? "Saving..." : "Save Changes"}
                buttonVariant="primary"
                onPress={handleSaveEdit}
                isDisabled={isUpdating}
              />
            </div>
          </div>
        )}

        <section className="stats-scroll">
          <MetricCard
            title="Total Prescriptions"
            value={prescriptionsTotal}
            icon={<FiFileText />}
            tone="slate"
          />
          <MetricCard
            title="Completed"
            value={prescriptionsCompleted}
            icon={<FiCheckCircle />}
            tone="green"
          />
          <MetricCard
            title="Pending"
            value={prescriptionsPending}
            icon={<FiClock />}
            tone="amber"
          />
          <MetricCard
            title="Rejected"
            value={prescriptionsRejected}
            icon={<FiXCircle />}
            tone="rose"
          />
        </section>

        {/* Medicine Inventory */}
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <h2 className="shrink-0 text-[15px] font-bold text-slate-950 sm:text-[16px]">
              Medicine Inventory
            </h2>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="w-full sm:w-[260px]">
                <SearchField
                  placeholder="Search medicines by name, SKU, brand..."
                  value={medicineSearch}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMedicineSearch(e.target.value)}
                  onClear={() => setMedicineSearch("")}
                  maxLength={50}
                />
              </div>
              <AppButton
                text="Add Medicine"
                onPress={handleOpenAddMedicine}
                buttonVariant="primary"
                className="h-10 w-full rounded-lg px-4 font-semibold sm:w-auto"
                startContent={<FiPlus className="text-[14px]" />}
                isDisabled={isDeactive}
              />
            </div>
          </div>

          {isMedicinesFetching ? (
            <div className="flex items-center gap-2 px-5 py-8 text-sm text-slate-500">
              <Spinner size="sm" />
              Loading medicine inventory...
            </div>
          ) : medicines.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-lg bg-slate-50 text-slate-500 ring-1 ring-slate-200">
                <FiFileText className="text-[22px]" />
              </div>
              <div className="mt-3 text-sm font-bold text-slate-950">
                No medicines in inventory
              </div>
              <div className="mt-1 max-w-sm text-[13px] text-slate-500">
                Add medicines to build this pharmacy's inventory catalog.
              </div>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="space-y-3 p-3 md:hidden">
                {medicines.map((item) => {
                  const stockStatus = getStockStatus(item.availableQuantity, item.reorder);
                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-[14px] font-bold text-slate-950">
                            {item.medicineName}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-500">
                            {item.category || "—"} • {item.brandName || "—"}
                          </div>
                        </div>
                        <span
                          className={[
                            "shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold",
                            item.status === "active"
                              ? "border-primary/20 bg-primary/10 text-primary"
                              : "border-rose-200 bg-rose-50 text-rose-700",
                          ].join(" ")}
                        >
                          {item.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
                        <div className="rounded-lg bg-slate-50 px-3 py-2">
                          <div className="text-[11px] font-medium text-slate-500">SKU</div>
                          <div className="mt-0.5 font-semibold text-slate-900">{item.sku || "—"}</div>
                        </div>
                        <div className="rounded-lg bg-slate-50 px-3 py-2">
                          <div className="text-[11px] font-medium text-slate-500">Available Qty</div>
                          <div className="mt-0.5">
                            <span
                              className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${stockStatus.className}`}
                            >
                              {item.availableQuantity} ({stockStatus.label})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          onClick={() => handleOpenEditMedicine(item)}
                          className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-600"
                          title="Edit"
                          aria-label={`Edit ${item.medicineName}`}
                          disabled={isDeactive}
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMedicine(item)}
                          className="grid h-9 w-9 place-items-center rounded-full border border-red-100 bg-red-50 text-red-600"
                          title="Delete"
                          aria-label={`Delete ${item.medicineName}`}
                          disabled={isDeactive || item.status === "inactive"}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-[13px]">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-slate-500">
                        <th className="px-5 py-3 font-semibold">SKU</th>
                        <th className="px-5 py-3 font-semibold">Medicine Name</th>
                        <th className="px-5 py-3 font-semibold">Category</th>
                        <th className="px-5 py-3 font-semibold">Brand</th>
                        <th className="px-5 py-3 font-semibold">Form</th>
                        <th className="px-5 py-3 font-semibold">Available Qty</th>
                        <th className="px-5 py-3 font-semibold">Status</th>
                        <th className="px-5 py-3 text-right font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {medicines.map((item) => {
                        const stockStatus = getStockStatus(item.availableQuantity, item.reorder);
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/80">
                            <td className="px-5 py-4 font-semibold text-slate-700">{item.sku || "—"}</td>
                            <td className="px-5 py-4">
                              <div className="font-bold text-slate-950">{item.medicineName}</div>
                              {item.packOf ? (
                                <div className="text-[11px] text-slate-500">Pack of {item.packOf}</div>
                              ) : null}
                            </td>
                            <td className="px-5 py-4 text-slate-700">{item.category || "—"}</td>
                            <td className="px-5 py-4 text-slate-700">{item.brandName || "—"}</td>
                            <td className="px-5 py-4 text-slate-700">{item.form || "—"}</td>
                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${stockStatus.className}`}
                              >
                                {item.availableQuantity} ({stockStatus.label})
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={[
                                  "inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                                  item.status === "active"
                                    ? "border-primary/20 bg-primary/10 text-primary"
                                    : "border-rose-200 bg-rose-50 text-rose-700",
                                ].join(" ")}
                              >
                                {item.status === "active" ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditMedicine(item)}
                                  className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 transition-all duration-200 hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                                  title="Edit"
                                  aria-label={`Edit ${item.medicineName}`}
                                  disabled={isDeactive}
                                >
                                  <FiEdit2 />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMedicine(item)}
                                  className="grid h-9 w-9 place-items-center rounded-full border border-red-100 bg-red-50 text-red-600 transition-all duration-200 hover:bg-red-100"
                                  title="Delete"
                                  aria-label={`Delete ${item.medicineName}`}
                                  disabled={isDeactive || item.status === "inactive"}
                                >
                                  <FiTrash2 />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {medicinesPagination && medicinesPagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-[13px] text-slate-500">
                  <span>
                    Page {medicinesPagination.currentPage} of {medicinesPagination.totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMedicinePage((p) => Math.max(1, p - 1))}
                      disabled={medicinesPagination.currentPage <= 1}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setMedicinePage((p) => Math.min(medicinesPagination.totalPages, p + 1))
                      }
                      disabled={medicinesPagination.currentPage >= medicinesPagination.totalPages}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* Staff Details */}
        <div>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold dark:text-white sm:text-xl">Staff Details</h3>

            <AppButton
              text="Pharma Users"
              onPress={() => navigate(`/users?role=Pharmacist&type=Pharmacist`)}
              buttonVariant="primary"
              isDisabled={isDeactive}
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* ✅ MOBILE: Cards (fixed: overflow + email/phone wrap) */}
            <div className="space-y-3 p-4 md:hidden">
              {staff.length === 0 ? (
                <div className="py-10 text-center text-slate-500">
                  No staff members found
                </div>
              ) : (
                staff.map((member: any) => {
                  const st = String(member?.userStatus ?? "").toLowerCase();
                  const statusCls =
                    st === "active"
                      ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                      : "bg-rose-50 text-rose-700 ring-1 ring-rose-200";

                  return (
                    <div
                      key={member.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-900">
                            {member.name ?? "-"}
                          </div>
                          <div className="truncate text-xs text-slate-500">
                            {member.userType ?? "-"}
                          </div>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${statusCls}`}
                        >
                          {member.userStatus ?? "-"}
                        </span>
                      </div>

                      {/* ✅ mobile detail rows: grid so values never overflow */}
                      <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
                        <div className="grid grid-cols-[78px_1fr] gap-x-3 gap-y-2">
                          <div className="text-xs text-slate-500">Phone</div>
                          <div className="min-w-0 text-right text-xs text-slate-900 break-words">
                            {member.mobile ?? "-"}
                          </div>

                          <div className="text-xs text-slate-500">Email</div>
                          <div className="min-w-0 text-right text-xs text-slate-900 break-all">
                            {member.email ?? "-"}
                          </div>

                          <div className="text-xs text-slate-500">Joined</div>
                          <div className="text-right text-xs text-slate-900">
                            {member.createdAt
                              ? new Date(member.createdAt).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                },
                              )
                              : "-"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <EditButton
                          text=""
                          onPress={() => openUserEdit(member)}
                          isDisabled={isLoading}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ✅ DESKTOP: Table (same look, only safe truncation added) */}
            <div className="hidden md:block">
              <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <table className="min-w-full text-[14px]">
                  <thead className="border-b border-slate-200">
                    <tr className="text-left text-slate-500">
                      <th className="px-6 py-4 font-medium">Name</th>
                      <th className="px-6 py-4 font-medium">Role</th>
                      <th className="px-6 py-4 font-medium">Phone</th>
                      <th className="px-6 py-4 font-medium">Email</th>
                      <th className="px-6 py-4 font-medium">Joined Date</th>
                      {/* <th className="px-6 py-4 font-medium text-right">
                        Action
                      </th> */}
                    </tr>
                  </thead>

                  <tbody>
                    {staff.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-10 text-center text-slate-500"
                        >
                          No staff members found
                        </td>
                      </tr>
                    ) : (
                      staff.map((member: any, idx: number) => (
                        <tr
                          key={member.id}
                          className={`hover:bg-gray-50 ${idx !== staff.length - 1
                            ? "border-b border-slate-200"
                            : ""
                            }`}
                        >
                          <td className="px-6 py-5 font-medium">
                            {member.name}
                          </td>

                          <td className="px-6 py-5">
                            <div className="text-gray-800">
                              {member.userType}
                            </div>
                            <div
                              className={[
                                "text-xs font-medium",
                                String(member.userStatus).toLowerCase() ===
                                "active"
                                  ? "text-primary"
                                  : "text-red-600",
                              ].join(" ")}
                            >
                              {member.userStatus ?? "-"}
                            </div>
                          </td>

                          <td className="px-6 py-5">{member.mobile ?? "-"}</td>

                          <td className="px-6 py-5">
                            <span className="block max-w-[320px] truncate">
                              {member.email ?? "-"}
                            </span>
                          </td>

                          <td className="px-6 py-5">
                            <div className="text-gray-800">
                              {member.createdAt
                                ? new Date(member.createdAt).toLocaleDateString(
                                  "en-US",
                                  {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  },
                                )
                                : "-"}
                            </div>
                            <div className="text-xs text-slate-500">
                              {member.createdAt
                                ? new Date(member.createdAt).toLocaleTimeString(
                                  "en-US",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )
                                : ""}
                            </div>
                          </td>

                          {/* <td className="px-6 py-5 text-right">
                            <EditButton
                              text=""
                              onPress={() => openUserEdit(member)}
                              isDisabled={isLoading}
                            />
                          </td> */}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Member Modal */}
      {id && (
        <AddMemberModal
          isOpen={isAddMemberModalOpen}
          onClose={() => setIsAddMemberModalOpen(false)}
          pharmacyId={id}
        />
      )}

      {/* ✅ Edit Pharmacy Modal */}

      <Modal
        isOpen={isEditOpen}
        hideCloseButton
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) setEditForm(null);
        }}
        placement="center"
        size="sm"
        // classNames={{ base: "max-w-[92vw] sm:max-w-[720px]" }}
      >
        <EditPharmacyModal
          editForm={editForm}
          isUpdating={isUpdating}
          pharmacyRealId={pharmacyRealId}
          closeEdit={() => {
            setIsEditOpen(false);
            setEditForm(null);
          }}
          saveEdit={savePharmacy}
        />
      </Modal>

      <Modal
        isOpen={isUserEditOpen}
        hideCloseButton
        onOpenChange={(open) => {
          setIsUserEditOpen(open);
          if (!open) setUserEditForm(null);
        }}
        placement="center"
        size="sm"
        // classNames={{ base: "max-w-[92vw] sm:max-w-[720px]" }}
      >
        <EditStaffUserModal
          editForm={userEditForm}
          isUpdating={isUserUpdating}
          closeEdit={() => {
            setIsUserEditOpen(false);
            setUserEditForm(null);
          }}
          saveEdit={saveUser}
        />
      </Modal>

      {/* ✅ Add/Edit Medicine Modal */}
      <MedicineFormModal
        isOpen={isMedicineModalOpen}
        onOpenChange={onMedicineModalOpenChange}
        initialData={selectedMedicine}
        onSubmit={handleMedicineFormSubmit}
        isLoading={isAddingMedicine || isUpdatingMedicine}
      />
    </>
  );
};

export default PharmacyDetails;
