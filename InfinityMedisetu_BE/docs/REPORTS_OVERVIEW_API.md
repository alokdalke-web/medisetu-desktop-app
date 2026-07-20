# Reports Overview API — Frontend Integration Guide

## Authentication

- **Required Header:** `Authorization: Bearer <token>`
- **Allowed Roles:** `Admin`, `Super_Admin` only
- The backend resolves the clinic automatically from the authenticated user's assignment. No `clinicId` param needed.

---

## Endpoints Summary

| #   | Endpoint                             | When Called               | Purpose                       |
| --- | ------------------------------------ | ------------------------- | ----------------------------- |
| 1   | `GET /api/v1/reports-overview`       | Page load + Apply Filters | All overview data in one call |
| 2   | `GET /api/v1/reports-overview/trend` | Period selector change    | Re-fetch specific chart data  |

---

## 1. GET /api/v1/reports-overview

### Query Parameters

| Parameter        | Type   | Required | Description                                             |
| ---------------- | ------ | -------- | ------------------------------------------------------- |
| startDate        | string | Yes      | Start of primary date range (`YYYY-MM-DD`)              |
| endDate          | string | Yes      | End of primary date range (`YYYY-MM-DD`)                |
| compareStartDate | string | No       | Start of comparison period (auto-calculated if omitted) |
| compareEndDate   | string | No       | End of comparison period (auto-calculated if omitted)   |
| department       | string | No       | Filter by department/service name                       |
| doctorId         | string | No       | Filter by specific doctor UUID                          |

### Example Request

```
GET /api/v1/reports-overview?startDate=2025-05-12&endDate=2025-05-18&compareStartDate=2025-05-05&compareEndDate=2025-05-11
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Success Response (200)

```json
{
  "success": true,
  "message": "Reports overview fetched successfully",
  "data": {
    "metrics": {
      "totalPatients": { "value": 1248, "change": 12.5, "changeType": "increase" },
      "appointments": { "value": 856, "change": 18.3, "changeType": "increase" },
      "newPatients": { "value": 458, "change": 15.7, "changeType": "increase" },
      "prescriptions": { "value": 642, "change": 10.8, "changeType": "increase" },
      "revenue": { "value": 34256000, "change": 22.6, "changeType": "increase" },
      "avgRating": { "value": 4.6, "maxValue": 5, "change": 8.2, "changeType": "increase" }
    },
    "appointmentsTrend": {
      "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      "currentPeriod": [120, 140, 130, 180, 150, 160, 150],
      "previousPeriod": [90, 110, 100, 130, 120, 110, 100]
    },
    "patientDistribution": [
      { "label": "New Patients", "value": 458, "percentage": 36.7 },
      { "label": "Returning Patients", "value": 690, "percentage": 55.3 },
      { "label": "Inactive Patients", "value": 100, "percentage": 8.0 }
    ],
    "topDepartments": [
      { "department": "General Physician", "appointments": 320, "revenue": 12864000 },
      { "department": "Cardiology", "appointments": 180, "revenue": 8640000 },
      { "department": "Dermatology", "appointments": 140, "revenue": 6550000 },
      { "department": "Orthopedics", "appointments": 120, "revenue": 3820000 },
      { "department": "Pediatrics", "appointments": 60, "revenue": 1896000 }
    ],
    "revenueOverview": {
      "totalRevenue": 34256000,
      "change": 22.6,
      "changeType": "increase",
      "comparisonLabel": "vs previous period",
      "chartData": [
        { "label": "Jan", "value": 18000000 },
        { "label": "Feb", "value": 21000000 },
        { "label": "Mar", "value": 16500000 },
        { "label": "Apr", "value": 24000000 },
        { "label": "May", "value": 34256000 }
      ]
    },
    "paymentModeDistribution": [
      { "label": "upi", "value": 15829100, "percentage": 46.2 },
      { "label": "cash", "value": 9625900, "percentage": 28.1 },
      { "label": "card", "value": 6303100, "percentage": 18.4 },
      { "label": "insurance", "value": 2499900, "percentage": 7.3 }
    ],
    "medicineSales": [
      { "medicine": "Montair LC", "units": 410, "revenue": 1230000 },
      { "medicine": "Ascoril LS", "units": 380, "revenue": 1080000 },
      { "medicine": "Azithral 500 mg", "units": 320, "revenue": 960000 },
      { "medicine": "Dolo 650 mg", "units": 280, "revenue": 840000 },
      { "medicine": "Paracetamol 500 mg", "units": 250, "revenue": 750000 }
    ],
    "prescriptionsTrend": {
      "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      "currentPeriod": [100, 130, 110, 160, 140, 150, 145],
      "previousPeriod": [80, 100, 90, 120, 110, 100, 95]
    },
    "noShowAnalysis": {
      "total": 18,
      "change": 10.0,
      "changeType": "increase",
      "breakdown": [
        { "label": "No Show", "value": 18, "percentage": 2.1 },
        { "label": "Completed", "value": 674, "percentage": 78.7 },
        { "label": "Cancelled", "value": 164, "percentage": 19.2 },
        { "label": "Rescheduled", "value": 0, "percentage": 0 }
      ]
    },
    "patientDemographics": [
      { "ageGroup": "0 - 18", "patients": 120, "percentage": 9.6 },
      { "ageGroup": "19 - 30", "patients": 230, "percentage": 18.4 },
      { "ageGroup": "31 - 45", "patients": 410, "percentage": 32.9 },
      { "ageGroup": "46 - 60", "patients": 320, "percentage": 25.6 },
      { "ageGroup": "60+", "patients": 168, "percentage": 13.5 }
    ],
    "monthlyComparison": [
      { "metric": "Patients", "thisMonth": 1248, "lastMonth": 1108, "change": 12.6 },
      { "metric": "Appointments", "thisMonth": 3624, "lastMonth": 3112, "change": 16.5 },
      { "metric": "Prescriptions", "thisMonth": 2856, "lastMonth": 2520, "change": 13.3 },
      { "metric": "Revenue", "thisMonth": 34256000, "lastMonth": 27984000, "change": 22.6 }
    ],
    "alerts": [
      { "type": "warning", "title": "Peak hours are between 10 AM - 1 PM", "date": "2025-05-18" },
      { "type": "danger", "title": "Cardiology has highest revenue this period", "date": "2025-05-18" },
      { "type": "info", "title": "No show rate is higher on Mondays", "date": "2025-05-18" }
    ],
    "meta": {
      "generatedAt": "2025-05-18T23:59:00.000Z",
      "accuracy": 98.6
    }
  }
}
```

---

## 2. GET /api/v1/reports-overview/trend

Called **only** when the user changes a period selector (e.g., Weekly → Monthly) on the appointments or prescriptions chart.

### Query Parameters

| Parameter        | Type   | Required | Description                                |
| ---------------- | ------ | -------- | ------------------------------------------ |
| type             | string | Yes      | `"appointments"` or `"prescriptions"`      |
| period           | string | Yes      | `"daily"`, `"weekly"`, or `"monthly"`      |
| startDate        | string | Yes      | Start of primary date range (`YYYY-MM-DD`) |
| endDate          | string | Yes      | End of primary date range (`YYYY-MM-DD`)   |
| compareStartDate | string | No       | Start of comparison period                 |
| compareEndDate   | string | No       | End of comparison period                   |
| department       | string | No       | Filter by department/service name          |
| doctorId         | string | No       | Filter by specific doctor UUID             |

### Example Request

```
GET /api/v1/reports-overview/trend?type=appointments&period=monthly&startDate=2025-05-01&endDate=2025-05-31
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Success Response (200)

```json
{
  "success": true,
  "message": "Trend data fetched successfully",
  "data": {
    "labels": ["Week 1", "Week 2", "Week 3", "Week 4"],
    "currentPeriod": [420, 480, 510, 490],
    "previousPeriod": [350, 380, 400, 390]
  }
}
```

---

## Error Responses

### 400 — Validation Error

```json
{
  "success": false,
  "errors": [
    {
      "path": "startDate",
      "message": "startDate must be YYYY-MM-DD",
      "code": "invalid_string"
    }
  ]
}
```

### 401 — Unauthorized

```json
{
  "success": false,
  "message": "Authorization token missing"
}
```

### 403 — Forbidden (wrong role)

```json
{
  "success": false,
  "message": "Access denied. Required roles: Admin, Super_Admin"
}
```

---

## Important Notes for Frontend

### Revenue & Money Values
- All monetary values are in **₹ (Rupees)** as integers.
- Frontend just needs to apply Indian number formatting.
- Example: `342560` → `₹3,42,560`

### Percentages
- All percentages are **pre-calculated floats** (e.g., `36.7`, not `"36.7%"`).
- Frontend just appends `%` for display.

### Change Values
- `change` = absolute percentage change vs comparison period.
- `changeType` = `"increase"` | `"decrease"` | `"neutral"`
- Use `changeType` to decide arrow direction and color (green/red/gray).

### Trend Labels
- Labels are auto-determined by the backend based on date range:
  - **≤ 7 days** → Day names: `["Mon", "Tue", "Wed", ...]`
  - **8–30 days** → Date format: `["12 May", "13 May", ...]`
  - **> 30 days** → Week format: `["Week 1", "Week 2", ...]`

### Caching Behavior
- Data is cached server-side for **1 hour**.
- Different filter combinations (department, doctorId, dates) have separate cache entries.
- No stale data across clinics — each clinic has isolated cache keys.

### Data Guarantees
- `topDepartments` and `medicineSales` are always **max 5 items** (no pagination needed).
- `patientDistribution` always returns exactly 3 items (New, Returning, Inactive).
- `patientDemographics` returns up to 5 age groups (Unknown is excluded).
- `alerts` returns 0–3 items based on anomaly detection.
- `noShowAnalysis.breakdown` always returns 4 items (No Show, Completed, Cancelled, Rescheduled).
- `monthlyComparison` always returns 4 items (Patients, Appointments, Prescriptions, Revenue).

### Comparison Period Auto-Calculation
- If `compareStartDate` and `compareEndDate` are **not provided**, the backend automatically calculates the comparison period by shifting back by the same duration.
- Example: If primary is May 12–18 (7 days), comparison auto-becomes May 5–11.

---

## Frontend Integration Example (React/Next.js)

```typescript
// api/reportsOverview.ts
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

interface OverviewParams {
  startDate: string;
  endDate: string;
  compareStartDate?: string;
  compareEndDate?: string;
  department?: string;
  doctorId?: string;
}

interface TrendParams extends OverviewParams {
  type: 'appointments' | 'prescriptions';
  period: 'daily' | 'weekly' | 'monthly';
}

export const fetchReportsOverview = async (params: OverviewParams) => {
  const { data } = await axios.get(`${API_BASE}/api/v1/reports-overview`, {
    params,
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return data; // { success: true, message: "...", data: { metrics, ... } }
};

export const fetchReportsTrend = async (params: TrendParams) => {
  const { data } = await axios.get(`${API_BASE}/api/v1/reports-overview/trend`, {
    params,
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return data; // { success: true, message: "...", data: { labels, currentPeriod, previousPeriod } }
};
```

### Usage in Component

```typescript
// On page load or filter apply
const { data } = await fetchReportsOverview({
  startDate: '2025-05-12',
  endDate: '2025-05-18',
});

// Render all sections from data.data
const { metrics, appointmentsTrend, patientDistribution, ... } = data.data;

// On period selector change (only this call needed)
const trendData = await fetchReportsTrend({
  type: 'appointments',
  period: 'monthly',
  startDate: '2025-05-01',
  endDate: '2025-05-31',
});
// Update only the chart: trendData.data.labels, trendData.data.currentPeriod, etc.
```

---

## TypeScript Interfaces

```typescript
interface MetricItem {
  value: number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  maxValue?: number; // only for avgRating
}

interface Metrics {
  totalPatients: MetricItem;
  appointments: MetricItem;
  newPatients: MetricItem;
  prescriptions: MetricItem;
  revenue: MetricItem;
  avgRating: MetricItem;
}

interface TrendData {
  labels: string[];
  currentPeriod: number[];
  previousPeriod: number[];
}

interface DistributionItem {
  label: string;
  value: number;
  percentage: number;
}

interface DepartmentItem {
  department: string;
  appointments: number;
  revenue: number;
}

interface RevenueOverview {
  totalRevenue: number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  comparisonLabel: string;
  chartData: { label: string; value: number }[];
}

interface MedicineSaleItem {
  medicine: string;
  units: number;
  revenue: number;
}

interface NoShowAnalysis {
  total: number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  breakdown: DistributionItem[];
}

interface DemographicItem {
  ageGroup: string;
  patients: number;
  percentage: number;
}

interface MonthlyComparisonItem {
  metric: string;
  thisMonth: number;
  lastMonth: number;
  change: number;
}

interface AlertItem {
  type: 'warning' | 'danger' | 'info';
  title: string;
  date: string;
}

interface ReportsOverviewResponse {
  success: true;
  message: string;
  data: {
    metrics: Metrics;
    appointmentsTrend: TrendData;
    patientDistribution: DistributionItem[];
    topDepartments: DepartmentItem[];
    revenueOverview: RevenueOverview;
    paymentModeDistribution: DistributionItem[];
    medicineSales: MedicineSaleItem[];
    prescriptionsTrend: TrendData;
    noShowAnalysis: NoShowAnalysis;
    patientDemographics: DemographicItem[];
    monthlyComparison: MonthlyComparisonItem[];
    alerts: AlertItem[];
    meta: {
      generatedAt: string;
      accuracy: number;
    };
  };
}

interface TrendResponse {
  success: true;
  message: string;
  data: TrendData;
}
```
