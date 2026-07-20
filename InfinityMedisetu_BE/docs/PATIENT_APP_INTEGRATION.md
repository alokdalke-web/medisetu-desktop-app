# Patient App — Frontend Integration Guide

## Overview

The patient app shows live queue tracking for today's appointments. Data is available via REST (on page load) and WebSocket (real-time push). The patient sees: current token being served, their token, patients ahead, estimated wait, and queue progress.

**Important: Live queue only works for today's active appointments.** If the appointment is on a different date or has a terminal status (Completed/Cancelled/NoShow), the API returns an error and no engine/socket/Redis queries run. The frontend should only show the live queue widget for today's active appointments.

---

## 1. REST API — Live Queue (on page load / pull to refresh)

### GET `/api/v1/patient/appointments/live-queue/{appointmentId}`

```
GET /api/v1/patient/appointments/live-queue/{appointmentId}

Headers:
  Authorization: Bearer {PATIENT_TOKEN}
```

**Validation rules:**
- Appointment must be today
- Appointment must be active (not Completed/Cancelled/NoShow)
- Must belong to the patient or their family member

**Response:**
```json
{
  "success": true,
  "data": {
    "appointmentId": "cf9d43dd-...",
    "appointmentTime": "15:00",
    "tokenNo": 18,
    "status": "Patient Arrived",
    "estimatedWaitMinutes": 18,
    "nowServingToken": 12,
    "patientsAhead": 6,
    "avgConsultationMinutes": 2,
    "queuePosition": "in-queue",
    "totalPatientsInQueue": 6,
    "isRunningLate": true,
    "runningLateMinutes": 18,
    "notifyPrefs": {
      "myTurn": true,
      "patientsAheadThreshold": 3,
      "doctorArrives": true
    }
  }
}
```

**Field notes:**
- `patientsAhead` / `totalPatientsInQueue` — **both are the number of patients ahead of this one** (not the whole day's queue size). They carry the same value; `totalPatientsInQueue` is kept only for backwards-compat.
- `isRunningLate` (boolean) / `runningLateMinutes` (number\|null) — durable running-late state, safe across app restarts / page reloads (backed by Redis, not just the transient `running_late` socket event). Use these to render a persistent "Doctor is running late" tile.
- `notifyPrefs` (object\|null) — the patient's saved "Notify me when" toggle state (see §4), or `null` if never set. Use it to hydrate the toggles on screen load.
- `status` — raw appointment status (`Upcoming` / `Patient Arrived` / `Confirmed`).

**Error responses:**
| Status | Message                                              | When                                 |
| ------ | ---------------------------------------------------- | ------------------------------------ |
| 400    | "Live queue only available for today's appointments" | Appointment is not today             |
| 400    | "Appointment is no longer in queue"                  | Status is Completed/Cancelled/NoShow |
| 400    | "No doctor assigned"                                 | Appointment has no doctor            |
| 403    | "Access denied"                                      | Not your appointment                 |
| 404    | "Appointment not found"                              | Invalid appointmentId                |

---

## 2. WebSocket — Real-Time Updates

### Connect

Patient connects to the main socket with their JWT token (same connection used for notifications).

```javascript
const socket = io('http://your-server:5000', {
  auth: { token: patientJwtToken },
  transports: ['websocket'],
});
```

### Join Live Queue

Send `join.live-queue` event with the appointmentId:

```javascript
socket.emit('join.live-queue', { appointmentId: 'cf9d43dd-...' }, (response) => {
  // response = { status: 'success', message: 'Joined live queue' }
  // or { status: 'error', message: '...' }
});
```

**Validation (same as REST):**
- Appointment must be today
- Appointment must be active
- Must belong to the patient

### Listen for Updates

#### Event: `queue.update`

Received immediately after joining + every time the queue changes. Same shape as the REST `data` object (minus `notifyPrefs`).

```json
{
  "appointmentId": "cf9d43dd-...",
  "tokenNo": 18,
  "status": "Upcoming",
  "appointmentTime": "15:00",
  "estimatedWaitMinutes": 18,
  "nowServingToken": 12,
  "patientsAhead": 6,
  "queuePosition": "in-queue",
  "totalPatientsInQueue": 6,
  "avgConsultationMinutes": 2,
  "isRunningLate": true,
  "runningLateMinutes": 18
}
```

#### Event: `queue.completed`

Received when your appointment is completed/cancelled/noshow. Auto-removes you from live queue.

```json
{
  "appointmentId": "cf9d43dd-...",
  "status": "Completed",
  "message": "Your appointment is no longer in the queue"
}
```

#### Event: `appointment.updated`

Received on the `user:{userId}` room (always connected). Same data as `queue.update`.

```json
{
  "appointmentId": "cf9d43dd-...",
  "tokenNo": 18,
  "status": "Upcoming",
  "appointmentTime": "15:00",
  "estimatedWaitMinutes": 14,
  "nowServingToken": 13,
  "patientsAhead": 5,
  "queuePosition": "in-queue",
  "totalPatientsInQueue": 5,
  "avgConsultationMinutes": 2,
  "isRunningLate": true,
  "runningLateMinutes": 14
}
```

#### Event: `running_late`

Received when doctor is running late beyond clinic threshold.

```json
{
  "appointmentId": "cf9d43dd-...",
  "estimatedNewTime": "15:25",
  "delayMinutes": 25,
  "originalTime": "15:00"
}
```

#### Event: `appointment_shifted`

Received when a no-show causes your appointment to move earlier.

```json
{
  "appointmentId": "cf9d43dd-...",
  "oldTime": "15:00",
  "newTime": "14:45"
}
```

### Leave Live Queue

When patient closes the live queue screen:

```javascript
socket.emit('leave.live-queue');
```

---

## 3. "Notify me when" — Push Notifications

The Live Queue screen has a **Notify me when** section with three independent opt-in
toggles. When an enabled condition becomes true, the patient receives a **push
notification** (works even if the app is backgrounded/closed — it does not require an open
socket). Preferences are stored server-side per appointment.

| Toggle              | Fires when                                                        | Push `event`           |
| ------------------- | ----------------------------------------------------------------- | ---------------------- |
| **My turn**         | The patient reaches the front of the queue (0 patients ahead)     | `queue_my_turn`        |
| **N patients before** | `patientsAhead` drops to or below the chosen number N            | `queue_patients_ahead` |
| **Doctor arrives**  | The doctor starts consulting (becomes active)                     | `queue_doctor_active`  |

Each condition notifies **once per crossing** — the patient won't be spammed on every
queue tick, but will be re-notified if the condition clears and later re-crosses (e.g. the
queue reshuffles after a no-show).

### Step 1 — Register the device for push (one-time, at login)

Push delivery needs the device's push token registered. This is the existing device
endpoint (no new setup specific to this feature):

```
POST /api/v1/notifications/devices
Authorization: Bearer {PATIENT_TOKEN}

Body: { "deviceToken": "<FCM/APNS token>", "platform": "android" | "ios" }
```

If no device is registered, saving preferences still succeeds — the pushes simply have
nowhere to go until a device is registered.

### Step 2 — Save the toggle state

Call this whenever the patient flips a toggle (send the full object each time — it
overwrites the stored preferences):

```
POST /api/v1/patient/appointments/live-queue/{appointmentId}/notify-prefs
Authorization: Bearer {PATIENT_TOKEN}

Body:
{
  "myTurn": true,
  "patientsAheadThreshold": 3,   // the "N patients before" value; null = toggle off
  "doctorArrives": true
}
```

**Body rules:**
- `myTurn` (boolean, required) — the "My turn" toggle.
- `patientsAheadThreshold` (integer 1–50 **or** `null`, required) — the "N patients before"
  value. Send the number when the toggle is on, `null` when off.
- `doctorArrives` (boolean, required) — the "Doctor arrives" toggle.

**Response:** `sendOk` with the saved prefs echoed back. Same validation/ownership/terminal
rules and error codes as the live-queue GET (see §1 error table).

The current saved state is also returned as `notifyPrefs` on the live-queue GET (§1) so you
can hydrate the toggles when the screen opens.

### Step 3 — Receive the push

Delivered as a normal push notification. The custom payload (`data` on Android / `aps.data`
on iOS) carries:

```json
{
  "appointmentId": "cf9d43dd-...",
  "patientsAhead": 0,
  "doctorId": "2187c798-..."
}
```

Titles/bodies are server-generated, e.g. "It's your turn — You are next, please be ready
for the doctor." Tapping the notification should deep-link into that appointment's Live
Queue screen using `appointmentId`.

> These are **push-only** — they are not mirrored as `socket` events or in-app inbox rows,
> to keep high-frequency queue events off the notification inbox. The live-queue socket
> events in §2 already give you real-time in-screen updates; this section is specifically
> for out-of-app alerts.

---

## 4. UI Mapping

| Screen Element                    | Field                             |
| --------------------------------- | --------------------------------- |
| Current Token: **12**             | `nowServingToken`                 |
| Your Token: **18**                | `tokenNo`                         |
| **6** Patient ahead               | `patientsAhead`                   |
| Your Turn in approx. **18 mins**  | `estimatedWaitMinutes`            |
| Based on avg **2** mins / patient | `avgConsultationMinutes`          |
| Queue Progress indicator          | `queuePosition`                   |
| "Doctor is running late" tile     | `isRunningLate` / `runningLateMinutes` |

### `queuePosition` values (the 4-stage Queue Progress stepper):

| Value          | Stepper stage  | When                                                                     |
| -------------- | -------------- | ------------------------------------------------------------------------ |
| `waiting-area` | Waiting Area   | Status is `Upcoming` — booked but not yet checked in                     |
| `in-queue`     | In Queue       | Status is `Patient Arrived` (checked in) **and** more than 5 ahead       |
| `almost-there` | Almost There   | Status is `Patient Arrived` **and** 5 or fewer patients ahead            |
| `consultation` | Consultation   | Status is `Confirmed` — the doctor is now seeing this patient            |
| `completed`    | (exited queue) | Terminal status (Completed/Cancelled/NoShow) — stop live-tracking        |

> Note: only `Confirmed` maps to Consultation. `Patient Arrived` means "checked in, waiting" — it maps to In Queue / Almost There, **not** Consultation.

---

## 5. Frontend Code Example

```javascript
import { io } from 'socket.io-client';

const socket = io('http://server:5000', {
  auth: { token: patientToken },
  transports: ['websocket'],
});

// ─── Live Queue Screen ───────────────────────────────────────────

// On opening live queue screen
const joinLiveQueue = (appointmentId) => {
  socket.emit('join.live-queue', { appointmentId }, (res) => {
    if (res.status === 'error') {
      showError(res.message);
    }
  });
};

// Receive queue updates
socket.on('queue.update', (data) => {
  setNowServing(data.nowServingToken);
  setYourToken(data.tokenNo);
  setPatientsAhead(data.patientsAhead);
  setWaitTime(data.estimatedWaitMinutes);
  setAvgTime(data.avgConsultationMinutes);
  setQueuePosition(data.queuePosition);
  setRunningLate(data.isRunningLate, data.runningLateMinutes); // persistent tile
});

// ─── "Notify me when" toggles ───────────────────────────────────

// Hydrate toggles from the REST live-queue response's `notifyPrefs`
const hydrateToggles = (notifyPrefs) => {
  if (!notifyPrefs) return; // never set — leave all off
  setMyTurn(notifyPrefs.myTurn);
  setPatientsBefore(notifyPrefs.patientsAheadThreshold); // number or null
  setDoctorArrives(notifyPrefs.doctorArrives);
};

// Persist on any toggle change (send the full object each time)
const saveNotifyPrefs = async (appointmentId, prefs) => {
  await fetch(`/api/v1/patient/appointments/live-queue/${appointmentId}/notify-prefs`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${patientToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      myTurn: prefs.myTurn,
      patientsAheadThreshold: prefs.patientsBefore ?? null, // null = toggle off
      doctorArrives: prefs.doctorArrives,
    }),
  });
};

// Appointment done — close the screen
socket.on('queue.completed', (data) => {
  showMessage(data.message);
  navigateToHome();
});

// On closing live queue screen
const leaveLiveQueue = () => {
  socket.emit('leave.live-queue');
};

// ─── Notifications (always active) ──────────────────────────────

socket.on('running_late', (data) => {
  showToast({
    title: 'Doctor Running Late',
    message: `Your ${data.originalTime} appointment is now expected at ${data.estimatedNewTime} (~${data.delayMinutes} min delay)`,
  });
});

socket.on('appointment_shifted', (data) => {
  showToast({
    title: 'Appointment Moved Earlier',
    message: `Your appointment moved from ${data.oldTime} to ${data.newTime}`,
  });
  updateAppointmentTime(data.appointmentId, data.newTime);
});
```

---

## 6. Home Screen — Quick Queue Status

For the home screen "Live Queue Status" card, use the same REST endpoint:

```javascript
// Fetch for home screen card
const res = await fetch(`/api/v1/patient/appointments/live-queue/${appointmentId}`, {
  headers: { Authorization: `Bearer ${token}` }
});
const { data } = await res.json();

// Display:
// Now Serving: data.nowServingToken
// Your Token: data.tokenNo
// Est. Time: data.estimatedWaitMinutes
```

Or use the `appointment.updated` socket event which fires on the `user:{userId}` room (always connected, no need to join anything):

```javascript
socket.on('appointment.updated', (data) => {
  // Update home screen card if this matches the current appointment
  if (data.appointmentId === myAppointmentId) {
    updateHomeCard(data);
  }
});
```

---

## 7. When to Show / Hide Live Queue

| Condition                                                           | Show Live Queue? |
| ------------------------------------------------------------------- | ---------------- |
| Appointment is today + status is Upcoming/Confirmed/Patient Arrived | YES              |
| Appointment is today + status is Completed/Cancelled/NoShow         | NO               |
| Appointment is not today                                            | NO               |
| No appointment exists                                               | NO               |

---

## 8. Event Summary

### Socket events

| Event                 | Room                                      | When Received                   |
| --------------------- | ----------------------------------------- | ------------------------------- |
| `queue.update`        | live-queue room (after `join.live-queue`) | Every queue change              |
| `queue.completed`     | live-queue room                           | Your appointment completed      |
| `appointment.updated` | `user:{userId}` (always)                  | Every queue change              |
| `running_late`        | `user:{userId}` (always)                  | Doctor delay exceeds threshold  |
| `appointment_shifted` | `user:{userId}` (always)                  | NoShow shifts your time earlier |

### Push notifications ("Notify me when" — opt-in, §3)

| Push `event`           | When Received                                  | Requires toggle         |
| ---------------------- | ---------------------------------------------- | ----------------------- |
| `queue_my_turn`        | 0 patients ahead (front of queue)              | My turn                 |
| `queue_patients_ahead` | `patientsAhead` ≤ chosen N                     | N patients before       |
| `queue_doctor_active`  | Doctor starts consulting (becomes active)      | Doctor arrives          |
