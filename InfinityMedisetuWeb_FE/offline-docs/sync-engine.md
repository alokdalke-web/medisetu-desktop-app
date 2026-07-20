# Sync Engine & Data Bootstrap

The Medi-Setu Sync Engine is a modular, background process running in the Electron Main thread. It has two primary responsibilities:
1. **Pull Sync (Cloud -> Local):** Silently replicates Cloud Master Data into the Local SQLite database.
2. **Push Sync (Local -> Cloud):** Monitors local changes made while offline and pushes them to the Cloud API when connectivity is restored.

## Architecture & Extensibility

### 1. Pull Sync (Master Data)
The Pull Sync Engine is built using an array of `ISyncService` instances. This design means that to add synchronization for a new entity (like 'Departments' or 'Inventory'), you only need to create a new class that implements `ISyncService` and add it to the Engine array.

```typescript
export interface ISyncService {
  entityName: string;
  sync(db: Database): Promise<number>;
}
```

### 2. Push Sync (Event Log)
The Push Sync Engine (`PushSyncEngine.ts`) relies on an Event Sourcing pattern. Whenever a user performs a write operation (e.g., booking an appointment) while offline, the local repositories save the state and insert a corresponding record into the `event_log` table within the same SQLite transaction.

The Push Sync Engine runs a continuous background worker that:
1. Polls the `event_log` for records with `status = 'pending'`.
2. Reads the `action_type`, `endpoint`, `httpMethod`, and `payload`.
3. Dispatches the HTTP request to the Cloud REST API.
4. On success, updates the `event_log` status to `success` and maps any new Cloud UUIDs back to the local SQLite database.
5. On failure, updates the status to `failed` and stores the `last_error` for future retries.

## The Sync Lifecycle

1. **Authentication Cache:** The React frontend detects a successful login and sends the credentials to the backend via IPC. `AuthStore.ts` writes this securely into SQLite.
2. **Trigger:** Both Pull and Push Sync Engines automatically start up shortly after the Electron application launches.
3. **Execution (Pull):** 
   - Iterates through each registered `ISyncService`.
   - Fetches from the Cloud REST API and `UPSERT`s into SQLite via synchronous transactions.
4. **Execution (Push):**
   - Polls the `event_log` every 5 seconds (or via manual trigger).
   - Replays queued events to the Cloud API and updates local metadata mapping.

## Concurrency Safety

Due to the strict atomicity rules of `better-sqlite3`, asynchronous network requests (`fetch`) are purposefully kept **outside** of the database transaction blocks. This ensures that the SQLite file is only locked for the few milliseconds it takes to perform the bulk `INSERT` statements or local commits, rather than being locked for the entire duration of the HTTP network request.
