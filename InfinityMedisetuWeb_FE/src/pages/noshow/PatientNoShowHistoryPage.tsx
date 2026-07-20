import React, { useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  Button,
  Card,
  CardBody,
  Badge,
  Skeleton,
} from "@heroui/react";
import {
  FiArrowLeft,
  FiCalendar,
  FiClock,
  FiAlertCircle,
  FiShield,
  FiAlertTriangle,
  FiUserX,
  FiUser,
  FiTrendingUp,
  FiSearch,
} from "react-icons/fi";
import { FaRupeeSign, FaStethoscope } from "react-icons/fa";
import dayjs from "dayjs";
import { useGetPatientNoShowHistoryQuery } from "../../redux/api/appointmentApi";

const ActionBadge: React.FC<{ action?: string | null }> = ({ action }) => {
  const actionValue = action || "no-show";

  const getConfig = (act: string) => {
    switch (act.toLowerCase()) {
      case "warning":
        return {
          bgColor: "bg-yellow-50",
          textColor: "text-yellow-700",
          borderColor: "border-yellow-200",
          icon: <FiAlertTriangle className="text-yellow-600" />,
          label: "Warning",
        };
      case "penalty":
        return {
          bgColor: "bg-orange-50",
          textColor: "text-orange-700",
          borderColor: "border-orange-200",
          icon: <FaRupeeSign className="text-orange-600" />,
          label: "Penalty",
        };
      case "advance_required":
        return {
          bgColor: "bg-blue-50",
          textColor: "text-blue-700",
          borderColor: "border-blue-200",
          icon: <FiShield className="text-blue-600" />,
          label: "Advance",
        };
      case "blocked":
        return {
          bgColor: "bg-red-50",
          textColor: "text-red-700",
          borderColor: "border-red-200",
          icon: <FiUserX className="text-red-600" />,
          label: "Blocked",
        };
      default:
        return {
          bgColor: "bg-slate-50",
          textColor: "text-slate-700",
          borderColor: "border-slate-200",
          icon: <FiAlertCircle className="text-slate-600" />,
          label: action || "No Action",
        };
    }
  };

  const config = getConfig(actionValue);

  return (
    <div
      className={`inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs sm:px-3 sm:py-1.5 ${config.bgColor} ${config.textColor} ${config.borderColor}`}
    >
      {config.icon}
      <span className="truncate font-medium sm:text-sm">{config.label}</span>
    </div>
  );
};

const PatientNoShowHistoryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useGetPatientNoShowHistoryQuery(id!, {
    skip: !id,
  });

  const historyData = data?.data || [];
  const patientInfo = historyData[0]?.patient;
  const totalNoShows = historyData.length;

  // Filter history based on search
  const filteredHistory = historyData.filter((item: any) => {
    if (!search.trim()) return true;

    const searchTerm = search.toLowerCase();
    return (
      item.doctor?.name?.toLowerCase().includes(searchTerm) ||
      item.appointment?.type?.toLowerCase().includes(searchTerm) ||
      item.reason?.toLowerCase().includes(searchTerm) ||
      item.actionTaken?.toLowerCase().includes(searchTerm)
    );
  });

  if (error) {
    return (
      <div className="min-h-screen bg-[#F9FBFC] flex items-center justify-center p-6">
        <Card className="max-w-md border border-slate-200">
          <CardBody className="text-center p-8">
            <FiAlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Unable to Load History
            </h3>
            <p className="text-slate-600 mb-6">
              Failed to load no-show history. Please try again.
            </p>
            <Button
              onPress={() => navigate(-1)}
              className="bg-primary text-white"
            >
              Go Back
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-full bg-[#F9FBFC]">
      <div className="space-y-4 sm:space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-start gap-3 px-1 sm:items-center sm:gap-4">
          <Button
            isIconOnly
            variant="light"
            radius="full"
            onPress={() => navigate(-1)}
            className="h-9 w-9 shrink-0 border border-slate-200 bg-white hover:bg-slate-50 sm:h-10 sm:w-10"
          >
            <FiArrowLeft size={18} />
          </Button>
          <div className="min-w-0">
            <h1 className="text-[18px] font-semibold leading-tight text-slate-900 sm:text-2xl">
              Patient No-Show History
            </h1>
            <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
              Track all missed appointments for this patient
            </p>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-4 sm:space-y-6">
            {/* Patient Info Skeleton */}
            <Card className="border border-slate-200">
              <CardBody className="p-4 sm:p-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-14 w-14 rounded-full sm:h-16 sm:w-16" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-40 max-w-full sm:w-48" />
                    <Skeleton className="h-3 w-28 max-w-full sm:w-32" />
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* History Items Skeleton */}
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Patient Info Card */}
            {patientInfo && (
              <Card className="border border-slate-200 shadow-sm">
                <CardBody className="p-4 sm:p-5 lg:p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    {/* Patient Details */}
                    <div className="flex w-full min-w-0 items-start gap-3 sm:items-center sm:gap-4 lg:flex-1">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-blue-100 to-blue-50 shadow-sm sm:h-16 sm:w-16">
                        {patientInfo.profileImage ? (
                          <img
                            src={patientInfo.profileImage}
                            alt={patientInfo.name}
                            className="h-12 w-12 rounded-full object-cover sm:h-14 sm:w-14"
                          />
                        ) : (
                          <FiUser className="h-7 w-7 text-blue-600 sm:h-8 sm:w-8" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="break-words text-base font-semibold leading-6 text-slate-900 sm:text-lg">
                          {patientInfo.name}
                        </h2>
                        <p className="text-sm text-slate-500">
                          {patientInfo.mobile}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <div className="inline-flex shrink-0 items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                            <FiTrendingUp className="text-xs" />
                            <span>
                              {totalNoShows} no-show
                              {totalNoShows !== 1 ? "s" : ""}
                            </span>
                          </div>
                          {historyData[0]?.actionTaken && (
                            <ActionBadge action={historyData[0].actionTaken} />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="flex w-full flex-col gap-4 lg:w-auto lg:min-w-[420px]">
                      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-lg bg-slate-50 p-3 text-center">
                          <div className="text-lg font-bold text-slate-900">
                            {totalNoShows}
                          </div>
                          <div className="text-xs text-slate-500">Total</div>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3 text-center">
                          <div className="text-lg font-bold text-slate-900">
                            {
                              historyData.filter(
                                (h: any) => h.actionTaken === "penalty",
                              ).length
                            }
                          </div>
                          <div className="text-xs text-slate-500">Penalties</div>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3 text-center">
                          <div className="text-lg font-bold text-slate-900">
                            {
                              historyData.filter(
                                (h: any) => h.actionTaken === "warning",
                              ).length
                            }
                          </div>
                          <div className="text-xs text-slate-500">Warnings</div>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3 text-center">
                          <div className="text-lg font-bold text-slate-900">
                            {
                              historyData.filter(
                                (h: any) => h.actionTaken === "blocked",
                              ).length
                            }
                          </div>
                          <div className="text-xs text-slate-500">Blocked</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* History Content */}
            <div>
              {filteredHistory.length > 0 ? (
                /* Card View */
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredHistory.map((item: any) => (
                    <Card
                      key={item.id}
                      className="border border-slate-200 hover:shadow-md transition-shadow"
                    >
                      <CardBody className="p-4 sm:p-5">
                        {/* Date & Status */}
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <FiCalendar className="shrink-0 text-sm text-slate-400" />
                            <span className="truncate text-sm font-medium text-slate-900">
                              {dayjs(
                                item.appointment?.date || item.createdAt,
                              ).format("MMM DD")}
                            </span>
                          </div>
                          <Badge
                            variant="flat"
                            color="danger"
                            size="sm"
                            className="shrink-0"
                          >
                            No-Show
                          </Badge>
                        </div>

                        {/* Doctor & Time */}
                        <div className="mb-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100">
                              <FaStethoscope className="text-xs text-green-600" />
                            </div>
                            <span className="min-w-0 truncate text-sm font-medium text-slate-700">
                              Dr. {item.doctor?.name || "N/A"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <FiClock className="text-xs" />
                            <span>{item.appointment?.time || "N/A"}</span>
                          </div>
                        </div>

                        {/* Reason */}
                        {item.reason && (
                          <div className="mb-4">
                            <div className="mb-1 text-xs font-medium text-slate-500">
                              Reason
                            </div>
                            <p className="line-clamp-2 break-words text-sm italic text-slate-700">
                              "{item.reason}"
                            </p>
                          </div>
                        )}

                        {/* Action Taken */}
                        <div className="mb-3">
                          <div className="mb-2 text-xs font-medium text-slate-500">
                            Action
                          </div>
                          <ActionBadge action={item.actionTaken} />
                        </div>

                        {/* Footer */}
                        <div className="border-t border-slate-100 pt-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                            <span className="min-w-0 truncate">
                              By:{" "}
                              {item.markedBy?.role || item.markedBy || "System"}
                            </span>
                            <span>
                              {dayjs(item.createdAt).format("hh:mm A")}
                            </span>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              ) : (
                /* Empty State */
                <Card className="border border-slate-200">
                  <CardBody className="py-12 text-center">
                    <div className="max-w-sm mx-auto">
                      <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                        {search ? (
                          <FiSearch className="h-8 w-8 text-slate-400" />
                        ) : (
                          <FiAlertCircle className="h-8 w-8 text-slate-400" />
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">
                        {search ? "No Results Found" : "No No-Show History"}
                      </h3>
                      <p className="text-slate-600 mb-6">
                        {search
                          ? "No records match your search criteria. Try different keywords."
                          : "This patient has no recorded no-show incidents."}
                      </p>
                      {search && (
                        <Button
                          onPress={() => setSearch("")}
                          variant="bordered"
                          className="border-slate-300 text-slate-700 mr-2"
                        >
                          Clear Search
                        </Button>
                      )}
                      <Button
                        onPress={() => navigate(-1)}
                        variant="bordered"
                        className="border-slate-300 text-slate-700"
                      >
                        Back to List
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PatientNoShowHistoryPage;
