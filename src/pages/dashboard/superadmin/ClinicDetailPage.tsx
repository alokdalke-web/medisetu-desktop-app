import {
  Avatar,
  Button,
  Card,
  CardBody,
  Chip,
  Skeleton,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Tabs,
  useDisclosure,
} from "@heroui/react";
import React from "react";
import {
  FiActivity,
  FiAlertCircle,
  FiArrowLeft,
  FiCalendar,
  FiCheckCircle,
  FiChevronRight,
  FiCreditCard,
  FiEdit2,
  FiFileText,
  FiMail,
  FiMapPin,
  FiPhone,
  FiShoppingBag,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import { useNavigate, useParams } from "react-router";
import { useGetClinicDetailQuery } from "../../../redux/api/clinicApi";
import { formatDate } from "../../../utils";
import EditAdminProfileModal from "./EditAdminProfileModal";
import EditClinicModal from "./EditClinicModal";
import AccessDeniedState from "../../../components/shared/AccessDeniedState";

const ClinicDetailSkeleton: React.FC = () => {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4 overflow-x-hidden px-3 py-3 sm:space-y-6 sm:px-4 lg:px-0">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-20 rounded-md" />
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-28 rounded-md" />
      </div>

      <Card
        shadow="none"
        radius="lg"
        className="border border-slate-200 bg-white"
      >
        <CardBody className="p-0">
          <div className="px-4 pt-4 sm:px-5">
            <Skeleton className="h-5 w-36 rounded-md" />
          </div>

          <hr className="mt-3 border-t border-slate-200" />

          <div className="p-4 sm:p-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Skeleton className="h-16 w-16 rounded-xl" />

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Skeleton className="h-7 w-52 rounded-md" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-72 max-w-full rounded-md" />
                  <Skeleton className="h-4 w-32 rounded-md" />
                </div>
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:w-auto lg:justify-end">
                <Skeleton className="h-14 w-full rounded-xl sm:w-36" />
                <Skeleton className="h-10 w-full rounded-xl sm:w-32" />
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4 2xl:gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} shadow="none" className="border border-slate-200">
            <CardBody className="flex flex-row items-center gap-4 p-4">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-28 rounded-md" />
                <Skeleton className="h-6 w-20 rounded-md" />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="space-y-5">
        <div className="flex gap-6 overflow-hidden border-b border-slate-200">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-28 shrink-0 rounded-md" />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
          <div className="space-y-4 lg:col-span-1">
            {Array.from({ length: 2 }).map((_, index) => (
              <Card
                key={index}
                shadow="none"
                className="border border-slate-200"
              >
                <CardBody className="space-y-5 p-5">
                  <Skeleton className="h-5 w-40 rounded-md" />
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-14 w-14 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-36 rounded-md" />
                      <Skeleton className="h-4 w-28 rounded-md" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full rounded-md" />
                  <Skeleton className="h-4 w-10/12 rounded-md" />
                </CardBody>
              </Card>
            ))}
          </div>

          <div className="space-y-4 lg:col-span-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <Card
                key={index}
                shadow="none"
                className="border border-slate-200"
              >
                <CardBody className="space-y-5 p-5">
                  <Skeleton className="h-5 w-48 rounded-md" />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, itemIndex) => (
                      <Skeleton key={itemIndex} className="h-24 rounded-xl" />
                    ))}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const OverviewSectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}> = ({ icon, title, action }) => (
  <div className="flex min-h-8 items-center justify-between gap-3">
    <h3 className="flex min-w-0 items-center gap-3 whitespace-nowrap text-[14px] font-bold text-slate-950">
      <span className="shrink-0 text-primary">{icon}</span>
      <span className="truncate">{title}</span>
    </h3>
    {action}
  </div>
);

const OverviewInfoRow: React.FC<{
  label: string;
  value?: React.ReactNode;
  icon?: React.ReactNode;
  title?: string;
  valueClassName?: string;
}> = ({ label, value, icon, title, valueClassName = "" }) => (
  <div className="grid min-w-0 grid-cols-1 gap-1 py-1.5 md:grid-cols-[320px_minmax(0,1fr)] md:items-center">
    <div className="flex min-w-0 items-center gap-3 text-[13px] font-semibold text-slate-500">
      <span className="grid h-5 w-5 shrink-0 place-items-center text-slate-500">
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </div>
    <div
      className={`min-w-0 truncate text-[13px] font-bold text-slate-950 ${valueClassName}`}
      title={title}
    >
      {value ?? "—"}
    </div>
  </div>
);

const ClinicDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const {
    isOpen: isAdminEditOpen,
    onOpen: onAdminEditOpen,
    onOpenChange: onAdminEditOpenChange,
  } = useDisclosure();

  const {
    data: res,
    isLoading,
    error,
  } = useGetClinicDetailQuery(id as string, {
    skip: !id,
  });
  const isAccessDenied = (error as { status?: number } | undefined)?.status === 403;

  const clinicData = res?.data;
  const clinic = clinicData?.clinic;
  const profile = clinicData?.profile;
  const subscription = clinicData?.subscription;
  const counts = clinicData?.counts;
  const users = clinicData?.users || [];
  const pharmacies = clinicData?.pharmacies || [];
  const labs = clinicData?.labs || [];
  const payments = clinicData?.payments || [];
  const registrationNumber =
    String(profile?.registrationNumber ?? "").trim() || "Not provided";

  const handleBack = () => {
    navigate("/clinics");
  };

  if (isLoading) {
    return <ClinicDetailSkeleton />;
  }

  if (isAccessDenied) {
    return (
      <div className="flex h-[400px] items-center justify-center px-4">
        <AccessDeniedState
          message="You don't have permission to view this clinic's details."
          action={
            <Button
              variant="flat"
              onPress={handleBack}
              startContent={<FiArrowLeft />}
            >
              Go Back
            </Button>
          }
        />
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4 px-4 text-center text-slate-500">
        <div className="rounded-full bg-slate-100 p-6">
          <FiMapPin size={48} className="text-slate-300" />
        </div>
        <p className="text-lg font-medium">Clinic record not found</p>
        <Button
          variant="flat"
          onPress={handleBack}
          startContent={<FiArrowLeft />}
        >
          Go Back
        </Button>
      </div>
    );
  }

  const clinicName = clinic.clinicName || "Clinic";
  const clinicTagline = clinic.Tagline || "No tagline provided";
  const clinicPhone = clinic.clinicPhone || "No phone provided";
  const currentPlanName = subscription?.planName || "Free Plan";
  const subscriptionFee =
    subscription?.price !== undefined
      ? `₹${subscription.price.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : "₹0.00";
  const renewalDate = subscription?.expiresAt
    ? formatDate(subscription.expiresAt)
    : "N/A";
  const adminName = profile?.name || "Not provided";
  const adminEmail = profile?.email || "Not provided";
  const adminPhone = profile?.mobile || "Not provided";
  const adminRole = profile?.userType || "Admin";
  const adminStatus = profile?.userStatus || "Active";
  const clinicAddress = clinic.clinicAddress || "Not provided";
  const cityState =
    [clinic.City, clinic.State].filter(Boolean).join(", ") || "Not provided";
  const zipCode = String(clinic.ZipCode ?? "").trim() || "Not provided";

  return (
    <div className="mx-auto w-full space-y-3 overflow-x-hidden px-3 sm:px-4 lg:px-0 2xl:space-y-4 ">
      <style>
        {`
          .clinic-detail-scroll {
            scrollbar-width: thin;
            scrollbar-color: #cbd5e1 transparent;
          }

          .clinic-detail-scroll::-webkit-scrollbar {
            height: 6px;
            width: 6px;
          }

          .clinic-detail-scroll::-webkit-scrollbar-track {
            background: transparent;
          }

          .clinic-detail-scroll::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 999px;
          }

          .clinic-detail-scroll::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}
      </style>

      {/* Breadcrumbs */}
      <nav
        className="clinic-detail-scroll mb-1 flex items-center gap-2 overflow-x-auto whitespace-nowrap text-[13px] font-medium text-slate-500"
        aria-label="Breadcrumb"
      >
        <button
          onClick={handleBack}
          className="shrink-0 transition-colors hover:text-primary"
        >
          Clinics
        </button>
        <FiChevronRight className="shrink-0 opacity-60" />
        <span className="shrink-0 font-medium text-slate-900">
          Clinic Details
        </span>
      </nav>

      {/* Header Section */}
      <Card
        shadow="none"
        radius="lg"
        className="overflow-hidden border border-slate-200 bg-white shadow-sm"
      >
        <CardBody className="p-0">
          <div className="flex min-h-12 items-center border-b border-slate-100 bg-slate-50/80 px-4 py-3">
            <h2 className="text-[14px] font-bold text-slate-950">
              Clinic Information
            </h2>
          </div>

          <div className="p-3 sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar
                  src={clinic.clinicLogo || ""}
                  name={clinicName}
                  className="h-14 w-14 shrink-0 bg-primary/10 text-[18px] font-bold text-primary"
                  radius="lg"
                />

                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <h1
                      className="min-w-0 truncate text-[20px] font-bold leading-tight text-slate-950"
                      title={clinicName}
                    >
                      {clinicName}
                    </h1>
                    <Chip
                      color={clinic.status === "Active" ? "success" : "danger"}
                      variant="flat"
                      size="sm"
                      className="font-semibold"
                      startContent={
                        clinic.status === "Active" ? (
                          <FiCheckCircle size={12} />
                        ) : (
                          <FiAlertCircle size={12} />
                        )
                      }
                    >
                      {clinic.status}
                    </Chip>
                  </div>

                  <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-medium text-slate-500">
                    <span
                      className="min-w-0 max-w-[420px] truncate"
                      title={clinicTagline}
                    >
                      {clinicTagline}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                      <FiPhone className="text-slate-400" size={13} />
                      {clinicPhone}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto lg:shrink-0">
                <div className="flex h-10 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 sm:min-w-[140px]">
                  <p className="text-[11px] font-bold uppercase text-slate-400">
                    Current Plan
                  </p>
                  <p className="truncate text-[13px] font-bold text-primary">
                    {currentPlanName}
                  </p>
                </div>

                <Button
                  color="primary"
                  variant="flat"
                  size="sm"
                  className="h-10 w-full whitespace-nowrap px-4 text-[13px] font-bold sm:w-auto"
                  onPress={onOpen}
                  startContent={<FiEdit2 size={16} />}
                >
                  Update Clinic Status
                </Button>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total Members",
            value: counts?.totalUsers || 0,
            icon: <FiUsers />,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "Pharmacies",
            value: counts?.totalPharmacies || 0,
            icon: <FiShoppingBag />,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            label: "Lab Centers",
            value: counts?.totalLabs || 0,
            icon: <FiActivity />,
            color: "text-purple-600",
            bg: "bg-purple-50",
          },
          {
            label: "Joined Date",
            value: clinic.createdAt ? formatDate(clinic.createdAt) : "—",
            icon: <FiCalendar />,
            color: "text-orange-600",
            bg: "bg-orange-50",
          },
        ].map((stat, i) => (
          <Card
            key={i}
            shadow="none"
            className="rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <CardBody className="flex flex-row items-center gap-3 p-4">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl ${stat.bg} ${stat.color}`}
              >
                {stat.icon}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-500 2xl:text-sm">
                  {stat.label}
                </p>
                <p className="truncate text-lg font-bold leading-tight text-slate-900 2xl:text-xl">
                  {stat.value}
                </p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs
        aria-label="Clinic Navigation"
        color="primary"
        variant="underlined"
        classNames={{
          base: "w-full overflow-hidden",
          tabList:
            "clinic-detail-scroll flex-nowrap gap-5 sm:gap-8 w-full overflow-x-auto relative rounded-none p-0 border-b border-divider",
          cursor: "w-full bg-primary h-0.5",
          tab: "shrink-0 max-w-fit px-0 h-12",
          tabContent:
            "whitespace-nowrap group-data-[selected=true]:text-primary font-bold text-xs sm:text-sm",
          panel: "outline-none",
        }}
      >
        <Tab key="overview" title="OVERVIEW">
          <Card
            shadow="none"
            className="mt-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
          >
            <CardBody className="p-0">
              <section className="px-4 py-4 sm:px-5">
                <OverviewSectionHeader
                  icon={<FiUser size={15} />}
                  title="Admin Profile"
                  action={
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      color="primary"
                      onPress={onAdminEditOpen}
                      className="hidden h-8 w-8 min-w-unit-8 shrink-0"
                      aria-label="Edit admin profile"
                      title="Edit admin profile"
                    >
                      <FiEdit2 size={14} />
                    </Button>
                  }
                />

                <div className="mt-3 space-y-0.5">
                  <OverviewInfoRow
                    icon={<FiUser size={14} />}
                    label="Admin Name"
                    value={
                      <span className="flex min-w-0 items-center gap-3">
                        <Avatar
                          src={profile?.profileImage || ""}
                          name={adminName}
                          className="h-8 w-8 shrink-0"
                          radius="full"
                        />
                        <span
                          className="truncate text-[13px] font-bold text-slate-950"
                          title={adminName}
                        >
                          {adminName}
                        </span>
                        <Chip
                          size="sm"
                          variant="flat"
                          color="primary"
                          className="h-5 shrink-0 text-[10px] font-bold"
                        >
                          {adminRole}
                        </Chip>
                        <Chip
                          size="sm"
                          variant="dot"
                          color="success"
                          className="h-5 shrink-0 border-none text-[10px] font-bold"
                        >
                          {adminStatus}
                        </Chip>
                      </span>
                    }
                  />
                  <OverviewInfoRow
                    icon={<FiMail size={14} />}
                    label="Email"
                    value={adminEmail}
                    title={adminEmail}
                  />
                  <OverviewInfoRow
                    icon={<FiPhone size={14} />}
                    label="Phone"
                    value={adminPhone}
                    title={adminPhone}
                  />
                  <OverviewInfoRow
                    icon={<FiFileText size={14} />}
                    label="Registration"
                    value={registrationNumber}
                    title={registrationNumber}
                  />
                </div>
              </section>

              <section className="border-t border-slate-200 px-4 py-4 sm:px-5">
                <OverviewSectionHeader
                  icon={<FiCreditCard size={15} />}
                  title="Active Subscription"
                  action={
                    <Chip
                      variant="solid"
                      color={subscription?.active ? "success" : "danger"}
                      size="sm"
                      className="h-6 w-fit px-2 text-[10px] font-bold text-white"
                    >
                      {subscription?.active ? "ACTIVE" : "EXPIRED"}
                    </Chip>
                  }
                />

                <div className="mt-3 space-y-0.5">
                  <OverviewInfoRow
                    label="Current Plan"
                    value={currentPlanName}
                    title={currentPlanName}
                  />
                  <OverviewInfoRow
                    label="Subscription Fee"
                    value={subscriptionFee}
                    title={subscriptionFee}
                  />
                  <OverviewInfoRow
                    label="Renewal Date"
                    value={renewalDate}
                    title={renewalDate}
                  />
                </div>
              </section>

              <section className="border-t border-slate-200 px-4 py-4 sm:px-5">
                <OverviewSectionHeader
                  icon={<FiMapPin size={15} />}
                  title="Clinic Location"
                />
                <div className="mt-3 space-y-0.5">
                  <OverviewInfoRow
                    label="Address"
                    value={clinicAddress}
                    title={clinicAddress}
                  />
                  <OverviewInfoRow
                    label="City / State"
                    value={cityState}
                    title={cityState}
                  />
                  <OverviewInfoRow
                    label="Zip Code"
                    value={zipCode}
                    title={zipCode}
                  />
                </div>
              </section>
            </CardBody>
          </Card>
        </Tab>

        <Tab
          key="staff"
          title={
            <div className="flex items-center gap-2">
              STAFF
              <Chip
                size="sm"
                variant="flat"
                className="h-5 min-w-5 bg-slate-100 p-0 font-bold text-slate-600"
              >
                {users.length}
              </Chip>
            </div>
          }
        >
          <div >
            <Card
              shadow="none"
              className="overflow-hidden border border-slate-200"
            >
              <div className="clinic-detail-scroll w-full overflow-x-auto">
                <Table
                  aria-label="Staff Table"
                  removeWrapper
                  classNames={{
                    base: "min-w-[820px]",
                    table: "min-w-[820px]",
                    th: "bg-slate-50 text-slate-500 font-bold uppercase text-[11px] py-4",
                    td: "py-4 text-sm",
                  }}
                >
                  <TableHeader>
                    <TableColumn>NAME</TableColumn>
                    <TableColumn>ROLE</TableColumn>
                    <TableColumn>CONTACT INFO</TableColumn>
                    <TableColumn>JOINED ON</TableColumn>
                    <TableColumn align="center">STATUS</TableColumn>
                  </TableHeader>
                  <TableBody emptyContent="No staff members registered.">
                    {users.map((user: any) => (
                      <TableRow
                        key={user.id}
                        className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/50"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={user.profileImage}
                              name={user.name}
                              size="sm"
                              radius="full"
                            />
                            <span className="font-bold text-slate-900">
                              {user.userType == "Doctor" ||
                                user.isAdminDoctorAccess == true
                                ? "Dr. " + user.name
                                : user.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="sm"
                            variant="flat"
                            className={`h-6 font-bold ${user.userType === "Admin"
                              ? "bg-emerald-100 text-emerald-600"
                              : user.userType === "Receptionist"
                                ? "bg-purple-100 text-purple-600"
                                : user.userType === "Doctor"
                                  ? "bg-blue-100 text-blue-600"
                                  : "bg-amber-100 text-amber-600"
                              }`}
                          >
                            {user.userType}
                          </Chip>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-slate-700">
                              {user.userType != "Patient" ? user.email : ""}
                            </span>
                            <span className="text-[12px] text-slate-600">
                              {user.mobile || "No mobile"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-slate-500">
                          {user.createdAt ? formatDate(user.createdAt) : "—"}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="sm"
                            variant="dot"
                            color="success"
                            className="border-none font-bold"
                          >
                            Active
                          </Chip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </Tab>

        <Tab
          key="pharmacies"
          title={
            <div className="flex items-center gap-2">
              PHARMACIES
              <Chip
                size="sm"
                variant="flat"
                className="h-5 min-w-5 bg-slate-100 p-0 font-bold text-slate-600"
              >
                {pharmacies.length}
              </Chip>
            </div>
          }
        >
          <div>
            <Card
              shadow="none"
              className="overflow-hidden border border-slate-200"
            >
              <div className="clinic-detail-scroll w-full overflow-x-auto">
                <Table
                  aria-label="Pharmacies Table"
                  removeWrapper
                  classNames={{
                    base: "min-w-[760px]",
                    table: "min-w-[760px]",
                    th: "bg-slate-50 text-slate-500 font-bold uppercase text-[11px] py-4",
                    td: "py-4 text-sm",
                  }}
                >
                  <TableHeader>
                    <TableColumn>PHARMACY NAME</TableColumn>
                    <TableColumn>LOCATION</TableColumn>
                    <TableColumn>CONTACT</TableColumn>
                    <TableColumn align="center">STATUS</TableColumn>
                  </TableHeader>
                  <TableBody emptyContent="No pharmacies linked to this clinic.">
                    {pharmacies.map((pharmacy: any) => (
                      <TableRow
                        key={pharmacy.id}
                        className="border-b border-slate-50 last:border-0"
                      >
                        <TableCell className="font-bold text-slate-900">
                          {pharmacy.name}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {pharmacy.address}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {pharmacy.phone}
                        </TableCell>
                        <TableCell>
                          <Chip size="sm" variant="flat" color="success">
                            Active
                          </Chip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </Tab>

        <Tab
          key="labs"
          title={
            <div className="flex items-center gap-2">
              LABS
              <Chip
                size="sm"
                variant="flat"
                className="h-5 min-w-5 bg-slate-100 p-0 font-bold text-slate-600"
              >
                {labs.length}
              </Chip>
            </div>
          }
        >
          <div>
            <Card
              shadow="none"
              className="overflow-hidden border border-slate-200"
            >
              <div className="clinic-detail-scroll w-full overflow-x-auto">
                <Table
                  aria-label="Labs Table"
                  removeWrapper
                  classNames={{
                    base: "min-w-[760px]",
                    table: "min-w-[760px]",
                    th: "bg-slate-50 text-slate-500 font-bold uppercase text-[11px] py-4",
                    td: "py-4 text-sm",
                  }}
                >
                  <TableHeader>
                    <TableColumn>LABORATORY NAME</TableColumn>
                    <TableColumn>SPECIALIZATION</TableColumn>
                    <TableColumn>CONTACT</TableColumn>
                    <TableColumn align="center">STATUS</TableColumn>
                  </TableHeader>
                  <TableBody emptyContent="No labs linked to this clinic.">
                    {labs.map((lab: any) => (
                      <TableRow
                        key={lab.id}
                        className="border-b border-slate-50 last:border-0"
                      >
                        <TableCell className="font-bold text-slate-900">
                          {lab.name}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {lab.type}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {lab.phone}
                        </TableCell>
                        <TableCell>
                          <Chip size="sm" variant="flat" color="success">
                            Active
                          </Chip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </Tab>

        <Tab key="payments" title="PAYMENTS & BILLING">
          <div>
            <Card
              shadow="none"
              className="overflow-hidden border border-slate-200"
            >
              <div className="clinic-detail-scroll w-full overflow-x-auto">
                <Table
                  aria-label="Payments Table"
                  removeWrapper
                  classNames={{
                    base: "min-w-[900px]",
                    table: "min-w-[900px]",
                    th: "bg-slate-50 text-slate-500 font-bold uppercase text-[11px] py-4",
                    td: "py-4 text-sm",
                  }}
                >
                  <TableHeader>
                    <TableColumn>BILLING DATE</TableColumn>
                    <TableColumn>PLAN DETAILS</TableColumn>
                    <TableColumn>AMOUNT PAID</TableColumn>
                    <TableColumn>BILLING PERIOD</TableColumn>
                    <TableColumn align="center">STATUS</TableColumn>
                  </TableHeader>
                  <TableBody emptyContent="No payment history found.">
                    {payments.map((payment: any, idx: number) => (
                      <TableRow
                        key={idx}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50"
                      >
                        <TableCell className="font-semibold text-slate-600">
                          {payment.startsAt
                            ? formatDate(payment.startsAt)
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-slate-900">
                            {payment.planName}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-primary">
                            ₹
                            {payment.price !== undefined
                              ? payment.price.toLocaleString()
                              : "0.00"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <FiCalendar size={12} />
                            {formatDate(payment.startsAt)} -{" "}
                            {formatDate(payment.expiresAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="sm"
                            variant="flat"
                            color="success"
                            className="font-bold"
                          >
                            PAID
                          </Chip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </Tab>
      </Tabs>

      {isOpen && clinic && (
        <EditClinicModal
          isOpen={isOpen}
          onOpenChange={onOpenChange}
          clinicId={id as string}
          initialData={{
            clinicName: clinic.clinicName,
            clinicPhone: clinic.clinicPhone,
            Tagline: clinic.Tagline,
            clinicAddress: clinic.clinicAddress,
            State: clinic.State,
            City: clinic.City,
            ZipCode: Number(clinic.ZipCode),
            status: clinic.status,
          }}
        />
      )}

      {isAdminEditOpen && profile && (
        <EditAdminProfileModal
          isOpen={isAdminEditOpen}
          onOpenChange={onAdminEditOpenChange}
          clinicId={id as string}
          initialData={{
            name: profile.name ?? "",
            mobile: profile.mobile ?? "",
            alternateMobile: profile.alternateMobile ?? undefined,
          }}
        />
      )}
    </div>
  );
};

export default ClinicDetailPage;
