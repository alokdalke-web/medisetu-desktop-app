import React from "react";
import { Avatar, Button, Card, CardBody, useDisclosure } from "@heroui/react";
import { useParams } from "react-router";
import {
  FiAward,
  FiBriefcase,
  FiCalendar,
  FiEdit2,
  FiMail,
  FiMapPin,
  FiPackage,
  FiPhone,
  FiStar,
  FiUserCheck,
  FiUsers,
} from "react-icons/fi";

import { useGetDoctorByIdQuery, useGetDoctorServicesQuery } from "../../redux/api/doctorApi";
import DoctorOnlineBookingCard from "../../components/appointment/DoctorOnlineBookingCard";
import Loader from "../../components/Loader";
import { displayValue, fmtDate, getUsersListPath, roleLabel, Skel } from "./components/shared";
import PageBackNav from "../../components/shared/PageBackNav";
import UserEditModal from "./components/UserEditModal";

const OverviewTab = React.lazy(() => import("./components/tabs/OverviewTab"));
const ServicesTab = React.lazy(() => import("./components/tabs/ServicesTab"));
const ActivityTab = React.lazy(() => import("./components/tabs/ActivityTab"));
const AvailabilityTab = React.lazy(() => import("./components/tabs/AvailabilityTab"));

type TabKey = "overview" | "services" | "activity" | "availability";

/* ---------- Small pieces used only on this page ---------- */

const BannerChip: React.FC<{ children: React.ReactNode; dot?: string }> = ({ children, dot }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
    {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
    {children}
  </span>
);

const toneClasses: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  purple: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
};

const StatTile: React.FC<{
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tone: keyof typeof toneClasses;
}> = ({ label, value, icon, tone }) => (
  <div className="flex items-center gap-3 rounded-xl border border-default-200 bg-background px-3 py-3 dark:border-default-100 sm:px-4 sm:py-3.5">
    <div
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[16px] sm:h-10 sm:w-10 sm:text-[18px] ${toneClasses[tone]}`}
    >
      {icon}
    </div>
    <div className="min-w-0">
      <div className="truncate text-base font-bold text-default-900 dark:text-white sm:text-lg">
        {value}
      </div>
      <div className="truncate text-[11px] font-medium text-default-400 sm:text-xs">{label}</div>
    </div>
  </div>
);

const StatusStatTile: React.FC<{ status?: string }> = ({ status }) => {
  const isActive = String(status ?? "").toLowerCase() === "active";
  const dot = isActive ? "bg-emerald-500" : "bg-rose-500";

  return (
    <StatTile
      label="Status"
      icon={<FiUserCheck />}
      tone={isActive ? "emerald" : "rose"}
      value={
        <span className="inline-flex items-center gap-1.5">
          <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
          {displayValue(status)}
        </span>
      }
    />
  );
};

const SummaryRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-sm text-default-400">{label}</span>
    <span className="text-sm font-semibold text-default-900 dark:text-white text-right">{value}</span>
  </div>
);

const UserInfoSkeleton = () => (
  <Card shadow="none" radius="lg" className="border border-default-200 bg-background dark:border-default-100">
    <CardBody className="p-5">
      <div className="flex items-start gap-4">
        <Skel className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skel className="h-5 w-48" />
          <Skel className="h-3 w-32" />
          <Skel className="h-6 w-24 rounded-full" />
        </div>
      </div>
    </CardBody>
  </Card>
);

/* ---------- Component ---------- */

const UserDetails: React.FC = () => {
  const { id: userId } = useParams();

  const [tab, setTab] = React.useState<TabKey>("overview");

  const { data, isLoading, refetch } = useGetDoctorByIdQuery(userId ?? "", {
    skip: !userId,
  });

  const user = data?.result as any;

  const isDoctorLike =
    String(user?.userType ?? "").toLowerCase() === "doctor" ||
    user?.isAdminDoctorAccess === true;

  // Same query key as ServicesTab's own fetch — RTK Query dedupes this into
  // a single request, so the stat tile stays accurate without an extra call.
  const { data: servicesData } = useGetDoctorServicesQuery(userId ?? "", {
    skip: !userId || !isDoctorLike,
  });
  const servicesCount = servicesData?.data?.length ?? 0;

  const tabItems: Array<{ key: TabKey; title: string }> = [
    { key: "overview", title: "Overview" },
    ...(isDoctorLike ? [{ key: "availability" as TabKey, title: "Availability" }] : []),
    ...(isDoctorLike ? [{ key: "services" as TabKey, title: "Services Offered" }] : []),
    ...(isDoctorLike ? [{ key: "activity" as TabKey, title: "Activity" }] : []),
  ];

  // If the active tab disappears (e.g. role-dependent tab), fall back to Overview.
  React.useEffect(() => {
    if (!tabItems.some((t) => t.key === tab)) {
      setTab("overview");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDoctorLike]);

  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const backToListPath = getUsersListPath(user?.userType);
  const goToEdit = () => onOpen();

  return (
    <div >
      <PageBackNav
        backTo={backToListPath}
        crumbs={[
          { label: "Users", to: backToListPath },
          ...(!isLoading && user?.userType ? [{ label: roleLabel(user.userType), to: backToListPath }] : []),
          { label: isLoading ? "User Details" : user?.name || "User Details" },
        ]}
      />

      <div className="mt-5 space-y-4">
        {/* Header card */}
        {isLoading ? (
          <UserInfoSkeleton />
        ) : (
          <Card shadow="sm" radius="lg" className="overflow-hidden border border-default-200 dark:border-default-100">
            {/* Banner: avatar, name, role/status/speciality + quick facts */}
            <div className="relative bg-gradient-to-r from-primary to-secondary px-4 py-4 sm:px-5">
              <div
                className="pointer-events-none absolute inset-0 opacity-25"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 15% 30%, white 0%, transparent 40%), radial-gradient(circle at 85% 75%, white 0%, transparent 35%)",
                }}
              />
              <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3 sm:gap-4">
                  <Avatar
                    src={user?.profileImage ?? undefined}
                    name={user?.name ?? "User"}
                    radius="full"
                    className="h-14 w-14 text-lg shrink-0 ring-4 ring-white/30 shadow-md sm:h-20 sm:w-20 sm:text-2xl"
                    showFallback
                  />
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <h2 className="truncate text-lg font-bold text-white sm:text-xl">
                      {isDoctorLike && user?.name ? `Dr. ${user.name}` : displayValue(user?.name)}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <BannerChip>{roleLabel(user?.userType)}</BannerChip>
                      <BannerChip dot={String(user?.userStatus ?? "").toLowerCase() === "active" ? "bg-emerald-300" : "bg-rose-300"}>
                        {displayValue(user?.userStatus)}
                      </BannerChip>
                      {isDoctorLike && user?.speciality && <BannerChip>{user.speciality}</BannerChip>}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:w-[260px] lg:shrink-0">
                  <div className="rounded-xl bg-white/15 px-3 py-2.5 backdrop-blur-sm">
                    <div className="text-[11px] text-white/70">Joined On</div>
                    <div className="mt-0.5 truncate text-sm font-semibold text-white">{fmtDate(user?.createdAt)}</div>
                  </div>
                  <div className="rounded-xl bg-white/15 px-3 py-2.5 backdrop-blur-sm">
                    <div className="text-[11px] text-white/70">Assigned Clinic</div>
                    <div className="mt-0.5 truncate text-sm font-semibold text-white">
                      {displayValue(user?.clinicName)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Body: contact details + edit */}
            <CardBody className="bg-background p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-default-400">
                    <span className="flex items-center gap-1.5 break-all">
                      <FiMail className="h-3.5 w-3.5 shrink-0" />
                      {user?.email ?? "-"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FiPhone className="h-3.5 w-3.5 shrink-0" />
                      {user?.mobile ?? "-"}
                    </span>
                  </div>

                  {user?.address && (
                    <div className="flex items-start gap-1.5 text-sm text-default-400">
                      <FiMapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        {[user?.address, user?.city, user?.state, user?.zipCode].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  )}
                </div>

                <Button
                  variant="bordered"
                  radius="full"
                  className="border-default-200 text-default-700 h-8 self-start text-xs px-3 dark:border-default-100 dark:text-default-200 sm:self-auto shrink-0"
                  startContent={<FiEdit2 className="h-3.5 w-3.5" />}
                  onPress={goToEdit}
                  isDisabled={!user}
                  size="sm"
                >
                  Edit
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Stat tiles */}
        {!isLoading && (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
            {isDoctorLike ? (
              <>
                <StatTile label="Total Patients" value={user?.totalPatients ?? 0} icon={<FiUsers />} tone="blue" />
                <StatTile label="Total Appointments" value={user?.totalAppointments ?? 0} icon={<FiCalendar />} tone="emerald" />
                <StatTile label="Services Offered" value={servicesCount} icon={<FiPackage />} tone="amber" />
                <StatTile
                  label="Avg. Rating"
                  value={user?.reviewCount ? `${Number(user?.averageRating ?? 0).toFixed(1)} ★` : "-"}
                  icon={<FiStar />}
                  tone="purple"
                />
              </>
            ) : (
              <>
                <StatusStatTile status={user?.userStatus} />
                <StatTile label="Assigned Clinic" value={displayValue(user?.clinicName)} icon={<FiBriefcase />} tone="blue" />
                <StatTile label="Role" value={roleLabel(user?.userType)} icon={<FiAward />} tone="amber" />
                <StatTile label="Joined On" value={fmtDate(user?.createdAt)} icon={<FiCalendar />} tone="purple" />
              </>
            )}
          </div>
        )}

        {/* Tabs + Sidebar */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <Card shadow="sm" radius="lg" className="min-w-0 flex-1 border border-default-200 bg-background dark:border-default-100">
            <CardBody className="p-0">
              <div className="px-3 pt-4 sm:px-5">
                <div
                  role="tablist"
                  aria-label="User details sections"
                  className="flex w-full items-center gap-0 overflow-x-auto border-b border-default-200 dark:border-default-100"
                >
                  {tabItems.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      role="tab"
                      aria-selected={tab === item.key}
                      onClick={() => setTab(item.key)}
                      className={`h-[34px] shrink-0 whitespace-nowrap border-b-2 px-3 text-[13px] transition-colors sm:px-4 sm:text-[14px] ${
                        tab === item.key
                          ? "border-primary font-medium text-primary"
                          : "border-transparent font-normal text-default-400 hover:text-default-600"
                      }`}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 sm:p-5">
                <React.Suspense fallback={<Loader label="Loading..." />}>
                  {tab === "overview" && <OverviewTab user={user} isDoctorLike={isDoctorLike} />}
                  {tab === "services" && isDoctorLike && <ServicesTab doctorId={userId ?? ""} />}
                  {tab === "availability" && isDoctorLike && <AvailabilityTab doctorId={userId ?? ""} />}
                  {tab === "activity" && isDoctorLike && <ActivityTab doctorId={userId ?? ""} />}
                </React.Suspense>
              </div>
            </CardBody>
          </Card>

          {/* Sidebar */}
          <div className="flex flex-col gap-4 lg:w-[300px] lg:shrink-0">
            <Card shadow="sm" radius="lg" className="border border-default-200 bg-background dark:border-default-100">
              <CardBody className="p-5">
                <h3 className="text-[15px] font-semibold text-default-900 dark:text-white mb-4">Profile Summary</h3>
                <div className="space-y-4">
                  <SummaryRow label="Role" value={roleLabel(user?.userType)} />
                  <SummaryRow label="Status" value={displayValue(user?.userStatus)} />
                  {isDoctorLike && <SummaryRow label="Speciality" value={displayValue(user?.speciality)} />}
                  {isDoctorLike && <SummaryRow label="Registration No." value={displayValue(user?.registrationNumber)} />}
                  <SummaryRow label="Assigned Clinic" value={displayValue(user?.clinicName)} />
                  <SummaryRow label="Joined On" value={fmtDate(user?.createdAt)} />
                </div>
              </CardBody>
            </Card>

            {isDoctorLike && userId && <DoctorOnlineBookingCard doctorId={userId} />}
          </div>
        </div>
      <UserEditModal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        userId={userId ?? ""}
        user={user}
        refetch={refetch}
      />
      </div>
    </div>
  );
};

export default UserDetails;
