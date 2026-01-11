# Recommendation System Specification

## 1. Overview

The recommendation system provides personalized article recommendations using a hybrid approach combining vector similarity, title matching, view history, and popularity metrics. It supports both anonymous users (via device ID) and authenticated users.

## 2. Components

### 2.1 Vector Service

The `VectorService` interfaces with ChromaDB for vector-based similarity search.

#### getVector(articleId: string): Promise<number[] | null>

1. If Chroma is disabled (`config.chroma.enable = false`), return empty array.
2. Query Chroma collection for the article's embedding.
3. Return the embedding vector or null if not found.

#### getNearestVectors(embedding: number[], n: number): Promise<QueryResult>

1. If Chroma is disabled, return empty results `{ ids: [[]], distances: [[]] }`.
2. If embedding is empty, return empty results.
3. Query Chroma for n nearest neighbors.
4. Return IDs and distances.

### 2.2 Recommendation Service

The `RecommendationService` provides recommendation algorithms.

## 3. Anonymous Behavior Tracking

### 3.1 Data Structure

Anonymous user behavior is stored in Redis sorted sets:

- Key: `anon_behavior:{deviceId}`
- Score: Unix timestamp in milliseconds
- Member: Article ID

### 3.2 recordAnonymousBehavior(deviceId, articleId)

1. Add `(timestamp, articleId)` to sorted set `anon_behavior:{deviceId}`.
2. Trim set to keep only the most recent `config.recommendation.anonymous.maxCount` entries.
3. Set TTL to `config.recommendation.anonymous.expireTime` seconds.

### 3.3 recordRecommendedArticles(deviceId, articleIds)

1. Add all article IDs with current timestamp to `anon_recommendations:{deviceId}`.
2. Trim to `config.recommendation.anonymous.maxCount` entries.
3. Set TTL to 3 hours (10800 seconds).

### 3.4 getRecommendedArticles(deviceId)

Return all article IDs from `anon_recommendations:{deviceId}`.

## 4. User Profile Vector

### 4.1 drawProfile(articles: string[]): Promise<number[]>

Compute a weighted average vector from a list of article IDs.

**Algorithm:**

```
1. For each article in articles:
   a. Fetch the embedding vector from Chroma.
   b. If vector exists, add to validItems.
2. If no valid items, return empty array.
3. Initialize profile vector of same dimension as embeddings.
4. For i = 0 to validItems.length - 1:
   a. factor = decayFactor^i  (where decayFactor = config.recommendation.decayFactor)
   b. profile += validItems[i].vector * factor
5. Normalize: profile /= validItems.length
6. Return profile.
```

The decay factor gives higher weight to more recent articles.

## 5. API Endpoints

### 5.1 GET /plaza/get

Get personalized recommendations for the plaza page.

**Request:**
- Query parameter: `count` (number, optional) - Number of recommendations (default: 10)
- Header: `X-Device-Id` (string) - Anonymous device identifier

**Response:**
- 200: Array of recommended articles with `reason` field
- 501: Not implemented (for authenticated users)

**Response Fields per Article:**

| Field      | Type     | Description                    |
|------------|----------|--------------------------------|
| `id`       | string   | Article ID                     |
| `title`    | string   | Article title                  |
| `summary`  | string   | First 100 characters of content|
| `author`   | User     | Author information             |
| `updatedAt`| Date     | Last update timestamp          |
| `category` | number   | Article category               |
| `tags`     | string[] | Article tags                   |
| `reason`   | string   | Recommendation source          |

**Reason Values:**

| Value    | Description                              |
|----------|------------------------------------------|
| `vector` | Vector similarity recommendation         |
| `random` | Random selection                         |
| `hot`    | High view count                          |
| `title`  | Title similarity to source article       |
| `other`  | Other/fallback source                    |

### 5.2 GET /article/relevant/:id

Get articles relevant to a specific article.

**Request:**
- Path parameter: `id` (string) - Article ID

**Response:**
- 200: Array of relevant articles with `reason` field

## 6. Recommendation Algorithms

### 6.1 getAnonymousRecommendations(deviceId, count)

**Algorithm:**

```
1. Fetch recent behavior: article IDs from anon_behavior:{deviceId}
2. Compute user profile vector from behavior using drawProfile()
3. Get candidate pools:
   a. vectorResults: count*5 nearest articles to profile vector
   b. randomResults: 20 random recent articles
   c. hotResults: 50 articles ordered by view count
4. Merge all candidates
5. Shuffle randomly
6. Filter out:
   a. Already read articles (from behavior)
   b. Previously recommended articles
7. Take first `count` articles
8. Fetch full article data
9. Record recommended articles
10. Add reason field based on source pool
11. Return filtered fields
```

### 6.2 getRelevantArticle(articleId, fromVector)

**Algorithm:**

```
1. Get similar articles via vector search (fromVector * 3)
2. Get source article's author
3. Get all articles by the same author
4. For each author article:
   a. Compute title similarity (string-similarity library)
   b. If similarity >= config.recommendation.relevantThreshold:
      Add to titleSimilarIds and finalResult
5. Append vector-similar articles (up to fromVector) to finalResult
6. Fetch full article data
7. Add reason field: "title" or "vector"
8. Return filtered fields
```

### 6.3 getSimilarArticles(id, count)

1. Get the article's embedding vector.
2. If no vector, return empty array.
3. Query Chroma for `count + 1` nearest neighbors.
4. Filter out the source article ID.
5. Return first `count` IDs.

## 7. Configuration

| Field                          | Description                                      |
|--------------------------------|--------------------------------------------------|
| `recommendation.anonymous.expireTime` | TTL for anonymous behavior data (seconds)  |
| `recommendation.anonymous.maxCount`   | Max behavior records per device            |
| `recommendation.maxHistory`           | Max history for profile calculation        |
| `recommendation.decayFactor`          | Weight decay for profile vectors (0-1)     |
| `recommendation.relevantThreshold`    | Min title similarity for matching (0-1)    |

## 8. Invariants

1. Anonymous recommendations exclude previously viewed and recommended articles.
2. Vector search requires Chroma to be enabled; otherwise returns empty results.
3. Profile vectors are normalized by the number of valid articles.
4. Recent articles have higher weight in profile calculation.
5. Title similarity uses the `string-similarity` library's `compareTwoStrings` function.

## 9. File Locations

- Recommendation service: `packages/backend/src/services/recommendation.service.ts`
- Vector service: `packages/backend/src/services/vector.service.ts`
- Plaza router: `packages/backend/src/routers/plaza.router.ts`
- Configuration: `packages/backend/src/config/schemas/business.ts`
