### Fixes

1. **data-source.ts**: `synchronize: true` → `false` (production safety)
2. **frontend/package.json**: `vfonts` moved from devDependencies → dependencies (build failure fix)
3. **config/schemas/infrastructure.ts**: `password` fields changed to `optional()` (proper Redis/DB auth handling)
4. **backend/tsconfig.json**: `target: es2018` → `es2022` (modern JS features)
5. **article.router.ts + frontend/api/article.ts**: Added `POST /article/query/batch` endpoint, frontend uses it instead of N+1 requests
6. **App.vue**: Theme vars already properly typed (no `as any` found)

### Config System Enhancement
- Added env var override support in `config/loader.ts` for sensitive fields:
  - `SAVER_AUTH_CP_OAUTH_CLIENT_SECRET`
  - `SAVER_AUTH_CP_OAUTH_CLIENT_ID`
  - `SAVER_DB_PASSWORD`
  - `SAVER_REDIS_PASSWORD`
- Updated `.env.example` with placeholders
- `config.yml` clientSecret replaced with placeholder

### Testing
- All TypeScript compiles cleanly
- No breaking changes to public APIs