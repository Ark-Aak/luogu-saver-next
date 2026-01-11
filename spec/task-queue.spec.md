# Task Queue System Specification

## 1. Overview

The task queue system manages asynchronous background jobs using BullMQ backed by Redis. It supports different task types with dedicated handlers and provides task status tracking.

## 2. Task Entity

### 2.1 Schema

Table name: `task`

| Column      | Type        | Constraints     | Description                    |
|-------------|-------------|-----------------|--------------------------------|
| `id`        | VARCHAR(32) | PRIMARY KEY     | Unique task ID (8-char random) |
| `info`      | TEXT        | NULLABLE        | Task result/error information  |
| `status`    | INT         | DEFAULT 0       | Task status (TaskStatus enum)  |
| `created_at`| DATETIME    | NOT NULL        | Task creation timestamp        |
| `type`      | VARCHAR     | NOT NULL        | Task type (TaskType enum)      |
| `target`    | VARCHAR     | NULLABLE        | Target identifier (e.g., "article", "paste") |
| `payload`   | JSON        | NOT NULL        | Task-specific payload data     |

### 2.2 TaskStatus Enum

| Value | Name       | Description                    |
|-------|------------|--------------------------------|
| 0     | PENDING    | Task created, not yet started  |
| 1     | PROCESSING | Task is being processed        |
| 2     | COMPLETED  | Task finished successfully     |
| 3     | FAILED     | Task failed with error         |

### 2.3 TaskType Enum

| Value        | Description                           |
|--------------|---------------------------------------|
| `save`       | Save content from Luogu              |
| `ai_process` | AI-based content processing          |

### 2.4 SaveTarget Enum

| Value      | Description                    |
|------------|--------------------------------|
| `article`  | Luogu article                  |
| `paste`    | Luogu paste                    |
| `benben`   | Luogu benben (犇犇)             |
| `judgement`| Judgement record               |
| `profile`  | User profile                   |

## 3. Task Interfaces

### 3.1 CommonTask

```typescript
interface CommonTask {
    id: string;
    type: TaskType;
    payload: {
        target: string;
        [key: string]: any;
    };
}
```

### 3.2 SaveTask

```typescript
interface SaveTask extends CommonTask {
    type: TaskType.SAVE;
    payload: {
        target: SaveTarget;
        targetId: string;
        metadata: Record<string, any>;
    };
}
```

### 3.3 AiTask

```typescript
interface AiTask extends CommonTask {
    type: TaskType.AI_PROCESS;
    payload: {
        target: string;
        metadata: Record<string, any>;
    };
}
```

## 4. API Endpoints

### 4.1 POST /task/create

Create and dispatch a new task.

**Request Body:**
```json
{
    "type": "save" | "ai_process",
    "payload": {
        "target": string,
        "targetId": string,
        ...additional fields
    }
}
```

**Validation:**
- `type` must be a valid TaskType value.
- `payload` must be an object.
- `payload.target` must be a string.

**Response:**
- 200: `{ taskId: string }`
- 400: Invalid request body or missing required fields
- 500: Server error

**Side Effects:**
1. Creates a Task record in the database.
2. Dispatches the task to the appropriate BullMQ queue.

### 4.2 GET /task/query/:id

Query task status.

**Request:**
- Path parameter: `id` (string) - Task ID

**Response:**
- 200: Task object
- 404: Task not found
- 500: Server error

## 5. Task Service

### 5.1 createTask(type, payload, target?)

1. Generate an 8-character random string as `task.id`.
2. Set `status` to `PENDING`.
3. Save the task to the database.
4. Return the created task.

### 5.2 dispatchTask(taskId)

1. Load the task from the database.
2. If task not found, throw an error.
3. Based on `task.type`:
   - `SAVE`: Add job to the save queue.
   - `AI_PROCESS`: Add job to the AI processing queue.
4. Use `task.id` as the BullMQ job ID.

### 5.3 updateTask(taskId, status, info?)

1. Update the task record with new `status`.
2. If `info` is provided, update the `info` field.

### 5.4 getTaskById(taskId)

1. Query the database for the task.
2. Return the task or null.

## 6. Queue System

### 6.1 Queue Factory

The `getQueueByType(type: TaskType)` function:
1. Map `TaskType` to a queue name using `QUEUE_NAMES` constant.
2. If the queue is not in the pool, create a new `TypedQueue` instance.
3. Return the queue from the pool.

Queue instances are cached in a global pool to prevent multiple connections.

### 6.2 Queue Cleanup

The `closeAllQueues()` function:
1. Close all queues in the pool.
2. Clear the queue pool.

## 7. Task Processor

### 7.1 Handler Registration

Handlers implement the `TaskHandler<T>` interface:

```typescript
interface TaskHandler<T extends CommonTask> {
    handle(task: T): Promise<void>;
    taskType: string;  // Format: "{type}" or "{type}:{target}"
}
```

### 7.2 Processing Flow

1. Receive job from BullMQ.
2. Extract task data from `job.data`.
3. Determine handler key: `{type}:{target}` if target exists, else `{type}`.
4. Look up registered handler.
5. If no handler found, throw `UnrecoverableError`.
6. Execute `handler.handle(task)`.

### 7.3 Registered Handlers

| Handler Key      | Handler Class    | Description                    |
|------------------|------------------|--------------------------------|
| `save:article`   | ArticleHandler   | Fetch and save Luogu article   |
| `save:paste`     | PasteHandler     | Fetch and save Luogu paste     |

## 8. Configuration

Queue behavior is controlled by `config.queue`:

| Field                 | Description                                      |
|-----------------------|--------------------------------------------------|
| `concurrencyLimit`    | Maximum concurrent jobs per worker               |
| `maxRequestToken`     | Token bucket capacity for rate limiting          |
| `regenerationSpeed`   | Tokens regenerated per interval                  |
| `regenerationInterval`| Token regeneration interval in ms                |
| `maxQueueLength`      | Maximum pending jobs in queue                    |
| `processInterval`     | Job processing interval in ms                    |

## 9. Invariants

1. Each task has a unique 8-character ID.
2. Task status transitions: PENDING -> PROCESSING -> (COMPLETED | FAILED).
3. Failed tasks are marked with `FAILED` status and error info.
4. Queue names are derived from task types via constant mapping.

## 10. File Locations

- Task entity: `packages/backend/src/entities/task.ts`
- Task types: `packages/backend/src/shared/task.ts`
- Task router: `packages/backend/src/routers/task.router.ts`
- Task service: `packages/backend/src/services/task.service.ts`
- Queue factory: `packages/backend/src/lib/queue-factory.ts`
- Task processor: `packages/backend/src/workers/task-processor.ts`
- Article handler: `packages/backend/src/workers/handlers/task/article.handler.ts`
- Paste handler: `packages/backend/src/workers/handlers/task/paste.handler.ts`
