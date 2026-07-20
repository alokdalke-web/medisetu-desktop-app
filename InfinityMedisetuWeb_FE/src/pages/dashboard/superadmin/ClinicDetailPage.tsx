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
  FiClock,
  FiCreditCard,
  FiEdit2,
  FiFileText,
  FiGlobe,
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

const ClinicDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const {
    isOpen: isAdminEditOpen,
    onOpen: onAdminEditOpen,
    onOpenChange: onAdminEditOpenChange,
  } = useDisclosure();

  const { data: res, isLoading } = useGetClinicDetailQuery(id as string, {
    skip: !id,
  });

  const clinicData = res?.data;
  const clinic = clinicData?.clinic;
  const profile = clinicData?.profile;
  const subscription = clinicData?.subscription;
  const counts = clinicData?.counts;
  const users = clinicData?.users || [];
  const pharmacies = clinicData?.pharmacies || [];
  const labs = clinicData?.labs || [];
  const payments = clinicData?.payments || [];

  const handleBack = () => {
    navigate("/clinics");
  };

  if (isLoading) {
    return <ClinicDetailSkeleton />;
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

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4 overflow-x-hidden px-3 py-3 sm:space-y-6 sm:px-4 lg:px-0">
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
        className="clinic-detail-scroll mb-2 flex items-center gap-2 overflow-x-auto whitespace-nowrap text-sm text-slate-500"
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
        className="border border-slate-200 bg-white"
      >
        <CardBody className="p-0">
          <div className="px-4 pt-4 sm:px-5">
            <h2 className="text-[15px] font-semibold">Clinic Information</h2>
          </div>
          <hr className="mt-3 border-t border-slate-200" />

          <div className="p-4 sm:p-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              {/* Left: avatar + name */}
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
                <Avatar
                  src={clinic.clinicLogo || ""}
                  name={clinic.clinicName}
                  className="h-16 w-16 shrink-0 bg-primary/10 text-xl font-bold text-primary"
                  radius="lg"
                />

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="max-w-full break-words text-xl font-bold text-slate-900 sm:text-2xl">
                      {clinic.clinicName}
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

                  <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-500">
                    <FiGlobe className="mt-0.5 shrink-0 text-slate-400" />
                    <span className="break-words">
                      {clinic.Tagline || "No tagline provided"}
                    </span>
                  </p>

                  <p className="mt-1 flex items-center gap-1.5 break-words text-sm text-slate-500">
                    ({clinic.clinicPhone})
                  </p>
                </div>
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:w-auto lg:justify-end lg:gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left sm:border-r sm:bg-transparent sm:pr-4 sm:text-right lg:block">
                  <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Current Plan
                  </p>
                  <p className="text-sm font-bold text-primary">
                    {subscription?.planName || "Free Plan"}
                  </p>
                </div>

                <Button
                  color="primary"
                  variant="flat"
                  className="w-full font-semibold sm:w-auto"
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
          <Card key={i} shadow="none" className="border border-slate-200">
            <CardBody className="flex flex-row items-center gap-4 p-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl ${stat.bg} ${stat.color}`}
              >
                {stat.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-tight text-slate-500">
                  {stat.label}
                </p>
                <p className="break-words text-xl font-bold text-slate-900">
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
          <div className="grid grid-cols-1 gap-4 pt-5 lg:grid-cols-3 lg:gap-6 lg:pt-6">
            <div className="space-y-4 lg:col-span-1 lg:space-y-6">
              {/* Admin Profile */}
              <Card shadow="none" className="border border-slate-200">
                <CardBody className="p-0">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-4 py-4 sm:px-5">
                    <h3 className="flex items-center gap-2 text-[15px] font-bold text-slate-800">
                      <FiUser className="shrink-0 text-primary" /> Admin
                      Profile
                    </h3>
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      color="primary"
                      onPress={onAdminEditOpen}
                      className="h-8 w-8 min-w-unit-8 shrink-0 hidden"
                    >
                      <FiEdit2 size={14} />
                    </Button>
                  </div>

                  <div className="p-4 sm:p-5">
                    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
                      <Avatar
                        src={profile?.profileImage || ""}
                        name={profile?.name}
                        className="h-14 w-14 shrink-0"
                        radius="full"
                      />
                      <div className="min-w-0">
                        <h4 className="break-words font-bold text-slate-900">
                          {profile?.name}
                        </h4>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Chip
                            size="sm"
                            variant="flat"
                            color="primary"
                            className="h-5 text-[10px] font-bold"
                          >
                            {profile?.userType}
                          </Chip>
                          <Chip
                            size="sm"
                            variant="dot"
                            color="success"
                            className="h-5 border-none text-[10px] font-bold"
                          >
                            {profile?.userStatus}
                          </Chip>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <FiMail
                          className="mt-1 shrink-0 text-slate-400"
                          size={16}
                        />
                        <div className="min-w-0">
                          <p className="mb-0.5 text-[11px] font-bold uppercase text-slate-400">
                            Email
                          </p>
                          <p className="break-all text-sm font-medium text-slate-700">
                            {profile?.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <FiPhone
                          className="mt-1 shrink-0 text-slate-400"
                          size={16}
                        />
                        <div className="min-w-0">
                          <p className="mb-0.5 text-[11px] font-bold uppercase text-slate-400">
                            Phone
                          </p>
                          <p className="break-words text-sm font-medium text-slate-700">
                            {profile?.mobile || "Not provided"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Location */}
              <Card shadow="none" className="border border-slate-200">
                <CardBody className="p-0">
                  <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-4 sm:px-5">
                    <h3 className="flex items-center gap-2 text-[15px] font-bold text-slate-800">
                      <FiMapPin className="shrink-0 text-primary" /> Clinic
                      Location
                    </h3>
                  </div>
                  <div className="space-y-5 p-4 sm:p-5">
                    <div>
                      <p className="mb-1 text-[11px] font-bold uppercase text-slate-400">
                        Address
                      </p>
                      <p className="break-words text-sm font-medium leading-relaxed text-slate-700">
                        {clinic.clinicAddress}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <p className="mb-1 text-[11px] font-bold uppercase text-slate-400">
                          City / State
                        </p>
                        <p className="break-words text-sm font-medium text-slate-700">
                          {clinic.City}, {clinic.State}
                        </p>
                      </div>
                      <div>
                        <p className="mb-1 text-[11px] font-bold uppercase text-slate-400">
                          Zip Code
                        </p>
                        <p className="break-words text-sm font-medium text-slate-700">
                          {clinic.ZipCode}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>

            <div className="space-y-4 lg:col-span-2 lg:space-y-6">
              {/* Subscription Details */}
              <Card
                shadow="none"
                className="border border-slate-200 bg-gradient-to-br from-white to-slate-50"
              >
                <CardBody className="p-0">
                  <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <h3 className="flex items-center gap-2 text-[15px] font-bold text-slate-800">
                      <FiCreditCard className="shrink-0 text-primary" /> Active
                      Subscription
                    </h3>
                    <Chip
                      variant="solid"
                      color={subscription?.active ? "success" : "danger"}
                      size="sm"
                      className="w-fit text-[10px] font-bold text-white"
                    >
                      {subscription?.active ? "ACTIVE" : "EXPIRED"}
                    </Chip>
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 xl:gap-6">
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">
                          Current Plan
                        </p>
                        <p className="break-words text-lg font-bold text-slate-900">
                          {subscription?.planName || "N/A"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">
                          Subscription Fee
                        </p>
                        <p className="break-words text-lg font-bold text-primary">
                          ₹
                          {subscription?.price !== undefined
                            ? subscription.price.toLocaleString()
                            : "0.00"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:col-span-2 xl:col-span-1">
                        <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">
                          Renewal Date
                        </p>
                        <p className="break-words text-lg font-bold text-rose-600">
                          {subscription?.expiresAt
                            ? formatDate(subscription.expiresAt)
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Technical Details */}
              <Card shadow="none" className="border border-slate-200">
                <CardBody className="p-0">
                  <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
                    <h3 className="flex items-center gap-2 text-[15px] font-bold text-slate-800">
                      <FiFileText className="shrink-0 text-primary" />{" "}
                      Registration Info
                    </h3>
                  </div>
                  <div className="p-4 sm:p-5">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
                      <div className="space-y-1">
                        <p className="text-[11px] font-bold uppercase text-slate-400">
                          Internal Clinic ID
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="min-w-0 flex-1 break-all rounded border border-slate-100 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-500">
                            {clinic.id}
                          </code>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-bold uppercase text-slate-400">
                          System Status
                        </p>
                        <div className="flex items-start gap-2 text-sm font-medium text-slate-700">
                          <FiClock className="mt-0.5 shrink-0 text-slate-400" />
                          <span className="break-words">
                            Last updated: {formatDate(clinic.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
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
          <div className="pt-5 lg:pt-6">
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
          <div className="pt-5 lg:pt-6">
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
          <div className="pt-5 lg:pt-6">
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
          <div className="pt-5 lg:pt-6">
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