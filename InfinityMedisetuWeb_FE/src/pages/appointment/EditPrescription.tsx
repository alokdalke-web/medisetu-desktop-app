/**
 * EditPrescription — Full-page prescription editor
 * Route: /appointment/:id/edit-prescription
 *
 * Redesigned layout following clinical workflow:
 * Patient → Consultation → Medicines → Clinical Details → Preview → Complete
 */
import { Button, Chip, Spinner, Tooltip } from "@heroui/react";
import { useMemo } from "react";
import {
    FiAlertCircle,
    FiCalendar,
    FiChevronLeft,
    FiClock,
    FiEdit3,
    FiEye,
    FiFileText,
    FiPhone,
    FiUser,
} from "react-icons/fi";
import { useNavigate, useParams } from "react-router";
import PrescriptionWorkspace from "../../components/PrescriptionWorkspace";
import { emptyPrescriptionDetails } from "../../components/prescription/PrescriptionDetails";
import { useGetAppointmentByIdQuery, useGetAppointmentReportsQuery } from "../../redux/api/appointmentApi";
import { fmtDate, mapReportPrescriptionToSelectedMed, mergeReportCardToDetails } from "./helpers/appointmentDetailsHelpers";

export default function EditPrescription() {
    const { id: appointmentId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: appointmentRaw, isLoading: l1 } = useGetAppointmentByIdQuery(appointmentId || "", { skip: !appointmentId });
    const { data: reportsRaw, isLoading: l2 } = useGetAppointmentReportsQuery(appointmentId || "", { skip: !appointmentId });
    const appointment: any = (appointmentRaw as any)?.result ?? appointmentRaw;
    const reportsResult: any = (reportsRaw as any)?.result ?? reportsRaw;

    const workspaceMeds = useMemo(() => {
        const rx = reportsResult?.prescriptions ?? [];
        return rx.length > 0 ? rx.map(mapReportPrescriptionToSelectedMed) : [];
    }, [reportsResult]);

    const workspaceDetails = useMemo(
        () => reportsResult?.reportCard
            ? mergeReportCardToDetails(reportsResult.reportCard, emptyPrescriptionDetails)
            : emptyPrescriptionDetails,
        [reportsResult],
    );

    const patient = useMemo(() => {
        const p = appointment?.patient ?? reportsResult?.patient ?? {};
        return {
            id: p.id || p.patientId || "",
            patientId: p.patientId || p.id || "",
            name: p.name || p.patientName || "",
            age: p.age || null,
            gender: p.gender || null,
            mobile: p.mobile || p.phone || null,
            bloodGroup: p.bloodGroup || null,
            profileImage: p.profileImage || null,
            allergies: p.allergies || null,
            chronicConditions: p.chronicConditions || p.comorbidities || null,
        };
    }, [appointment, reportsResult]);

    const doctor = useMemo(() => {
        const d = appointment?.doctor ?? reportsResult?.doctor ?? {};
        return {
            id: d.id || d.doctorId || "",
            name: d.name || d.doctorName || "",
            speciality: d.speciality || null,
            qualification: d.qualification || null,
        };
    }, [appointment, reportsResult]);

    const clinic = useMemo(() => {
        const c = reportsResult?.clinic ?? appointment?.clinic ?? {};
        return {
            name: c.clinicName || c.name || null,
            addressLine1: c.clinicAddress || c.address || null,
            phone: c.clinicPhone || c.phone || null,
            logoUrl: c.clinicLogo || c.logo || null,
            isPharmacyAvailable: c.isPharmacyAvailable === true,
        };
    }, [appointment, reportsResult]);

    const visitDate = useMemo(() => fmtDate(appointment?.appointmentDate), [appointment]);
    const lastVisit = useMemo(() => fmtDate(appointment?.lastVisit || appointment?.patient?.lastVisit), [appointment]);
    const appointmentTime = appointment?.appointmentTime || null;

    if (l1 || l2) {
        return (
            <div className="flex h-[calc(100vh-80px)] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Spinner size="lg" color="primary" />
                    <span className="text-sm text-slate-500 dark:text-slate-400">Loading consultation...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden">
            {/* ─── Patient Header ─── */}
            <header className="shrink-0 border-b border-slate-100 bg-white dark:border-[#1e293b] dark:bg-[#0f172a]">
                <div className="flex items-center gap-4 px-4 py-2.5 lg:px-6">
                    {/* Back button */}
                    <Tooltip content="Back to appointment" placement="bottom">
                        <button
                            type="button"
                            onClick={() => navigate(`/appointment/${appointmentId}`)}
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 dark:border-[#273244] dark:text-slate-400 dark:hover:bg-[#1e293b]"
                            aria-label="Back"
                        >
                            <FiChevronLeft className="h-4 w-4" />
                        </button>
                    </Tooltip>

                    {/* Patient avatar + info */}
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-teal-100 to-emerald-50 dark:from-teal-900/30 dark:to-emerald-900/20">
                            {patient.profileImage ? (
                                <img src={patient.profileImage} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                    <FiUser className="h-4 w-4 text-teal-700 dark:text-teal-300" />
                                </div>
                            )}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="truncate text-[13px] font-bold text-slate-900 dark:text-white">
                                    {patient.name || "Patient"}
                                </span>
                                <Chip size="sm" color="success" variant="flat" className="h-[18px] text-[9px] font-bold px-1.5">
                                    Active
                                </Chip>
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                                {patient.age && <span>{patient.age}Y</span>}
                                {patient.gender && <><span className="text-slate-300">•</span><span>{patient.gender}</span></>}
                                {patient.patientId && <><span className="text-slate-300">•</span><span className="font-mono">ID:{patient.patientId.slice(0, 6).toUpperCase()}</span></>}
                                {patient.mobile && (
                                    <><span className="text-slate-300">•</span>
                                        <span className="inline-flex items-center gap-0.5">
                                            <FiPhone className="h-2.5 w-2.5" />{patient.mobile}
                                        </span></>
                                )}
                                {patient.bloodGroup && <><span className="text-slate-300">•</span><span className="font-medium text-rose-600 dark:text-rose-400">{patient.bloodGroup}</span></>}
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="hidden h-8 w-px bg-slate-150 dark:bg-[#273244] lg:block" />

                    {/* Appointment metadata */}
                    <div className="hidden items-center gap-5 lg:flex">
                        {visitDate && (
                            <div className="flex items-center gap-1.5 text-[11px]">
                                <FiCalendar className="h-3 w-3 text-slate-400" />
                                <div>
                                    <span className="text-slate-400">Visit:</span>{" "}
                                    <span className="font-semibold text-slate-700 dark:text-slate-200">{visitDate}</span>
                                    {appointmentTime && <span className="ml-1 text-slate-400">at {appointmentTime}</span>}
                                </div>
                            </div>
                        )}
                        {lastVisit && (
                            <div className="flex items-center gap-1.5 text-[11px]">
                                <FiClock className="h-3 w-3 text-slate-400" />
                                <div>
                                    <span className="text-slate-400">Last:</span>{" "}
                                    <span className="font-semibold text-slate-700 dark:text-slate-200">{lastVisit}</span>
                                </div>
                            </div>
                        )}
                        {doctor.name && (
                            <div className="flex items-center gap-1.5 text-[11px]">
                                <FiUser className="h-3 w-3 text-slate-400" />
                                <span className="font-semibold text-slate-700 dark:text-slate-200">{doctor.name}</span>
                            </div>
                        )}
                    </div>

                    {/* Alerts (allergies/chronic) */}
                    {(patient.allergies || patient.chronicConditions) && (
                        <>
                            <div className="hidden h-8 w-px bg-slate-150 dark:bg-[#273244] lg:block" />
                            <div className="hidden items-center gap-2 lg:flex">
                                {patient.allergies && (
                                    <Tooltip content={`Allergies: ${patient.allergies}`} placement="bottom">
                                        <Chip size="sm" color="danger" variant="flat" startContent={<FiAlertCircle className="h-3 w-3" />} className="h-6 text-[10px] font-medium">
                                            Allergy
                                        </Chip>
                                    </Tooltip>
                                )}
                                {patient.chronicConditions && (
                                    <Tooltip content={`Conditions: ${patient.chronicConditions}`} placement="bottom">
                                        <Chip size="sm" color="warning" variant="flat" className="h-6 text-[10px] font-medium">
                                            Chronic
                                        </Chip>
                                    </Tooltip>
                                )}
                            </div>
                        </>
                    )}

                    {/* Quick Actions — pushed right */}
                    <div className="ml-auto flex items-center gap-1.5">
                        <Tooltip content="Previous prescriptions" placement="bottom">
                            <Button
                                size="sm"
                                variant="light"
                                isIconOnly
                                className="h-8 w-8 min-w-8 text-slate-500 hover:text-slate-700 dark:text-slate-400"
                                aria-label="History"
                                onPress={() => navigate(`/appointment/${appointmentId}`)}
                            >
                                <FiFileText className="h-4 w-4" />
                            </Button>
                        </Tooltip>
                        <Tooltip content="Preview prescription" placement="bottom">
                            <Button
                                size="sm"
                                variant="light"
                                isIconOnly
                                className="h-8 w-8 min-w-8 text-slate-500 hover:text-slate-700 dark:text-slate-400"
                                aria-label="Preview"
                            >
                                <FiEye className="h-4 w-4" />
                            </Button>
                        </Tooltip>
                        <Tooltip content="Edit patient" placement="bottom">
                            <Button
                                size="sm"
                                variant="light"
                                isIconOnly
                                className="h-8 w-8 min-w-8 text-slate-500 hover:text-slate-700 dark:text-slate-400"
                                aria-label="Edit patient"
                                onPress={() => navigate(`/patient/${patient.id || patient.patientId}`)}
                            >
                                <FiEdit3 className="h-4 w-4" />
                            </Button>
                        </Tooltip>
                    </div>
                </div>
            </header>

            {/* ─── Prescription Workspace ─── */}
            <div className="min-h-0 flex-1 overflow-hidden">
                <PrescriptionWorkspace
                    ui="collapse"
                    patientId={patient.id || patient.patientId || ""}
                    appointmentId={appointmentId || ""}
                    doctorId={doctor.id || ""}
                    appointmentStatus="Confirmed"
                    defaultSelected={workspaceMeds}
                    defaultDetails={workspaceDetails}
                    keepEditingAfterSave
                    patient={patient}
                    doctor={doctor}
                    clinic={clinic}
                    onRefreshAfterSave={() => navigate(`/appointment/${appointmentId}`)}
                />
            </div>
        </div>
    );
}
