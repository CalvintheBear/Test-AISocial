# CLAUDE.md - AI Social Platform Architecture Guide

## Overview
AI Social is a modern social media platform for AI-generated artwork, built as a monorepo with:
- **Frontend**: Next.js 14 App Router with TypeScript, Clerk authentication, and SWR caching
- **Backend**: Cloudflare Workers with Hono framework, D1 SQLite, Upstash Redis, and R2 storage
- **AI Integration**: KIE AI API for image generation with real-time webhook callbacks

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment files
cp apps/web/.env.local.example apps/web/.env.local
cp apps/worker-api/.dev.vars.example apps/worker-api/.dev.vars

# Database setup
cd apps/worker-api && wrangler d1 migrations apply test-d1

# Start development servers
npm run api:dev    # Backend: http://localhost:8787
npm run dev        # Frontend: http://localhost:3000
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, SWR, Clerk
- **Backend**: Cloudflare Workers, Hono, TypeScript, Zod validation
- **Database**: D1 SQLite (primary), Redis (cache), R2 (file storage)
- **AI**: KIE AI API integration with webhook callbacks
- **Authentication**: Clerk JWT with fallback support

### Service Architecture
```
Frontend (Next.js) → authFetch → Cloudflare Workers → Router → Service → Database
                    ↓
              SWR Caching → Real-time Updates → Cache Invalidation
```

### Key Services

#### 1. D1Service (`apps/worker-api/src/services/d1.ts`)
- **Purpose**: Primary database operations
- **Features**: User management, artwork CRUD, interaction tracking, hotness calculation
- **Tables**: users, artworks, artworks_like, artworks_favorite, artworks_hot_history
- **Key Methods**: 
  - `listFeedWithUserState()` - Optimized feed with user interactions
  - `updateArtworkHotness()` - Hotness score updates
  - `createKieArtwork()` - AI generation tracking

#### 2. RedisService (`apps/worker-api/src/services/redis.ts`)
- **Purpose**: Cache management and real-time data
- **Features**: Fallback to memory cache in development
- **Cache Keys**:
  - `feed:list:{limit}` - Feed cache (10min TTL)
  - `user:{id}:artworks` - User artworks (10min TTL)
  - `artwork:{id}:likes` - Like counts (persistent)
  - `user:{id}:favorites` - Favorite sets (persistent)
  - `user:{id}:likes` - User like sets (persistent)

#### 3. HotnessCalculator (`apps/worker-api/src/utils/hotness-calculator.ts`)
- **Purpose**: Real-time artwork hotness calculation
- **Algorithm**: (Interaction Weight + Base Weight) × Time Decay × Quality Factor
- **Weights**: Like(2), Favorite(5), Comment(3), Share(8), View(0.1)
- **Levels**: 🔥🔥🔥 爆红(>100), 🔥🔥 热门(>50), 🔥 上升(>20)

#### 4. ArtworkStateManager (`apps/web/lib/artworkStateManager.ts`)
- **Purpose**: Frontend state coordination
- **Features**: SWR cache management, optimistic updates, batch operations
- **Methods**: 
  - `preloadVisibleArtworks()` - Smart preloading
  - `refreshWithDelay()` - Debounced refresh
  - `batchUpdateArtworkStates()` - Bulk state updates

## Development Workflow

### Core Commands
```bash
# Root workspace
npm run dev          # Frontend Next.js
npm run build        # Build frontend
npm run start        # Production frontend
npm run api:dev      # Backend Cloudflare Workers
npm run api:deploy   # Deploy backend

# Individual services
cd apps/web && npm run dev
cd apps/worker-api && npm run dev
```

### Testing & Validation
```bash
# Type checking
cd apps/web && npm run typecheck
cd apps/worker-api && npm run typecheck

# Data integrity
cd apps/worker-api && npm run consistency-check
cd apps/worker-api && npm run consistency-check:fix

# Hotness system
cd apps/worker-api && npm run hotness:validate
cd apps/worker-api && npm run hotness:recalculate-all

# Health checks
curl http://localhost:8787/api/health
curl http://localhost:8787/api/redis/ping
```

## API Structure

### Core Endpoints
- **Feed**: `GET /api/feed` - Optimized feed with caching
- **User Artworks**: `GET /api/users/:id/artworks`
- **User Favorites**: `GET /api/users/:id/favorites`
- **Artwork Detail**: `GET /api/artworks/:id`
- **State Management**: `GET /api/artworks/:id/state`, `POST /api/artworks/batch/state`

### Interaction Endpoints
- **Like**: `POST/DELETE /api/artworks/:id/like`
- **Favorite**: `POST/DELETE /api/artworks/:id/favorite`
- **Publish**: `POST /api/artworks/:id/publish`

### AI Generation
- **Generate**: `POST /api/artworks/generate`
- **Status**: `GET /api/artworks/task-status/:id`
- **Callback**: `POST /api/kie/kie-callback` - Webhook from KIE

### Hotness System
- **Trending**: `GET /api/hotness/trending`
- **Rank**: `GET /api/hotness/rank`
- **Refresh**: `POST /api/hotness/refresh`

## Frontend Architecture

### Data Flow Pattern
1. **Hooks** (`apps/web/hooks/`): SWR-powered data fetching
2. **State Manager**: Singleton pattern for cache coordination
3. **Optimistic Updates**: Immediate UI updates with rollback support
4. **Batch Operations**: Efficient bulk state loading

### Key Components
- **useArtworkState**: Individual artwork interaction management
- **useFeed**: Feed data with pagination and refresh
- **useLike/useFavorite**: Optimistic interaction updates
- **artworkStateManager**: Cross-component state synchronization

## Cache Strategy

### Tiered Caching
```
Client (SWR) → Redis → D1 Database
```

### Cache Keys & TTL
- **Feed**: `feed:list:{limit}` - 10 minutes
- **User Artworks**: `user:{id}:artworks` - 10 minutes  
- **User Favorites**: `user:{id}:favorites:list` - 10 minutes
- **Like/Favorite Counts**: Persistent Redis sets (no TTL)
- **State Cache**: `artwork:{id}:state` - 5 minutes

### Invalidation Strategy
- **Immediate**: User actions trigger cache invalidation
- **Scheduled**: 15-minute cron jobs for hotness recalculation
- **Smart**: Batch invalidation for related caches

## Database Schema

### Core Tables
```sql
-- Users
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT, email TEXT, profile_pic TEXT,
  hide_name INTEGER DEFAULT 0,
  hide_email INTEGER DEFAULT 0,
  created_at INTEGER, updated_at INTEGER
);

-- Artworks
CREATE TABLE artworks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT, url TEXT, thumb_url TEXT, slug TEXT,
  status TEXT CHECK (status IN ('draft','published','generating')),
  created_at INTEGER, updated_at INTEGER, published_at INTEGER,
  prompt TEXT, model TEXT, seed INTEGER,
  like_count INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,
  hot_score INTEGER DEFAULT 0,
  hot_level TEXT DEFAULT 'new',
  kie_task_id TEXT, kie_generation_status TEXT
);

-- Relationships
CREATE TABLE artworks_like (
  user_id TEXT, artwork_id TEXT, created_at INTEGER,
  PRIMARY KEY (user_id, artwork_id)
);

CREATE TABLE artworks_favorite (
  user_id TEXT, artwork_id TEXT, created_at INTEGER,
  PRIMARY KEY (user_id, artwork_id)
);

-- Hotness History
CREATE TABLE artworks_hot_history (
  id TEXT PRIMARY KEY,
  artwork_id TEXT, hot_score INTEGER, hot_level TEXT,
  calculated_at INTEGER, calculation_method TEXT, metadata TEXT
);
```

## Environment Setup

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8787
NEXT_PUBLIC_SITE_URL=https://cuttingasmr.org
NEXT_PUBLIC_DEV_JWT=dev-token
NEXT_PUBLIC_USE_MOCK=0
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
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

# KIE AI API
KIE_API_KEY=your-kie-api-key

# Development
DEV_MODE=1
ALLOWED_ORIGIN=http://localhost:3000
```

## Production Deployment

### Cloudflare Workers
```bash
# Set production secrets
wrangler secret put UPSTASH_REDIS_REST_TOKEN
wrangler secret put CLERK_SECRET_KEY
wrangler secret put KIE_API_KEY

# Deploy
npm run api:deploy
```

### Cloudflare Pages (Frontend)
```bash
# Build and deploy
npm run build
wrangler pages deploy apps/web/.next/static --project-name=ai-social-web
```

## Key Patterns & Best Practices

### 1. Service-Oriented Architecture
- **Routers** → **Services** → **Database**
- Clean separation of concerns
- Dependency injection for testability

### 2. Cache-First Design
- Redis cache with D1 fallback
- Memory cache for development
- Smart invalidation strategies

### 3. Optimistic Updates
- Immediate UI feedback
- Automatic rollback on failure
- State synchronization across components

### 4. Real-time Features
- Hotness calculation every 15 minutes
- Webhook-based AI generation updates
- Instant interaction feedback

### 5. Performance Optimization
- Batch API calls for state management
- Efficient database queries with JOINs
- Strategic caching with TTL management

## Development Tips

### Adding New Features
1. **Backend**: Add route in `src/routers/` → Update `src/services/d1.ts`
2. **Frontend**: Add hook in `hooks/` → Update `lib/api/endpoints.ts`
3. **Database**: Create migration → `wrangler d1 migrations apply test-d1`
4. **Hotness**: Update `hotness-calculator.ts` for algorithm changes

### Debugging Commands
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

This architecture enables a scalable, real-time social media platform with sophisticated AI integration and user interaction features.