import { useEffect, useMemo, useRef, useState } from "react";
import { addToast } from "@heroui/react";
import {
  LuCalendarX,
  LuRotateCcw,
  LuSave,
  LuUserCheck,
  LuClock,
  LuActivity,
  LuMessageSquare,
  LuRefreshCw,
  LuUser,
  LuStethoscope,
  LuContact,
  LuShieldAlert,
  LuGlobe,
  LuHouse,
  LuCreditCard,
  LuInfo,
} from "react-icons/lu";
import Tooltip from "../../components/shared/Tooltip";
import {
  useGetClinicCancellationPolicyQuery,
  useUpdateClinicCancellationPolicyMutation,
  useLazyGetDefaultCancellationPolicyQuery,
  type ClinicCancellationPolicy,
} from "../../redux/api/cancellationPolicyApi";
import { useUnsavedChanges } from "../../context/UnsavedChangesContext";

export default function CancellationPolicySettings() {
  const { data: policyData, isLoading, refetch } = useGetClinicCancellationPolicyQuery();
  const [savePolicy, { isLoading: isSaving }] = useUpdateClinicCancellationPolicyMutation();
  const [triggerGetDefaults, { isFetching: isFetchingDefaults }] = useLazyGetDefaultCancellationPolicyQuery();

  const { setDirty } = useUnsavedChanges();

  // Settings State
  const [allowPatientCancel, setAllowPatientCancel] = useState(true);
  const [allowDoctorCancel, setAllowDoctorCancel] = useState(true);
  const [allowReceptionistCancel, setAllowReceptionistCancel] = useState(true);
  const [allowClinicAdminCancel, setAllowClinicAdminCancel] = useState(true);

  const [windowOnlineHours, setWindowOnlineHours] = useState<number>(24);
  const [windowOfflineHours, setWindowOfflineHours] = useState<number>(12);

  const [dailyLimitPerPatient, setDailyLimitPerPatient] = useState<number>(3);
  const [weeklyLimitPerPatient, setWeeklyLimitPerPatient] = useState<number>(10);
  const [monthlyLimitPerPatient, setMonthlyLimitPerPatient] = useState<number>(30);
  const [cooldownSecondsBetweenCancellations, setCooldownSecondsBetweenCancellations] = useState<number>(1800);

  const [reasonMandatory, setReasonMandatory] = useState(true);
  const [allowAdditionalComments, setAllowAdditionalComments] = useState(true);
  const [minCommentLength, setMinCommentLength] = useState<number>(10);
  const [maxCommentLength, setMaxCommentLength] = useState<number>(500);

  const [allowReschedule, setAllowReschedule] = useState(true);
  const [maxReschedules, setMaxReschedules] = useState<number>(3);
  const [rescheduleWindowHours, setRescheduleWindowHours] = useState<number>(24);
  const [preservePaymentOnReschedule, setPreservePaymentOnReschedule] = useState(true);

  // Baseline ref for tracking changes
  const baselineRef = useRef<ClinicCancellationPolicy | null>(null);

  const loadPolicy = (policy: ClinicCancellationPolicy) => {
    setAllowPatientCancel(!!policy.allowPatientCancel);
    setAllowDoctorCancel(!!policy.allowDoctorCancel);
    setAllowReceptionistCancel(!!policy.allowReceptionistCancel);
    setAllowClinicAdminCancel(!!policy.allowClinicAdminCancel);
    setWindowOnlineHours(Number(policy.windowOnlineHours ?? 24));
    setWindowOfflineHours(Number(policy.windowOfflineHours ?? 12));
    setDailyLimitPerPatient(Number(policy.dailyLimitPerPatient ?? 3));
    setWeeklyLimitPerPatient(Number(policy.weeklyLimitPerPatient ?? 10));
    setMonthlyLimitPerPatient(Number(policy.monthlyLimitPerPatient ?? 30));
    setCooldownSecondsBetweenCancellations(Number(policy.cooldownSecondsBetweenCancellations ?? 1800));
    setReasonMandatory(!!policy.reasonMandatory);
    setAllowAdditionalComments(!!policy.allowAdditionalComments);
    setMinCommentLength(Number(policy.minCommentLength ?? 10));
    setMaxCommentLength(Number(policy.maxCommentLength ?? 500));
    setAllowReschedule(!!policy.allowReschedule);
    setMaxReschedules(Number(policy.maxReschedules ?? 3));
    setRescheduleWindowHours(Number(policy.rescheduleWindowHours ?? 24));
    setPreservePaymentOnReschedule(!!policy.preservePaymentOnReschedule);
  };

  useEffect(() => {
    const existing = policyData;
    if (!existing) return;

    loadPolicy(existing);

    baselineRef.current = {
      isActive: true,
      allowPatientCancel: !!existing.allowPatientCancel,
      allowDoctorCancel: !!existing.allowDoctorCancel,
      allowReceptionistCancel: !!existing.allowReceptionistCancel,
      allowClinicAdminCancel: !!existing.allowClinicAdminCancel,
      windowOnlineHours: Number(existing.windowOnlineHours ?? 24),
      windowOfflineHours: Number(existing.windowOfflineHours ?? 12),
      dailyLimitPerPatient: Number(existing.dailyLimitPerPatient ?? 3),
      weeklyLimitPerPatient: Number(existing.weeklyLimitPerPatient ?? 10),
      monthlyLimitPerPatient: Number(existing.monthlyLimitPerPatient ?? 30),
      cooldownSecondsBetweenCancellations: Number(existing.cooldownSecondsBetweenCancellations ?? 1800),
      reasonMandatory: !!existing.reasonMandatory,
      allowAdditionalComments: !!existing.allowAdditionalComments,
      minCommentLength: Number(existing.minCommentLength ?? 10),
      maxCommentLength: Number(existing.maxCommentLength ?? 500),
      allowReschedule: !!existing.allowReschedule,
      maxReschedules: Number(existing.maxReschedules ?? 3),
      rescheduleWindowHours: Number(existing.rescheduleWindowHours ?? 24),
      preservePaymentOnReschedule: !!existing.preservePaymentOnReschedule,
    };

    setDirty(false);
  }, [policyData, setDirty]);

  // Clean up dirty state on unmount
  useEffect(() => {
    return () => setDirty(false);
  }, [setDirty]);

  // Page dirty calculations
  const isPageDirty = useMemo(() => {
    const base = baselineRef.current;
    if (!base) return false;

    return (
      base.allowPatientCancel !== allowPatientCancel ||
      base.allowDoctorCancel !== allowDoctorCancel ||
      base.allowReceptionistCancel !== allowReceptionistCancel ||
      base.allowClinicAdminCancel !== allowClinicAdminCancel ||
      base.windowOnlineHours !== windowOnlineHours ||
      base.windowOfflineHours !== windowOfflineHours ||
      base.dailyLimitPerPatient !== dailyLimitPerPatient ||
      base.weeklyLimitPerPatient !== weeklyLimitPerPatient ||
      base.monthlyLimitPerPatient !== monthlyLimitPerPatient ||
      base.cooldownSecondsBetweenCancellations !== cooldownSecondsBetweenCancellations ||
      base.reasonMandatory !== reasonMandatory ||
      base.allowAdditionalComments !== allowAdditionalComments ||
      base.minCommentLength !== minCommentLength ||
      base.maxCommentLength !== maxCommentLength ||
      base.allowReschedule !== allowReschedule ||
      base.maxReschedules !== maxReschedules ||
      base.rescheduleWindowHours !== rescheduleWindowHours ||
      base.preservePaymentOnReschedule !== preservePaymentOnReschedule
    );
  }, [
    allowPatientCancel,
    allowDoctorCancel,
    allowReceptionistCancel,
    allowClinicAdminCancel,
    windowOnlineHours,
    windowOfflineHours,
    dailyLimitPerPatient,
    weeklyLimitPerPatient,
    monthlyLimitPerPatient,
    cooldownSecondsBetweenCancellations,
    reasonMandatory,
    allowAdditionalComments,
    minCommentLength,
    maxCommentLength,
    allowReschedule,
    maxReschedules,
    rescheduleWindowHours,
    preservePaymentOnReschedule,
  ]);

  useEffect(() => {
    setDirty(isPageDirty);
  }, [isPageDirty, setDirty]);

  const validateSettings = () => {
    // 1. Cancellation Windows
    if (windowOnlineHours < 0 || windowOnlineHours > 720) {
      addToast({ title: "Online notice hours must be between 0 and 720 hours.", color: "danger" });
      return false;
    }
    if (windowOfflineHours < 0 || windowOfflineHours > 720) {
      addToast({ title: "Offline notice hours must be between 0 and 720 hours.", color: "danger" });
      return false;
    }

    // 2. Patient Limitations
    const cooldownMins = Math.round(cooldownSecondsBetweenCancellations / 60);
    if (cooldownMins < 0 || cooldownMins > 10080) {
      addToast({ title: "Cooldown must be between 0 and 10,080 minutes.", color: "danger" });
      return false;
    }
    if (dailyLimitPerPatient < 0 || dailyLimitPerPatient > 100) {
      addToast({ title: "Max daily cancellations must be between 0 and 100.", color: "danger" });
      return false;
    }
    if (weeklyLimitPerPatient < 0 || weeklyLimitPerPatient > 500) {
      addToast({ title: "Max weekly cancellations must be between 0 and 500.", color: "danger" });
      return false;
    }
    if (monthlyLimitPerPatient < 0 || monthlyLimitPerPatient > 2000) {
      addToast({ title: "Max monthly cancellations must be between 0 and 2,000.", color: "danger" });
      return false;
    }

    // 3. Reason & Comment Validations
    if (allowAdditionalComments) {
      if (minCommentLength < 0 || minCommentLength > 1000) {
        addToast({ title: "Min comments length must be between 0 and 1,000 characters.", color: "danger" });
        return false;
      }
      if (maxCommentLength < 10 || maxCommentLength > 5000) {
        addToast({ title: "Max comments length must be between 10 and 5,000 characters.", color: "danger" });
        return false;
      }
      if (minCommentLength > maxCommentLength) {
        addToast({ title: "Min comment length cannot exceed max comment length.", color: "danger" });
        return false;
      }
    }

    // 4. Rescheduling Rules
    if (allowReschedule) {
      if (maxReschedules < 0 || maxReschedules > 100) {
        addToast({ title: "Max reschedules must be between 0 and 100.", color: "danger" });
        return false;
      }
      if (rescheduleWindowHours < 0 || rescheduleWindowHours > 720) {
        addToast({ title: "Reschedule window limit must be between 0 and 720 hours.", color: "danger" });
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateSettings()) return;

    const payload: ClinicCancellationPolicy = {
      isActive: true,
      allowPatientCancel,
      allowDoctorCancel,
      allowReceptionistCancel,
      allowClinicAdminCancel,
      windowOnlineHours,
      windowOfflineHours,
      dailyLimitPerPatient,
      weeklyLimitPerPatient,
      monthlyLimitPerPatient,
      cooldownSecondsBetweenCancellations,
      reasonMandatory,
      allowAdditionalComments,
      minCommentLength,
      maxCommentLength,
      allowReschedule,
      maxReschedules,
      rescheduleWindowHours,
      preservePaymentOnReschedule,
    };

    try {
      const response = await savePolicy(payload).unwrap();
      const versionText = response?.version ? ` updated to Version ${response.version}` : "";
      addToast({
        title: "Success",
        description: `Policy saved successfully! Configuration${versionText}.`,
        color: "success",
      });
      await refetch();
      setDirty(false);
    } catch (e: any) {
      addToast({
        title: "Failed to save settings",
        description: e?.data?.message || "Please try again later.",
        color: "danger",
      });
    }
  };

  const handleResetDefaults = async () => {
    try {
      const defaults = await triggerGetDefaults().unwrap();
      if (defaults) {
        loadPolicy(defaults);
        addToast({
          title: "Defaults loaded",
          description: "Click Save Configuration to apply defaults.",
          color: "warning",
        });
      }
    } catch {
      addToast({
        title: "Failed to load default policy settings",
        color: "danger",
      });
    }
  };

  const isBusy = isLoading || isSaving || isFetchingDefaults;

  const toggleClass = (val: boolean) =>
    `relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
      val ? "bg-teal-600" : "bg-slate-300"
    }`;

  const spanClass = (val: boolean) =>
    `inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
      val ? "translate-x-6" : "translate-x-1"
    }`;

  return (
    <div className="bg-white font-sans text-slate-700">
      <div className="mx-auto px-4 py-4 sm:px-6 sm:py-5">
        {/* Header */}
        <div className="mb-5 flex items-center gap-3 border-b border-slate-100 px-1 pb-4 sm:px-0">
          <span className="flex shrink-0 items-center justify-center rounded-xl bg-rose-50/60 p-2 text-rose-500 dark:bg-rose-950/20 dark:text-rose-400">
            <LuCalendarX size={24} />
          </span>
          <h2 className="text-[17px] font-semibold text-slate-800 sm:text-[20px]">
            Appointment Cancellation & Refund Settings
          </h2>
        </div>

        <div className="space-y-6">
          {/* Cancellable Roles Settings */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
              <LuUserCheck size={18} className="text-teal-600" />
              User Cancel Rights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Allow Patients */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium text-slate-800 flex items-center gap-2">
                    <LuUser size={16} className="text-slate-400" />
                    Allow Patients to Cancel Online
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Allows patients to cancel their appointments directly from the mobile app, subject to notice hours and limits.</p>
                </div>
                <button
                  onClick={() => setAllowPatientCancel(!allowPatientCancel)}
                  disabled={isBusy}
                  className={toggleClass(allowPatientCancel)}
                >
                  <span className={spanClass(allowPatientCancel)} />
                </button>
              </div>

              {/* Allow Doctors */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium text-slate-800 flex items-center gap-2">
                    <LuStethoscope size={16} className="text-slate-400" />
                    Allow Doctors to Cancel
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Allows doctors to cancel appointments. This bypasses normal frequency limits but follows reason rules.</p>
                </div>
                <button
                  onClick={() => setAllowDoctorCancel(!allowDoctorCancel)}
                  disabled={isBusy}
                  className={toggleClass(allowDoctorCancel)}
                >
                  <span className={spanClass(allowDoctorCancel)} />
                </button>
              </div>

              {/* Allow Receptionist */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium text-slate-800 flex items-center gap-2">
                    <LuContact size={16} className="text-slate-400" />
                    Allow Receptionist to Cancel
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Allows receptionists to cancel appointments on behalf of patients or doctors.</p>
                </div>
                <button
                  onClick={() => setAllowReceptionistCancel(!allowReceptionistCancel)}
                  disabled={isBusy}
                  className={toggleClass(allowReceptionistCancel)}
                >
                  <span className={spanClass(allowReceptionistCancel)} />
                </button>
              </div>

              {/* Allow Clinic Admin */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium text-slate-800 flex items-center gap-2">
                    <LuShieldAlert size={16} className="text-slate-400" />
                    Allow Clinic Admin to Cancel
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Allows clinic administrators to cancel any appointment without restriction.</p>
                </div>
                <button
                  onClick={() => setAllowClinicAdminCancel(!allowClinicAdminCancel)}
                  disabled={isBusy}
                  className={toggleClass(allowClinicAdminCancel)}
                >
                  <span className={spanClass(allowClinicAdminCancel)} />
                </button>
              </div>
            </div>
          </div>

          {/* Cancellation Windows Section */}
          <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 transition-opacity duration-200 ${!allowPatientCancel ? "opacity-60 pointer-events-none" : ""}`}>
            <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
              <LuClock size={18} className="text-teal-600" />
              Cancellation Windows
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Specify how many hours before the appointment patients must cancel. If they try to cancel after this, they must contact the clinic.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <LuGlobe size={14} className="text-slate-400" />
                  <span>Online Consultations (Hours prior)</span>
                  <Tooltip
                    content="Minimum advance notice required for online cancellation (e.g. 24 hours prior means a patient cannot cancel within 24 hours of the slot)."
                    placement="top"
                    showArrow
                  >
                    <span className="cursor-help text-slate-400 hover:text-slate-600">
                      <LuInfo size={14} />
                    </span>
                  </Tooltip>
                </label>
                <input
                  type="number"
                  min={0}
                  max={720}
                  step={1}
                  value={windowOnlineHours}
                  onChange={(e) => setWindowOnlineHours(Math.max(0, parseInt(e.target.value) || 0))}
                  disabled={isBusy || !allowPatientCancel}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <LuHouse size={14} className="text-slate-400" />
                  <span>Offline / In-Clinic (Hours prior)</span>
                  <Tooltip
                    content="Minimum advance notice required for in-person cancellations."
                    placement="top"
                    showArrow
                  >
                    <span className="cursor-help text-slate-400 hover:text-slate-600">
                      <LuInfo size={14} />
                    </span>
                  </Tooltip>
                </label>
                <input
                  type="number"
                  min={0}
                  max={720}
                  step={1}
                  value={windowOfflineHours}
                  onChange={(e) => setWindowOfflineHours(Math.max(0, parseInt(e.target.value) || 0))}
                  disabled={isBusy || !allowPatientCancel}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-100 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Patient Limitations Section */}
          <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 transition-opacity duration-200 ${!allowPatientCancel ? "opacity-60 pointer-events-none" : ""}`}>
            <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
              <LuActivity size={18} className="text-teal-600" />
              Patient Limitations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  Cooldown (Minutes between requests)
                  <Tooltip
                    content="The waiting time required after a patient cancels an appointment before they can cancel another (prevents spam)."
                    placement="top"
                    showArrow
                  >
                    <span className="cursor-help text-slate-400 hover:text-slate-600">
                      <LuInfo size={14} />
                    </span>
                  </Tooltip>
                </label>
                <input
                  type="number"
                  min={0}
                  max={10080}
                  step={1}
                  value={Math.round(cooldownSecondsBetweenCancellations / 60)}
                  onChange={(e) => setCooldownSecondsBetweenCancellations((Math.max(0, parseInt(e.target.value) || 0)) * 60)}
                  disabled={isBusy || !allowPatientCancel}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-100 focus:outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  Max Daily Cancellations
                  <Tooltip
                    content="Maximum cancellations a single patient can perform within a single day."
                    placement="top"
                    showArrow
                  >
                    <span className="cursor-help text-slate-400 hover:text-slate-600">
                      <LuInfo size={14} />
                    </span>
                  </Tooltip>
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={dailyLimitPerPatient}
                  onChange={(e) => setDailyLimitPerPatient(Math.max(0, parseInt(e.target.value) || 0))}
                  disabled={isBusy || !allowPatientCancel}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  Max Weekly Cancellations
                  <Tooltip
                    content="Maximum cancellations a single patient can perform within a single week."
                    placement="top"
                    showArrow
                  >
                    <span className="cursor-help text-slate-400 hover:text-slate-600">
                      <LuInfo size={14} />
                    </span>
                  </Tooltip>
                </label>
                <input
                  type="number"
                  min={0}
                  max={500}
                  step={1}
                  value={weeklyLimitPerPatient}
                  onChange={(e) => setWeeklyLimitPerPatient(Math.max(0, parseInt(e.target.value) || 0))}
                  disabled={isBusy || !allowPatientCancel}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  Max Monthly Cancellations
                  <Tooltip
                    content="Maximum cancellations a single patient can perform within a single month."
                    placement="top"
                    showArrow
                  >
                    <span className="cursor-help text-slate-400 hover:text-slate-600">
                      <LuInfo size={14} />
                    </span>
                  </Tooltip>
                </label>
                <input
                  type="number"
                  min={0}
                  max={2000}
                  step={1}
                  value={monthlyLimitPerPatient}
                  onChange={(e) => setMonthlyLimitPerPatient(Math.max(0, parseInt(e.target.value) || 0))}
                  disabled={isBusy || !allowPatientCancel}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-100 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Reason & Comment Validations */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
              <LuMessageSquare size={18} className="text-teal-600" />
              Reason & Comment Validations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium text-slate-800">Cancellation Reason is Mandatory</p>
                  <p className="text-xs text-slate-400 mt-0.5">Requires selecting a cancellation reason from the pre-defined dropdown list.</p>
                </div>
                <button
                  onClick={() => setReasonMandatory(!reasonMandatory)}
                  disabled={isBusy}
                  className={toggleClass(reasonMandatory)}
                >
                  <span className={spanClass(reasonMandatory)} />
                </button>
              </div>

              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium text-slate-800">Allow Additional Comments</p>
                  <p className="text-xs text-slate-400 mt-0.5">Enables typing customized additional comments when cancelling.</p>
                </div>
                <button
                  onClick={() => setAllowAdditionalComments(!allowAdditionalComments)}
                  disabled={isBusy}
                  className={toggleClass(allowAdditionalComments)}
                >
                  <span className={spanClass(allowAdditionalComments)} />
                </button>
              </div>
            </div>

            {allowAdditionalComments && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    Min Characters
                    <Tooltip
                      content="Minimum character length required for additional comments."
                      placement="top"
                      showArrow
                    >
                      <span className="cursor-help text-slate-400 hover:text-slate-600">
                        <LuInfo size={14} />
                      </span>
                    </Tooltip>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    step={1}
                    value={minCommentLength}
                    onChange={(e) => setMinCommentLength(Math.max(0, parseInt(e.target.value) || 0))}
                    disabled={isBusy}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    Max Characters
                    <Tooltip
                      content="Maximum character length allowed for additional comments."
                      placement="top"
                      showArrow
                    >
                      <span className="cursor-help text-slate-400 hover:text-slate-600">
                        <LuInfo size={14} />
                      </span>
                    </Tooltip>
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={5000}
                    step={1}
                    value={maxCommentLength}
                    onChange={(e) => setMaxCommentLength(Math.max(0, parseInt(e.target.value) || 0))}
                    disabled={isBusy}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-100 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Rescheduling Rules */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <LuRefreshCw size={18} className="text-teal-600" />
                Rescheduling Rules
              </h3>
              <button
                onClick={() => setAllowReschedule(!allowReschedule)}
                disabled={isBusy}
                className={toggleClass(allowReschedule)}
              >
                <span className={spanClass(allowReschedule)} />
              </button>
            </div>

            {allowReschedule && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      Max Reschedules (times)
                      <Tooltip
                        content="Maximum times a single patient is allowed to reschedule an appointment."
                        placement="top"
                        showArrow
                      >
                        <span className="cursor-help text-slate-400 hover:text-slate-600">
                          <LuInfo size={14} />
                        </span>
                      </Tooltip>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={maxReschedules}
                      onChange={(e) => setMaxReschedules(Math.max(0, parseInt(e.target.value) || 0))}
                      disabled={isBusy}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-100 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      Reschedule Window limit (Hours)
                      <Tooltip
                        content="Minimum hours prior to the appointment slot required for rescheduling."
                        placement="top"
                        showArrow
                      >
                        <span className="cursor-help text-slate-400 hover:text-slate-600">
                          <LuInfo size={14} />
                        </span>
                      </Tooltip>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={720}
                      step={1}
                      value={rescheduleWindowHours}
                      onChange={(e) => setRescheduleWindowHours(Math.max(0, parseInt(e.target.value) || 0))}
                      disabled={isBusy}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-100 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm font-medium text-slate-800 flex items-center gap-2">
                      <LuCreditCard size={16} className="text-slate-400" />
                      Keep existing payments active on reschedule
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Transfers the patient's payment/deposit to the rescheduled appointment automatically.</p>
                  </div>
                  <button
                    onClick={() => setPreservePaymentOnReschedule(!preservePaymentOnReschedule)}
                    disabled={isBusy}
                    className={toggleClass(preservePaymentOnReschedule)}
                  >
                    <span className={spanClass(preservePaymentOnReschedule)} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
          <button
            onClick={handleResetDefaults}
            disabled={isBusy}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <LuRotateCcw size={16} />
            Reset Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={isBusy || !isPageDirty}
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-50"
          >
            <LuSave size={16} />
            {isSaving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>
    </div>
  );
}
