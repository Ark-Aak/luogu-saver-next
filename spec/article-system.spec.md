# Article System Specification

## 1. Overview

The article system manages articles archived from Luogu. It provides storage, retrieval, caching, history tracking, and content rendering.

## 2. Article Entity

### 2.1 Schema

Table name: `article`

| Column           | Type          | Constraints                | Description                          |
|------------------|---------------|----------------------------|--------------------------------------|
| `id`             | VARCHAR(8)    | PRIMARY KEY                | Article ID (Luogu LID)               |
| `title`          | VARCHAR       | NOT NULL                   | Article title                        |
| `content`        | MEDIUMTEXT    | NOT NULL                   | Markdown content                     |
| `author_id`      | INT UNSIGNED  | NOT NULL, FK -> user.id    | Author user ID                       |
| `category`       | INT           | NOT NULL                   | Article category (ArticleCategory)   |
| `upvote`         | INT           | DEFAULT 0                  | Upvote count                         |
| `favor_count`    | INT           | DEFAULT 0                  | Favorite count                       |
| `solution_for_pid`| VARCHAR(50)  | NULLABLE                   | Problem ID if this is a solution     |
| `priority`       | INT           | DEFAULT 0                  | Display priority                     |
| `deleted`        | TINYINT       | DEFAULT 0                  | Soft delete flag                     |
| `tags`           | JSON          | NOT NULL                   | Array of tag strings                 |
| `created_at`     | DATETIME      | NOT NULL                   | Record creation timestamp            |
| `updated_at`     | DATETIME      | NOT NULL                   | Record update timestamp              |
| `delete_reason`  | VARCHAR       | NULLABLE                   | Reason for deletion                  |
| `content_hash`   | VARCHAR       | NULLABLE                   | SHA-256 hash of content              |
| `view_count`     | INT           | DEFAULT 0                  | View count                           |

### 2.2 Indexes

- `idx_articles_author`: (`author_id`)
- `idx_articles_deleted_priority_updated_at`: (`deleted`, `priority`, `updated_at`)
- `idx_articles_deleted_view_count`: (`deleted`, `view_count`)
- `idx_created_at`: (`created_at`)
- `idx_priority`: (`priority`)
- `idx_updated_at`: (`updated_at`)

### 2.3 ArticleCategory Enum

| Value | Name       | Description           |
|-------|------------|-----------------------|
| 1     | RECORD     | Competition records   |
| 2     | SOLUTION   | Problem solutions     |
| 3     | TECHNOLOGY | Technical articles    |
| 4     | ALGORITHM  | Algorithm tutorials   |
| 5     | LIFE       | Life/personal         |
| 6     | STUDY      | Study notes           |
| 7     | AMUSEMENT  | Entertainment         |
| 8     | GOSSIP     | Discussion/chat       |

## 3. Article History Entity

### 3.1 Schema

Table name: `article_history`

| Column      | Type        | Constraints     | Description                    |
|-------------|-------------|-----------------|--------------------------------|
| `id`        | INT         | PRIMARY KEY, AI | Auto-increment ID              |
| `articleId` | VARCHAR(8)  | NOT NULL        | Reference to article.id        |
| `version`   | INT         | NOT NULL        | Version number (1-indexed)     |
| `title`     | VARCHAR     | NOT NULL        | Title at this version          |
| `content`   | MEDIUMTEXT  | NOT NULL        | Content at this version        |
| `created_at`| DATETIME    | NOT NULL        | Version creation timestamp     |

### 3.2 Indexes

- `idx_article_id_version`: (`articleId`, `version`)

## 4. API Endpoints

### 4.1 GET /article/query/:id

Retrieve a single article by ID.

**Request:**
- Path parameter: `id` (string) - Article ID

**Response:**
- 200: Article object with rendered content
- 403: If `deleted = true`, returns `deleteReason` as error message
- 404: Article not found
- 500: Server error

**Side Effects:**
- Tracks `VIEW_ARTICLE` event if tracking is enabled

### 4.2 GET /article/relevant/:id

Get articles relevant to the specified article.

**Request:**
- Path parameter: `id` (string) - Article ID

**Response:**
- 200: Array of relevant articles with `reason` field
- 500: Server error

### 4.3 GET /article/history/:id

Get version history of an article.

**Request:**
- Path parameter: `id` (string) - Article ID

**Response:**
- 200: Array of `ArticleHistory` entries ordered by version ASC
- 500: Server error

### 4.4 GET /article/recent

Get recently updated articles.

**Request:**
- Query parameters:
  - `count` (number, optional): Maximum articles to return (default: 20, max: 100)
  - `updated_after` (string, optional): ISO date string to filter articles updated after
  - `truncated_count` (number, optional): Max content length (default: 200, max: 600)

**Response:**
- 200: Array of articles with truncated content
- 500: Server error

### 4.5 GET /article/count

Get total count of non-deleted articles.

**Response:**
- 200: `{ count: number }`
- 500: Server error

## 5. Service Layer

### 5.1 ArticleService

| Method                          | Cache TTL | Cache Key Pattern                              |
|---------------------------------|-----------|------------------------------------------------|
| `getArticleById(id)`            | 600s      | `article:${id}`                                |
| `getRecentArticles(count, after)`| 600s     | `article:recent:${count}:${after?.getTime()}` |
| `getArticleCount()`             | 600s      | `article:count`                                |
| `saveArticle(article)`          | evicts    | `article:${id}`, `article:count`              |

### 5.2 ArticleHistoryService

| Method                              | Cache TTL | Cache Key Pattern            |
|-------------------------------------|-----------|------------------------------|
| `getHistoryByArticleId(articleId)`  | 600s      | `article_history:${articleId}`|
| `pushNewVersion(articleId, ...)`    | evicts    | `article_history:${articleId}`|

### 5.3 Version Management

When `pushNewVersion` is called:
1. Query the latest history entry for the article (ordered by version DESC).
2. Calculate `newVersion = latestVersion + 1` (or 1 if no history exists).
3. Create and save a new `ArticleHistory` record.
4. Evict the history cache.

## 6. Content Rendering

The `article.renderContent()` method:
1. If `content` is non-empty, render Markdown to HTML using the `renderMarkdown` library.
2. Store the result in `article.renderedContent`.

## 7. Content Hashing

When saving an article:
1. Compute `SHA-256(content)` as hex string.
2. Compare with existing `contentHash`.
3. If hashes match AND titles match, skip the update.
4. Otherwise, save the new content and update `contentHash`.

## 8. Invariants

1. `version` numbers are strictly monotonically increasing per article.
2. Non-deleted articles (`deleted = false`) are returned in queries unless explicitly filtered.
3. All article queries include the `author` relation.
4. Content truncation preserves UTF-8 character boundaries.

## 9. File Locations

- Article entity: `packages/backend/src/entities/article.ts`
- Article history entity: `packages/backend/src/entities/article-history.ts`
- Article router: `packages/backend/src/routers/article.router.ts`
- Article service: `packages/backend/src/services/article.service.ts`
- Article history service: `packages/backend/src/services/article-history.service.ts`
- Article category enum: `packages/backend/src/shared/article.ts`
