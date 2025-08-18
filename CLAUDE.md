
  This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

  Project Overview

  AI Social is a full-stack AI art sharing platform with serverless architecture:
  - Frontend: Next.js 14 App Router, Clerk auth, Tailwind CSS, TypeScript
  - Backend: Cloudflare Workers, Hono framework, D1 SQLite, Upstash Redis, R2 storage
  - Monorepo: npm workspaces, optimized for serverless deployment

  Quick Start

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

  Key Commands

  Development

  npm run dev        # Frontend (Next.js)
  npm run api:dev    # Backend (Cloudflare Workers)
  npm run build      # Build frontend
  npm run api:deploy # Deploy backend
  npm test           # Run integration tests

  Testing & Validation

  # Type checking
  cd apps/web && npm run typecheck
  cd apps/worker-api && npm run typecheck

  # Data consistency
  cd apps/worker-api && npm run consistency-check
  cd apps/worker-api && npm run consistency-check:fix

  # Health checks
  curl http://localhost:8787/api/health
  curl http://localhost:8787/api/redis/ping

  Architecture Overview

  Data Flow

  Frontend (Next.js) → authFetch → Cloudflare Workers → Middleware → Router → Service → Database
                      ↓
                SWR Caching → Real-time Updates → Cache Invalidation

  Core Patterns

  - Service-Oriented Architecture: Clean separation between routers, services, and middleware
  - Repository Pattern: D1Service handles all database operations
  - Cache-First Strategy: Redis → D1 fallback for hot data
  - Optimistic Updates: Immediate UI updates with background sync
  - JWT Authentication: Clerk-based auth with dual-mode support (prod/dev)

  Key Services

  - API: Hono routers with middleware (auth, error, cors, logging, monitoring)
  - Data: D1Service (SQL), RedisService (cache), R2Service (storage)
  - State Management: ArtworkStateManager singleton for cache coordination
  - Background Processing: Cron jobs for thumbnails and count synchronization

  File Structure

  apps/
  ├── web/                    # Next.js frontend
  │   ├── app/               # App Router pages
  │   │   ├── feed/          # Main feed (dynamic, force-dynamic)
  │   │   ├── artwork/[id]/[slug]/  # Artwork detail (dynamic)
  │   │   ├── user/[username]/      # User profile (dynamic)
  │   │   └── trending/      # Hotness trending page
  │   ├── hooks/            # SWR-based React hooks
  │   │   ├── useArtworkState.ts     # Centralized artwork state
  │   │   ├── useFeed.ts            # Feed management
  │   │   ├── useLike.ts            # Like operations
  │   │   ├── useFavorite.ts        # Favorite operations
  │   │   └── useArtworks.ts        # Artworks management
  │   ├── lib/api/          # API client & types
  │   │   ├── client.ts     # authFetch wrapper
  │   │   └── endpoints.ts  # API endpoint definitions
  │   ├── components/       # React components
  │   │   ├── HotnessFilter.tsx     # Hotness filtering
  │   │   └── HotnessIndicator.tsx  # Hotness visualization
  │   └── __tests__/        # Frontend tests
  └── worker-api/           # Cloudflare Workers
      ├── src/routers/      # API endpoints
      │   ├── artworks.ts   # CRUD operations
      │   ├── feed.ts       # Feed generation
      │   ├── users.ts      # User operations
      │   ├── hotness.ts    # Hotness calculation endpoints
      │   └── debug.ts      # Debug utilities
      ├── src/services/     # Data services
      │   ├── d1.ts         # Database operations
      │   ├── redis.ts      # Cache operations
      │   └── r2.ts         # Storage operations
      ├── src/utils/        # Utility functions
      │   ├── hotness-calculator.ts   # Core hotness algorithm
      │   ├── hotness-batch-updater.ts # Batch updates
      │   ├── hotness-debugger.ts     # Debugging tools
      │   └── hotness-metrics.ts      # Hotness monitoring
      ├── src/middlewares/  # Cross-cutting concerns
      │   ├── auth.ts       # JWT verification
      │   ├── cache.ts      # Cache management
      │   └── error.ts      # Error handling
      ├── src/config/       # Configuration files
      └── migrations/       # D1 database migrations

  Database Schema

  -- Core tables
  users (id, name, email, profile_pic, created_at, updated_at)
  artworks (id, user_id, title, url, thumb_url, slug, status,
            like_count, favorite_count, created_at, updated_at,
            published_at, mime_type, width, height, prompt, model, seed)
  artworks_like (user_id, artwork_id, created_at)      -- Composite PK
  artworks_favorite (user_id, artwork_id, created_at)  -- Composite PK

  Cache Strategy

  Cache Keys & TTL

  - Feed Data: feed:{user_id} - 10min TTL
  - User Artworks: user:{id}:artworks - 10min TTL
  - User Favorites: user:{id}:favorites - 10min TTL
  - Like/Favorite Counts: Persistent Redis sets (no TTL)
  - Artwork State: Real-time via batch endpoints
  - Hot Rank: hot_rank (sorted set) - 5min TTL
  - Artwork Hotness: artwork:{id}:hot (hash) - 5min TTL
  - User Actions: user:{id}:actions (hash) - 1hr TTL

  Invalidation Patterns

  - User Actions: Invalidate user-specific caches
  - Content Creation: Invalidate global feed caches
  - Like/Favorite: Update Redis sets immediately, sync to D1 async
  - Hotness Updates: Real-time via Redis pub/sub
  - Trending Data: Staggered invalidation based on time windows

  Hotness Architecture

  Core Components
  - HotnessCalculator: Core algorithm for calculating artwork hotness scores
  - HotnessBatchUpdater: Batch processing for bulk hotness recalculation
  - HotnessDebugger: Development tools for debugging hotness calculations
  - HotnessMetrics: Monitoring and analytics for hotness system performance

  Hotness Formula
  - Real-time hotness = (base_weight + interaction_weight) × time_decay × quality_factor
  - Interaction weights: Like(+2), Favorite(+5), Comment(+3), Share(+8), View(+0.1)
  - Time decay: Compound decay with segmented strategies (24h/7d/long-term)
  - Quality factors: Resolution, aspect ratio, prompt completeness, user reputation

  Real-time Updates
  - Redis sorted sets for global hot rankings (hot_rank)
  - Hash-based storage for individual artwork hotness details
  - Atomic operations for real-time score updates
  - Pub/sub notifications for immediate UI updates

  Environment Configuration

  Frontend (.env.local)

  NEXT_PUBLIC_SITE_URL=https://your-domain.com
  NEXT_PUBLIC_API_BASE_URL=https://your-worker.workers.dev
  NEXT_PUBLIC_DEV_JWT=dev-token
  NEXT_PUBLIC_USE_MOCK=0

  Backend (.dev.vars)

  CLERK_SECRET_KEY=sk_live_...
  UPSTASH_REDIS_REST_URL=https://...upstash.io
  UPSTASH_REDIS_REST_TOKEN=...
  ALLOWED_ORIGIN=https://your-frontend-domain.com
  DEV_MODE=1

  Common Operations

  Adding Features

  1. Backend: Add route in src/routers/, update src/services/d1.ts
  2. Frontend: Add hook in hooks/, update lib/api/endpoints.ts
  3. Database: Create migration, run wrangler d1 migrations apply test-d1
  4. Hotness: Update hotness-calculator.ts for algorithm changes

  Hotness-specific Operations

  # Recalculate all hotness scores
  cd apps/worker-api
  npm run hotness:recalculate-all

  # Debug specific artwork hotness
  curl http://localhost:8787/api/debug/hotness/{artwork_id}

  # View hot rankings
  curl http://localhost:8787/api/hotness/top?limit=20

  # Reset hotness cache
  curl -X POST http://localhost:8787/api/debug/reset-hotness

  Debugging

  - Worker logs: wrangler tail
  - CORS issues: Check ALLOWED_ORIGIN
  - Auth issues: Set DEV_MODE=1 to bypass Clerk
  - Data consistency: Run consistency-check:fix
  - Hotness issues: Use hotness-debugger.ts utilities
  - Performance: Check hotness-metrics.ts for bottlenecks

  Production Deployment

  # Backend secrets
  wrangler secret put CLERK_SECRET_KEY
  wrangler secret put UPSTASH_REDIS_REST_TOKEN
  npm run api:deploy

  # Frontend
  npm run build
  # Deploy to Vercel/Cloudflare Pages

  Testing Setup

  Frontend Tests

  - Framework: Jest + React Testing Library
  - Location: apps/web/__tests__/useArtworkState.test.ts
  - Coverage: Like/favorite hooks, API interactions

  Integration Tests

  - File: test-integration.js (root)
  - Commands: npm test, npm run test:integration

  Error Handling Patterns

  Backend

  - Middleware: Centralized error handling in error.ts
  - Response Format: { success: boolean, message: string, code?: string }
  - Validation: Zod schema validation with detailed field errors

  Frontend

  - Error Boundaries: Global error boundary in ApiErrorBoundary.tsx
  - Retry Logic: SWR automatic retry with exponential backoff
  - Fallback States: Skeleton components and error states