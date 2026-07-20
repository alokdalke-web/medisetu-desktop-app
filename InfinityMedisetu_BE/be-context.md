# Infinity MediSetu - Backend Context & Architecture

This document provides a high-level overview of the Infinity MediSetu backend architecture, technology stack, and core business modules. It is synthesized from the backend documentation archive.

## 1. Project Overview
The **Infinity MediSetu Backend** is a robust API and real-time orchestration engine that powers the clinic management platform. It manages patients, doctors, appointments, pharmacy, labs, and clinic subscriptions.

## 2. Technology Stack
- **Language**: TypeScript (Node.js)
- **Database ORM**: Drizzle ORM
- **Database Engine**: PostgreSQL
- **Caching & KV**: Redis (used for subscription caching, rate limiting, etc.)
- **Real-Time**: Socket.io (for live queue broadcasts)
- **File Storage**: S3 integration (via Multer) for medical certificates, consent forms, and prescriptions.
- **Payments**: Razorpay integration (for clinic subscriptions and add-ons).

## 3. Core Modules & Systems

### 3.1 Appointment Engine
An automated, real-time orchestrator triggered by appointment status changes (e.g., "Completed", "Patient Arrived", "NoShow").
- **Capabilities**: Computes estimated wait times, triggers running-late notifications, calculates time-to-next patient, and automatically shifts schedules forward for no-shows.
- **Broadcasting**: Pushes state changes (e.g., `queue.updated`, `appointment.updated`) to clinics and patients instantly via Socket.io.

### 3.2 Subscription & Add-On System
Manages billing and feature gating for clinics.
- **Plans & Add-ons**: Supports tiered plans (e.g., Free, Pro) and discrete add-ons.
- **Database Schema**: Tracks active plans in `clinic_subscriptions` with details like Razorpay transaction IDs, auto-renew flags, and expiry dates.
- **Payments**: Tightly integrated with Razorpay for subscription lifecycles.

### 3.3 Pharmacy & Lab Modules
- **Pharmacy**: Manages stock inventory, HSN tax data, and checkout logic. Optimized for bulk queries (avoiding N+1 loops) using batched lookups and multi-row inserts in Drizzle.
- **Lab**: Manages medical lab tests, patient test assignments, and report PDF generation (`PatientsTestModel`, `LabsModel`).

### 3.4 Patient & Auth Flows
- **Middleware**: Uses standard `requireAuth`, `requireClinic`, and role-based middleware which execute before request validation and file uploads to ensure security.
- **Files**: Secure uploads for doctor manual prescriptions, consent forms, and medical certificates.

## 4. Architecture Patterns
- **Directory Structure**: Features are grouped logically into domain modules (`src/main/appointments/`, `src/main/pharmacies/`, `src/main/test/` for labs).
- **Service Layer**: Business logic is decoupled into services (`sales.service.ts`), abstracted from the routing and controller layers.
- **Database Transactions**: Complex flows (like pharmacy checkouts) utilize SQL transactions to ensure data consistency.
- **Performance**: Heavy emphasis on query batching, reducing lock contention, and caching data-heavy limits in Redis.
