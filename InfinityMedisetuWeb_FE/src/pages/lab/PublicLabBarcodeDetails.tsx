import { Spinner } from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import {
  FiActivity,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiDroplet,
  FiLock,
  FiUser,
} from "react-icons/fi";
import { useParams } from "react-router";

type PublicAppointmentTest = {
  id?: string | null;
  uniqueTestId?: string | null;
  barcodeValue?: string | null;
  patientName?: string | null;
  doctorName?: string | null;
  testName?: string | null;
  category?: string | null;
  price?: number | null;
  dateTime?: string | null;
  appointmentTime?: string | null;
  workflowStatus?: string | null;
  paymentStatus?: string | null;
  sampleStatus?: string | null;
  reportStatus?: string | null;
};

type PublicStep = {
  key?: string;
  title?: string;
  description?: string | null;
  status?: string | null;
  timestamp?: string | null;
};

type PublicEvent = {
  id?: string;
  eventType?: string;
  title?: string;
  description?: string | null;
  actorUserName?: string | null;
  createdAt?: string | null;
};

type PublicBarcodePayload = {
  appointmentTest?: PublicAppointmentTest | null;
  sample?: Record<string, unknown> | null;
  payment?: Record<string, unknown> | null;
  barcodeValue?: string | null;
  steps?: PublicStep[];
  events?: PublicEvent[];
  nextAction?: { key?: string; label?: string } | null;
};

type PublicBarcodeResponse = {
  success?: boolean;
  data?: PublicBarcodePayload;
  message?: string;
};

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }

  return "";
}

function getApiBaseUrl() {
  return String(import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
}

function getPublicBarcodeErrorMessage(status: number, fallback?: string) {
  if (status === 400) return "Invalid barcode format.";
  if (status === 404) return "No lab test found for this barcode.";
  if (status === 403) return "You are not authorized to access this lab barcode.";

  return fallback || "Could not load barcode details.";
}

function formatStatus(value: unknown) {
  const status = firstText(value);
  if (!status) return "-";

  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatMoney(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return firstText(value) || "-";

  return amount.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    style: "currency",
    currency: "INR",
  });
}

function formatDateTime(value: unknown) {
  const text = firstText(value);
  if (!text) return "-";

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;

  return date.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: unknown;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
      <div className="flex items-center gap-1.5">
        {icon ? <span className="text-primary">{icon}</span> : null}
        <p className="text-[11px] font-bold uppercase text-slate-400">{label}</p>
      </div>
      <p className="mt-1 truncate text-sm font-semibold text-slate-950">
        {firstText(value) || "-"}
      </p>
    </div>
  );
}

function stepTone(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "COMPLETED") {
    return {
      dot: "bg-emerald-500",
      badge: "bg-emerald-50 text-emerald-700 border-emerald-100",
      icon: <FiCheckCircle className="text-emerald-500" />,
    };
  }
  if (normalized === "PENDING") {
    return {
      dot: "bg-primary",
      badge: "bg-primary/10 text-primary border-primary/15",
      icon: <FiActivity className="text-primary" />,
    };
  }
  return {
    dot: "bg-slate-300",
    badge: "bg-slate-50 text-slate-500 border-slate-200",
    icon: <FiLock className="text-slate-400" />,
  };
}

function PublicLabBarcodeDetails() {
  const { barcodeValue = "" } = useParams();
  const decodedBarcodeValue = useMemo(
    () => decodeURIComponent(barcodeValue).trim(),
    [barcodeValue],
  );
  const [data, setData] = useState<PublicBarcodePayload | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const loadBarcodeDetails = async () => {
      if (!decodedBarcodeValue) {
        setError("Invalid barcode format.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${getApiBaseUrl()}/lab/barcodes/${encodeURIComponent(decodedBarcodeValue)}/lookup`,
          {
            method: "GET",
            signal: controller.signal,
          },
        );
        const payload = (await response
          .json()
          .catch(() => ({}))) as PublicBarcodeResponse;

        if (!response.ok) {
          setError(getPublicBarcodeErrorMessage(response.status, payload.message));
          setData(null);
          return;
        }

        setData(payload.data ?? null);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(
          err instanceof Error ? err.message : "Could not load barcode details.",
        );
        setData(null);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    void loadBarcodeDetails();

    return () => controller.abort();
  }, [decodedBarcodeValue]);

  const appointmentTest = data?.appointmentTest ?? {};
  const sample = (data?.sample ?? {}) as Record<string, unknown>;
  const payment = (data?.payment ?? {}) as Record<string, unknown>;
  const steps = data?.steps ?? [];
  const events = data?.events ?? [];
  const hasDetails = Boolean(data);

  if (isLoading) {
    return (
      <div className="grid min-h-[70vh] place-items-center bg-slate-50 px-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
          <Spinner size="sm" />
          Loading barcode details...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <main className="mx-auto grid w-full max-w-3xl gap-4">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase text-primary">
                Lab Sample Tracking
              </p>
              <h1 className="mt-1 truncate text-xl font-black text-slate-950">
                {firstText(appointmentTest.testName) || "Lab Test"}
              </h1>
              <p className="mt-1 break-all font-mono text-xs font-bold text-slate-500">
                {decodedBarcodeValue || "-"}
              </p>
            </div>
            {data ? (
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                <FiCheckCircle />
                Found
              </span>
            ) : null}
          </div>

          {error ? (
            <div className="mt-4 flex gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
              <FiAlertCircle className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
        </section>

        {!error && !hasDetails ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              No barcode details are available.
            </p>
          </section>
        ) : null}

        {data ? (
          <>
            <section className="grid gap-3 sm:grid-cols-2">
              <DetailRow
                icon={<FiUser />}
                label="Patient"
                value={appointmentTest.patientName}
              />
              <DetailRow
                icon={<FiUser />}
                label="Doctor"
                value={appointmentTest.doctorName}
              />
              <DetailRow
                icon={<FiDroplet />}
                label="Test"
                value={appointmentTest.testName}
              />
              <DetailRow
                label="Category"
                value={firstText(appointmentTest.category, sample.sampleType)}
              />
              <DetailRow label="Test ID" value={appointmentTest.uniqueTestId} />
              <DetailRow
                label="Barcode / Sample ID"
                value={firstText(
                  appointmentTest.barcodeValue,
                  data.barcodeValue,
                  sample.barcodeValue,
                  decodedBarcodeValue,
                )}
              />
            </section>

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <DetailRow
                label="Workflow"
                value={formatStatus(appointmentTest.workflowStatus)}
              />
              <DetailRow
                label="Sample Status"
                value={formatStatus(
                  appointmentTest.sampleStatus ?? sample.status,
                )}
              />
              <DetailRow
                icon={<FiCreditCard />}
                label="Payment"
                value={formatStatus(
                  appointmentTest.paymentStatus ?? payment.status,
                )}
              />
              <DetailRow
                label="Amount"
                value={formatMoney(payment.amount ?? appointmentTest.price)}
              />
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <FiActivity className="text-primary" />
                  <h2 className="text-sm font-bold text-slate-950">
                    Sample Timeline
                  </h2>
                </div>
                <div className="grid gap-2">
                  {steps.length > 0 ? (
                    steps.map((step, index) => {
                      const tone = stepTone(firstText(step.status));
                      return (
                        <div
                          key={`${firstText(step.key, step.title, index)}`}
                          className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2"
                        >
                          <span
                            className={`grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-sm shadow-sm`}
                          >
                            {tone.icon}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-slate-950">
                              {firstText(step.title, step.key) ||
                                `Step ${index + 1}`}
                            </p>
                            {step.timestamp ? (
                              <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                                {formatDateTime(step.timestamp)}
                              </p>
                            ) : null}
                          </div>
                          <span
                            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${tone.badge}`}
                          >
                            {formatStatus(step.status)}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm font-medium text-slate-500">
                      No timeline steps available.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <FiClock className="text-primary" />
                  <h2 className="text-sm font-bold text-slate-950">
                    Recent Events
                  </h2>
                </div>
                <div className="grid gap-2">
                  {events.length > 0 ? (
                    events.slice(0, 6).map((event, index) => (
                      <div
                        key={`${firstText(event.id, event.title, index)}`}
                        className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2"
                      >
                        <p className="truncate text-xs font-bold text-slate-950">
                          {firstText(event.title, event.eventType) ||
                            `Event ${index + 1}`}
                        </p>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          {event.actorUserName ? (
                            <p className="truncate text-[10px] font-semibold text-slate-500">
                              by {event.actorUserName}
                            </p>
                          ) : (
                            <span />
                          )}
                          <p className="shrink-0 text-[10px] font-semibold text-slate-400">
                            {formatDateTime(event.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm font-medium text-slate-500">
                      No events available.
                    </p>
                  )}
                </div>
              </div>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}

export default PublicLabBarcodeDetails;
