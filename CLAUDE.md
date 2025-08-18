# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Social is a full-stack AI art sharing platform with serverless architecture:
- **Frontend**: Next.js 14 App Router, Clerk auth, Tailwind CSS, TypeScript
- **Backend**: Cloudflare Workers, Hono framework, D1 SQLite, Upstash Redis, R2 storage
- **Monorepo**: npm workspaces, optimized for serverless deployment

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp apps/web/.env.local.example apps/web/.env.local
cp apps/worker-api/.dev.vars.example apps/worker-api/.dev.vars
# Edit both files with actual credentials

# Database setup
cd apps/worker-api
wrangler d1 migrations apply test-d1

# Start development
npm run api:dev    # Backend: http://localhost:8787
npm run dev        # Frontend: http://localhost:3000
```

## Key Commands

### Development
```bash
npm run dev        # Frontend (Next.js)
npm run api:dev    # Backend (Cloudflare Workers)
npm run build      # Build frontend
npm run api:deploy # Deploy backend
npm test           # Run integration tests
```

### Testing & Validation
```bash
# Type checking
cd apps/web && npm run typecheck
cd apps/worker-api && npm run typecheck

# Data consistency
cd apps/worker-api && npm run consistency-check
cd apps/worker-api && npm run consistency-check:fix

# Health checks
curl http://localhost:8787/api/health
curl http://localhost:8787/api/redis/ping
```

## Architecture Overview

### Data Flow
```
Frontend (Next.js) → Cloudflare Workers → D1/SQLite + Redis → R2 Storage
                    ↓
              SWR Caching → Real-time Updates
```

### Core Services
- **API**: Hono routers with middleware (auth, error, cors, logging)
- **Data**: D1Service (SQL), RedisService (cache), R2Service (storage)
- **Cache**: Redis-first for hot data, D1 fallback for persistence
- **Images**: R2_UPLOAD (originals) → R2_AFTER (thumbnails) via cron

## Key Files & Directories

```
apps/
├── web/                    # Next.js frontend
│   ├── app/               # App Router pages
│   │   ├── feed/          # Main feed
│   │   ├── artwork/[id]/[slug]/  # Artwork detail
│   │   └── user/[username]/      # User profile
│   ├── hooks/            # SWR-based React hooks
│   ├── lib/api/          # API client & types
│   └── __tests__/        # Frontend tests
└── worker-api/           # Cloudflare Workers
    ├── src/routers/      # API endpoints
    ├── src/services/     # Data services
    ├── src/middlewares/  # Auth, error handling
    ├── src/schemas/      # Zod validation
    └── migrations/       # D1 database migrations
```

## Database Schema

```sql
-- Core tables
users (id, name, email, profile_pic, created_at)
artworks (id, user_id, title, url, thumb_url, slug, status, 
          like_count, favorite_count, created_at)
artworks_like (user_id, artwork_id, created_at)      -- Composite PK
artworks_favorite (user_id, artwork_id, created_at)  -- Composite PK
```

## Cache Strategy

- **User State**: `user:{id}:artworks`, `user:{id}:favorites`
- **Artwork State**: `artwork:{id}:likes`, `artwork:{id}:favorites`
- **Feed Data**: 5min TTL with background refresh
- **Hot Rankings**: 15min recalculation via cron

## Environment Configuration

### Frontend (.env.local)
```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_API_BASE_URL=https://your-worker.workers.dev
NEXT_PUBLIC_DEV_JWT=dev-token
NEXT_PUBLIC_USE_MOCK=0
```

### Backend (.dev.vars)
```bash
CLERK_SECRET_KEY=sk_live_...
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
ALLOWED_ORIGIN=https://your-frontend-domain.com
DEV_MODE=1
```

## Testing Setup

### Frontend Tests
- **File**: `apps/web/__tests__/useArtworkState.test.ts`
- **Framework**: Jest + React Testing Library
- **Coverage**: Like/favorite hooks, API interactions

### Integration Tests
- **File**: `test-integration.js` (root)
- **Commands**: `npm test`, `npm run test:integration`

## Common Operations

### Adding Features
1. **Backend**: Add route in `src/routers/`, update `src/services/d1.ts`
2. **Frontend**: Add hook in `hooks/`, update `lib/api/endpoints.ts`
3. **Database**: Create migration, run `wrangler d1 migrations apply test-d1`

### Debugging
- **Worker logs**: `wrangler tail`
- **CORS issues**: Check `ALLOWED_ORIGIN`
- **Auth issues**: Set `DEV_MODE=1` to bypass Clerk
- **Data consistency**: Run `consistency-check:fix`

### Production Deployment
```bash
# Backend secrets
wrangler secret put CLERK_SECRET_KEY
wrangler secret put UPSTASH_REDIS_REST_TOKEN
npm run api:deploy

# Frontend
npm run build
# Deploy to Vercel/Cloudflare Pages
```