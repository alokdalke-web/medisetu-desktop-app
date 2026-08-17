import { addToast } from "@heroui/react";

export const pickMessage = (obj: any, fallback = ""): string => {
  if (!obj) return fallback;

  const fromArrayErrors =
    Array.isArray(obj?.data?.errors) && obj.data.errors.length
      ? obj.data.errors
          .map((e: any) => e?.message || e?.msg || e?.error || String(e))
          .join(", ")
      : undefined;

  const msg =
    obj?.message ??
    obj?.data?.message ??
    fromArrayErrors ??
    obj?.error ??
    obj?.statusText;

  return typeof msg === "string" && msg.trim() ? msg : fallback;
};

export const toastSuccess = (title: string, obj?: any, fallback?: string) =>
  addToast({
    title,
    description: pickMessage(obj, fallback ?? "Done successfully."),
    color: "success",
    variant: "flat",
  });

export const toastError = (title: string, obj?: any, fallback?: string) =>
  addToast({
    title,
    description: pickMessage(obj, fallback ?? "Something went wrong."),
    color: "danger",
    variant: "flat",
  });

export const toastInfo = (title: string, desc: string) =>
  addToast({ title, description: desc, color: "warning", variant: "flat" });
