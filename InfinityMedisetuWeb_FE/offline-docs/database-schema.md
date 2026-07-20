# Database Schema & Migrations

The Desktop application utilizes `better-sqlite3` to maintain a local, offline database. This ensures the clinic can operate even when internet connectivity drops.

## Migration System
The database schema is entirely managed through a code-first Migration Engine located in `electron/database/migrations/index.ts`. 
On startup, the system checks the `schema_migrations` table and applies any missing versions.

### Current Schema Entities

#### 1. Patients (`patients`)
Stores the core demographic information.
- `id`: The Cloud UUID
- `name`, `phone`, `gender`, `dob`
- `profile_data`: A flexible JSON string column that stores extended patient history and metadata, enabling the React UI to render rich profiles entirely offline.

#### 2. Appointments (`appointments`)
Stores the booking history.
- `id`: The Cloud UUID
- `patient_id`: Foreign key to `patients`
- `doctor_id`: Foreign key to `doctors`
- `date`, `time_slot`, `status`
- `service_id`: (Optional) Foreign key to `services`
- `payment_mode`, `payment_status`, `booking_source`: (Optional) Payment and booking source data

#### 3. Doctors & Services (`doctors`, `services`)
The Master Data dictionaries populated by the Sync Engine.
- Contains the exact Cloud UUIDs (`id`), Names, and Specialities.
- Ensures that SQLite `JOIN` queries accurately resolve entity names for offline viewing.

#### 4. Settings & Metadata (`clinic_settings`, `sync_metadata`)
- `clinic_settings`: A key-value store used to securely persist the `auth_token` across application restarts.
- `sync_metadata`: Tracks the last time the Pull Sync Engine successfully updated a specific table and records the number of rows synced or any error messages.

#### 5. Offline Sync Queue (`event_log`)
The heart of the Offline-to-Cloud synchronization mechanism.
- `id`: Unique identifier for the sync event.
- `action_type`: E.g., `appointment:book`, `patient:update`.
- `entity_type`: The domain entity affected (e.g., `appointments`).
- `entity_id`: The local SQLite UUID of the entity.
- `payload`: A JSON string containing the HTTP request required to replay this action on the cloud API (includes `httpMethod`, `endpoint`, and `body`).
- `status`: `pending`, `success`, or `failed`.
- `created_at`: The exact time the action occurred offline.
- `last_error`: Records any failure reasons (e.g., 404, 500) during the background replay attempts.
