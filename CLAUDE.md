# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Social is a full-stack AI art sharing platform built as a monorepo with serverless architecture:
- **Frontend**: Next.js 14 App Router with Clerk authentication, Tailwind CSS, TypeScript
- **Backend**: Cloudflare Workers with Hono framework, D1 SQLite database, R2 storage, Upstash Redis
- **Architecture**: Monorepo with npm workspaces, optimized for serverless deployment

## Development Setup

### Prerequisites
- Node.js 18+
- Cloudflare account with Workers, D1, R2 services
- Upstash Redis instance
- Clerk account for authentication

### Quick Start
```bash
# Install dependencies
npm install

# Environment setup
cp apps/web/.env.local.example apps/web/.env.local
cp apps/worker-api/.dev.vars.example apps/worker-api/.dev.vars
# Edit both files with actual credentials

# Database initialization
cd apps/worker-api
wrangler d1 migrations apply test-d1

# Start development servers
npm run api:dev    # Backend: http://localhost:8787
npm run dev        # Frontend: http://localhost:3000
```

## Architecture Patterns

### Data Flow Architecture
```
Frontend (Next.js) -> Cloudflare Workers -> D1/SQLite + Redis Cache -> R2 Storage
                    ↓
              Response Aggregation -> Frontend State Management (SWR)
```

### Core Service Layers
- **API Layer**: Hono routers with middleware pipeline (auth, error, cors, logging)
- **Service Layer**: D1Service, RedisService, R2Service for data operations
- **Cache Strategy**: Redis for hot data (likes, favorites, user states), D1 for persistent storage
- **Image Pipeline**: Original uploads to R2_UPLOAD, thumbnails to R2_AFTER via cron jobs

### Authentication Flow
- **Frontend**: Clerk Next.js integration with JWT tokens
- **Backend**: Clerk backend validation (skippable with DEV_MODE=1)
- **Token Handling**: Runtime token provider in authFetch with Clerk fallback

## Development Commands

### Frontend (Next.js)
```bash
cd apps/web
npm run dev           # Development server
npm run build         # Production build
npm run start         # Production server
npm run typecheck     # TypeScript checking
```

### Backend (Cloudflare Workers)
```bash
cd apps/worker-api
npm run dev           # Local development with wrangler
npm run deploy        # Deploy to Cloudflare Workers
npm run typecheck     # TypeScript checking
npm run consistency-check      # Data consistency validation
npm run consistency-check:fix  # Auto-fix consistency issues
```

### Testing & Debugging
```bash
# Health checks
curl http://localhost:8787/api/health
curl http://localhost:8787/api/redis/ping

# Feed testing
curl http://localhost:8787/api/feed

# With authentication
curl -H "Authorization: Bearer YOUR_JWT" http://localhost:8787/api/feed

# Worker logs
wrangler tail
```

## Key Architecture Details

### Database Schema (D1)
```sql
-- Core tables with optimized indexes
users (id, name, email, profile_pic, created_at)
artworks (id, user_id, title, url, thumb_url, slug, status, created_at, 
          like_count, favorite_count, hot_base, engagement_weight)
artworks_like (user_id, artwork_id, created_at) -- Composite PK
artworks_favorite (user_id, artwork_id, created_at) -- Composite PK

-- Performance indexes
idx_artworks_status_created ON artworks(status, created_at DESC)
idx_artworks_slug ON artworks(slug)
```

### Redis Cache Strategy
- **User State**: `user:{user_id}:artworks`, `user:{user_id}:favorites`
- **Interaction State**: `artwork:{id}:likes`, `artwork:{id}:favorites`
- **Ranking**: `hot_rank` (sorted set with engagement scores)
- **Feed Queue**: `feed_queue` for background processing

### R2 Storage Structure
- **Original Files**: `/artworks/original/{uuid}` in R2_UPLOAD bucket
- **Thumbnails**: `/artworks/thumb/{uuid}` in R2_AFTER bucket
- **Public URLs**: Configured via R2_PUBLIC_* environment variables

### API Response Patterns
- **Unified Format**: `{ success: boolean, data: T, code?: string }`
- **Error Handling**: Centralized middleware with structured error responses
- **Caching**: Redis-first with D1 fallback for user interaction states

## Development Workflow

### Adding New Features
1. **Backend**: Create route in `apps/worker-api/src/routers/`
   - Add validation schema in `apps/worker-api/src/schemas/`
   - Update D1Service methods in `apps/worker-api/src/services/d1.ts`
   - Add Redis cache keys and TTL strategies

2. **Frontend**: Create hook in `apps/web/hooks/`
   - Update API client in `apps/web/lib/api/endpoints.ts`
   - Add component integration with SWR for real-time updates

### Database Changes
1. Create migration: `apps/worker-api/migrations/NNN_description.sql`
2. Apply migration: `wrangler d1 migrations apply test-d1`
3. Update types: `apps/worker-api/src/types.ts` and `apps/web/lib/types.ts`
4. Update service methods and validation schemas

### Production Deployment
```bash
# Backend secrets (production)
cd apps/worker-api
wrangler secret put CLERK_SECRET_KEY
wrangler secret put UPSTASH_REDIS_REST_TOKEN
wrangler secret put UPSTASH_REDIS_REST_URL
npm run deploy

# Frontend deployment
npm run build
# Deploy to Cloudflare Pages or Vercel
```

## Environment Configuration

### Frontend (.env.local)
```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_API_BASE_URL=https://your-worker.workers.dev
NEXT_PUBLIC_DEV_JWT=dev-token-for-testing
NEXT_PUBLIC_USE_MOCK=0  # 0=real API, 1=mock data
```

### Backend (.dev.vars)
```bash
# Clerk configuration
CLERK_SECRET_KEY=sk_live_...
CLERK_ISSUER=https://your-instance.clerk.accounts.dev
CLERK_JWKS_URL=https://your-instance.clerk.accounts.dev/.well-known/jwks.json

# Redis configuration
UPSTASH_REDIS_REST_URL=https://your-endpoint.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# R2 public URLs
R2_PUBLIC_UPLOAD_BASE=https://your-r2-domain.r2.dev
R2_PUBLIC_AFTER_BASE=https://your-r2-domain.r2.dev

# CORS
ALLOWED_ORIGIN=https://your-frontend-domain.com

# Development
DEV_MODE=1  # Skip Clerk validation for local development
```

## Key Directories

```
apps/
├── web/                    # Next.js frontend (App Router)
│   ├── app/               # App directory with route segments
│   │   ├── feed/          # Main feed page
│   │   ├── artwork/[id]/[slug]/  # Artwork detail pages
│   │   └── user/[username]/      # User profile pages
│   ├── components/        # Reusable UI components
│   ├── hooks/            # Custom React hooks with SWR
│   ├── lib/              # API client, types, utilities
│   └── styles/           # Tailwind CSS and design tokens
└── worker-api/           # Cloudflare Workers backend
    ├── src/
    │   ├── routers/      # API route handlers (artworks, users, feed)
    │   ├── services/     # Data services (D1, Redis, R2)
    │   ├── middlewares/  # Auth, error, cors, logging
    │   ├── schemas/      # Zod validation schemas
    │   ├── utils/        # Formatters, response helpers
    │   └── scheduled.ts  # Cron jobs for thumbnails, cleanup
    └── migrations/       # D1 database migrations
```

## Performance Optimizations

### Frontend
- **SWR Integration**: Intelligent caching and revalidation
- **Dynamic Rendering**: Force-dynamic pages for real-time data
- **Image Optimization**: Next.js Image component with remote patterns

### Backend
- **Redis Caching**: Hot data cached with TTL strategies
- **Query Optimization**: Indexed composite keys, batch operations
- **Cron Jobs**: Background thumbnail generation and cleanup
- **Connection Pooling**: Efficient D1 and Redis connections

### Caching Strategy
- **Feed Data**: 5-minute TTL with background refresh
- **User States**: Session-based with immediate invalidation on actions
- **Artwork Metadata**: 1-hour TTL with manual invalidation on updates
- **Hot Rankings**: 15-minute recalculation via cron jobs

## Common Issues & Solutions

### Development
- **D1 Connection**: Ensure `wrangler.toml` database_id matches your instance
- **Redis Connection**: Verify UPSTASH credentials in .dev.vars
- **CORS Issues**: Check ALLOWED_ORIGIN matches your frontend domain
- **Type Errors**: Run `npm run typecheck` in both frontend and backend

### Production
- **Clerk Auth**: Ensure production keys are set via wrangler secrets
- **R2 Permissions**: Verify bucket bindings and public URL configurations
- **Deployment**: Use `wrangler tail` for real-time Worker logs
- **Cache Consistency**: Run consistency-check periodically for data integrity