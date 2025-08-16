export type Env = {
  // D1 binding
  DB: D1Database
  // R2 buckets
  R2_UPLOAD: R2Bucket
  R2_AFTER: R2Bucket
  // Upstash Redis (REST)
  UPSTASH_REDIS_REST_URL?: string
  UPSTASH_REDIS_REST_TOKEN?: string
  // Clerk
  CLERK_ISSUER?: string
  CLERK_JWKS_URL?: string
  CLERK_SECRET_KEY?: string
  // Dev
  DEV_MODE?: string
}


