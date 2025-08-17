# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Social is a full-stack AI art sharing platform with:
- **Frontend**: Next.js 14 with Clerk auth, Tailwind CSS, TypeScript
- **Backend**: Cloudflare Workers with Hono framework, D1 database, R2 storage, Upstash Redis
- **Architecture**: Monorepo with workspace structure, serverless deployment

## Quick Start Commands

### Development Setup
```bash
# Install dependencies
npm install

# Setup environment files
cp apps/web/.env.local.example apps/web/.env.local
cp apps/worker-api/.dev.vars.example apps/worker-api/.dev.vars
# Edit both files with actual values

# Database setup
cd apps/worker-api
wrangler d1 migrations apply test-d1

# Start development servers
npm run api:dev    # Backend on http://localhost:8787
npm run dev        # Frontend on http://localhost:3000
```

### Available Scripts
```bash
# Frontend (Next.js)
cd apps/web
npm run dev        # Start Next.js dev server
npm run build      # Build for production
npm run start      # Start production server

# Backend (Cloudflare Workers)
cd apps/worker-api
npm run dev        # Start worker dev server
npm run deploy     # Deploy to Cloudflare Workers
npm run typecheck  # Type checking with TypeScript

# Consistency checks
cd apps/worker-api
npm run consistency-check      # Check data consistency
npm run consistency-check:fix  # Fix data consistency issues
```

### Production Deployment
```bash
# Backend deployment
cd apps/worker-api
wrangler secret put UPSTASH_REDIS_REST_TOKEN
wrangler secret put CLERK_SECRET_KEY
npm run api:deploy

# Frontend deployment
npm run build
vercel --prod
```

## Architecture Details

### Tech Stack
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Radix UI
- **Authentication**: Clerk (Next.js integration)
- **Backend**: Cloudflare Workers, Hono framework, TypeScript
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (S3-compatible)
- **Cache**: Upstash Redis (REST API)
- **Deployment**: Serverless (Workers + Vercel/Cloudflare Pages)

### Key Features
- AI artwork generation and sharing
- User authentication and profiles
- Like/favorite system
- Feed/recommendation engine
- Image upload and storage
- SEO-optimized pages with SSR

### API Structure
```
├── /api/health           # Health check
├── /api/redis/ping       # Redis connectivity test
├── /api/feed             # Recommendation feed
├── /api/artworks/
│   ├── GET /:id          # Single artwork details
│   ├── POST /upload      # Upload artwork
│   ├── POST /:id/like    # Like/unlike artwork
│   ├── POST /:id/favorite # Favorite/unfavorite
│   └── POST /:id/publish # Publish draft artwork
└── /api/users/
    ├── GET /:id/artworks # User's artworks
    └── GET /:id/favorites # User's favorites
```

### Database Schema (D1)
- **users**: id, name, email, profile_pic
- **artworks**: id, user_id, title, url, status (draft/published), created_at
- **artworks_like**: user_id, artwork_id, created_at (composite PK)
- **artworks_favorite**: user_id, artwork_id, created_at (composite PK)

### Environment Variables

#### Frontend (.env.local)
```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_USE_MOCK=0                    # 0=real API, 1=mock data
NEXT_PUBLIC_DEV_JWT=dev-jwt-token         # Development JWT
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8787
```

#### Backend (.dev.vars)
```
# Clerk
CLERK_SECRET_KEY=sk_test_...
CLERK_ISSUER=https://your-instance.clerk.accounts.dev
CLERK_JWKS_URL=https://your-instance.clerk.accounts.dev/.well-known/jwks.json

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-endpoint.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# Development
DEV_MODE=1
```

#### Backend (wrangler.toml)
```toml
[vars]
R2_PUBLIC_UPLOAD_BASE = "https://your-r2-domain.r2.dev"
R2_PUBLIC_AFTER_BASE = "https://your-r2-domain.r2.dev"

[[d1_databases]]
binding = "DB"
database_name = "your-d1-database"
database_id = "your-database-id"

[[r2_buckets]]
binding = "R2_UPLOAD"
bucket_name = "your-upload-bucket"

[[r2_buckets]]
binding = "R2_AFTER"
bucket_name = "your-after-bucket"
```

## Development Workflow

### Testing Endpoints
```bash
# Health checks
curl http://localhost:8787/api/health
curl http://localhost:8787/api/redis/ping

# Test feed
curl http://localhost:8787/api/feed

# Test with JWT (when DEV_MODE=0)
curl -H "Authorization: Bearer your-jwt" http://localhost:8787/api/feed
```

### Frontend Pages
- `/` - Marketing landing page
- `/features` - Feature showcase
- `/feed` - Main feed/recommendations
- `/user/[username]` - User profile with artworks
- `/artwork/[id]/[slug]` - Individual artwork detail

### Key Directories
```
apps/
├── web/                    # Next.js frontend
│   ├── app/               # App router pages
│   ├── components/        # UI components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities and API client
│   └── styles/           # Global styles and tokens
└── worker-api/           # Cloudflare Workers backend
    ├── src/
    │   ├── routers/      # API route handlers
    │   ├── services/     # Business logic services
    │   ├── middlewares/  # Auth, error handling, logging
    │   ├── schemas/      # Validation schemas
    │   └── utils/        # Helper utilities
    └── migrations/       # Database migrations
```

### Redis Cache Keys
- `user:{user_id}:artworks` - User's artwork list
- `user:{user_id}:favorites` - User's favorite artworks
- `hot_rank` - Global hot ranking (sorted set)
- `feed_queue` - Feed generation queue
- `artwork:{id}:likes` - Like count per artwork

### R2 Storage Structure
- `/artworks/original/{uuid}` - Original uploaded files
- `/artworks/thumb/{uuid}` - Generated thumbnails
- Public URLs via `R2_PUBLIC_UPLOAD_BASE` and `R2_PUBLIC_AFTER_BASE`

## Common Tasks

### Adding New API Endpoint
1. Create route in `apps/worker-api/src/routers/`
2. Add validation schema in `apps/worker-api/src/schemas/`
3. Update frontend API client in `apps/web/lib/api/`
4. Add corresponding hook in `apps/web/hooks/`

### Database Changes
1. Create migration file in `apps/worker-api/migrations/`
2. Run: `wrangler d1 migrations apply test-d1`
3. Update types in `apps/worker-api/src/types.ts`
4. Update frontend types in `apps/web/lib/types.ts`

### Debugging
- **D1 issues**: Check `wrangler.toml` database_id
- **Redis issues**: Verify `UPSTASH_REDIS_REST_TOKEN`
- **Clerk auth**: Check `CLERK_SECRET_KEY` and issuer config
- **R2 upload**: Check bucket names and permissions
- **Logs**: Use `wrangler tail` for Worker logs

### Development Mode Features
- `DEV_MODE=1`: Skip Clerk validation
- `NEXT_PUBLIC_USE_MOCK=1`: Use frontend mock data
- Hot reload for both frontend and backend