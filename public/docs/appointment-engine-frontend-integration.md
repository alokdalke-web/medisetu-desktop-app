# Appointment Engine — Frontend Integration Guide

This document covers everything frontend developers need to integrate the Appointment Engine into the **Admin/Clinic Dashboard** and **Patient App**.

---

## Table of Contents

- [Admin / Clinic Dashboard](#admin--clinic-dashboard)
  - [Configure Running-Late Threshold](#1-configure-running-late-threshold)
  - [Real-Time Queue Display](#2-real-time-queue-display)
  - [Time-to-Next Patient Display](#3-time-to-next-patient-display)
- [Patient App](#patient-app)
  - [Estimated Wait Time on Appointment Detail](#1-estimated-wait-time-on-appointment-detail)
  - [Real-Time Wait Time Updates](#2-real-time-wait-time-updates)
  - [Running-Late Notification](#3-running-late-notification)
  - [Appointment Shifted Notification](#4-appointment-shifted-notification)

---

## Admin / Clinic Dashboard

### 1. Configure Running-Late Threshold

Admins can set how many minutes of delay trigger a "running late" notification to patients.

#### API

**GET** `/api/v1/clinic/settings`

Response includes:
```json
{
  "runningLateThresholdMinutes": 10
}
```

**PUT** `/api/v1/clinic/settings`

Body:
```json
{
  "runningLateThresholdMinutes": 15
}
```

| Field                         | Type    | Range | Default | Description                                   |
| ----------------------------- | ------- | ----- | ------- | --------------------------------------------- |
| `runningLateThresholdMinutes` | integer | 5–60  | 10      | Minutes of delay before patients are notified |

#### UI Suggestion

A slider or number input in the clinic settings page labeled:
> "Notify patients when doctor is running late by more than X minutes"

---

### 2. Real-Time Queue Display

The clinic dashboard receives live queue updates via WebSocket without polling.

#### Socket Room to Join

```
clinic:{clinicId}
```

Join this room on dashboard load. The backend emits events to this room whenever the queue state changes.

#### Event: `queue.updated`

Emitted when any appointment status changes that affects the queue (completion, arrival, no-show).

**Payload:**
```typescript
{
  clinicId: string;
  doctorId: string;
  date: string;              // "YYYY-MM-DD"
  cumulativeDelay: number;   // Total delay in minutes for the queue
  appointments: Array<{
    appointmentId: string;
    status: "Upcoming" | "Confirmed" | "Patient Arrived" | "Completed" | "Cancelled" | "NoShow";
    appointmentTime: string | null;   // "HH:MM" or null for token-based
    estimatedWaitMinutes: number;     // 0 for completed/arrived appointments
    cumulativeDelay: number;          // Queue-level cumulative delay
  }>;
}
```

#### How to Use

```typescript
// Join clinic room on mount
socket.emit('join', { room: `clinic:${clinicId}` });

// Listen for queue updates
socket.on('queue.updated', (data) => {
  // Replace the queue display with fresh data
  setQueueAppointments(data.appointments);
  setCumulativeDelay(data.cumulativeDelay);
});
```

#### Display Recommendations

| Column           | Source                                                           |
| ---------------- | ---------------------------------------------------------------- |
| Patient Name     | Your existing data (join by appointmentId)                       |
| Appointment Time | `appointmentTime`                                                |
| Status           | `status`                                                         |
| Estimated Wait   | `estimatedWaitMinutes` (show as "~15 min" or similar)            |
| Queue Delay      | `cumulativeDelay` (show at the top: "Queue running 12 min late") |

---

### 3. Time-to-Next Patient Display

Shows doctors/receptionists how many minutes until the next patient.

#### Socket Room

Same `clinic:{clinicId}` room.

#### Event: `timeToNext.updated`

**Payload:**
```typescript
{
  clinicId: string;
  timeToNextMinutes: number | null;   // null = no more appointments today
  ts: string;                          // ISO timestamp of computation
}
```

#### How to Use

```typescript
socket.on('timeToNext.updated', (data) => {
  if (data.timeToNextMinutes === null) {
    // No more appointments — hide the widget or show "Done for today"
    setTimeToNext(null);
  } else {
    setTimeToNext(data.timeToNextMinutes);
  }
});
```

#### Display Suggestion

A card or badge near the queue showing:
> "Next patient in ~**8 min**"

Or when null:
> "No more appointments today"

**Note:** This event is throttled — it only fires when the value changes by ≥ 1 minute, so you won't get excessive updates.

---

## Patient App

### 1. Estimated Wait Time on Appointment Detail

When a patient opens their appointment detail, the response now includes their estimated wait time.

#### API

**GET** `/api/v1/patient/appointments/detail/:appointmentId`

Response now includes:
```json
{
  "appointment": { ... },
  "estimatedWaitMinutes": 12
}
```

#### Rules

| Condition                               | Value                                                |
| --------------------------------------- | ---------------------------------------------------- |
| Appointment status is "Patient Arrived" | `0`                                                  |
| Appointment is not today                | `0`                                                  |
| No delay data available                 | `0`                                                  |
| Normal case                             | Computed wait time (non-negative integer in minutes) |

#### Display Suggestion

```
Estimated wait: ~12 minutes
```

Show only when `estimatedWaitMinutes > 0` and appointment is today. Hide or show "You're next!" when value is 0 and status is not "Patient Arrived".

---

### 2. Real-Time Wait Time Updates

The patient receives live updates to their wait time via WebSocket without re-fetching.

#### Socket Room to Join

```
user:{userId}
```

The patient app should join this room on login/app launch (you likely already do this for other notifications).

#### Event: `appointment.updated`

Emitted whenever the queue is recalculated and the patient's wait time changes.

**Payload:**
```typescript
{
  appointmentId: string;
  status: "Upcoming" | "Confirmed" | "Patient Arrived";
  appointmentTime: string | null;      // May change if shifted due to no-show
  estimatedWaitMinutes: number;
}
```

#### How to Use

```typescript
socket.on('appointment.updated', (data) => {
  // Update the specific appointment in your local state
  updateAppointment(data.appointmentId, {
    status: data.status,
    appointmentTime: data.appointmentTime,
    estimatedWaitMinutes: data.estimatedWaitMinutes,
  });
});
```

#### Important Notes

- This event fires for **all active appointments** of the patient (self + family members)
- Match by `appointmentId` to update the correct record
- `appointmentTime` may change if a no-show shift moved the appointment earlier
- The event is emitted within 5 seconds of any queue change

---

### 3. Running-Late Notification

Patients receive a push notification and socket event when their doctor is running late beyond the clinic's configured threshold.

#### Push Notification

Arrives via FCM/APNs as a standard push notification.

| Field | Value                                                                                                                  |
| ----- | ---------------------------------------------------------------------------------------------------------------------- |
| Title | "Doctor Running Late"                                                                                                  |
| Body  | "Your appointment originally at 10:00 is now estimated at 10:25. The doctor is running approximately 25 minutes late." |

#### Socket Event: `running_late`

Delivered via the patient's socket room `user:{userId}`.

**Payload:**
```typescript
{
  appointmentId: string;
  estimatedNewTime: string;    // "HH:MM" — projected start time
  delayMinutes: number;        // How many minutes late
  originalTime: string | null; // Originally scheduled time
}
```

#### How to Use

```typescript
socket.on('running_late', (data) => {
  showToast({
    title: 'Doctor Running Late',
    message: `Your ${data.originalTime} appointment is now expected at ${data.estimatedNewTime} (~${data.delayMinutes} min delay)`,
    appointmentId: data.appointmentId,
  });
});
```

#### Behavior Notes

- Sent **once per threshold crossing** — not repeatedly while delay persists
- If delay drops below threshold and rises again, a new notification is sent
- Only sent for appointments with status "Upcoming" or "Confirmed" (not after arrival)

---

### 4. Appointment Shifted Notification

When a no-show causes appointments to shift forward, affected patients receive:

#### Push Notification

| Field | Value                                                                          |
| ----- | ------------------------------------------------------------------------------ |
| Title | "Appointment Time Updated"                                                     |
| Body  | "Your appointment has been moved earlier. New time: 09:45 (previously 10:00)." |

#### Socket Event: `appointment_shifted`

Delivered via the patient's socket room `user:{userId}`.

**Payload:**
```typescript
{
  appointmentId: string;
  oldTime: string;     // Previous appointment time "HH:MM"
  newTime: string;     // New (earlier) appointment time "HH:MM"
}
```

#### How to Use

```typescript
socket.on('appointment_shifted', (data) => {
  // Update the appointment time in local state
  updateAppointmentTime(data.appointmentId, data.newTime);
  
  showToast({
    title: 'Appointment Moved Earlier',
    message: `Your appointment was moved from ${data.oldTime} to ${data.newTime}`,
  });
});
```

---

## Socket Room Summary

| Room Pattern        | Who Joins                                      | Events Received                                              |
| ------------------- | ---------------------------------------------- | ------------------------------------------------------------ |
| `clinic:{clinicId}` | Clinic Dashboard (doctor, receptionist, admin) | `queue.updated`, `timeToNext.updated`                        |
| `user:{userId}`     | Patient App                                    | `appointment.updated`, `running_late`, `appointment_shifted` |

---

## Complete Event Reference

| Event Name            | Room                | Direction       | Trigger                                |
| --------------------- | ------------------- | --------------- | -------------------------------------- |
| `queue.updated`       | `clinic:{clinicId}` | Server → Client | Any queue-affecting status change      |
| `timeToNext.updated`  | `clinic:{clinicId}` | Server → Client | Time-to-next changes by ≥ 1 min        |
| `appointment.updated` | `user:{userId}`     | Server → Client | Queue recalculated, wait times changed |
| `running_late`        | `user:{userId}`     | Server → Client | Delay exceeds clinic threshold         |
| `appointment_shifted` | `user:{userId}`     | Server → Client | No-show causes time shift              |

---

## Migration Checklist

### Admin Dashboard

- [ ] Add "Running Late Threshold" field to clinic settings page (GET/PUT `/api/v1/clinic/settings`)
- [ ] Join Socket.IO room `clinic:{clinicId}` on dashboard mount
- [ ] Listen for `queue.updated` — refresh queue display with new data
- [ ] Listen for `timeToNext.updated` — show/update time-to-next widget
- [ ] Display `estimatedWaitMinutes` column in the appointment queue table
- [ ] Display `cumulativeDelay` as a queue-level indicator

### Patient App

- [ ] Display `estimatedWaitMinutes` from appointment detail API response
- [ ] Ensure Socket.IO room `user:{userId}` is joined on app launch
- [ ] Listen for `appointment.updated` — update wait time in real-time
- [ ] Listen for `running_late` — show in-app alert/toast
- [ ] Listen for `appointment_shifted` — update appointment time + notify user
- [ ] Handle push notifications for "Doctor Running Late" and "Appointment Time Updated"
