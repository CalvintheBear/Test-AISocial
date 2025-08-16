# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Social is a full-stack social platform for AI-generated artwork sharing, built with Next.js 14 (frontend) and Cloudflare Workers (backend). The platform enables users to generate, upload, publish, like, and favorite AI artwork.

## Architecture

### Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Cloudflare Workers with Hono framework
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (object storage)
- **Cache**: Upstash Redis
- **Auth**: Clerk (via JWT verification)
- **Package Manager**: npm workspaces

### Project Structure
```
ai-social/
├── apps/
│   ├── web/                 # Next.js frontend
│   │   ├── app/            # App Router pages
│   │   ├── components/     # UI components (ui/, app/)
│   │   ├── hooks/          # React hooks for data fetching
│   │   ├── lib/            # Utilities, API client, types
│   │   └── public/mocks/   # Mock data for development
│   └── worker-api/         # Cloudflare Workers backend
│       ├── src/
│       │   ├── routers/    # API route handlers
│       │   ├── middlewares/# Authentication middleware
│       │   └── services/   # External service integrations
│       └── wrangler.toml   # Worker configuration
└── doc/                    # Architecture documentation
```

## Development Commands

### Environment Setup
```bash
# Install dependencies for all workspaces
npm install

# Install worker-api dependencies separately (first time)
npm --workspace apps/worker-api install
```

### Local Development
```bash
# Start frontend (Next.js dev server)
npm run dev                    # or: npm --workspace apps/web run dev

# Start backend (Cloudflare Workers)
npm run api:dev               # or: npm --workspace apps/worker-api run dev

# Build for production
npm run build                 # builds frontend
npm run api:deploy           # deploy backend to Cloudflare
```

### Testing Backend
```bash
# Health check
curl http://localhost:8787/api/health

# Redis connection test
curl http://localhost:8787/api/redis/ping
```

### Environment Variables

#### Frontend (`apps/web/.env.local`)
```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_USE_MOCK=1          # Use mock data instead of real API
```

#### Backend (via wrangler secrets)
```bash
# Set required secrets
wrangler secret put UPSTASH_REDIS_REST_TOKEN
wrangler secret put CLERK_SECRET_KEY

# Set public variables in wrangler.toml
[vars]
UPSTASH_REDIS_REST_URL="https://your-endpoint.upstash.io"
CLERK_ISSUER="https://your-clerk-instance.clerk.accounts.dev"
CLERK_JWKS_URL="https://your-clerk-instance.clerk.accounts.dev/.well-known/jwks.json"
```

## API Endpoints

### Backend Routes (worker-api)
All routes prefixed with `/api` and require JWT authentication (except health checks).

- `GET /api/health` - Health check
- `GET /api/redis/ping` - Redis connection test
- `GET /api/feed` - Get feed/recommendations
- `GET /api/users/:id/artworks` - Get user's artworks
- `GET /api/users/:id/favorites` - Get user's favorites
- `GET /api/artworks/:id` - Get artwork details
- `POST /api/artworks/:id/like` - Like artwork
- `DELETE /api/artworks/:id/like` - Unlike artwork
- `POST /api/artworks/:id/favorite` - Favorite artwork
- `DELETE /api/artworks/:id/favorite` - Unfavorite artwork
- `POST /api/artworks/:id/publish` - Publish artwork

### Frontend Routes
- `/` - Marketing landing page
- `/features` - Feature showcase
- `/feed` - Main feed/recommendations
- `/user/:username` - User profile with artworks
- `/artwork/:id/:slug` - Individual artwork page
- `/login` - Authentication page

## Data Models

### Core Types
```typescript
// Artwork
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
- `artworks_like`: user_id, artwork_id, created_at
- `artworks_favorite`: user_id, artwork_id, created_at

### Redis Keys
- `user:{user_id}:artworks` - List of user's artworks
- `user:{user_id}:favorites` - Set of user's favorites
- `hot_rank` - Sorted set for trending artworks
- `feed_queue` - List for feed generation
- `artwork:{id}:likes` - Like counter

## Development Workflow

### Current Implementation Status
- ✅ Frontend pages and components implemented
- ✅ Mock data system for development
- ✅ React hooks for data fetching (useLike, useFavorite, etc.)
- ✅ API endpoint constants defined
- ✅ Backend skeleton created (health checks only)
- ❌ Actual API endpoints (artworks, users, feed) - TODO
- ❌ Database integration - TODO
- ❌ Redis caching - TODO
- ❌ Authentication with Clerk - TODO
- ❌ AI generation integration - TODO

### Common Tasks
1. **Adding new API endpoint**: Create route in `worker-api/src/routers/`, add to `index.ts`
2. **Adding new frontend page**: Create in `web/app/` directory
3. **Adding new component**: Place in `web/components/` (ui/ for generic, app/ for domain-specific)
4. **Adding new hook**: Create in `web/hooks/` directory
5. **Database changes**: Run schema migrations via wrangler

### Testing
- Frontend uses mock data when `NEXT_PUBLIC_USE_MOCK=1`
- Backend has basic health checks at `/api/health`
- Redis connection test at `/api/redis/ping`

## Deployment

### Cloudflare Workers
```bash
cd apps/worker-api
npm run deploy
```

### Next.js
```bash
npm run build
npm run start
```

### Required Services
- Cloudflare account with Workers, D1, R2 enabled
- Upstash Redis instance
- Clerk authentication service