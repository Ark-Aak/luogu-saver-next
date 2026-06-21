# API Middleware Specification

## 1. Overview

The API middleware subsystem applies HTTP request preprocessing and postprocessing before route handlers execute.

## 2. Access Logging

For every HTTP request, after authorization middleware has completed, the system SHALL write exactly one info-level log entry.

The client IP address SHALL be Koa `ctx.ip`.

The client IP resolution rule SHALL NOT read request header `cf-connecting-ip`, request header `x-forwarded-for`, or any other forwarding header.

The access log entry SHALL include:

1. Client IP address as `ip`.
2. Authenticated user ID as `userId` if authentication succeeded; otherwise `null`.
3. HTTP method as `method`.
4. Request path as `path`.
5. HTTP response status as `status`.

The access log entry SHALL NOT include request body, response body, authorization header, cookie header, or query parameter values.

## 3. API Rate Limiting

If `config.apiRateLimit.enabled` is `true`, every HTTP request SHALL be checked by a Redis-backed rate limiter before router execution.

The rate limit key SHALL be the client IP address resolved by the rule set in section 2.

If the request is within the configured limit, request processing SHALL continue.

If the request exceeds the configured limit, the server SHALL return HTTP 200 with response body `{ code: 429, message: 'Too Many Requests', data: null }`.

The rate limiter SHALL NOT read or store the request body.

## 4. Middleware Order

The middleware order SHALL satisfy these constraints:

1. Access log middleware SHALL wrap the HTTP middleware chain and write the log entry after downstream middleware returns or is handled by response helper middleware.
2. Response helper middleware SHALL execute before API rate limiting.
3. Authorization middleware SHALL execute before the access log entry is written.
4. API rate limiting SHALL execute before request body parsing.
5. Route handlers SHALL execute after response helper, authorization, API rate limiting, and request body parsing.

## 5. File Locations

- Entry point: `packages/backend/src/index.ts`
- Client IP helper: `packages/backend/src/middlewares/client-ip.ts`
- Access log middleware: `packages/backend/src/middlewares/access-log.ts`
- API rate limit middleware: `packages/backend/src/middlewares/api-rate-limit.ts`
- Response helper middleware: `packages/backend/src/middlewares/response.ts`
- Authorization middleware: `packages/backend/src/middlewares/authorization.ts`
