# Paste System Specification

## 1. Overview

The paste system manages code/text pastes archived from Luogu. It provides storage, retrieval, caching, and content rendering.

## 2. Paste Entity

### 2.1 Schema

Table name: `paste`

| Column         | Type         | Constraints              | Description                    |
|----------------|--------------|--------------------------|--------------------------------|
| `id`           | VARCHAR(8)   | PRIMARY KEY              | Paste ID (from Luogu)          |
| `content`      | MEDIUMTEXT   | NOT NULL                 | Paste content                  |
| `author_id`    | INT UNSIGNED | NOT NULL, FK -> user.id  | Author user ID                 |
| `deleted`      | TINYINT      | DEFAULT 0                | Soft delete flag               |
| `created_at`   | DATETIME     | NOT NULL                 | Record creation timestamp      |
| `updated_at`   | DATETIME     | NOT NULL                 | Record update timestamp        |
| `delete_reason`| VARCHAR      | DEFAULT '管理员删除'       | Reason for deletion           |

### 2.2 Indexes

- `idx_author_id`: (`author_id`)

### 2.3 Relations

- `author`: ManyToOne relationship to `User` entity via `author_id`

## 3. API Endpoints

### 3.1 GET /paste/query/:id

Retrieve a single paste by ID.

**Request:**
- Path parameter: `id` (string) - Paste ID

**Response:**
- 200: Paste object with rendered content
- 403: If `deleted = true`, returns `deleteReason` as error message
- 404: Paste not found
- 500: Server error

### 3.2 GET /paste/count

Get total count of non-deleted pastes.

**Response:**
- 200: `{ count: number }`
- 500: Server error

## 4. Service Layer

### 4.1 PasteService

| Method                  | Cache TTL | Cache Key Pattern        | Eviction                      |
|-------------------------|-----------|--------------------------|-------------------------------|
| `getPasteById(id)`      | 600s      | `paste:${id}`            | -                             |
| `getPasteCount()`       | 600s      | `paste:count`            | -                             |
| `savePaste(paste)`      | evicts    | -                        | `paste:${id}`, `paste:count`  |

### 4.2 Method Specifications

#### getPasteById(id: string): Promise<Paste | null>

1. Check Redis cache for key `paste:${id}`.
2. If cache hit, deserialize and return the paste.
3. If cache miss, query database with `author` relation.
4. Cache the result for 600 seconds.
5. Return the paste or null.

#### getPasteCount(): Promise<number>

1. Check Redis cache for key `paste:count`.
2. If cache hit, return the cached count.
3. If cache miss, count non-deleted pastes in database.
4. Cache the result for 600 seconds.
5. Return the count.

#### savePaste(paste: Paste): Promise<Paste>

1. Save the paste entity to database.
2. Evict cache keys: `paste:${paste.id}`, `paste:count`.
3. Return the saved paste.

## 5. Content Rendering

The `paste.renderContent()` method:
1. If `content` is non-empty, render Markdown to HTML using the `renderMarkdown` library.
2. Store the result in `paste.renderedContent`.

## 6. Soft Deletion

### 6.1 Behavior

- Pastes are never physically deleted from the database.
- The `deleted` flag marks a paste as removed.
- When `deleted = true`, the API returns 403 with `deleteReason`.

### 6.2 Default Delete Reason

The default value for `delete_reason` is `'管理员删除'` (Administrator deleted).

## 7. Invariants

1. All paste queries include the `author` relation.
2. Non-deleted pastes (`deleted = false`) are counted in `getPasteCount()`.
3. Deleted pastes remain queryable but return 403 status.

## 8. File Locations

- Paste entity: `packages/backend/src/entities/paste.ts`
- Paste router: `packages/backend/src/routers/paste.router.ts`
- Paste service: `packages/backend/src/services/paste.service.ts`
