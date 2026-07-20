# Paste System Specification

## 1. Overview

The paste system manages code/text pastes archived from Luogu. It provides storage, retrieval, caching, and content rendering.

## 2. Paste Entity

### 2.1 Schema

Table name: `paste`

| Column          | Type         | Constraints             | Description               |
| --------------- | ------------ | ----------------------- | ------------------------- |
| `id`            | VARCHAR(8)   | PRIMARY KEY             | Paste ID (from Luogu)     |
| `content`       | MEDIUMTEXT   | NOT NULL                | Paste content             |
| `author_id`     | INT UNSIGNED | NOT NULL, FK -> user.id | Author user ID            |
| `deleted`       | TINYINT      | DEFAULT 0               | Soft delete flag          |
| `created_at`    | DATETIME     | NOT NULL                | Record creation timestamp |
| `updated_at`    | DATETIME     | NOT NULL                | Record update timestamp   |
| `delete_reason` | VARCHAR      | DEFAULT '管理员删除'    | Reason for deletion       |
| `content_hash`  | VARCHAR      | NULLABLE                | SHA-256 hash of content   |

### 2.2 Indexes

- `idx_author_id`: (`author_id`)
- `idx_paste_deleted`: (`deleted`)

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

When the frontend paste detail request returns code `403`, the frontend SHALL:

1. Clear any loaded paste object and rendered paste content.
2. Render one result state with status `403` and exact title `剪贴板不可查看`.
3. Render the response message as the result description; if the message is empty, use
   `剪贴板已删除`.
4. Render commands for returning to the previous route and opening the original Luogu paste.
5. Not render the paste content card.

### 3.2 GET /paste/count

Get total count of non-deleted pastes.

**Response:**

- 200: `{ count: number }`
- 500: Server error

### 3.3 POST /workflow/create/template/paste-save-pipeline

Create a workflow that saves one Luogu paste.

Input body:

```json
{
    "targetId": "paste_id"
}
```

Postconditions:

1. If `targetId` is absent or empty, workflow creation SHALL fail.
2. The template SHALL be public and require no authentication.
3. The workflow SHALL contain one reported task named `save` with type `save`, target `paste`, and `targetId` equal to the input `targetId`.
4. Workflow creation SHALL use deduplication key `paste-save:${targetId}` and return the active existing workflow descriptor when that key already exists.
5. The workflow MAY contain content safety tasks for the saved paste.
6. The workflow SHALL NOT contain an LLM task with target `summary`.
7. The workflow SHALL NOT contain an LLM task with target `embedding`.
8. The workflow SHALL NOT contain an update task with target `search_index`.

## 4. Service Layer

### 4.1 PasteService

| Method             | Cache TTL | Cache Key Pattern | Eviction                     |
| ------------------ | --------- | ----------------- | ---------------------------- |
| `getPasteById(id)` | 600s      | `paste:${id}`     | -                            |
| `getPasteCount()`  | 600s      | `paste:count`     | -                            |
| `savePaste(paste)` | evicts    | -                 | `paste:${id}`, `paste:count` |

Each PasteService read/write method that accepts an optional `manager` argument SHALL use that `EntityManager` for database access when it is provided.
When a cached read method receives a manager argument, it SHALL bypass Redis cache reads and writes.

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

#### saveLuoguPaste(data: LuoguPaste, forceUpdate = false): Promise<{ skipped: boolean; content: string }>

1. Compute `SHA-256(data.data)`.
2. If a paste with `id=data.id` exists, `forceUpdate=false`, and `content_hash` equals the computed hash, return `{ skipped: true, content: "" }` without updating the database.
3. Otherwise upsert a paste row with `id=data.id`, `content=data.data`, `author_id=data.user.uid`, `content_hash` equal to the computed hash, and `deleted=false` for newly inserted rows.
4. Return `{ skipped: false, content }` where `content` equals the saved paste content.
5. A missing paste row SHALL be inserted before any pessimistic row lock is requested.
6. MariaDB deadlock and lock-wait timeout errors SHALL retry the complete paste transaction at most three times.

## 5. Content Rendering

The `paste.renderContent()` method:

1. If `content` is non-empty, render Markdown to HTML using the `renderMarkdown` library.
2. Store the result in `paste.renderedContent`.
3. The paste renderer SHALL NOT generate a table of contents for the response.

### 5.1 Save Task Behavior

The `save:paste` task SHALL:

1. Fetch `https://www.luogu.com/paste/{targetId}`.
2. Read paste data from `response.currentData.paste`.
3. If `response.currentData.paste` is absent or null, fail permanently with exact error message `剪贴板不存在`.
4. Do not read `response.currentData.paste.user` before step 3 succeeds.
5. Upsert the Luogu paste author before saving the paste.
6. Save the paste through `PasteService.saveLuoguPaste`.
7. If `saveLuoguPaste` returns `skipped=true`, return `skipNextStep=true` and `data.text=""`.
8. If `saveLuoguPaste` returns `skipped=false`, emit websocket event `paste:{id}:updated` to room `paste_{id}`.
9. If saved content is empty, return `skipNextStep=true` and `data.text=""`.
10. If saved content is non-empty, return `skipNextStep=false` and `data.text` equal to saved content.

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
