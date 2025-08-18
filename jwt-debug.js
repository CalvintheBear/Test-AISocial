// JWT Debugging script
const jwt = require('jsonwebtoken');

// Simulate the current issuer configuration
const issuer = 'https://cuttingasmr.org';
const jwksUrl = 'https://cuttingasmr.org/.well-known/jwks.json';

// Test scenarios
console.log('=== JWT Token Validation Analysis ===');

// 1. Check if issuer is reachable
console.log('\n1. Checking issuer configuration:');
console.log(`CLERK_ISSUER: ${issuer}`);
console.log(`CLERK_JWKS_URL: ${jwksUrl}`);

// 2. Analyze the auth middleware flow
console.log('\n2. Auth Middleware Silent Failure Points:');
console.log('- Line 71-73: verifyToken() with CLERK_ISSUER and CLERK_JWKS_URL');
console.log('- Line 75-77: decodeJwtPayload() fallback');
console.log('- Line 85-86: basicValid check with issuer matching');
console.log('- Line 91-92: upsertUser() with empty catch block');
console.log('- Line 138-139: upsertUser() in users/me endpoint');

// 3. Silent failure patterns identified
console.log('\n3. Silent Failure Patterns:');
console.log('a) JWT signature verification fails silently');
console.log('b) Database upsert operations fail silently');
console.log('c) decodeJwtPayload() returns null on failure');
console.log('d) basicValid check fails silently');
console.log('e) Empty user data returned without error');

// 4. Potential issuer mismatch issues
console.log('\n4. Issuer Configuration Issues:');
console.log('- Current issuer: cuttingasmr.org');
console.log('- Previous issuer may have been different');
console.log('- JWT tokens issued with old domain will fail signature verification');
console.log('- Fallback decodeJwtPayload() may not match new issuer');

// 5. Debugging recommendations
console.log('\n5. Debugging Steps:');
console.log('a) Verify current JWT token issuer claim');
console.log('b) Check if jwks.json is accessible');
console.log('c) Test verifyToken() directly with current config');
console.log('d) Add logging to decodeJwtPayload() function');
console.log('e) Add error logging to upsertUser() calls');

// 6. Test environment variables
console.log('\n6. Environment Configuration:');
console.log('DEV_MODE=1 (bypasses all auth)');
console.log('CLERK_ISSUER=https://cuttingasmr.org');
console.log('CLERK_JWKS_URL=https://cuttingasmr.org/.well-known/jwks.json');