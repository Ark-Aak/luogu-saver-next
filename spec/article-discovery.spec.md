# Article Discovery Specification

## 1. Scope

This specification defines backend behavior for discovering Luogu articles from the article plaza and from a Luogu user's article list.

Article discovery is a producer of existing article save workflows. It SHALL NOT parse saved article
content for links. It SHALL NOT create recursive discovery runs.

## 2. Entities

### 2.1 DiscoveryRun

Table name: `discovery_run`

| Column                | Type     | Constraints | Description                                                                                                      |
| --------------------- | -------- | ----------- | ---------------------------------------------------------------------------------------------------------------- |
| `id`                  | UUID     | PRIMARY KEY | Discovery run identifier                                                                                         |
| `seed_url`            | VARCHAR  | NOT NULL    | Seed URL. Article plaza runs use the plaza URL. User article runs use `https://www.luogu.com/user/{uid}/article` |
| `status`              | VARCHAR  | NOT NULL    | `active`, `completed`, `stopped`, or `failed`                                                                    |
| `max_pages`           | INT      | NOT NULL    | Maximum pages claimed by this run                                                                                |
| `force_update`        | TINYINT  | NOT NULL    | Whether article save workflows force refresh                                                                     |
| `visited_pages`       | INT      | NOT NULL    | Number of page claims consumed by this run                                                                       |
| `failed_pages`        | INT      | NOT NULL    | Number of pages that reached final failure                                                                       |
| `pending_pages`       | INT      | NOT NULL    | Number of page chains that have not terminated                                                                   |
| `discovered_articles` | INT      | NOT NULL    | Number of distinct article rows inserted                                                                         |
| `created_workflows`   | INT      | NOT NULL    | Number of save workflows created by this run                                                                     |
| `last_error`          | TEXT     | NULLABLE    | Last final page failure message, at most 80 characters                                                           |
| `finished_at`         | DATETIME | NULLABLE    | Completion or stop timestamp                                                                                     |
| `created_at`          | DATETIME | NOT NULL    | Record creation timestamp                                                                                        |
| `updated_at`          | DATETIME | NOT NULL    | Record update timestamp                                                                                          |

### 2.2 DiscoveredArticle

Table name: `discovered_article`

| Column         | Type        | Constraints | Description                                   |
| -------------- | ----------- | ----------- | --------------------------------------------- |
| `id`           | UUID        | PRIMARY KEY | Row identifier                                |
| `run_id`       | VARCHAR     | NOT NULL    | Discovery run identifier                      |
| `article_id`   | VARCHAR(8)  | NOT NULL    | Luogu article LID                             |
| `source`       | VARCHAR     | NOT NULL    | `plaza` or `user_articles`                    |
| `status`       | VARCHAR     | NOT NULL    | `discovered`, `workflow_created`, etc.        |
| `workflow_id`  | VARCHAR(36) | NULLABLE    | Created article save workflow ID              |
| `reason`       | TEXT        | NULLABLE    | Failure or skip reason, at most 80 characters |
| `last_seen_at` | DATETIME    | NOT NULL    | Last time this run saw the article            |
| `created_at`   | DATETIME    | NOT NULL    | Record creation timestamp                     |
| `updated_at`   | DATETIME    | NOT NULL    | Record update timestamp                       |

`(run_id, article_id)` SHALL be unique.

## 3. Article Plaza Run Creation

`DiscoveryService.startArticlePlazaDiscovery(input)` SHALL:

1. Normalize `maxPages` to an integer in `[1, 1000]`, default `50`.
2. Normalize `forceUpdate` to a boolean, default `false`.
3. Normalize `includeCategories` to a boolean, default `true`.
4. If `includeCategories=true`, create page-chain seeds for `category=null` and categories `1..8`.
5. If `includeCategories=false`, create only the `category=null` page-chain seed.
6. Create one `discovery_run` row with:
    - `seed_url = "https://www.luogu.com.cn/article"`
    - `status = active`
    - `pending_pages = number of seeds`
    - counters initialized to zero
7. For every seed, create and dispatch one `discover:article_plaza` task with page `1`.
8. Return the created run and dispatched task IDs.

## 4. Article Plaza Page Task

A `discover:article_plaza` task SHALL:

1. Claim one page budget from the run before fetching the page.
2. On retry attempts, verify the run is still active but SHALL NOT consume another page budget.
3. Fetch `https://www.luogu.com.cn/article` with optional `category` and `page` query parameters.
4. Extract valid article LIDs from `data.articles.result[*].lid`.
5. Deduplicate article LIDs within the fetched page.
6. For each extracted article ID, call `DiscoveryService.discoverArticle`.
7. If the page contains at least one article and `page < maxPages`, create and dispatch the next page task for the same category.
8. If no continuation task is created, decrement `pending_pages`.
9. When `pending_pages` reaches zero, mark the run `completed` and set `finished_at`.

If fetching or parsing fails:

1. Non-final BullMQ attempts SHALL rethrow the error without incrementing `failed_pages` and without decrementing `pending_pages`.
2. The final attempt SHALL increment `failed_pages`, write normalized `last_error`, decrement `pending_pages`, and rethrow the error.
3. Normalized `last_error` SHALL follow `task-queue.spec.md` failure reason normalization and have length at most 80 characters.

## 4.1 User Article Run Creation

`DiscoveryService.startUserArticleDiscovery(input)` SHALL:

1. Normalize `uid` to a positive integer.
2. Normalize `maxPages` to an integer in `[1, 1000]`, default `1000`.
3. Normalize `forceUpdate` to a boolean, default `false`.
4. Create one `discovery_run` row with:
    - `seed_url = "https://www.luogu.com/user/{uid}/article"`
    - `status = active`
    - `max_pages = maxPages`
    - `pending_pages = 1`
    - counters initialized to zero
5. Create and dispatch one `discover:user_articles` task with page `1`, `uid`, `maxPages`, and `forceUpdate`.
6. Return the created run and dispatched task ID.

`POST /discover/user/:uid/articles/start` SHALL require an authenticated admin user. It SHALL start one user article discovery run for path parameter `uid`.

If the requester is not authenticated, the endpoint SHALL return 401.

If the requester is authenticated but is not admin, the endpoint SHALL return 403.

The frontend SHALL provide a dedicated page with a UID input for starting this endpoint. The frontend SHALL NOT place this start form on the home page.

The frontend SHALL show the dedicated user article discovery page and sidebar menu item only when the current authenticated user is admin.

## 4.2 User Article Page Task

A `discover:user_articles` task SHALL:

1. Claim one page budget from the run before fetching the page.
2. On retry attempts, verify the run is still active but SHALL NOT consume another page budget.
3. Fetch `https://www.luogu.com/user/{uid}/article?page={page}`.
4. Extract valid article LIDs from `data.articles.result[*].lid`.
5. Deduplicate article LIDs within the fetched page.
6. For each extracted article ID, call `DiscoveryService.discoverArticle` with source `user_articles`.
7. Compute total page count as `ceil(count / perPage)` if both `data.articles.count` and `data.articles.perPage` are positive finite numbers.
8. If the page contains at least one article and `page < maxPages` and either total page count is unknown or `page < totalPageCount`, create and dispatch the next page task for the same user.
9. If no continuation task is created, decrement `pending_pages`.
10. When `pending_pages` reaches zero, mark the run `completed` and set `finished_at`.

If fetching or parsing fails, error handling SHALL match Section 4.

## 5. Discovered Article Handling

`DiscoveryService.discoverArticle(input)` SHALL:

1. Reject article IDs that do not match `/^[A-Za-z0-9]{1,8}$/`.
2. Reject inactive or missing runs.
3. Insert one `discovered_article` row with source `plaza` or `user_articles`.
4. If `(run_id, article_id)` already exists, update `last_seen_at` and return duplicate.
5. Request one `article-save-pipeline` workflow with `targetId = articleId`, `forceUpdate`, and BullMQ job priority `10`; workflow deduplication MAY return an active existing workflow.
6. On workflow creation success, set row status to `workflow_created` and store `workflow_id`.
7. On workflow creation failure, set row status to `failed` and store the normalized error message.
8. Normalized workflow creation failure `reason` SHALL follow `task-queue.spec.md` failure reason normalization and have length at most 80 characters.

Article save workflow creation SHALL use workflow deduplication key `article-save:${articleId}`.
If another active article-save workflow already owns that key, discovery SHALL store the existing
workflow ID, set the discovered row status to `workflow_created`, and SHALL NOT create another SQL
workflow or another set of task rows.
`created_workflows` SHALL increment only when the returned workflow descriptor has
`deduplicated=false`.

The `discovery_run` table SHALL define indexes over `(created_at)` and `(seed_url, status)` in
addition to its status index.

The `discovery_run` table SHALL define indexes over `(created_at)` and `(seed_url, status)` in
addition to its status index.

Discovery SHALL NOT create article-link edges.
Discovery SHALL NOT recursively create discovery work from saved article content.

## 6. Scheduler

The backend SHALL start an article plaza discovery scheduler after the database is initialized.

Scheduler configuration lives at `config.discovery.articlePlaza`:

| Field               | Type    | Default | Description                            |
| ------------------- | ------- | ------- | -------------------------------------- |
| `enabled`           | boolean | true    | Whether the scheduler runs             |
| `intervalMs`        | number  | 3600000 | Delay between scheduled checks         |
| `maxPages`          | number  | 50      | `maxPages` passed to scheduled runs    |
| `includeCategories` | boolean | true    | `includeCategories` for scheduled runs |
| `forceUpdate`       | boolean | false   | `forceUpdate` for scheduled runs       |

The scheduler SHALL:

1. Do nothing when `enabled=false`.
2. Check once every `intervalMs`.
3. If an active article plaza run exists, skip that tick.
4. Otherwise start one article plaza discovery run using the configured values.
5. Log scheduler failures and keep the process running.

## 7. REST API

### 7.1 POST `/discover/article-plaza/start`

Permission requirement: `MANAGE_DISCOVERY`.

The endpoint SHALL pass the request body to `DiscoveryService.startArticlePlazaDiscovery`.

On success, response data SHALL be:

```json
{
    "runId": "<run.id>",
    "taskIds": ["<task_id>"],
    "run": {}
}
```

If the service throws, the endpoint SHALL return code `500` through `ctx.fail`.

### 7.2 POST `/discover/user/:uid/articles/start`

Permission requirement: authenticated user with `role === ROLE_ADMIN`.

If `ctx.user` is absent, the endpoint SHALL return 401. If `ctx.user.role !== ROLE_ADMIN`, the endpoint SHALL return 403.

The endpoint SHALL pass `{ ...body, uid: ctx.params.uid }` to `DiscoveryService.startUserArticleDiscovery`.

On success, response data SHALL be `{ runId, taskIds, run }`.

If the service throws, the endpoint SHALL return code `400` through `ctx.fail`.

### 7.3 GET `/discover/runs`

Permission requirement: `MANAGE_DISCOVERY`.

The endpoint SHALL normalize `limit` as `Number(ctx.query.limit) || 20` and return `DiscoveryService.listRuns(limit)`.

### 7.4 GET `/discover/runs/:id`

Permission requirement: `MANAGE_DISCOVERY`.

If no run exists for `id`, the endpoint SHALL return 404. Otherwise it SHALL return the run object.

### 7.5 POST `/discover/runs/:id/stop`

Permission requirement: `MANAGE_DISCOVERY`.

If no run exists for `id`, the endpoint SHALL return 404. Otherwise it SHALL call `DiscoveryService.stopRun(id)` and return `{ runId: id }`.

## 8. WebSocket Updates

Room `discovery:runs` SHALL publish event `discovery:runs:update`.

Joining room `discovery:runs` SHALL require Socket.IO authentication with `MANAGE_DISCOVERY`.

The event payload SHALL be:

```ts
{
    runs: Array<{
        id: string;
        seedUrl: string;
        status: 'active' | 'completed' | 'stopped' | 'failed';
        maxPages: number;
        forceUpdate: boolean;
        visitedPages: number;
        failedPages: number;
        pendingPages: number;
        discoveredArticles: number;
        createdWorkflows: number;
        lastError: string | null;
        finishedAt: string | null;
        createdAt: string;
        updatedAt: string;
    }>;
}
```

`runs` SHALL contain the same discovery run list as `GET /discover/runs?limit=20`, ordered newest
first.
Each emitted `lastError` value SHALL be normalized by `task-queue.spec.md` failure reason normalization when it is non-null.

When an authorized client joins `discovery:runs`, the server SHALL emit one
`discovery:runs:update` event to that socket.

The backend SHALL emit `discovery:runs:update` after observable discovery run state changes,
including:

1. Creating an article plaza discovery run.
2. Stopping a discovery run.
3. Updating page counters, pending page count, completion state, or failure state.
4. Inserting or updating discovered article rows when the run counters or workflow status can change.

The websocket payload SHALL NOT include discovered article rows, article IDs, workflow IDs, Luogu
cookies, raw HTTP response bodies, HTML error pages, or error stack traces.

To avoid flooding admin clients while one page discovers many articles, the backend SHOULD batch
rapid updates and emit at most one `discovery:runs:update` event per short debounce window.
