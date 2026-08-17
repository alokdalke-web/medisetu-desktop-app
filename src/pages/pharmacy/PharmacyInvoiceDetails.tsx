// src/pages/pharmacy/PharmacyInvoiceDetails.tsx
import {
  Card,
  CardBody,
  Spinner,
} from "@heroui/react";
import React, { useMemo } from "react";
import {
  FiArrowLeft,
  FiDownload,
  FiFileText,
  FiMapPin,
  FiPhone,
  FiUser,
} from "react-icons/fi";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router";

import AppButton from "../../components/shared/AppButton";
import { useGetUserQuery } from "../../redux/api/authApi";
import { useGetInvoiceByIdQuery } from "../../redux/api/pharmacyApi";
import type { RootState } from "../../redux/store";

/* ----------------------------- Helpers ----------------------------- */

const pickUser = (resp: any) =>
  resp?.data?.user ?? resp?.data ?? resp?.user ?? resp ?? null;

const toNum = (v: any) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const fmt = (v: any) =>
  v === null || v === undefined || v === "" ? "—" : String(v);

const formatINR = (n: number) => {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `₹${n.toFixed(2)}`;
  }
};

const formatDate = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* ----------------------------- Skeleton UI ----------------------------- */

const Skeleton = ({ className = "" }: { className?: string }) => (
  <div
    className={["animate-pulse rounded-xl bg-slate-200/70", className].join(
      " ",
    )}
  />
);

const InvoiceDetailsSkeleton = () => (
  <Card
    shadow="none"
    radius="lg"
    className="border border-slate-200 rounded-2xl"
  >
    <CardBody className="p-0">
      <div className="p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-lg" />
          <Skeleton className="h-4 w-40 rounded-lg" />
        </div>

        <div>
          <Skeleton className="h-4 w-40 rounded-lg mb-3" />
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-5 w-5 rounded-lg mt-0.5" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-28 rounded-lg" />
                    <Skeleton className="mt-2 h-3 w-20 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <Skeleton className="h-4 w-44 rounded-lg mb-3" />
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-white border-b border-slate-200">
                    {["Name", "Qty", "Unit Price", "Amount"].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left font-medium text-slate-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr
                      key={i}
                      className="border-b border-slate-100 last:border-b-0"
                    >
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-40 rounded-lg" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-12 rounded-lg" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-20 rounded-lg" />
                      </td>
                      <td className="px-5 py-4">
                        <Skeleton className="h-4 w-24 rounded-lg" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <Skeleton className="h-4 w-28 rounded-lg mb-3" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-3 w-24 rounded-lg" />
                <Skeleton className="h-3 w-20 rounded-lg" />
              </div>
            ))}
            <div className="h-px bg-slate-200 my-2" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28 rounded-lg" />
              <Skeleton className="h-4 w-24 rounded-lg" />
            </div>
          </div>
        </div>

        <div className="pt-2">
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>
      </div>
    </CardBody>
  </Card>
);

/* ----------------------------- Component ----------------------------- */

const PharmacyInvoiceDetails: React.FC = () => {
  const navigate = useNavigate();

  const params = useParams();
  const invoiceId = String(
    (params as any)?.invoiceId ?? (params as any)?.id ?? "",
  );

  const authUser = useSelector((s: RootState) => s.auth.user);
  const { data: userData } = useGetUserQuery();

  const user = pickUser(userData) ?? pickUser(authUser);
  const pharmacyId = String(user?.pharmacyDetails?.pharmacyId ?? "");

  const skipQuery = !invoiceId || !pharmacyId;

  const {
    data: apiResp,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetInvoiceByIdQuery({ invoiceId, pharmacyId }, { skip: skipQuery });

  const payload: any = apiResp;

  const invoice = payload?.invoice ?? null;
  const billing = payload?.billing ?? null;
  const items = Array.isArray(payload?.items) ? payload.items : [];

  const subtotal = toNum(billing?.price);
  const discount = toNum(billing?.discount);
  const tax = toNum(billing?.tax);
  const totalAmount = toNum(billing?.totalPrice);

  const invAny = invoice as any;

  const invoiceCode = useMemo(() => {
    const raw =
      invAny?.invoiceNumber ?? invAny?.invoiceNo ?? invoice?.id ?? invoiceId;
    const s = String(raw ?? "");
    if (!s) return "—";
    if (s.toUpperCase().startsWith("INV")) return s;
    return s.length > 10 ? `INV-${s.slice(0, 6)}` : `INV-${s}`;
  }, [invAny?.invoiceNumber, invAny?.invoiceNo, invoice?.id, invoiceId]);

  const invoiceDate =
    (invoice as any)?.createdAt ?? (billing as any)?.createdAt ?? null;

  // Print header info
  const pharmacyName =
    user?.pharmacyDetails?.pharmacyName ??
    user?.pharmacyDetails?.name ??
    "NEW PHARMA";
  const pharmacyPhone = user?.pharmacyDetails?.contactNumber ?? "";
  const pharmacyAddress = user?.pharmacyDetails?.address ?? "";

  const getItemName = (m: any) =>
    m?.drugName ?? m?.medicineName ?? m?.name ?? "—";

  const getItemQty = (m: any) => {
    const q = toNum(m?.quantity ?? m?.qty ?? m?.totalStrips ?? 1);
    return q || 1;
  };

  const buildSimpleInvoiceHtml = () => {
    const dateStr = formatDate(invoiceDate);

    const rowsHtml = items
      .map((m: any, idx: number) => {
        const qty = getItemQty(m);
        const price = toNum(m?.sellingPriceExclGst || m?.sellingPrice);
        const gstPerc = toNum(m?.gstPercentage);
        const total = toNum(m?.totalPrice);
        const expiry = formatDate(m?.expiryDate);

        return `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${idx + 1}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">
              <div style="font-weight: 600;">${getItemName(m)}</div>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${qty}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${expiry}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${price.toFixed(2)}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${gstPerc.toFixed(2)}%</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">₹${total.toFixed(2)}</td>
          </tr>
        `;
      })
      .join("");

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoiceCode}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body { font-family: 'Inter', -apple-system, sans-serif; padding: 40px; color: #1f2937; line-height: 1.5; background: #fff; }
            .container { max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #f3f4f6; padding-bottom: 20px; }
            .pharmacy-info h1 { margin: 0; font-size: 24px; color: #111827; }
            .pharmacy-info p { margin: 4px 0; font-size: 14px; color: #6b7280; }
            .invoice-title { text-align: right; }
            .invoice-title h2 { margin: 0; font-size: 28px; font-weight: 800; color: #111827; letter-spacing: -0.025em; }
            .invoice-title p { margin: 4px 0; font-size: 14px; color: #6b7280; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
            .meta-box h3 { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.05em; margin-bottom: 8px; }
            .meta-box p { margin: 2px 0; font-size: 15px; font-weight: 500; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { text-align: left; background: #f9fafb; padding: 12px 10px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; }
            .summary { display: flex; justify-content: flex-end; }
            .summary-card { width: 300px; background: #f9fafb; padding: 20px; border-radius: 12px; }
            .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
            .total-row { display: flex; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 2px solid #e5e7eb; font-weight: 800; font-size: 20px; color: #059669; }
            .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #f3f4f6; text-align: center; font-size: 12px; color: #9ca3af; }
            @media print {
              body { padding: 0; }
              .container { max-width: 100%; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="pharmacy-info">
                <h1>${pharmacyName}</h1>
                <p>${pharmacyAddress}</p>
                <p>Phone: ${pharmacyPhone}</p>
              </div>
              <div class="invoice-title">
                <h2>INVOICE</h2>
                <p>${invoiceCode}</p>
                <p>${dateStr}</p>
              </div>
            </div>

            <div class="meta-grid">
              <div class="meta-box">
                <h3>Billed To</h3>
                <p style="font-size: 18px; font-weight: 700;">${fmt((invoice as any)?.customerName)}</p>
                <p>${fmt((invoice as any)?.mobile)}</p>
                <p>${fmt((invoice as any)?.address)}</p>
              </div>
              <div class="meta-box" style="text-align: right;">
                <h3>Payment Details</h3>
                <p>Method: ${billing?.paymentMethod || "CASH"}</p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th width="40">#</th>
                  <th>Medicine</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: center;">Exp</th>
                  <th style="text-align: right;">Rate</th>
                  <th style="text-align: right;">GST</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <div class="summary">
              <div class="summary-card">
                <div class="summary-row">
                  <span>Subtotal</span>
                  <span>₹${subtotal.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                  <span>GST Total</span>
                  <span>₹${tax.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                  <span>Discount</span>
                  <span style="color: #ef4444;">-₹${discount.toFixed(2)}</span>
                </div>
                <div class="total-row">
                  <span>Total</span>
                  <span>₹${totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div class="footer">
              <p>This is a computer generated invoice and does not require a physical signature.</p>
              <p>Thank you for choosing ${pharmacyName}!</p>
            </div>
          </div>
          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>
    `;
  };

  const handlePrintAction = () => {
    try {
      const html = buildSimpleInvoiceHtml();
      
      // Create a hidden iframe
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.name = "print_iframe";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!doc) throw new Error("Could not access iframe document");

      doc.open();
      doc.write(html);
      doc.close();

      // Wait for content to load then print
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        
        // Remove iframe after a delay
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);
    } catch (err) {
      console.error("❌ Failed to print invoice", err);
    }
  };

  const downloadInvoicePdf = async () => {
    handlePrintAction();
  };

  const shouldShowNoData = !isLoading && !isFetching && !isError && !invoice;
  const showInitialLoading =
    !skipQuery && (isLoading || isFetching) && !invoice && !isError;
  const showRefreshing = !skipQuery && isFetching && !!invoice;

  return (
    <div className="w-full h-full px-4 sm:px-6 py-4">
      {/* Top bar (screen only) */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex space-x-2">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="h-9 w-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50"
              aria-label="Back"
            >
              <FiArrowLeft className="text-slate-700" />
            </button>
          </div>

          <div className="text-base sm:text-[18px] mt-1 font-semibold text-slate-900">
            Invoice Details
          </div>
        </div>

        {showRefreshing && (
          <span className="ml-2 inline-flex items-center gap-2 text-xs text-slate-500">
            <Spinner size="sm" /> Updating…
          </span>
        )}
      </div>

      {isError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center justify-between">
          <span>Failed to load invoice details.</span>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
          >
            Retry
          </button>
        </div>
      ) : shouldShowNoData ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          No invoice details found.
        </div>
      ) : showInitialLoading ? (
        <InvoiceDetailsSkeleton />
      ) : !invoice ? (
        <Card
          shadow="none"
          radius="lg"
          className="border border-slate-200 rounded-2xl"
        >
          <CardBody className="p-6">
            <div className="text-sm text-slate-600 flex items-center gap-2">
              <Spinner size="sm" /> Fetching invoice…
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-5">
          <Card
            shadow="none"
            radius="lg"
            className="border border-slate-200 rounded-2xl"
          >
            <CardBody className="p-0">
              <div className="relative">
                {showRefreshing && (
                  <div className="absolute inset-0 z-10 bg-white/55 backdrop-blur-[1px] flex items-center justify-center rounded-2xl">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm">
                      <Spinner size="sm" /> Updating…
                    </div>
                  </div>
                )}

                <div
                  className={[
                    "p-5 space-y-5",
                    showRefreshing ? "opacity-80" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2 text-primary font-semibold">
                    <FiFileText />
                    <span className="text-sm sm:text-base">{invoiceCode}</span>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-slate-900 mb-2">
                      Customer Details
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 text-slate-500">
                            <FiUser />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {fmt((invoice as any)?.customerName)}
                            </div>
                            <div className="text-xs text-slate-500">
                              Customer
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 text-slate-500">
                            <FiPhone />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {fmt((invoice as any)?.mobile)}
                            </div>
                            <div className="text-xs text-slate-500">
                              Contact
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 text-slate-500">
                            <FiMapPin />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {fmt((invoice as any)?.address)}
                            </div>
                            <div className="text-xs text-slate-500">
                              Address
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-slate-900 mb-2">
                      Medicine Details
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="bg-white border-b border-slate-200">
                              <th className="px-5 py-3 text-left font-medium text-slate-500">
                                #
                              </th>
                              <th className="px-5 py-3 text-left font-medium text-slate-500">
                                Name
                              </th>
                              <th className="px-5 py-3 text-left font-medium text-slate-500">
                                Qty
                              </th>
                              <th className="px-5 py-3 text-left font-medium text-slate-500">
                                Expiry
                              </th>
                              <th className="px-5 py-3 text-left font-medium text-slate-500">
                                GST %
                              </th>
                              <th className="px-5 py-3 text-right font-medium text-slate-500">
                                GST Amt
                              </th>
                              <th className="px-5 py-3 text-right font-medium text-slate-500">
                                Selling
                              </th>
                              <th className="px-5 py-3 text-right font-medium text-slate-500">
                                Total
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {items.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={8}
                                  className="px-5 py-6 text-center text-slate-500"
                                >
                                  No medicines found.
                                </td>
                              </tr>
                            ) : (
                              items.map((m: any, idx: number) => {
                                const qty = getItemQty(m);
                                const expiry = formatDate(m?.expiryDate);
                                const gstPerc = toNum(
                                  m?.gstPercentage,
                                ).toFixed(2);
                                const gstAmt = toNum(m?.gstAmount);
                                const selling = toNum(
                                  m?.sellingPriceExclGst || m?.sellingPrice,
                                );
                                const total = toNum(m?.totalPrice);

                                return (
                                  <tr
                                    key={m?.batchItemId ?? m?.productId ?? idx}
                                    className="border-b border-slate-100 last:border-b-0"
                                  >
                                    <td className="px-5 py-4 font-medium text-slate-900">
                                      {idx + 1}
                                    </td>
                                    <td className="px-5 py-4 font-medium text-slate-900">
                                      {getItemName(m)}
                                    </td>
                                    <td className="px-5 py-4 text-slate-700">
                                      {qty}
                                    </td>
                                    <td className="px-5 py-4 text-slate-700">
                                      {expiry}
                                    </td>
                                    <td className="px-5 py-4 text-slate-700">
                                      {gstPerc}%
                                    </td>
                                    <td className="px-5 py-4 text-right text-slate-700">
                                      {formatINR(gstAmt)}
                                    </td>
                                    <td className="px-5 py-4 text-right text-slate-700">
                                      {formatINR(selling)}
                                    </td>
                                    <td className="px-5 py-4 text-right text-slate-900 font-semibold">
                                      {formatINR(total)}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-sm font-semibold text-primary mb-3">
                      Bill Summary
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">
                          Subtotal (Excl. GST):
                        </span>
                        <span className="font-semibold text-slate-900">
                          {formatINR(subtotal)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Discount:</span>
                        <span className="font-semibold text-slate-900">
                          - {formatINR(discount)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">GST:</span>
                        <span className="font-semibold text-slate-900">
                          + {formatINR(tax)}
                        </span>
                      </div>

                      <div className="h-px bg-slate-200 my-2" />

                      <div className="flex items-center justify-between">
                        <span className="text-slate-700 font-semibold">
                          Total Amount:
                        </span>
                        <span className="font-bold text-primary">
                          {formatINR(totalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <AppButton
                      text="Download"
                      buttonVariant="primary"
                      startContent={<FiDownload />}
                      onPress={downloadInvoicePdf}
                      isDisabled={isLoading || isFetching}
                    />
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Modal removed for direct print experience */}
    </div>
  );
};

export default PharmacyInvoiceDetails;
