#!/usr/bin/env node

/**
 * Authentication Testing Script
 * Tests Clerk JWT validation without DEV_MODE
 */

const { exec } = require('child_process')

// Test configuration
const API_BASE = process.env.API_BASE || 'http://localhost:8787'
const TEST_ENDPOINTS = [
  '/api/health',
  '/api/feed',
  '/api/users/test-user/artworks',
  '/api/artworks/test-id'
]

async function testAuth() {
  console.log('🔐 Testing Authentication Flow')
  console.log('================================')
  
  // Test 1: Request without JWT (should fail)
  console.log('\n1️⃣ Testing without JWT...')
  for (const endpoint of TEST_ENDPOINTS.slice(1)) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`)
      console.log(`   ${endpoint}: ${response.status} ${response.status === 401 ? '✅' : '❌'}`)
    } catch (error) {
      console.log(`   ${endpoint}: Error - ${error.message}`)
    }
  }
  
  // Test 2: Request with invalid JWT (should fail)
  console.log('\n2️⃣ Testing with invalid JWT...')
  for (const endpoint of TEST_ENDPOINTS.slice(1)) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Authorization': 'Bearer invalid-jwt-token'
        }
      })
      console.log(`   ${endpoint}: ${response.status} ${response.status === 401 ? '✅' : '❌'}`)
    } catch (error) {
      console.log(`   ${endpoint}: Error - ${error.message}`)
    }
  }
  
  // Test 3: Health check (should pass - no auth required)
  console.log('\n3️⃣ Testing health endpoint...')
  try {
    const response = await fetch(`${API_BASE}/api/health`)
    console.log(`   /api/health: ${response.status} ${response.ok ? '✅' : '❌'}`)
  } catch (error) {
    console.log(`   /api/health: Error - ${error.message}`)
  }
}

function createTestJWT() {
  // Create a mock JWT for testing
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ 
    sub: 'test-user-id',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000)
  })).toString('base64url')
  const signature = 'mock-signature'
  
  return `${header}.${payload}.${signature}`
}

// CLI interface
const args = process.argv.slice(2)
const command = args[0]

switch (command) {
  case 'test':
    console.log('🧪 Starting authentication tests...')
    testAuth().catch(console.error)
    break
    
  case 'jwt':
    console.log('🔑 Generated test JWT:', createTestJWT())
    break
    
  default:
    console.log(`
🎯 AI Social Auth Testing Tool

Usage: node test-auth.js [command]

Commands:
  test    - Run authentication tests
  jwt     - Generate test JWT token

🧪 Manual Testing:
1. Start dev server: npm run api:dev
2. Test without JWT: curl http://localhost:8787/api/feed
3. Test with JWT: curl -H "Authorization: Bearer YOUR_JWT" http://localhost:8787/api/feed
4. Check health: curl http://localhost:8787/api/health

🔐 Expected Results:
- Without JWT: 401 Unauthorized (protected endpoints)
- With valid JWT: 200 OK
- Health endpoint: 200 OK (no auth required)
    `)
}

if (require.main === module) {
  if (!command) {
    console.log('Please specify a command: test or jwt')
  }
}