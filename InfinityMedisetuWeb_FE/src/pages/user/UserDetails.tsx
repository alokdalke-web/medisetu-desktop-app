import React from "react";
import { Button, Card, CardBody, Modal, addToast } from "@heroui/react";
import { Avatar } from "@heroui/avatar";
import { useGetDoctorByIdQuery } from "../../redux/api/doctorApi";
import { Link, useParams } from "react-router";
import { FiChevronRight, FiEdit2 } from "react-icons/fi";
import EditUserModal from "../../components/shared/Modals/EditUserModal";
import { useUpdateAddUserMutation } from "../../redux/api/usersApi";

const normalizeUserStatus = (status?: string): "Active" | "Inactive" =>
  String(status ?? "").toLowerCase() === "inactive" ? "Inactive" : "Active";

const displayValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
};

const hasDisplayValue = (value: unknown) => {
  if (value === null || value === undefined) return false;
  return String(value).trim() !== "";
};

const cleanOptionalString = (value: unknown) => {
  const text = String(value ?? "").trim();
  return text;
};

const isValidMobile = (value: unknown) => /^[6-9]\d{9}$/.test(String(value ?? "").trim());

const UserDetails = () => {
  const { id: userId } = useParams();
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [updateAddUser, { isLoading: isUpdating }] = useUpdateAddUserMutation();

  const { data, isLoading, refetch } = useGetDoctorByIdQuery(userId ?? "", {
    skip: !userId,
  });

  const user = data?.result as any;

  const fields = [
    { label: "Email", value: user?.email },
    { label: "Mobile", value: user?.mobile },
    { label: "Alternate Mobile", value: user?.alternateMobile },
    { label: "Gender", value: user?.gender },
    { label: "Address", value: user?.address },
    { label: "City", value: user?.city },
    // { label: "State", value: user?.state || "-" },
    // { label: "User Type", value: user?.userType },
    // { label: "Status", value: user?.userStatus },
    { label: "Qualification", value: user?.qualification },
    { label: "Experience", value: user?.yearsOfExperience },
    // { label: "License Number", value: user?.licenseNumber || "-" },
    // { label: "Speciality", value: user?.speciality || "-" },
    // { label: "Age", value: user?.age || "-" },
    // { label: "Date of Birth", value: user?.dob || "-" },
    // { label: "Medical Notes", value: user?.notesMedicalHistory || "-" },
  ].filter((item) => hasDisplayValue(item.value));

  const closeEdit = () => setIsEditOpen(false);

  const saveEdit = async (updatedUser: any) => {
    const id = String(updatedUser?.id ?? userId ?? "").trim();
    const name = String(updatedUser?.name ?? "").trim();
    const mobile = cleanOptionalString(updatedUser?.mobile);

    if (!id) {
      addToast({
        title: "Update failed",
        description: "User id is missing.",
        color: "danger",
      });
      return;
    }

    if (!name) {
      addToast({
        title: "Invalid name",
        description: "Name is required.",
        color: "danger",
      });
      return;
    }

    if (!mobile || !isValidMobile(mobile)) {
      addToast({
        title: "Invalid mobile",
        description: "Invalid input.",
        color: "danger",
      });
      return;
    }

    try {
      await updateAddUser({
        id,
        body: {
          name,
          mobile,
          userStatus: normalizeUserStatus(updatedUser?.userStatus),
        },
      }).unwrap();

      addToast({
        title: "User updated",
        description: "User details updated successfully.",
        color: "success",
      });

      closeEdit();
      refetch();
    } catch (err: any) {
      addToast({
        title: "Update failed",
        description:
          err?.data?.message || err?.message || "Unable to update user details.",
        color: "danger",
      });
    }
  };

  if (isLoading)
    return <div className="p-6 text-center">Loading User Profile...</div>;

  return (
    <div className="p-6">


      <nav
        className="mb-4 flex items-center gap-2 text-sm text-slate-500"
        aria-label="Breadcrumb"
      >
        <Link
          to="/users"
          className="transition hover:text-slate-900 hover:underline"
        >
          Users
        </Link>
        <FiChevronRight className="opacity-60" aria-hidden />
        <span className="font-medium text-primary">User Details</span>
      </nav>

      <div className="space-y-5">
        <Card
          shadow="none"
          radius="lg"
          className="border border-gray-200 bg-white"
        >
          <CardBody className="p-0">
            <div className="flex items-center justify-between gap-3 px-5 pt-4">
              <h2 className="text-[15px] font-semibold">User Information</h2>
              <Button
                isIconOnly
                size="sm"
                radius="full"
                variant="bordered"
                className="h-9 w-9 min-w-9 border-slate-200 bg-white text-slate-600 shadow-sm hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                onPress={() => setIsEditOpen(true)}
                isDisabled={!user || isUpdating}
                aria-label="Edit user details"
                title="Edit user details"
              >
                <FiEdit2 className="text-[15px]" />
              </Button>
            </div>
            <hr className="mt-3 border-t border-gray-200" />
            <div className="p-5">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar
                      src={user?.profileImage ?? undefined}
                      name={user?.name ?? "User"}
                      radius="full"
                    />
                    <div>
                      <div className="text-base font-semibold">
                        {displayValue(user?.name)}
                      </div>
                      {/* <div className="text-sm text-slate-500">
                        {user?.age} yrs, {user?.gender}
                      </div> */}
                    </div>
                  </div>
                </div>

                <div className="grid gap-8 md:grid-cols-4">
                  {fields.map((item) => (
                    <div key={item.label}>
                      <div className="text-xs text-slate-500">{item.label}</div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span>{displayValue(item.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* <div className="mt-2">
                  <div className="text-xs font-medium text-slate-500">
                    Notes / Medical Summary
                  </div>
                  <div className="mt-1 text-sm text-slate-700">
                    {user?.notesMedicalHistory || "N/A"}
                  </div>
                </div> */}
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <Modal
        isOpen={isEditOpen}
        hideCloseButton
        onOpenChange={(open) => {
          setIsEditOpen(open);
        }}
        placement="center"
        size="xl"
      >
        <EditUserModal
          editForm={
            user
              ? {
                  ...user,
                  id: user?.id ?? userId,
                  mobile: user?.mobile ?? "",
                  userStatus: normalizeUserStatus(user?.userStatus),
                }
              : null
          }
          userType={user?.userType}
          isUpdating={isUpdating}
          closeEdit={closeEdit}
          saveEdit={saveEdit}
        />
      </Modal>
    </div>
  );
};

export default UserDetails;