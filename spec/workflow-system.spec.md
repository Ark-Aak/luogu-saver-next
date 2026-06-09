# Workflow System Specification

## 1. Scope

This specification defines backend workflow orchestration behavior implemented under `packages/backend`.

A workflow definition is a logical DAG of task definitions. The backend compiles the logical DAG into one linear BullMQ Flow. The `fathers` field controls upstream data visibility and linear order; it does not require parallel execution.

## 2. Workflow Entity

Table name: `workflow`

| Column        | Type     | Constraints       | Description                                                  |
| ------------- | -------- | ----------------- | ------------------------------------------------------------ |
| `id`          | UUID     | PRIMARY KEY       | Workflow identifier exposed as `workflowId` in API responses |
| `root_job_id` | VARCHAR  | NOT NULL          | BullMQ root job ID. It equals one workflow node `Task.id`    |
| `queue_name`  | VARCHAR  | NOT NULL          | Queue name containing the root job                           |
| `status`      | VARCHAR  | DEFAULT `pending` | Last known workflow status                                   |
| `definition`  | JSON     | NOT NULL          | Normalized workflow definition                               |
| `result`      | JSON     | NULLABLE          | Tracked task result map                                      |
| `created_at`  | DATETIME | NOT NULL          | Creation time                                                |
| `updated_at`  | DATETIME | NOT NULL          | Last update time                                             |

## 3. Workflow Definition

The API accepts exactly this JSON shape:

```json
{
    "tasks": [
        {
            "name": "save",
            "track": true,
            "report": true,
            "fathers": [],
            "data": {
                "type": "save",
                "payload": {}
            }
        }
    ]
}
```

Validation rules:

1. `tasks` MUST be a non-empty array.
2. Each task MUST have a unique non-empty `name`.
3. If `fathers` is present, it MUST be an array of task names that exist in `tasks`.
4. The logical graph defined by `fathers` MUST be acyclic.
5. If `report` is present on a task, it MUST be a boolean.
6. `track = true` means the task completion payload is written into `workflow.result[taskName]`.
7. `report = true` means the task emits websocket completion/failure events for clients that join `task:{taskId}`.
8. `track` and `report` are independent. A task MAY be tracked but not reported, or reported but not tracked.

## 4. API Endpoints

### 4.1 POST `/workflow/create`

Permission requirement: `CREATE_WORKFLOW`.

Input: normalized workflow definition object as specified in section 3.

Output:

```json
{
    "workflowId": "<uuid>",
    "rootJobId": "<16_char_task_id>",
    "taskIds": {
        "<taskName>": "<16_char_task_id>"
    },
    "reportTaskIds": {
        "<reportTaskName>": "<16_char_task_id>"
    }
}
```

Postconditions:

1. A `workflow` row is created with `id = workflowId` before any workflow task row is created.
2. For every item in `tasks`, one `task` row is created before the BullMQ Flow is submitted.
3. Each workflow node BullMQ job ID equals the corresponding `task.id`.
4. Each task ID in `taskIds` is a 16-character random string.
5. `workflow.root_job_id` equals the BullMQ root job ID and equals one value in `taskIds`.
6. The submitted BullMQ Flow contains every task in `tasks` exactly once.
7. Each submitted BullMQ job SHALL set `failParentOnFailure = true`.
8. If a workflow node reaches final failure, each parent waiting on that node SHALL fail instead of remaining in `waiting-children` indefinitely.
9. If workflow creation fails before the API response is sent, no `workflow` row with `id = workflowId` remains in the database.

### 4.2 POST `/workflow/create/template/:name`

Input: template parameter object.

Permission model:

1. The template name must exist in `WORKFLOW_TEMPLATES_PERMISSION`.
2. If mapped permission is `null`, the endpoint is public and does not require login.
3. If mapped permission is non-null, requester must be authenticated and satisfy the mapped permission bit.

Output format is identical to section 4.1.

### 4.3 GET `/workflow/query/:id`

Input path parameter: workflow UUID.

Output:

```json
{
    "workflowId": "<uuid>",
    "status": "pending|active|completed|failed|expired|...",
    "createdAt": "<datetime>",
    "updatedAt": "<datetime>",
    "tasks": [
        {
            "jobId": "<task_id>",
            "jobName": "<task_name>",
            "status": "<bullmq_state>"
        }
    ],
    "result": {
        "<trackedTaskName>": {
            "name": "<result_name>",
            "result": "<result_payload>"
        }
    }
}
```

If runtime flow data cannot be loaded from Redis and current status is not terminal, status is set to `expired` and `tasks` is returned as `null`.
If runtime flow data cannot be loaded from Redis and current status is terminal, status is unchanged and `tasks` is returned as `null`.
For tracked task entries that are not finished yet, `result[taskName]` is `null`.

## 5. Template Definitions

### 5.1 `article-save-pipeline`

Required input: `targetId`.

Task graph by logical dependency:

1. `save` (tracked, reported)
2. `summary` depends on `save` (tracked)
3. `censor` depends on `save` (tracked)
4. `update-embedding` depends on `summary`
5. `update-summary` depends on `summary`
6. `update-censor` depends on `censor`
7. `update-search-index` depends on `update-summary`

Permission: public (`null` permission mapping).

Task `update-embedding` SHALL read upstream `summary.data.summary` when present and SHALL NOT depend on `update-summary`.

Task `update-search-index` has `track=true` and `report=true` so clients can observe final search indexing success or failure.

### 5.2 `paste-save-pipeline`

Required input: `targetId`.

Task graph by logical dependency:

1. `save` (tracked, reported)
2. `censor` depends on `save` (tracked)
3. `update-censor` depends on `censor`

Permission: public (`null` permission mapping).

Task `save` has type `save`, target `paste`, targetId equal to the input `targetId`, and empty metadata.
Task `censor` has type `llm`, target `censor`, and empty metadata.
Task `update-censor` has type `update`, target `censor`, targetId equal to the input `targetId`, and metadata `{ "censorTarget": "paste" }`.

The template SHALL NOT contain a `summary` task.
The template SHALL NOT contain an `embedding` task.
The template SHALL NOT contain an `update-search-index` task.

### 5.3 `article-censor-pipeline`

Required input: `targetId`.

Task graph:

1. `censor` (tracked, reported)
2. `update-censor` depends on `censor`

Permission: `CREATE_WORKFLOW`.

### 5.4 `search-reindex-pipeline`

Input parameter:

| Parameter   | Type   | Required | Default | Constraint            |
| ----------- | ------ | -------- | ------- | --------------------- |
| `batchSize` | number | no       | 100     | Integer in `[1, 500]` |

Task graph:

1. `reindex-search` (tracked, reported)

Task `reindex-search` has type `update`, target `search_reindex`, targetId `articles`, and metadata field `batchSize` equal to the normalized input value.

Permission: `MANAGE_SEARCH`.

### 5.5 `article-summary-rebuild-pipeline`

Input parameters:

| Parameter     | Type   | Required | Default | Constraint            |
| ------------- | ------ | -------- | ------- | --------------------- |
| `batchSize`   | number | no       | 20      | Integer in `[1, 100]` |
| `concurrency` | number | no       | 5       | Integer in `[1, 20]`  |

Task graph:

1. `rebuild-summary` (tracked, reported)

Task `rebuild-summary` has type `update`, target `article_summary_rebuild`, targetId `articles`, metadata field `batchSize` equal to the normalized `batchSize`, and metadata field `concurrency` equal to the normalized `concurrency`.

Permission: `MANAGE_SEARCH`.

### 5.6 `article-embedding-rebuild-pipeline`

Input parameters:

| Parameter     | Type   | Required | Default | Constraint            |
| ------------- | ------ | -------- | ------- | --------------------- |
| `batchSize`   | number | no       | 20      | Integer in `[1, 100]` |
| `concurrency` | number | no       | 5       | Integer in `[1, 50]`  |

Task graph:

1. `rebuild-embedding` (tracked, reported)

Task `rebuild-embedding` has type `update`, target `article_embedding_rebuild`, targetId `articles`, metadata field `batchSize` equal to the normalized `batchSize`, and metadata field `concurrency` equal to the normalized `concurrency`.

Permission: `MANAGE_SEARCH`.

### 5.7 `rag-search-pipeline`

Input parameters:

| Parameter     | Type   | Required | Default | Constraint                 |
| ------------- | ------ | -------- | ------- | -------------------------- |
| `query`       | string | yes      | absent  | Trimmed non-empty text     |
| `limit`       | number | no       | 100     | Integer in `[1, 100]`      |
| `maxArticles` | number | no       | 10      | Integer in `[1, 10]`       |
| `maxChars`    | number | no       | 20000   | Integer in `[1000, 20000]` |
| `articleIds`  | array  | no       | `[]`    | At most 10 article IDs     |

Task graph:

1. `read-query` (read text from workflow parameters)
2. `plan-queries` depends on `read-query`
3. For each index `i` in `[0, 4]`, `read-planned-query-i` depends on `plan-queries`
4. For each index `i` in `[0, 4]`, `keyword-search-i` depends on `read-planned-query-i`
5. For each index `i` in `[0, 4]`, `query-embedding-i` depends on `read-planned-query-i`
6. For each index `i` in `[0, 4]`, `vector-search-i` depends on `query-embedding-i`
7. `build-context` depends on `read-query`, every `keyword-search-i`, and every `vector-search-i`
8. `answer` depends on `build-context` (tracked, reported)

Reported progress tasks:

1. `plan-queries` SHALL be tracked and reported.
2. Every `keyword-search-i` SHALL be tracked and reported.
3. Every `query-embedding-i` SHALL be tracked and reported.
4. Every `vector-search-i` SHALL be tracked and reported.
5. `build-context` SHALL be tracked and reported.
6. `answer` SHALL be tracked and reported.

For websocket completed events, reported embedding task payloads SHALL NOT include the full embedding vector. They SHALL include `embeddingLength`.

Task `plan-queries` has type `rag` and target `plan_queries`.

Task `plan-queries` SHALL:

1. Read the original question from `read-query.data.text`.
2. Ask the chat LLM scenario for alternative retrieval texts.
3. Return `data.queries` as an array of strings.
4. Set `data.queries[0]` exactly equal to the original question text.
5. Remove empty strings and duplicate strings after trimming.
6. Return at most 5 queries.
7. If the LLM call fails or returns invalid JSON, return exactly `[original question text]`.
8. Generated strings MAY be long natural-language retrieval texts and SHALL NOT be restricted to short keywords.

Each `read-planned-query-i` task SHALL:

1. Have type `read` and target `planned_query`.
2. Read `plan-queries.data.queries[i]`.
3. Return `skipNextStep=true` and `data.text=''` if no query exists at index `i`.
4. Return `skipNextStep=false` and `data.text=<query>` if a query exists at index `i`.

For every `read-planned-query-i` where `skipNextStep=false`, both `keyword-search-i` and `query-embedding-i` SHALL run over that exact query text, and `vector-search-i` SHALL run over the resulting embedding.

Task `build-context` SHALL receive up to 100 keyword candidates and up to 100 vector candidates per planned query.

Task `build-context` SHALL rerank merged candidates when the LLM rerank scenario is configured.

Task `build-context` SHALL include at most `maxArticles` documents and at most `maxChars` characters in `data.text`.

If `articleIds` contains article IDs:

1. The template SHALL pass at most the first 10 unique non-empty article IDs to `build-context.metadata.articleIds`.
2. Task `build-context` SHALL load non-deleted articles matching `metadata.articleIds` before adding retrieval hits.
3. Forced articles from `metadata.articleIds` SHALL appear before retrieved articles in `data.documents`, preserving the `articleIds` order.
4. Forced articles SHALL count toward `maxArticles` and `maxChars`.
5. If a forced article is missing or deleted, `build-context` SHALL skip it.
6. Retrieved articles whose IDs are already included by forced articles SHALL NOT be duplicated.
7. If forced articles alone exceed `maxChars`, `build-context` SHALL include only the prefix of forced articles that fits in `maxChars`.

Task `answer` SHALL ask the LLM to:

1. Answer in Chinese.
2. Use Markdown.
3. Use `$formula$` for every inline mathematical formula.
4. Use `$$formula$$` for every display mathematical formula.
5. Not use `\(...\)` or `\[...\]` math delimiters.
6. Not write prefatory disclaimers such as `下面根据已有材料` or `需要说明`.
7. Not invite the user to ask follow-up questions.
8. If no answer can be determined from the documents, output exactly `现有材料无法确定。`.

Task `answer` SHALL use the `answer` LLM scenario.

Permission: `CREATE_WORKFLOW`.

LLM task handlers SHALL consume upstream `data.text` only. LLM task handlers SHALL NOT read external source objects by `sourceId`.

Read task handlers SHALL be the only task handlers that load article or paste content from persistent storage for workflow data flow.

## 6. Status, Result, and Report Synchronization

1. Each workflow node updates the `task` row whose `id` equals the BullMQ job ID.
2. Only report tasks emit websocket events `task:{taskId}:completed` and `task:{taskId}:failed`.
3. A report task completed event payload SHALL contain `status='completed'` and `result=returnvalue.__result`.
4. A report task failed event payload SHALL contain `status='failed'` and `error`.
5. Non-report workflow tasks do not emit `task:{taskId}` websocket events.
6. Legacy non-workflow tasks emit websocket task events for every completed or failed task.
7. Workflow completion status is set to `completed` only when the root job completes successfully.
8. Workflow failure status is set to `failed` when any workflow node reaches final failure.
9. For tracked tasks (`track = true`), when a job includes `workflowId` and `taskName`, its return payload is merged into `workflow.result[taskName]`.
10. Result payload is normalized as:

```json
{
    "name": "<returnvalue.__name>",
    "result": "<returnvalue.__result>"
}
```

11. Status writes are monotonic with respect to terminal states.
12. If current `workflow.status` is `completed`, `failed`, or `expired`, later queue status reads or queue events MUST NOT replace it.
13. If current `workflow.status` is not terminal, a queue status read or queue event MAY replace it with the observed BullMQ state.

## 7. Invariants

1. `workflowId` is the only workflow identifier accepted by `/workflow/query/:id`.
2. `rootJobId` is exposed only as the BullMQ root job locator.
3. Every value in `taskIds` is both a `task.id` and a BullMQ job ID.
4. `reportTaskIds` contains exactly the task-name subset whose task definition has `report = true`.
5. Template permission lookup is exact-key based; missing keys are rejected as invalid templates.
