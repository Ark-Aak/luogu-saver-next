# Luogu Integration Specification

## 1. Overview

The Luogu integration handles HTTP communication with Luogu's API endpoints to fetch articles, pastes, and user information. It includes C3VK challenge handling and cookie management.

## 2. HTTP Client Configuration

### 2.1 Default Headers

All requests to Luogu include:

| Header               | Value                                      |
|----------------------|--------------------------------------------|
| `User-Agent`         | Chrome 98 on Windows 10 (see below)        |
| `Content-Type`       | `application/json; charset=UTF-8`          |
| `x-luogu-type`       | `content-only`                             |
| `x-lentille-request` | `content-only`                             |

User-Agent string:
```
Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36
```

### 2.2 Request Configuration

| Setting          | Value  | Description                              |
|------------------|--------|------------------------------------------|
| `maxRedirects`   | 0      | Do not follow redirects automatically    |
| `validateStatus` | () => true | Accept all HTTP status codes        |
| `timeout`        | config.network.timeout | Request timeout in ms     |

## 3. C3VK Challenge Handling

Luogu uses a challenge-response mechanism called C3VK to prevent automated access.

### 3.1 C3vkMode Enum

| Value    | Description                    |
|----------|--------------------------------|
| `LEGACY` | Old-style inline token         |
| `MODERN` | New-style redirect-based token |

### 3.2 Legacy C3VK Handling

**Trigger:** Response body contains pattern `C3VK=([a-zA-Z0-9]+);`

**Algorithm:**
1. Parse response body for C3VK token.
2. If found:
   a. Extract token value.
   b. Append `C3VK={token}` to Cookie header.
   c. Retry the request with updated cookies.
3. Return the final response.

### 3.3 Modern C3VK Handling

**Trigger:** Response status is 302 AND `location` header is present.

**Algorithm:**
1. Extract `Set-Cookie` headers from response.
2. Parse and merge cookies with existing cookie header.
3. Retry the original request with merged cookies.
4. Return the final response.

### 3.4 Cookie Merging

```
1. Parse existing Cookie header into key-value map.
2. For each Set-Cookie header:
   a. Extract cookie name and value (ignore attributes).
   b. Overwrite in map (new values replace old).
3. Serialize map back to Cookie header format.
```

## 4. Fetch Function

### 4.1 Signature

```typescript
async function fetch(
    url: string,
    mode: C3vkMode,
    cookie?: Record<string, string>
): Promise<any>
```

### 4.2 Flow

```
1. Build headers with defaults and optional cookies.
2. Make initial GET request.
3. If mode === LEGACY:
   a. Check for inline C3VK token.
   b. Retry if found.
4. If mode === MODERN and status === 302:
   a. Merge Set-Cookie headers.
   b. Retry request.
5. Check status:
   a. 401: Log warning, throw UnrecoverableError("Unauthorized fetch")
6. Parse response:
   a. If string, JSON.parse().
   b. Otherwise, return as-is.
7. Return parsed data.
```

### 4.3 Error Handling

| Error Code/Type  | Behavior                                   |
|------------------|--------------------------------------------|
| `ECONNABORTED`   | Throw retriable network error              |
| `ETIMEDOUT`      | Throw retriable network error              |
| `ECONNREFUSED`   | Throw retriable network error              |
| `ECONNRESET`     | Throw retriable network error              |
| timeout message  | Throw retriable network error              |
| Other errors     | Throw `UnrecoverableError`                 |
| HTTP 401         | Throw `UnrecoverableError("Unauthorized")` |
| JSON parse fail  | Throw `UnrecoverableError`                 |

Network errors are retriable by BullMQ; `UnrecoverableError` stops retries.

## 5. Luogu API Endpoints

### 5.1 Article Fetch

**URL Pattern:** `https://www.luogu.com.cn/article/{articleId}`

**Response Structure:**
```typescript
{
    currentData: {
        article: {
            lid: string;
            title: string;
            content: string;
            author: UserSummary;
            category: number;
            // ... other fields
        }
    }
}
```

### 5.2 Paste Fetch

**URL Pattern:** `https://www.luogu.com.cn/paste/{pasteId}`

**Response Structure:**
```typescript
{
    currentData: {
        paste: {
            id: string;
            data: string;
            user: UserSummary;
            // ... other fields
        }
    }
}
```

### 5.3 UserSummary Type

```typescript
interface UserSummary {
    uid: number;
    name: string;
    color: string;
}
```

## 6. User Building

### 6.1 buildUser(user: UserSummary): Partial<User>

Convert Luogu user summary to local User entity:

```typescript
{
    id: user.uid,
    name: user.name,
    color: user.color as UserColor
}
```

## 7. Task Handlers

### 7.1 ArticleHandler

**Task Type:** `save:article`

**Payload:**
```typescript
{
    target: "article",
    targetId: string,  // Article LID
    metadata: {}
}
```

**Processing:**
1. Fetch article from Luogu API.
2. Extract article data from response.
3. Build or update User entity for author.
4. Build Article entity with:
   - `id`, `title`, `content`, `category`, `tags`
   - `authorId` linked to user
   - Compute `contentHash` (SHA-256)
5. Check for existing article:
   a. If exists with same hash and title, skip.
   b. Otherwise, push new history version.
6. Save article to database.
7. Update task status to COMPLETED.

### 7.2 PasteHandler

**Task Type:** `save:paste`

**Payload:**
```typescript
{
    target: "paste",
    targetId: string,  // Paste ID
    metadata: {}
}
```

**Processing:**
1. Fetch paste from Luogu API.
2. Extract paste data from response.
3. Build or update User entity for author.
4. Build Paste entity with:
   - `id`, `content`
   - `authorId` linked to user
5. Save paste to database.
6. Update task status to COMPLETED.

## 8. Invariants

1. All Luogu API requests include the standard headers.
2. C3VK challenges are handled transparently before returning data.
3. Network timeouts result in retriable errors.
4. HTTP 401 and parse errors are unrecoverable.
5. User entities are created/updated before content entities.

## 9. File Locations

- Fetch utility: `packages/backend/src/utils/fetch.ts`
- Luogu API helpers: `packages/backend/src/utils/luogu-api.ts`
- C3VK mode enum: `packages/backend/src/shared/c3vk.ts`
- Article handler: `packages/backend/src/workers/handlers/task/article.handler.ts`
- Paste handler: `packages/backend/src/workers/handlers/task/paste.handler.ts`
