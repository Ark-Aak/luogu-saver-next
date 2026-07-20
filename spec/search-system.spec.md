# Search System Specification

## 1. Scope

This specification defines article full-text search behavior implemented under `packages/backend`.

The search system uses Meilisearch as the full-text index. Article database rows remain the source of truth. The Meilisearch index is a derived cache that can be rebuilt from the database.

## 2. Configuration

The `meilisearch` configuration object SHALL contain:

| Field              | Type    | Default                 | Description                    |
| ------------------ | ------- | ----------------------- | ------------------------------ |
| `enable`           | boolean | `false`                 | Whether Meilisearch is enabled |
| `host`             | string  | `http://127.0.0.1:7700` | Meilisearch server URL         |
| `apiKey`           | string  | empty string            | Meilisearch API key            |
| `articleIndexName` | string  | `lgs_articles`          | Article index name             |

If `enable=false`, search APIs SHALL return an empty result set and index update tasks SHALL complete without writing to Meilisearch.

## 3. Article Search Document

The article index primary key SHALL be `id`.

Each indexed document SHALL have this shape:

| Field        | Type     | Source                                |
| ------------ | -------- | ------------------------------------- |
| `id`         | string   | `article.id`                          |
| `title`      | string   | `article.title`                       |
| `content`    | string   | `article.content`                     |
| `summary`    | string   | `article.summary` or empty string     |
| `authorId`   | number   | `article.authorId`                    |
| `authorName` | string   | `article.author.name` or empty string |
| `category`   | number   | `article.category`                    |
| `tags`       | string[] | `article.tags`                        |
| `updatedAt`  | number   | `article.updatedAt.getTime()`         |
| `viewCount`  | number   | `article.viewCount`                   |
| `priority`   | number   | `article.priority`                    |

Deleted articles SHALL NOT be indexed.

## 4. Index Settings

When `SearchService.ensureArticleIndex()` is called and `enable=true`, the service SHALL ensure these settings:

1. Primary key: `id`.
2. Searchable attributes in order: `title`, `summary`, `content`, `authorName`, `tags`.
3. Filterable attributes: `category`, `authorId`, `tags`.
4. Sortable attributes: `updatedAt`, `viewCount`, `priority`.

## 5. Search API

### 5.1 GET `/search/articles`

Input query parameters:

| Parameter  | Type   | Required | Default | Constraint            |
| ---------- | ------ | -------- | ------- | --------------------- |
| `q`        | string | no       | empty   | Trimmed before use    |
| `page`     | number | no       | 1       | Minimum 1             |
| `limit`    | number | no       | 10      | Minimum 1, maximum 50 |
| `category` | number | no       | absent  | Exact filter          |
| `authorId` | number | no       | absent  | Exact filter          |

Response data shape:

```json
{
    "hits": [],
    "page": 1,
    "limit": 10,
    "total": 0,
    "processingTimeMs": 0
}
```

Postconditions:

1. If `meilisearch.enable=false`, return `hits=[]`, `total=0`, `processingTimeMs=0`.
2. If `q` is empty and filters are absent, return recent indexed articles sorted by `updatedAt:desc`.
3. If `q` is non-empty, search indexed articles by Meilisearch default ranking.
4. The response SHALL not include raw `content`.
5. Every returned `summary` string SHALL be at most 220 Unicode code points. If truncation occurs, append `...`.
6. Every returned `formatted.summary` string SHALL be at most 260 Unicode code points excluding `<mark>` and `</mark>` tags. If truncation occurs, append `...` after any open mark tag is closed.

## 6. Workflow Integration

### 6.1 Article Save Pipeline Index Update

The workflow template `article-save-pipeline` SHALL include task `update-search-index`.

Task `update-search-index` SHALL:

1. Have type `update`.
2. Have target `search_index`.
3. Have `targetId` equal to the saved article ID.
4. Depend on task `update-summary`.
5. Set `track=true`.
6. Set `report=true`.

Because `update-search-index` depends on `update-summary`, Meilisearch article indexing SHALL occur only after summary generation and summary persistence both succeed.

### 6.2 Search Reindex Pipeline

The workflow template `search-reindex-pipeline` SHALL include exactly one task named `reindex-search`.

Input parameter:

| Parameter   | Type   | Required | Default | Constraint            |
| ----------- | ------ | -------- | ------- | --------------------- |
| `batchSize` | number | no       | 100     | Integer in `[1, 500]` |

Task `reindex-search` SHALL:

1. Have type `update`.
2. Have target `search_reindex`.
3. Have `targetId='articles'`.
4. Have `metadata.batchSize` equal to normalized `batchSize`.
5. Set `track=true`.
6. Set `report=true`.
7. Require permission `MANAGE_SEARCH`.

## 7. Update Handlers

### 7.1 `update:search_index`

1. Load the article by `targetId` with author relation.
2. If the article does not exist, fail permanently.
3. If the article is deleted, delete the document with the same ID from Meilisearch and complete.
4. If the article exists and is not deleted, upsert one article search document.
5. Return `{ indexed: true, articleId }` when an upsert is executed.
6. Return `{ indexed: false, articleId }` when `meilisearch.enable=false` or the article is deleted.

### 7.2 `update:search_reindex`

1. If `meilisearch.enable=false`, return `{ indexed: 0 }`.
2. Delete all existing documents from the configured article index and wait for deletion completion.
3. Load non-deleted articles from the database in ascending `(updatedAt, id)` order.
4. Use keyset pagination with the last `(updatedAt, id)` pair from the previous batch; do not use SQL `OFFSET`.
5. Upsert articles into Meilisearch in batches.
6. Wait for each Meilisearch document addition task to finish before loading the next batch.
7. Return `{ indexed: number }` where `number` is the count of documents accepted by Meilisearch.

## 8. Search Task

Task type `search` is available for workflow pipelines.

### 8.1 `search:article`

Payload shape:

```json
{
    "type": "search",
    "payload": {
        "target": "article",
        "query": "text",
        "metadata": {
            "limit": 5,
            "category": 1,
            "authorId": 1
        }
    }
}
```

Behavior:

1. Use `payload.query` as the search query.
2. If `payload.query` is absent, use upstream `data.text` from the first father task that returns text.
3. Use `metadata.limit` as the number of hits. If absent, use 5. Clamp the value to `[1, 100]`.
4. Use optional `metadata.category` and `metadata.authorId` as filters.
5. Return `{ hits, total }` where `hits` has the same item shape as `GET /search/articles`.
6. Set `query` on each hit to the text query used by the task.
7. Set `source='keyword'` on each hit.
8. If any father task has `skipNextStep=true`, return `{ hits: [], total: 0 }` with `skipNextStep=true`.

### 8.2 `search:vector`

Payload shape:

```json
{
    "type": "search",
    "payload": {
        "target": "vector",
        "metadata": {
            "limit": 10
        }
    }
}
```

Behavior:

1. Read `embedding` from the first father task whose result has `data.embedding` as an array.
2. Use `metadata.limit` as the number of distinct article hits. If absent, use 10. Clamp the value to `[1, 100]`.
3. Query Chroma by `EmbeddingService.getNearestArticleCandidates(embedding, limit, rawLimit)` where `rawLimit` defaults to 500.
4. Return `{ hits, total }` where each hit has `{ id, distance, score, source, vectorId, vectorKind }` and may include chunk metadata.
5. Set `source` to `vector`.
6. Set `score=max(0, 1 - distance)`.
7. Set `query` on each hit to the text query used to produce the embedding, if present in the embedding task result.
8. If any father task has `skipNextStep=true`, return `{ hits: [], total: 0 }` with `skipNextStep=true`.

## 9. RAG Tasks

Task type `rag` is available for workflow pipelines.

### 9.1 `rag:context`

Behavior:

1. Read the user question from father task `read-query.data.text` or the first father result with `data.text`.
2. Read keyword hits from father results with `data.hits` where hits contain article search fields.
3. Read vector hits from father results with `data.hits` where hits contain `source='vector'`.
4. Merge hits by article ID.
5. Fold all hits into at most `config.rag.candidateArticleLimit` distinct article candidates.
6. Score each candidate using keyword score, vector score, and rerank score.
7. Keyword score SHALL be normalized from rank as `1 / (rank + 1)`.
8. Vector score SHALL be `max(0, 1 - distance)` from the best summary or chunk hit for the article.
9. The handler SHALL load all forced and candidate articles with one `WHERE id IN (...)` database query.
10. The handler SHALL call standard rerank API through the LLM rerank scenario when configured, using the batch-loaded article map.
11. Final score SHALL be `keywordScore * keywordWeight + vectorScore * vectorWeight + rerankScore * rerankWeight`.
12. If rerank is not configured or fails, rerankScore SHALL be `0` and candidate ordering SHALL still complete.
13. Include each distinct non-empty query string in the returned document's `queries` array.
14. Select at most `metadata.maxArticles` articles. If absent, use 10. Clamp to `[1, 10]`.
15. Build `data.text` as XML-like context containing the question and selected documents.
16. The total context text SHALL be at most `metadata.maxChars` characters. If absent, use 20000. Clamp to `[1000, 20000]`.
17. Return `{ text, documents }`.

### 9.2 `rag:answer`

Behavior:

1. Read context text from the first father result with `data.text`.
2. Read documents from the first father result with `data.documents`.
3. Call the chat LLM scenario with a prompt that requires the answer to be based only on provided documents.
4. If the answer cannot be determined from documents, state that the existing material cannot determine the answer.
5. Return `{ text, documents }`.

## 10. Read Tasks

Task type `read` is available for workflow pipelines.

### 10.1 `read:text`

Return `{ text }` where `text` equals `payload.metadata.text`.

### 10.2 `read:planned_query`

1. Read `payload.metadata.queryIndex` as integer `i`. If absent, use 0.
2. Read `data.queries[i]` from the first father result that contains a `queries` array.
3. If no query exists at index `i`, return `{ text: '', queryIndex: i }` with `skipNextStep=true`.
4. If a query exists at index `i`, return `{ text: query, queryIndex: i }` with `skipNextStep=false`.
5. The value of `query` MAY be a long natural-language retrieval text and SHALL NOT be required to be a short keyword phrase.

### 10.3 `read:article`

Load an article by `payload.targetId` and return `{ id, title, summary, content, text, authorId, authorName, category, tags }`.

### 10.4 `read:paste`

Load a paste by `payload.targetId` and return `{ id, content, text }`.

## 11. File Locations

- Search service: `packages/backend/src/services/search.service.ts`
- Search router: `packages/backend/src/routers/search.router.ts`
- Update handlers: `packages/backend/src/workers/handlers/task/update/*.handler.ts`
- Search handlers: `packages/backend/src/workers/handlers/task/search/*.handler.ts`
- RAG handlers: `packages/backend/src/workers/handlers/task/rag/*.handler.ts`
- Read handlers: `packages/backend/src/workers/handlers/task/read/*.handler.ts`
- Workflow templates: `packages/backend/src/lib/workflow-templates.ts`
- Search configuration: `packages/backend/src/config/schemas/infrastructure.ts`
