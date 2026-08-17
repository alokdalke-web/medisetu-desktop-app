import type { NotificationEvent, NotificationTemplate } from "./types";

export const NOTIFICATION_EVENTS: NotificationEvent[] = [
  { key: "appointment_created", name: "Appointment Created", description: "When a new appointment is booked", category: "appointments" },
  { key: "appointment_rescheduled", name: "Appointment Rescheduled", description: "When an appointment time is changed", category: "appointments" },
  { key: "appointment_confirmed", name: "Appointment Confirmed", description: "When confirmed by doctor or clinic", category: "appointments" },
  { key: "appointment_canceled", name: "Appointment Canceled", description: "When an appointment is canceled", category: "appointments" },
  { key: "appointment_no_show", name: "Appointment No-Show", description: "When patient doesn't show up", category: "appointments" },
  { key: "payment_received", name: "Payment Received", description: "When an invoice is paid", category: "payments" },
  { key: "test_assigned_to_lab", name: "Test Assigned to Lab", description: "When a new lab test is assigned", category: "laboratory" },
  { key: "test_log_created", name: "Test Log Created", description: "When lab assistant starts a log", category: "laboratory" },
  { key: "test_report_uploaded", name: "Test Report Uploaded", description: "When a report PDF is uploaded", category: "laboratory" },
  { key: "pdf_ready", name: "Prescription PDF Ready", description: "When a prescription PDF is available", category: "documents" },
  { key: "user_created", name: "User Account Created", description: "When a new user is registered", category: "accounts" },
];

export const INTERNAL_CATEGORIES = [
  { id: "appointments" as const, title: "Appointments", icon: "calendar" },
  { id: "payments" as const, title: "Payments", icon: "credit-card" },
  { id: "laboratory" as const, title: "Laboratory", icon: "flask" },
  { id: "documents" as const, title: "Documents", icon: "file" },
  { id: "accounts" as const, title: "Accounts", icon: "user" },
];

export const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  { id: "1", name: "Appointment Reminder", channel: "WhatsApp, SMS", status: "active", lastUpdated: "2 days ago" },
  { id: "2", name: "Appointment Confirmation", channel: "WhatsApp, SMS", status: "active", lastUpdated: "5 days ago" },
  { id: "3", name: "Appointment Cancellation", channel: "SMS", status: "active", lastUpdated: "1 week ago" },
  { id: "4", name: "Lab Report Ready", channel: "WhatsApp, Push", status: "active", lastUpdated: "3 days ago" },
  { id: "5", name: "Prescription Ready", channel: "WhatsApp", status: "active", lastUpdated: "1 week ago" },
  { id: "6", name: "Payment Receipt", channel: "Email, SMS", status: "draft", lastUpdated: "2 weeks ago" },
  { id: "7", name: "Follow-up Reminder", channel: "WhatsApp, SMS", status: "draft", lastUpdated: "3 weeks ago" },
];
