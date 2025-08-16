# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Social is a full-stack social platform for AI-generated artwork sharing, built with Next.js 14 (frontend) and Cloudflare Workers (backend). The platform enables users to generate, upload, publish, like, and favorite AI artwork.

## Architecture

### Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Radix UI, Clerk Auth
- **Backend**: Cloudflare Workers with Hono framework, Cloudflare D1 (SQLite), Cloudflare R2 (object storage), Upstash Redis
- **Package Manager**: npm workspaces (root manages both apps)

### Project Structure
```
ai-social/
├── apps/
│   ├── web/                 # Next.js frontend (port 3000)
│   │   ├── app/            # App Router pages with Clerk auth
│   │   ├── components/     # UI components (ui/, app/)
│   │   ├── hooks/          # React hooks for data fetching (SWR-based)
│   │   ├── lib/            # Utilities, API client, types
│   │   ├── mocks/          # Mock data for development
│   │   └── public/mocks/   # Static mock files
│   └── worker-api/         # Cloudflare Workers backend (port 8787)
│       ├── src/
│       │   ├── routers/    # API route handlers (artworks, users, feed)
│       │   ├── middlewares/# Authentication middleware (JWT via Clerk)
│       │   ├── services/   # External service integrations (D1, R2, Redis)
│       │   └── types.ts    # Shared backend types
│       ├── migrations/     # Database schema files
│       └── wrangler.toml   # Worker configuration
└── doc/                    # Architecture documentation (Chinese)
```

## Development Commands

### Initial Setup
```bash
# Install all dependencies (workspaces handle both apps)
npm install

# Configure environment variables
# Frontend: apps/web/.env.local
# Backend: wrangler secrets (see Environment Variables section)
```

### Local Development
```bash
# Start frontend with hot reload (localhost:3000)
npm run dev

# Start backend with local Cloudflare env (localhost:8787)
npm run api:dev

# Note: Frontend can run in mock mode via NEXT_PUBLIC_USE_MOCK=1
```

### Build & Deploy
```bash
# Build frontend for production
npm run build

# Deploy backend to Cloudflare Workers
npm run api:deploy

# Type checking for backend
npm --workspace apps/worker-api run typecheck
```

### Environment Variables

#### Frontend (`apps/web/.env.local`)
```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_USE_MOCK=1          # Use mock data instead of real API
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

#### Backend (Cloudflare secrets)
```bash
# Required secrets (set via wrangler)
wrangler secret put UPSTASH_REDIS_REST_TOKEN
wrangler secret put CLERK_SECRET_KEY

# Public variables (set in wrangler.toml)
[vars]
UPSTASH_REDIS_REST_URL="https://your-endpoint.upstash.io"
CLERK_ISSUER="https://your-clerk-instance.clerk.accounts.dev"
CLERK_JWKS_URL="https://your-clerk-instance.clerk.accounts.dev/.well-known/jwks.json"
```

### Testing Backend
```bash
# Health check (no auth required)
curl http://localhost:8787/api/health

# Redis connection test (no auth required)
curl http://localhost:8787/api/redis/ping

# Test authenticated endpoint (requires JWT)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:8787/api/feed
```

## API Endpoints

### Backend Routes (worker-api)
All routes prefixed with `/api` and require JWT authentication (except health checks).

**Core Endpoints:**
- `GET /api/health` - Health check
- `GET /api/redis/ping` - Redis connection test
- `GET /api/feed?limit=20` - Get feed/recommendations
- `GET /api/users/:id/artworks` - Get user's artworks
- `GET /api/users/:id/favorites` - Get user's favorites
- `GET /api/artworks/:id` - Get artwork details
- `POST /api/artworks/upload` - Upload new artwork (multipart/form-data)
- `POST /api/artworks/:id/like` - Like artwork
- `DELETE /api/artworks/:id/like` - Unlike artwork
- `POST /api/artworks/:id/favorite` - Favorite artwork
- `DELETE /api/artworks/:id/favorite` - Unfavorite artwork
- `POST /api/artworks/:id/publish` - Publish artwork

### Frontend Routes
- `/` - Marketing landing page
- `/features` - Feature showcase
- `/feed` - Main feed/recommendations (auth required)
- `/user/:username` - User profile with artworks
- `/artwork/:id/:slug` - Individual artwork page
- `/login` - Authentication page (Clerk)

## Data Models

### Core Types
```typescript
// Frontend types (apps/web/lib/types.ts)
interface ArtworkListItem {
  id: string
  slug: string
  title: string
  thumbUrl: string
  author: User
  likeCount: number
  isFavorite: boolean
  status: 'draft' | 'published'
}

interface ArtworkDetail extends ArtworkListItem {
  originalUrl: string
  createdAt: number
}

interface User {
  id: string
  name: string
  profilePic?: string
}
```

### Database Schema (D1)
- `users`: id, name, email, profile_pic
- `artworks`: id, user_id, title, url, status, created_at
- `artworks_like`: user_id, artwork_id, created_at (composite PK)
- `artworks_favorite`: user_id, artwork_id, created_at (composite PK)

### Redis Keys
- `user:{user_id}:favorites` - Set of user's favorite artwork IDs
- `artwork:{id}:likes` - Counter for artwork likes

## Implementation Status

### ✅ Completed
- **Frontend**: All pages and components implemented with Clerk auth
- **Backend**: All API endpoints implemented (artworks, users, feed)
- **Database**: D1 integration with full CRUD operations
- **Storage**: R2 integration for file uploads
- **Cache**: Redis integration for likes/favorites
- **Auth**: Clerk JWT verification middleware
- **Mock System**: Frontend can use mock data via NEXT_PUBLIC_USE_MOCK=1

### Development Workflow

#### Adding Features
1. **New API endpoint**: Add route in `worker-api/src/routers/` then import in `index.ts`
2. **New frontend page**: Create in `web/app/` directory with proper routing
3. **New component**: Place in `web/components/` (ui/ for generic, app/ for domain-specific)
4. **New hook**: Create in `web/hooks/` directory following SWR pattern
5. **Database changes**: Add migrations to `worker-api/migrations/`, apply via wrangler

#### Testing Patterns
- **Frontend**: Uses mock data when `NEXT_PUBLIC_USE_MOCK=1` (set in .env.local)
- **Backend**: All endpoints tested with real D1/R2/Redis when configured
- **Auth**: Clerk handles both frontend auth and backend JWT verification

#### Common Issues
- **Database not configured**: D1Service falls back to mock mode gracefully
- **Redis unavailable**: Like/favorite counts default to 0, doesn't break app
- **Missing secrets**: Backend starts but warns about missing configuration

## Deployment

### Prerequisites
- Cloudflare account with Workers, D1, R2 enabled
- Upstash Redis instance
- Clerk authentication service

### Steps
1. **Backend**: `npm run api:deploy` (requires configured secrets)
2. **Frontend**: `npm run build && npm run start` (or deploy to Vercel)
3. **Database**: Apply migrations via `wrangler d1 migrations apply`

### Environment-specific Notes
- **Local development**: Uses wrangler local mode, real Cloudflare services
- **Production**: All Cloudflare services (D1, R2, Workers) are production-ready
- **Secrets management**: Use wrangler secrets for sensitive data