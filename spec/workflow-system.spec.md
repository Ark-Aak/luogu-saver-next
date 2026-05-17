# Workflow System Specification

## 1. Scope

This specification defines backend workflow orchestration behavior implemented under `packages/backend`.

A workflow is a DAG-like task definition submitted to BullMQ as a single Flow tree.

## 2. Workflow Entity

Table name: `workflow`

| Column        | Type     | Constraints       | Description                                                            |
| ------------- | -------- | ----------------- | ---------------------------------------------------------------------- |
| `id`          | UUID     | PRIMARY KEY       | Workflow identifier exposed as `workflowId` in API responses           |
| `root_job_id` | VARCHAR  | NOT NULL          | BullMQ root job ID used for queue status lookup and websocket tracking |
| `queue_name`  | VARCHAR  | NOT NULL          | Queue name containing the root job                                     |
| `status`      | VARCHAR  | DEFAULT `pending` | Last known workflow status                                             |
| `definition`  | JSON     | NOT NULL          | Submitted workflow task definitions                                    |
| `result`      | JSON     | NULLABLE          | Tracked task result map                                                |
| `created_at`  | DATETIME | NOT NULL          | Creation time                                                          |
| `updated_at`  | DATETIME | NOT NULL          | Last update time                                                       |

## 3. API Endpoints

### 3.1 POST `/workflow/create`

Permission requirement: `CREATE_WORKFLOW`.

Input: workflow definition array.

Output:

```json
{
    "workflowId": "<uuid>",
    "taskId": "<root_job_id>",
    "jobIds": {
        "<taskName>": "<bullmq_job_id>"
    }
}
```

Postconditions:

1. A `workflow` row is created with `id = workflowId`.
2. The `workflow` row is created before the submitted flow is pushed to BullMQ.
3. Each BullMQ job in the flow has a job ID assigned before submission.
4. The submitted flow is pushed to BullMQ.
5. `taskId` equals the BullMQ root job ID and can be used with existing websocket task rooms (`task:{taskId}`).
6. If workflow creation fails before the API response is sent, no `workflow` row with `id = workflowId` remains in the database.

### 3.2 POST `/workflow/create/template/:name`

Input: template parameter object.

Permission model:

1. The template name must exist in `WORKFLOW_TEMPLATES_PERMISSION`.
2. If mapped permission is `null`, the endpoint is public and does not require login.
3. If mapped permission is non-null, requester must be authenticated and satisfy the mapped permission bit.

Output format is identical to section 3.1.

### 3.3 GET `/workflow/query/:id`

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
            "jobId": "<bullmq_job_id>",
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

## 4. Template Definitions

### 4.1 `article-save-pipeline`

Required input: `targetId`.

Task graph (by dependency):

1. `save` (tracked)
2. `summary` depends on `save` (tracked)
3. `censor` depends on `save` (tracked)
4. `embedding` depends on `summary`
5. `update-embedding` depends on `embedding`
6. `update-summary` depends on `summary`
7. `update-censor` depends on `censor`

Permission: public (`null` permission mapping).

### 4.2 `article-censor-pipeline`

Required input: `targetId`.

Task graph:

1. `censor` (tracked)
2. `update-censor` depends on `censor`

Permission: `CREATE_WORKFLOW`.

## 5. Status and Result Synchronization

1. Workflow completion/failure status is updated by matching queue events using `root_job_id`.
2. For tracked tasks (`track = true`), when a job includes `workflowId` and `taskName`, its return payload is merged into `workflow.result[taskName]`.
3. Result payload is normalized as:

```json
{
    "name": "<returnvalue.__name>",
    "result": "<returnvalue.__result>"
}
```

4. Status writes are monotonic with respect to terminal states.
5. If current `workflow.status` is `completed`, `failed`, or `expired`, later queue status reads or queue events MUST NOT replace it.
6. If current `workflow.status` is not terminal, a queue status read or queue event MAY replace it with the observed BullMQ state.

## 6. Invariants

1. `workflowId` is the only workflow identifier exposed in API payloads.
2. `taskId` is always present in workflow create responses and is always equal to the root BullMQ job ID.
3. Websocket tracking compatibility is preserved: clients may subscribe to `task:{taskId}` and receive `task:{taskId}:completed` / `task:{taskId}:failed` events.
4. Template permission lookup is exact-key based; missing keys are rejected as invalid templates.
