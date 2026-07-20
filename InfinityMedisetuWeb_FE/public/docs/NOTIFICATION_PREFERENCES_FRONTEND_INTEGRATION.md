# Notification Preferences - Frontend Integration Guide

This document outlines the API endpoints, request/response models, role-based structures, and frontend implementation guidelines for integrating customizable notification preferences in the MediSetu applications (Web and Mobile).

---

## 1. Feature Overview

Users (Doctors, Patients, Admins, Receptionists, and Lab Assistants) can customize their notification preferences across two primary delivery channels:
1. **In-App Notification Center (`inApp`)**: Real-time notifications delivered via websockets inside the application.
2. **Push Notifications (`push`)**: Mobile device notifications delivered via AWS SNS / Firebase.

### Merging & Resolution Logic (Backend Fallbacks)
- The backend stores overrides in a JSONB column (`settings.notification_preferences`).
- When fetching preferences, the backend automatically merges the user's overrides with the **default settings** defined for their role.
- Certain critical notifications (e.g., Canceled Appointments) are marked as **non-configurable** and are **always enabled**. The UI must display these toggles as locked/disabled in the active state.

---

## 2. Notification Event Definitions

Use this mapping in the frontend UI to display human-readable names and descriptions for each key:

| Event Key | UI Display Name | UI Description |
| :--- | :--- | :--- |
| `appointment_created` | Appointment Created | When a new appointment is booked. |
| `appointment_rescheduled` | Appointment Rescheduled | When an appointment time is updated. |
| `appointment_confirmed` | Appointment Confirmed | When an appointment is confirmed by a doctor or clinic. |
| `appointment_canceled` | Appointment Canceled *(Locked)* | **Critical:** When an appointment is canceled. |
| `appointment_no_show` | Appointment No-Show *(Locked)* | **Critical:** When a patient does not show up for their appointment. |
| `payment_received` | Payment Received *(Locked)* | **Critical:** When an invoice is paid successfully. |
| `test_assigned_to_lab` | Test Assigned to Lab | When a new lab test is assigned. |
| `test_log_created` | Test Log Created | When a lab assistant starts a log entry. |
| `test_report_uploaded` | Test Report Uploaded | When a diagnostic report PDF is uploaded. |
| `pdf_ready` | Prescription PDF Ready | When a prescription or lab receipt PDF becomes available. |
| `user_created` | User Account Created | When a new user account is registered. |

---

## 3. API Specifications

All endpoints require the Authorization header containing the Bearer token of the logged-in user.

### Base Configuration
- **Base URL**: `https://<api-domain>/api/v1` (Refer to current API host)
- **Headers**:
  ```http
  Authorization: Bearer <token>
  Content-Type: application/json
  ```

---

### Endpoint 1: Get Resolved Notification Preferences
Retrieve the current merged preferences for the logged-in user. The backend returns a combination of user overrides and role defaults.

- **Method**: `GET`
- **Path**: `/api/v1/settings/notification-preferences`
- **Response Shape (`success: true, data: ResolvedPreferences`)**:
  ```json
  {
    "success": true,
    "data": {
      "inApp": {
        "appointment_created": { "enabled": true, "configurable": true },
        "appointment_confirmed": { "enabled": true, "configurable": true },
        "appointment_canceled": { "enabled": true, "configurable": false }
      },
      "push": {
        "appointment_created": { "enabled": true, "configurable": true },
        "appointment_confirmed": { "enabled": false, "configurable": true },
        "appointment_canceled": { "enabled": true, "configurable": false }
      }
    }
  }
  ```

---

### Endpoint 2: Get Defaults for User's Role
Retrieve the default configuration template for the logged-in user's role. This can be used for UI resets or comparison purposes.

- **Method**: `GET`
- **Path**: `/api/v1/settings/notification-preferences/defaults`
- **Response Shape (`success: true, data: RolePreferences`)**:
  ```json
  {
    "success": true,
    "data": {
      "inApp": {
        "appointment_created": { "enabled": true, "configurable": true },
        "appointment_canceled": { "enabled": true, "configurable": false }
      },
      "push": {
        "appointment_created": { "enabled": true, "configurable": true },
        "appointment_canceled": { "enabled": true, "configurable": false }
      }
    }
  }
  ```

---

### Endpoint 3: Update Notification Preferences
Update the notification preferences by submitting overrides. Only the values you want to modify need to be sent.

> [!NOTE]
> Values sent for non-configurable keys (e.g. `appointment_canceled`) are ignored by the server to enforce critical notifications.

- **Method**: `PUT`
- **Path**: `/api/v1/settings/notification-preferences`
- **Request Body**:
  ```json
  {
    "inApp": {
      "appointment_created": false,
      "appointment_confirmed": true
    },
    "push": {
      "appointment_created": true,
      "appointment_confirmed": false
    }
  }
  ```
- **Response Shape (`success: true, data: ResolvedPreferences`)**:
  The response returns the fully resolved preferences structure after applying your changes:
  ```json
  {
    "success": true,
    "data": {
      "inApp": {
        "appointment_created": { "enabled": false, "configurable": true },
        "appointment_rescheduled": { "enabled": true, "configurable": true },
        "appointment_confirmed": { "enabled": true, "configurable": true },
        "appointment_canceled": { "enabled": true, "configurable": false }
      },
      "push": {
        "appointment_created": { "enabled": true, "configurable": true },
        "appointment_rescheduled": { "enabled": true, "configurable": true },
        "appointment_confirmed": { "enabled": false, "configurable": true },
        "appointment_canceled": { "enabled": true, "configurable": false }
      }
    }
  }
  ```

---

## 4. Role-Specific Schema Details

Here is what the frontend will receive for each role when calling `GET /api/v1/settings/notification-preferences` (assuming no overrides have been customized yet):

````carousel
### Patient
```json
{
  "inApp": {
    "appointment_created": { "enabled": true, "configurable": true },
    "appointment_rescheduled": { "enabled": true, "configurable": true },
    "appointment_confirmed": { "enabled": true, "configurable": true },
    "appointment_canceled": { "enabled": true, "configurable": false },
    "payment_received": { "enabled": true, "configurable": false },
    "test_report_uploaded": { "enabled": true, "configurable": true },
    "pdf_ready": { "enabled": true, "configurable": true }
  },
  "push": {
    "appointment_created": { "enabled": true, "configurable": true },
    "appointment_rescheduled": { "enabled": true, "configurable": true },
    "appointment_confirmed": { "enabled": true, "configurable": true },
    "appointment_canceled": { "enabled": true, "configurable": false },
    "payment_received": { "enabled": true, "configurable": false },
    "test_report_uploaded": { "enabled": true, "configurable": true },
    "pdf_ready": { "enabled": true, "configurable": true }
  }
}
```
<!-- slide -->
### Doctor
```json
{
  "inApp": {
    "appointment_created": { "enabled": true, "configurable": true },
    "appointment_rescheduled": { "enabled": true, "configurable": true },
    "appointment_confirmed": { "enabled": true, "configurable": true },
    "appointment_canceled": { "enabled": true, "configurable": false },
    "appointment_no_show": { "enabled": true, "configurable": false },
    "test_assigned_to_lab": { "enabled": true, "configurable": true },
    "test_report_uploaded": { "enabled": true, "configurable": true },
    "pdf_ready": { "enabled": true, "configurable": true }
  },
  "push": {
    "appointment_created": { "enabled": true, "configurable": true },
    "appointment_rescheduled": { "enabled": true, "configurable": true },
    "appointment_confirmed": { "enabled": false, "configurable": true },
    "appointment_canceled": { "enabled": true, "configurable": false },
    "appointment_no_show": { "enabled": true, "configurable": false },
    "test_assigned_to_lab": { "enabled": false, "configurable": true },
    "test_report_uploaded": { "enabled": true, "configurable": true },
    "pdf_ready": { "enabled": false, "configurable": true }
  }
}
```
<!-- slide -->
### Receptionist
```json
{
  "inApp": {
    "appointment_created": { "enabled": true, "configurable": true },
    "appointment_rescheduled": { "enabled": true, "configurable": true },
    "appointment_confirmed": { "enabled": true, "configurable": true },
    "appointment_canceled": { "enabled": true, "configurable": false },
    "appointment_no_show": { "enabled": true, "configurable": false },
    "payment_received": { "enabled": true, "configurable": false }
  },
  "push": {
    "appointment_created": { "enabled": true, "configurable": true },
    "appointment_rescheduled": { "enabled": false, "configurable": true },
    "appointment_confirmed": { "enabled": false, "configurable": true },
    "appointment_canceled": { "enabled": true, "configurable": false },
    "appointment_no_show": { "enabled": true, "configurable": false },
    "payment_received": { "enabled": true, "configurable": false }
  }
}
```
<!-- slide -->
### Lab Assistant
```json
{
  "inApp": {
    "test_log_created": { "enabled": true, "configurable": true },
    "test_assigned_to_lab": { "enabled": true, "configurable": true },
    "test_report_uploaded": { "enabled": true, "configurable": true }
  },
  "push": {
    "test_log_created": { "enabled": true, "configurable": true },
    "test_assigned_to_lab": { "enabled": true, "configurable": true },
    "test_report_uploaded": { "enabled": false, "configurable": true }
  }
}
```
<!-- slide -->
### Admin
```json
{
  "inApp": {
    "appointment_created": { "enabled": true, "configurable": true },
    "appointment_rescheduled": { "enabled": true, "configurable": true },
    "appointment_confirmed": { "enabled": true, "configurable": true },
    "appointment_canceled": { "enabled": true, "configurable": false },
    "appointment_no_show": { "enabled": true, "configurable": false },
    "payment_received": { "enabled": true, "configurable": false },
    "test_log_created": { "enabled": true, "configurable": true },
    "test_report_uploaded": { "enabled": true, "configurable": true },
    "user_created": { "enabled": true, "configurable": true }
  },
  "push": {
    "appointment_created": { "enabled": true, "configurable": true },
    "appointment_rescheduled": { "enabled": true, "configurable": true },
    "appointment_confirmed": { "enabled": false, "configurable": true },
    "appointment_canceled": { "enabled": true, "configurable": false },
    "appointment_no_show": { "enabled": true, "configurable": false },
    "payment_received": { "enabled": true, "configurable": false },
    "test_log_created": { "enabled": false, "configurable": true },
    "test_report_uploaded": { "enabled": false, "configurable": true },
    "user_created": { "enabled": true, "configurable": true }
  }
}
```
````

---

## 5. UI/UX Best Practices for Settings Panel

To ensure a seamless user experience, implement the following details in the frontend UI:

1. **Categorized Tabs / Table columns**:
   - Organize the interface with two columns side-by-side or two distinct sections: **In-App Notifications** and **Push Notifications**.
   - Show a row for each notification event.
2. **Handle Non-Configurable Events (`configurable: false`)**:
   - Do **NOT** hide non-configurable settings. Instead, render them in their active state (`enabled: true`), but disable the switch/checkbox component.
   - Show a subtle padlock icon or a tag indicating "Required" or "Always On".
3. **Optimistic Updates vs Save Button**:
   - **Recommended Approach**: Provide a "Save Settings" button at the bottom of the page. This prevents sending an API request for every single switch flip, and allows batch saving of all changes.
   - Keep a local state representing the changes, then build the update body with modified values when clicking Save.
4. **Localization & Friendly Naming**:
   - Do not display the raw snake_case keys (like `test_log_created`) to users. Use a lookup mapping (like Section 2 above) to render readable labels and descriptions.

---

## 6. Implementation Code Snippets

### A. TypeScript Integration (React/Vue/Next.js)

```typescript
// types/notifications.ts
export interface PreferenceSetting {
  enabled: boolean;
  configurable: boolean;
}

export interface ResolvedPreferences {
  inApp: Record<string, PreferenceSetting>;
  push: Record<string, PreferenceSetting>;
}

export interface UpdatePreferencesPayload {
  inApp?: Record<string, boolean>;
  push?: Record<string, boolean>;
}

// services/notificationSettings.ts
import axios from 'axios';

const API_BASE = '/api/v1/settings/notification-preferences';

export async function fetchNotificationPreferences(): Promise<ResolvedPreferences> {
  const response = await axios.get<{ success: boolean; data: ResolvedPreferences }>(API_BASE);
  return response.data.data;
}

export async function updateNotificationPreferences(
  payload: UpdatePreferencesPayload
): Promise<ResolvedPreferences> {
  const response = await axios.put<{ success: boolean; data: ResolvedPreferences }>(API_BASE, payload);
  return response.data.data;
}

export async function fetchDefaultPreferences(): Promise<ResolvedPreferences> {
  const response = await axios.get<{ success: boolean; data: ResolvedPreferences }>(`${API_BASE}/defaults`);
  return response.data.data;
}
```

### B. Flutter Integration (Dart)

```dart
// models/notification_preference.dart
class PreferenceSetting {
  final bool enabled;
  final bool configurable;

  PreferenceSetting({required this.enabled, required this.configurable});

  factory PreferenceSetting.fromJson(Map<String, dynamic> json) {
    return PreferenceSetting(
      enabled: json['enabled'] ?? false,
      configurable: json['configurable'] ?? true,
    );
  }
}

class ResolvedPreferences {
  final Map<String, PreferenceSetting> inApp;
  final Map<String, PreferenceSetting> push;

  ResolvedPreferences({required this.inApp, required this.push});

  factory ResolvedPreferences.fromJson(Map<String, dynamic> json) {
    final inAppMap = (json['inApp'] as Map<String, dynamic>).map(
      (key, val) => MapEntry(key, PreferenceSetting.fromJson(val)),
    );
    final pushMap = (json['push'] as Map<String, dynamic>).map(
      (key, val) => MapEntry(key, PreferenceSetting.fromJson(val)),
    );
    return ResolvedPreferences(inApp: inAppMap, push: pushMap);
  }
}

// services/notification_preferences_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class NotificationPreferencesService {
  final String baseUrl = 'https://infinitymedisetu.com/api/v1/settings/notification-preferences';
  final String userToken;

  NotificationPreferencesService({required this.userToken});

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $userToken',
      };

  Future<ResolvedPreferences> getPreferences() async {
    final response = await http.get(Uri.parse(baseUrl), headers: _headers);
    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      return ResolvedPreferences.fromJson(decoded['data']);
    } else {
      throw Exception('Failed to load notification preferences');
    }
  }

  Future<ResolvedPreferences> updatePreferences({
    Map<String, bool>? inAppOverrides,
    Map<String, bool>? pushOverrides,
  }) async {
    final payload = <String, dynamic>{};
    if (inAppOverrides != null) payload['inApp'] = inAppOverrides;
    if (pushOverrides != null) payload['push'] = pushOverrides;

    final response = await http.put(
      Uri.parse(baseUrl),
      headers: _headers,
      body: jsonEncode(payload),
    );

    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      return ResolvedPreferences.fromJson(decoded['data']);
    } else {
      throw Exception('Failed to update notification preferences');
    }
  }
}
```
