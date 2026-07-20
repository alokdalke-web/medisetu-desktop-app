import { Button, Input, Modal, addToast } from "@heroui/react";
import React, { useState } from "react";
import { FiChevronLeft, FiMapPin, FiPhone } from "react-icons/fi";
import { useNavigate, useParams } from "react-router";

import {
  useGetPharmacyByIdQuery,
  useUpdatePharmacyMutation,
  type PharmacyStatus,
} from "../../../redux/api/pharmacyApi";

// ✅ user update mutation (RTK)
import { useUpdateAddUserMutation } from "../../../redux/api/usersApi";

import AddMemberModal from "./AddMemberModal";
import AppButton from "../../../components/shared/AppButton";
import EditButton from "../../../components/shared/EditButton";
import EditPharmacyModal from "../../../components/shared/Modals/EditPharmacyModal";
import EditStaffUserModal from "../../../components/shared/Modals/EditStaffUserModal";

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
    else if (!/^[6-9]\d{9}$/.test(editContact.trim())) e.contact = "Must be 10 digits starting with 6-9";
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

  if (isLoading) {
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
        {/* Back link */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <FiChevronLeft size={14} />
          Back to Configuration
        </button>

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
                label="Address"
                placeholder="Enter full address"
                labelPlacement="outside"
                variant="bordered"
                radius="lg"
                value={editAddress}
                onValueChange={setEditAddress}
                onBlur={() => handleEditBlur("address")}
                isDisabled={isUpdating}
                isRequired
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

        {/* Staff Details */}
        <div>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold dark:text-white sm:text-xl">Staff Details</h3>

            <AppButton
              text="Add New Member"
              onPress={() => setIsAddMemberModalOpen(true)}
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
                      <th className="px-6 py-4 font-medium text-right">
                        Action
                      </th>
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
                          className={`hover:bg-gray-50 ${
                            idx !== staff.length - 1
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

                          <td className="px-6 py-5 text-right">
                            <EditButton
                              text=""
                              onPress={() => openUserEdit(member)}
                              isDisabled={isLoading}
                            />
                          </td>
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
    </>
  );
};

export default PharmacyDetails;
