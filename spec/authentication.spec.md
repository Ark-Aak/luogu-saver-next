# Authentication System Specification

## 1. Overview

The authentication system validates API requests using Bearer tokens stored in the database. It provides middleware-based authentication for Koa applications.

## 2. Token Entity

### 2.1 Schema

Table name: `token`

| Column      | Type         | Constraints         | Description                    |
|-------------|--------------|---------------------|--------------------------------|
| `id`        | VARCHAR(32)  | PRIMARY KEY         | Token string (the bearer token)|
| `uid`       | INT UNSIGNED | UNIQUE, NOT NULL    | Associated user ID             |
| `role`      | INT UNSIGNED | NOT NULL            | User role identifier           |
| `created_at`| DATETIME     | NOT NULL, DEFAULT   | Token creation timestamp       |

### 2.2 Token Validation

The static method `Token.validate(token: string)` SHALL:

1. Query the `token` table for a record where `id` equals the provided token.
2. If a record exists, return the `uid` field value.
3. If no record exists, return `null`.

## 3. Authorization Middleware

The `authorization` middleware is applied globally to all incoming requests.

### 3.1 Behavior

For each incoming request:

1. Check if the `Authorization` header is present.
2. If present:
   - Extract the token by removing the `Bearer ` prefix.
   - Call `Token.validate(token)`.
   - If validation returns a user ID, attach it to `ctx.userId`.
3. If the header is absent or validation fails, `ctx.userId` remains `undefined`.
4. Always call `next()` to continue request processing.

### 3.2 Pseudocode

```
function authorization(ctx, next):
    if ctx.headers['authorization'] exists:
        token = ctx.headers['authorization'].replace('Bearer ', '')
        uid = await Token.validate(token)
        if uid is not null:
            ctx.userId = uid
    await next()
```

## 4. User Entity

### 4.1 Schema

Table name: `user`

| Column      | Type         | Constraints     | Description                      |
|-------------|--------------|-----------------|----------------------------------|
| `id`        | INT UNSIGNED | PRIMARY KEY     | User ID (from Luogu)             |
| `name`      | VARCHAR      | NOT NULL        | Display name                     |
| `color`     | VARCHAR      | NOT NULL        | User color/badge (UserColor enum)|
| `created_at`| DATETIME     | NOT NULL        | Record creation timestamp        |
| `updated_at`| DATETIME     | NOT NULL        | Record update timestamp          |

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

## 5. Authorization States

| `ctx.userId`  | Interpretation                     |
|---------------|------------------------------------|
| `undefined`   | Unauthenticated request            |
| `number`      | Authenticated user with given ID   |

## 6. Security Constraints

1. Tokens are stored as plaintext in the database.
2. Token validation is performed on every request with an Authorization header.
3. The middleware does NOT reject unauthenticated requests; downstream handlers must check `ctx.userId` if authentication is required.

## 7. File Locations

- Token entity: `packages/backend/src/entities/token.ts`
- User entity: `packages/backend/src/entities/user.ts`
- Authorization middleware: `packages/backend/src/middlewares/authorization.ts`
- User color enum: `packages/backend/src/shared/user.ts`
