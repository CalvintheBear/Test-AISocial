# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment
npm run setup
# Or manually: cp apps/web/.env.local.example apps/web/.env.local && cp apps/worker-api/.dev.vars.example apps/worker-api/.dev.vars

# Database setup
cd apps/worker-api && wrangler d1 migrations apply test-d1

# Start development
npm run api:dev    # Backend: http://localhost:8787
npm run dev        # Frontend: http://localhost:3000
```

## Essential Commands

### Development
```bash
npm run dev          # Frontend only
npm run api:dev      # Backend only  
npm run build        # Build frontend
npm run api:deploy   # Deploy backend to Cloudflare
npm test            # Run integration tests
```

### Testing & Validation
```bash
# Type checking
cd apps/web && npm run typecheck
cd apps/worker-api && npm run typecheck

# Data integrity
cd apps/worker-api && npm run consistency-check:fix

# Health checks
curl http://localhost:8787/api/health
curl http://localhost:8787/api/redis/ping
```

### Hotness System Operations
```bash
# Recalculate all hotness scores
cd apps/worker-api && npm run hotness:recalculate-all

# Debug specific artwork
curl http://localhost:8787/api/debug/hotness/{artwork_id}

# View rankings
curl http://localhost:8787/api/hotness/top?limit=20
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

### Development Workflow
1. **Backend**: Add route in `src/routers/` → Update `src/services/d1.ts`
2. **Frontend**: Add hook in `hooks/` → Update `lib/api/endpoints.ts`
3. **Database**: Create migration → `wrangler d1 migrations apply test-d1`
4. **Hotness**: Update `hotness-calculator.ts` for algorithm changes

### Environment Setup
```bash
# Frontend (.env.local)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8787
NEXT_PUBLIC_DEV_JWT=dev-token
NEXT_PUBLIC_USE_MOCK=0

# Backend (.dev.vars)  
DEV_MODE=1  # Bypass Clerk auth in development
```

### Debugging Commands
```bash
# Worker logs
wrangler tail

# Reset cache
curl -X POST http://localhost:8787/api/debug/reset-hotness

# Check data consistency
cd apps/worker-api && npm run consistency-check
```