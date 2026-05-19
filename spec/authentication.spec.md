# Authentication System Specification

## 1. Overview

The authentication system signs users in through CP OAuth only. It validates API requests using Bearer tokens stored in the database. It provides middleware-based authentication for Koa applications.

The `user` table is not an authentication table. The `user` table stores Luogu users that appear as article or paste authors. CP OAuth login SHALL NOT insert, update, or delete rows in the `user` table.

## 2. Token Entity

### 2.1 Schema

Table name: `token`

| Column       | Type         | Constraints       | Description                     |
| ------------ | ------------ | ----------------- | ------------------------------- |
| `id`         | VARCHAR(32)  | PRIMARY KEY       | Token string (the bearer token) |
| `uid`        | INT UNSIGNED | UNIQUE, NOT NULL  | Associated registered user ID   |
| `role`       | INT UNSIGNED | NOT NULL          | User role identifier            |
| `created_at` | DATETIME     | NOT NULL, DEFAULT | Token creation timestamp        |

### 2.2 Token Validation

The static method `Token.validate(token: string)` SHALL:

1. Query the `token` table for a record where `id` equals the provided token.
2. If a record exists, return `[uid, role]`.
3. If no record exists, return an empty array.

## 3. Authorization Middleware

The `authorization` middleware is applied globally to all incoming requests.

### 3.1 Behavior

For each incoming request:

1. Check if the `Authorization` header is present.
2. If present:
    - Extract the token by removing the `Bearer ` prefix.
    - Call `Token.validate(token)`.
    - If validation returns a non-empty array, attach `{ id: uid, role }` to `ctx.user`.
3. If the header is absent or validation fails, `ctx.user` remains `undefined`.
4. Always call `next()` to continue request processing.

### 3.2 Pseudocode

```
function authorization(ctx, next):
    if ctx.headers['authorization'] exists:
        token = ctx.headers['authorization'].replace('Bearer ', '')
        data = await Token.validate(token)
        if data is not empty:
            ctx.user = { id: data[0], role: data[1] }
    await next()
```

## 4. Article Display User Entity

### 4.1 Schema

Table name: `user`

This table is used for article and paste author display only. It is populated from Luogu content data during save tasks. Authentication code SHALL NOT write to this table.

| Column       | Type         | Constraints | Description                       |
| ------------ | ------------ | ----------- | --------------------------------- |
| `id`         | INT UNSIGNED | PRIMARY KEY | User ID (from Luogu)              |
| `name`       | VARCHAR      | NOT NULL    | Display name                      |
| `color`      | VARCHAR      | NOT NULL    | User color/badge (UserColor enum) |
| `created_at` | DATETIME     | NOT NULL    | Record creation timestamp         |
| `updated_at` | DATETIME     | NOT NULL    | Record update timestamp           |

### 4.2 UserColor Enum

```
Gray    - Default/unrated
Blue    - Rated user
Green   - Higher rated user
Orange  - Expert user
Red     - Master user
Purple  - Admin user
Cheater - Flagged user
```

### 4.3 Caching

The `User.findById(id)` method is cached for 3 days (259200 seconds) with key pattern `user:${id}`.

UserService cached read methods SHALL bypass Redis cache reads and writes when an optional `manager` argument is provided.
UserService read/write methods that accept an optional `manager` argument SHALL use that `EntityManager` for database access when it is provided.

### 4.4 Luogu User Upsert

The `UserService.upsertLuoguUser(data)` method SHALL:

1. Throw an error if `data.id` is `undefined`.
2. Use `data.id` as the unique user key.
3. Insert a user row when no row exists for `data.id`.
4. Update the existing row when a row exists for `data.id`.
5. Execute as one database upsert operation so concurrent saves for the same user do not fail with a duplicate primary-key error.
6. After a successful upsert, evict Redis cache key `user:{data.id}`.

## 5. Registered User Entity

Table name: `registered_user`

This table stores users that can log in to Luogu Saver Next.

| Column         | Type         | Constraints      | Description                |
| -------------- | ------------ | ---------------- | -------------------------- |
| `id`           | INT UNSIGNED | PRIMARY KEY      | Local registered user ID   |
| `cp_oauth_sub` | VARCHAR(128) | UNIQUE, NOT NULL | CP OAuth subject claim     |
| `luogu_uid`    | INT UNSIGNED | UNIQUE, NOT NULL | Linked Luogu user ID       |
| `name`         | VARCHAR      | NOT NULL         | Display name from CP OAuth |
| `avatar_url`   | VARCHAR      | NULL             | Avatar URL from CP OAuth   |
| `created_at`   | DATETIME     | NOT NULL         | Record creation timestamp  |
| `updated_at`   | DATETIME     | NOT NULL         | Record update timestamp    |

### 5.1 CP OAuth Registered User Upsert

The `RegisteredUserService.upsertCpOAuthUser(data)` method SHALL:

1. Require `data.cpOAuthSub` to be a non-empty string.
2. Require `data.luoguUid` to be a positive integer.
3. If a row exists where `luogu_uid=data.luoguUid` and `cp_oauth_sub != data.cpOAuthSub`, reject the operation and do not modify that row.
4. If a concurrent insert creates a row where `luogu_uid=data.luoguUid` and `cp_oauth_sub != data.cpOAuthSub`, reject the operation.
5. Store `data.luoguUid` in `registered_user.luogu_uid`.
6. Store `data.name` as the display name. If `data.name` is empty, store `User {luoguUid}`.
7. Store `data.avatarUrl` when it is present. Store `NULL` when it is absent.
8. Insert a registered user row when no row exists for `data.cpOAuthSub`.
9. Update the existing registered user row when a row exists for `data.cpOAuthSub`.
10. Return the row after the insert or update.
11. Not read or write the `user` table.

## 6. CP OAuth Login

### 6.1 Configuration

The `auth.cpOAuth` configuration object SHALL contain:

| Field                 | Type     | Default                                                    | Description                                                                                       |
| --------------------- | -------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `discoveryUrl`        | string   | `https://www.cpoauth.com/.well-known/openid-configuration` | OpenID Connect discovery document URL                                                             |
| `clientId`            | string   | empty string                                               | CP OAuth client ID                                                                                |
| `clientSecret`        | string   | empty string                                               | CP OAuth client secret for confidential clients                                                   |
| `redirectUri`         | string   | empty string                                               | Backend callback URL registered at CP OAuth                                                       |
| `frontendRedirectUri` | string   | `/auth/callback`                                           | Frontend URL receiving the issued local token. It may be an absolute URL or a root-relative path. |
| `scopes`              | string[] | `['openid', 'profile', 'link:luogu']`                      | Scopes requested from CP OAuth                                                                    |
| `stateExpireSeconds`  | number   | 600                                                        | Redis TTL for OAuth state and PKCE verifier                                                       |

### 6.2 GET /auth/cp/login

Start the CP OAuth authorization code flow.

**Request:**

- Query parameter: `redirect` (string, optional) - Frontend path used after login. If absent, use `/`.

**Behavior:**

1. If `auth.cpOAuth.clientId` is empty, return 500.
2. If `auth.cpOAuth.redirectUri` is empty, return 500.
3. Fetch the CP OAuth discovery document from `discoveryUrl`.
4. Generate `state` as at least 128 bits of random data encoded as hex.
5. Generate a PKCE `code_verifier` as at least 256 bits of random data encoded as base64url.
6. Compute `code_challenge = BASE64URL(SHA256(code_verifier))`.
7. Store JSON `{ codeVerifier, redirect }` in Redis key `auth:cp:state:{state}` with TTL `stateExpireSeconds`.
8. Redirect to the discovered `authorization_endpoint` with these query parameters:
    - `response_type=code`
    - `client_id=auth.cpOAuth.clientId`
    - `redirect_uri=auth.cpOAuth.redirectUri`
    - `scope=auth.cpOAuth.scopes` joined by a single space
    - `state=state`
    - `code_challenge=code_challenge`
    - `code_challenge_method=S256`

### 6.3 GET /auth/cp/callback

Complete the CP OAuth authorization code flow.

**Request:**

- Query parameter: `code` (string, required)
- Query parameter: `state` (string, required)
- Query parameter: `error` (string, optional)

**Behavior:**

1. If `frontendRedirectUri` is an absolute URL, preserve its origin, path, and existing query parameters when appending callback query parameters.
2. If `frontendRedirectUri` is a root-relative path, redirect to that path with appended callback query parameters.
3. If `error` is present, redirect to `frontendRedirectUri` with query parameters `error` and `message`.
4. If `code` or `state` is absent, redirect to `frontendRedirectUri` with `error=invalid_request`.
5. Atomically read and delete Redis key `auth:cp:state:{state}` in one Redis command.
6. If no state data exists, redirect to `frontendRedirectUri` with `error=invalid_state`.
7. The callback SHALL NOT exchange the authorization code unless the atomic read-and-delete operation returned state data.
8. Exchange `code` at the discovered `token_endpoint` using JSON request body:
    - `grant_type=authorization_code`
    - `code=code`
    - `redirect_uri=auth.cpOAuth.redirectUri`
    - `client_id=auth.cpOAuth.clientId`
    - `code_verifier=stored codeVerifier`
    - `client_secret=auth.cpOAuth.clientSecret` only when non-empty
9. Require a string `access_token` in the token response.
10. Fetch the discovered `userinfo_endpoint` with header `Authorization: Bearer {access_token}`.
11. Require a non-empty string `sub` in the userinfo response.
12. Require `linked_accounts` to contain an object with `platform='luogu'` and numeric `platformUid`.
13. Upsert a registered user using:
    - `cpOAuthSub = sub`
    - `luoguUid = Number(platformUid)`
    - `name = platformUsername` when present, otherwise `display_name`, otherwise `username`, otherwise `User {luoguUid}`
    - `avatarUrl = avatar_url` when present
14. The callback SHALL NOT write to the `user` table.
15. Get or create a local token where `uid` equals `registered_user.id` using insert-if-absent semantics on unique column `token.uid`.
16. If concurrent callbacks for the same `registered_user.id` attempt token creation, all successful callbacks SHALL return the token row stored for that `uid` and SHALL NOT fail due to a duplicate `token.uid` key.
17. Redirect to `frontendRedirectUri` with query parameters:
    - `token=local token`
    - `uid=registered user ID`
    - `role=local role`
    - `redirect=stored redirect`

### 6.4 GET /auth/me

Return the authenticated local user.

**Response:**

- 200: `{ uid, role, registeredUser }` when `ctx.user` exists.
- 401: `Unauthorized` when `ctx.user` does not exist.

## 7. Authorization States

| `ctx.user`   | Interpretation                      |
| ------------ | ----------------------------------- |
| `undefined`  | Unauthenticated request             |
| `{id, role}` | Authenticated user with ID and role |

## 8. Security Constraints

1. Tokens are stored as plaintext in the database.
2. Token validation is performed on every request with an Authorization header.
3. The middleware does NOT reject unauthenticated requests; downstream handlers must check `ctx.user` if authentication is required.
4. CP OAuth state values are single-use because the callback atomically reads and deletes the Redis state key before token exchange.
5. CP OAuth login SHALL NOT accept a CP OAuth user without a linked Luogu account.
6. CP OAuth login SHALL NOT mutate the article display `user` table.

## 9. File Locations

- Token entity: `packages/backend/src/entities/token.ts`
- User entity: `packages/backend/src/entities/user.ts`
- Registered user entity: `packages/backend/src/entities/registered-user.ts`
- Authorization middleware: `packages/backend/src/middlewares/authorization.ts`
- User color enum: `packages/backend/src/shared/user.ts`
- Registered user service: `packages/backend/src/services/registered-user.service.ts`
- CP OAuth service: `packages/backend/src/services/auth.service.ts`
- Auth router: `packages/backend/src/routers/auth.router.ts`
