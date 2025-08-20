# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start (Monorepo)

```bash
# Install dependencies
npm install

# Setup environment files (create from examples)
cp apps/web/.env.local.example apps/web/.env.local
cp apps/worker-api/.dev.vars.example apps/worker-api/.dev.vars

# Database setup
cd apps/worker-api && wrangler d1 migrations apply test-d1

# Start development
npm run api:dev    # Backend: http://localhost:8787
npm run dev        # Frontend: http://localhost:3000
```

## Development Workflow

### Core Commands
```bash
# Root workspace commands
npm run dev          # Frontend Next.js
npm run build        # Build frontend
npm run start        # Production frontend
npm run api:dev      # Backend Cloudflare Workers
npm run api:deploy   # Deploy backend

# Individual workspace commands
cd apps/web && npm run dev     # Frontend only
cd apps/worker-api && npm run dev  # Backend only
```

### Testing & Validation
```bash
# Type checking
cd apps/web && npm run typecheck
cd apps/worker-api && npm run typecheck

# Data integrity checks
cd apps/worker-api && npm run consistency-check
cd apps/worker-api && npm run consistency-check:fix

# Hotness system validation
cd apps/worker-api && npm run hotness:validate
cd apps/worker-api && npm run hotness:recalculate-all

# Health checks
curl http://localhost:8787/api/health
curl http://localhost:8787/api/redis/ping
```


## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS, Clerk auth
- **Backend**: Cloudflare Workers, Hono framework, D1 SQLite, Upstash Redis, R2 storage
- **Deployment**: Serverless (Cloudflare Workers + Vercel/CF Pages)

### Key Patterns
- **Service-Oriented Architecture**: Routers → Services → Database
- **Cache-First**: Redis → D1 fallback with 5-10min TTL
- **Optimistic Updates**: Immediate UI updates, background sync
- **Real-time Hotness**: Redis sorted sets + pub/sub for rankings

### Data Flow
```
Frontend (Next.js) → authFetch → Cloudflare Workers → Middleware → Router → Service → Database
                    ↓
              SWR Caching → Real-time Updates → Cache Invalidation
```

### Critical Services
- **D1Service**: All database operations (users, artworks, interactions)
- **RedisService**: Cache management, hotness rankings, user actions
- **ArtworkStateManager**: Singleton for cache coordination across components
- **HotnessCalculator**: Real-time algorithm with time decay + quality factors

### Cache Strategy
- **Feed**: `feed:{user_id}` - 10min TTL
- **User Artworks**: `user:{id}:artworks` - 10min TTL  
- **Hot Rankings**: `hot_rank` (sorted set) - 5min TTL
- **Like/Favorite Counts**: Persistent Redis sets (no TTL)
- **State Cache**: `artwork:{id}:state` - 5min TTL

## Environment Setup

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8787
NEXT_PUBLIC_SITE_URL=https://cuttingasmr.org
NEXT_PUBLIC_DEV_JWT=dev-token
NEXT_PUBLIC_USE_MOCK=0
```

### Backend (.dev.vars)
```bash
# Clerk Configuration
CLERK_SECRET_KEY=sk_live_...
CLERK_ISSUER=https://your-domain.clerk.accounts.dev
CLERK_JWKS_URL=https://your-domain.clerk.accounts.dev/.well-known/jwks.json

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-endpoint.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token

# R2 Configuration
R2_PUBLIC_UPLOAD_BASE=https://your-upload-bucket.r2.dev
R2_PUBLIC_AFTER_BASE=https://your-after-bucket.r2.dev

# Development
DEV_MODE=1
ALLOWED_ORIGIN=http://localhost:3000
```

## Development Workflow

### Adding New Features
1. **Backend**: Add route in `src/routers/` → Update `src/services/d1.ts`
2. **Frontend**: Add hook in `hooks/` → Update `lib/api/endpoints.ts`
3. **Database**: Create migration → `wrangler d1 migrations apply test-d1`
4. **Hotness**: Update `hotness-calculator.ts` for algorithm changes

### Database Schema
```sql
-- Core Tables
CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT, email TEXT, profile_pic TEXT, created_at INTEGER, updated_at INTEGER);
CREATE TABLE artworks (id TEXT PRIMARY KEY, user_id TEXT, title TEXT, url TEXT, thumb_url TEXT, slug TEXT, status TEXT, created_at INTEGER, updated_at INTEGER, published_at INTEGER, mime_type TEXT, width INTEGER, height INTEGER, prompt TEXT, model TEXT, seed INTEGER);
CREATE TABLE artworks_like (user_id TEXT, artwork_id TEXT, created_at INTEGER, PRIMARY KEY (user_id, artwork_id));
CREATE TABLE artworks_favorite (user_id TEXT, artwork_id TEXT, created_at INTEGER, PRIMARY KEY (user_id, artwork_id));
```

### API Endpoints
- **Feed**: `GET /api/feed`
- **User Artworks**: `GET /api/users/:id/artworks`
- **User Favorites**: `GET /api/users/:id/favorites`
- **Artwork Detail**: `GET /api/artworks/:id`
- **Like/Favorite Actions**: `POST/DELETE /api/artworks/:id/like`, `POST/DELETE /api/artworks/:id/favorite`
- **State Management**: `GET /api/artworks/:id/state`, `POST /api/artworks/batch/state`
- **Hotness**: `GET /api/hotness/top?limit=20`
- **Debug**: `GET /api/debug/hotness/:id`

## Production Deployment

### Cloudflare Workers
```bash
# Set production secrets
wrangler secret put UPSTASH_REDIS_REST_TOKEN
wrangler secret put CLERK_SECRET_KEY
wrangler secret put CLERK_SECRET_KEY

# Deploy
npm run api:deploy
```

### Cloudflare Pages (Frontend)
```bash
# Build and deploy
npm run build
wrangler pages deploy apps/web/.next/static --project-name=ai-social-web
# Or use Vercel
vercel --prod
```

### CI/CD Configuration
GitHub Actions workflow at `.github/workflows/deploy.yml` automatically:
- Builds frontend and backend
- Deploys to Cloudflare Workers and Pages
- Requires repository secrets:
  - `CLOUDFLARE_API_TOKEN` (Workers Scripts:Edit & Pages:Edit permissions)
  - `CLOUDFLARE_ACCOUNT_ID`

## Debugging & Troubleshooting

### Common Issues
1. **D1 Connection**: Check `wrangler.toml` database_id and run migrations
2. **Redis Connection**: Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
3. **Clerk Auth**: Ensure `CLERK_SECRET_KEY` matches your Clerk instance
4. **CORS Issues**: Check `ALLOWED_ORIGIN` matches your frontend domain
5. **Build Errors**: Verify all environment variables are set in production

### Debug Commands
```bash
# Check worker logs
wrangler tail

# Test specific endpoints
curl http://localhost:8787/api/health
curl http://localhost:8787/api/redis/ping

# Check data consistency
cd apps/worker-api && npm run consistency-check

# Reset hotness cache
curl -X POST http://localhost:8787/api/debug/reset-hotness
```

### Performance Monitoring
- **Response Times**: Target <500ms for API calls
- **Error Rates**: Monitor for <1% error rate
- **Cache Hit Rate**: Monitor Redis cache effectiveness
- **Database Performance**: Use `wrangler d1 insights` for query analysis