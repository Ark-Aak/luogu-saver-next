# Judgement System Specification

## 1. Scope

The judgement system integrates the Luogu judgement history into the main Luogu Saver backend and frontend. It owns persistence, scheduled synchronization, read-only APIs, and one-time import of the legacy SQLite database.

The legacy Express server, legacy static pages, the legacy SQLite runtime, and browser requests to `jdmt.luogu.me` are outside the integrated runtime.

## 2. Persistence

### 2.1 Judgement Record

Table name: `judgement_record`.

| Column               | Type         | Constraints      | Description                                 |
| -------------------- | ------------ | ---------------- | ------------------------------------------- |
| `id`                 | INT UNSIGNED | PRIMARY KEY      | Record identifier                           |
| `dedup_key`          | CHAR(64)     | UNIQUE, NOT NULL | Stable SHA-256 duplicate key                |
| `uid`                | INT UNSIGNED | NOT NULL         | Luogu user ID                               |
| `name`               | VARCHAR(255) | NOT NULL         | User name captured with the event           |
| `reason`             | TEXT         | NULLABLE         | Judgement reason                            |
| `revoked_permission` | INT UNSIGNED | DEFAULT 0        | Revoked permission bit set                  |
| `added_permission`   | INT UNSIGNED | DEFAULT 0        | Added permission bit set                    |
| `time`               | INT UNSIGNED | NOT NULL         | Luogu event time in Unix seconds            |
| `user_snapshot`      | JSON         | NOT NULL         | Complete user object returned by Luogu      |
| `full_record`        | JSON         | NOT NULL         | Complete judgement object returned by Luogu |
| `fetch_log_id`       | INT UNSIGNED | NOT NULL         | Fetch that first persisted this record      |
| `created_at`         | DATETIME     | NOT NULL         | Local persistence time                      |

The duplicate key SHALL be the lowercase hexadecimal SHA-256 digest of the JSON array `[uid, time, reason ?? "", revokedPermission, addedPermission]`.

The table SHALL index `(time, id)`, `(uid, time, id)`, and `fetch_log_id`. When the duplicate key already exists, synchronization SHALL preserve the first persisted snapshots and fetch-log association.

### 2.2 Fetch Log

Table name: `judgement_fetch_log`.

| Column             | Type         | Constraints                 | Description                       |
| ------------------ | ------------ | --------------------------- | --------------------------------- |
| `id`               | INT UNSIGNED | PRIMARY KEY, AUTO_INCREMENT | Fetch identifier                  |
| `fetched_at`       | DATETIME     | NOT NULL                    | Fetch completion time             |
| `record_count`     | INT UNSIGNED | NOT NULL                    | Valid records returned by Luogu   |
| `new_record_count` | INT UNSIGNED | DEFAULT 0                   | Newly inserted records            |
| `skipped_count`    | INT UNSIGNED | DEFAULT 0                   | Duplicate records skipped         |
| `status`           | VARCHAR(16)  | `success` or `error`        | Fetch outcome                     |
| `error_message`    | VARCHAR(255) | NULLABLE                    | Normalized failure reason         |
| `raw_response`     | LONGTEXT     | NULLABLE                    | Successful upstream JSON response |

Every persisted judgement record SHALL reference an existing fetch log.

## 3. Worker Handler Upstream Fetch

The `JudgementHandler` module SHALL request `config.judgement.sourceUrl` itself with:

1. Method `GET`.
2. Header `X-Requested-With: XMLHttpRequest`.
3. Header `Referer` equal to `https://www.luogu.com.cn/judgement`.
4. Browser-compatible `Accept`, `Accept-Language`, `Cache-Control`, `Pragma`, and `User-Agent` headers.
5. Timeout `config.network.timeout`.
6. Automatic response decompression.
7. Redirects disabled.
8. A maximum response size of 10 MiB.

Only HTTP 2xx responses SHALL be accepted. The response SHALL be JSON with a `logs` array. Every log SHALL contain a positive integer `user.uid`, non-empty `user.name`, non-negative integer permission fields, and a positive integer Unix timestamp. The numeric fields stored in unsigned 32-bit columns (`user.uid`, permission fields, and timestamp) SHALL NOT exceed `4294967295`. Additional upstream fields SHALL be preserved in the JSON snapshots.

Upstream failure reasons SHALL NOT contain response bodies, cookies, HTML pages, or judgement snapshots.

## 4. Synchronization Persistence Service

`JudgementService.persistFetchedResult(result)` SHALL accept one already fetched and schema-validated upstream result containing `data` and `rawResponse`.

The method SHALL:

1. In one database transaction, create a successful fetch log and insert each non-duplicate judgement record.
2. Store the successful raw JSON response in the fetch log for forensic recovery.
3. Return `fetchLogId`, `fetchedCount`, `newRecordCount`, and `skippedCount`.

`JudgementService.recordFetchFailure(reason)` SHALL persist one error fetch log with zero counts, no raw response, and the supplied normalized reason. This method SHALL execute outside any failed successful-fetch transaction.

The persistence service SHALL not perform upstream HTTP requests or response validation. Runtime logs SHALL contain counts and identifiers but SHALL NOT contain raw responses or snapshots.

## 5. Read-only HTTP API

### 5.1 Common Pagination and Validation

`page` SHALL be a positive integer with default `1`. `limit` SHALL be an integer from `1` through `500` with default `50`. Invalid query values SHALL produce application error code `400`.

### 5.2 GET /judgement

The endpoint SHALL accept these optional filters:

| Query      | Meaning                                                       |
| ---------- | ------------------------------------------------------------- |
| `uid`      | Comma-separated unique positive user IDs                      |
| `name`     | Trimmed literal substring, maximum 100 characters             |
| `rev_perm` | Comma-separated positive bit masks, all of which must be set  |
| `add_perm` | Comma-separated positive bit masks, all of which must be set  |
| `no_perm`  | Exact value `1` requires both permission fields to equal zero |

All supplied filters SHALL be combined with AND. `%`, `_`, and the SQL escape character in `name` SHALL be treated literally. Results SHALL be ordered by `time DESC, id DESC`.

The endpoint SHALL call `ctx.success` with:

```typescript
{
    items: Array<{
        id: number;
        uid: number;
        name: string;
        reason: string | null;
        revoked_permission: number;
        added_permission: number;
        time: number;
        user: Record<string, unknown>;
        full_record: Record<string, unknown>;
        fetch_log_id: number;
        log_fetched_at: Date | null;
        created_at: Date;
    }>;
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    }
}
```

### 5.3 GET /judgement/logs

This endpoint SHALL use common pagination, order by `id DESC`, and return fetch-log metadata without `raw_response`.

### 5.4 GET /judgement/stats

This endpoint SHALL return `totalJudgements`, `totalFetchLogs`, `lastFetchAt`, and `lastFetchStatus`.

## 6. Queue Handler and Scheduler

`JudgementHandler` SHALL register exact task key `save:judgement`. It SHALL accept only `targetId = "latest"`, perform the upstream fetch and response validation in the handler module, pass the validated result to `JudgementService.persistFetchedResult()`, and return the synchronization counts.

If the upstream request, response validation, or persistence fails, the handler SHALL normalize the failure reason, call `JudgementService.recordFetchFailure()` once, and rethrow the normalized error. Failure-log persistence errors SHALL be logged without replacing the original task failure.

The scheduler SHALL be disabled by default. When enabled it SHALL optionally dispatch once during startup and then dispatch every configured interval. It SHALL create and dispatch a save task with target `judgement` and target ID `latest`.

Before dispatch, the scheduler SHALL acquire a Redis lock with `SET NX PX` so multiple backend processes do not enqueue the same scheduled run. The lock TTL SHALL equal the interval. If task creation or dispatch fails, the scheduler SHALL release only the lock value it owns. Its timer SHALL call `unref()`.

## 7. Configuration

The optional top-level `judgement` section SHALL have:

| Field          | Type    | Default                              | Validation              |
| -------------- | ------- | ------------------------------------ | ----------------------- |
| `enabled`      | boolean | false                                | none                    |
| `intervalMs`   | number  | 1200000                              | integer, at least 60000 |
| `runOnStartup` | boolean | true                                 | none                    |
| `sourceUrl`    | string  | `https://www.luogu.com.cn/judgement` | absolute URL            |

## 8. Legacy SQLite Import

The one-time importer SHALL require an explicit SQLite file path and explicit source time-zone offset in `+HH:MM` or `-HH:MM` form.

Before writing, it SHALL validate the required tables and columns, every JSON snapshot, and every record-to-fetch-log reference. It SHALL preserve legacy IDs, snapshots, statuses, fetch-log associations, and timestamps, compute each duplicate key, and use duplicate-safe inserts so rerunning the importer is safe.

If multiple legacy rows map to one normalized duplicate key, the importer SHALL retain the earliest legacy row and count later rows as duplicates. Imported fetch-log new/skipped counts SHALL reflect those retained records.

The importer SHALL print source counts, unique record count, inserted and matched target counts, duplicate count, and minimum/maximum event time. It SHALL exit non-zero when the target does not contain every source duplicate key after import. The deployed import command SHALL run against the already compiled backend and SHALL NOT require development dependencies.

Scheduled synchronization SHALL remain disabled while importing. The legacy database file and credentials SHALL NOT be committed.

## 9. Production Cutover

Production migration SHALL happen in this order:

1. Back up the legacy SQLite file and stop the legacy scheduler.
2. Deploy the integrated backend with judgement scheduling disabled.
3. Run the importer and verify its audit output.
4. Enable scheduling and observe at least one successful fetch.
5. Deploy the same-origin frontend.
6. Keep the legacy service read-only during a rollback window, then retire it.

Automatic production deployment SHALL require repository variable `ENABLE_PRODUCTION_DEPLOYMENT` to equal `true`, serialize deployment runs, deploy the backend first, and verify `GET /judgement?page=1&limit=1`. The frontend job SHALL additionally require `JUDGEMENT_MIGRATION_READY=true` and SHALL build with `VITE_API_URL=/api` so the first frontend cutover cannot precede the audited historical import.

## 10. File Locations

- Entities: `packages/backend/src/entities/judgement-record.ts`, `packages/backend/src/entities/judgement-fetch-log.ts`
- Domain helpers: `packages/backend/src/shared/judgement.ts`
- Service: `packages/backend/src/services/judgement.service.ts`
- Router: `packages/backend/src/routers/judgement.router.ts`
- Queue handler: `packages/backend/src/workers/handlers/task/save/judgement.handler.ts`
- Scheduler: `packages/backend/src/services/judgement-sync-scheduler.service.ts`
- Legacy importer: `packages/backend/scripts/import-judgement-sqlite.mjs`
